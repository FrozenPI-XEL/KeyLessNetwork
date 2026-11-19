-- KeyLessNetwork: Sicherheits-Setup (EINMAL im SQL-Editor von Supabase ausführen)
--
-- Was das macht:
--  * Echte Anmeldung über Supabase Auth statt "Benutzername + Passwort in der codes-Tabelle".
--  * Registrierung nur mit gültigem Einladungscode (prüft die Datenbank selbst, nicht die App).
--  * Nur Admins dürfen Codes, Nutzer, Locker und Freigaben verwalten.
--  * Freigegebene Nutzer bekommen nach dem Login automatisch Locker + Schlüssel.
--  * Alte, offene Policies (jeder darf alles lesen/ändern) werden entfernt.
--
-- Diese Datei EINMAL komplett im SQL-Editor ausführen, mehr ist nicht nötig. Sie kann auch mehrfach laufen.
--
-- Voraussetzung in Supabase (Authentication > Sign In / Providers):
--   "Allow new users to sign up" AN, Provider "Email" AN, "Confirm email" AUS.
--   (Die App erzeugt intern E-Mail-Adressen aus Benutzernamen, es wird nie eine Mail verschickt.
--    Die Registrierung ist trotz "sign up AN" durch den Einladungscode geschützt, siehe unten.)
--
-- Am Ende der Datei zeigt eine Abfrage deinen Einladungscode. Damit registrierst du dich in der App.
-- Der ERSTE registrierte Nutzer wird automatisch Admin.

-- ---------------------------------------------------------------------------
-- Migration: falls dieses Skript schon einmal unter dem alten Namen "cabinet"
-- gelaufen ist, werden die bestehenden Tabellen/Spalten umbenannt statt neue,
-- leere anzulegen (keine Daten gehen verloren). Wer frisch startet: tut nichts.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.kln_cabinets') is not null and to_regclass('public.kln_lockers') is null then
    alter table public.kln_cabinets rename to kln_lockers;
  end if;
  if to_regclass('public.kln_cabinet_secrets') is not null and to_regclass('public.kln_locker_secrets') is null then
    alter table public.kln_cabinet_secrets rename to kln_locker_secrets;
  end if;
  if to_regclass('public.kln_locker_secrets') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='kln_locker_secrets' and column_name='cabinet_id') then
    alter table public.kln_locker_secrets rename column cabinet_id to locker_id;
  end if;
  if to_regclass('public.kln_cabinet_members') is not null and to_regclass('public.kln_locker_members') is null then
    alter table public.kln_cabinet_members rename to kln_locker_members;
  end if;
  if to_regclass('public.kln_locker_members') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='kln_locker_members' and column_name='cabinet_id') then
    alter table public.kln_locker_members rename column cabinet_id to locker_id;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
create table if not exists public.kln_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists kln_profiles_username_lower on public.kln_profiles (lower(username));

create table if not exists public.kln_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.kln_lockers (
  id uuid primary key,
  name text not null,
  host text not null,
  port integer not null default 8443 check (port between 1 and 65535),
  https boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.kln_locker_secrets (
  locker_id uuid primary key references public.kln_lockers(id) on delete cascade,
  key_hex text not null check (key_hex ~ '^[0-9a-f]{64}$')
);

create table if not exists public.kln_locker_members (
  locker_id uuid not null references public.kln_lockers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (locker_id, user_id)
);

alter table public.kln_profiles enable row level security;
alter table public.kln_admins enable row level security;            -- bewusst ohne Policy: von außen unsichtbar
alter table public.kln_lockers enable row level security;
alter table public.kln_locker_secrets enable row level security;
alter table public.kln_locker_members enable row level security;

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------
create or replace function public.kln_is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.kln_admins where user_id = auth.uid());
$$;

-- Wird auch vom Pi aufgerufen (mit dem Login-Token des Nutzers).
create or replace function public.kln_can_access(p_locker uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select auth.uid() is not null
    and (
      public.kln_is_admin()
      or exists (
        select 1 from public.kln_locker_members m
        where m.locker_id = p_locker and m.user_id = auth.uid()
      )
    );
$$;

-- Prüft einen Einladungscode (für die Registrierungs-Maske). Verrät nur ja/nein.
create or replace function public.kln_check_invite(p_code text)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.codes where code = upper(trim(p_code)) and genutzt = false
  );
$$;

create or replace function public.kln_list_users()
returns table (user_id uuid, username text, is_admin boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not public.kln_is_admin() then
    raise exception 'not allowed';
  end if;
  return query
    select p.user_id, p.username, exists (select 1 from public.kln_admins a where a.user_id = p.user_id)
    from public.kln_profiles p
    order by lower(p.username);
end;
$$;

create or replace function public.kln_set_admin(p_user uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.kln_is_admin() then
    raise exception 'not allowed';
  end if;
  if p_user = auth.uid() and not p_admin then
    raise exception 'you cannot remove your own admin role';
  end if;
  if p_admin then
    insert into public.kln_admins (user_id) values (p_user) on conflict do nothing;
  else
    delete from public.kln_admins where user_id = p_user;
  end if;
end;
$$;

create or replace function public.kln_delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.kln_is_admin() then
    raise exception 'not allowed';
  end if;
  if p_user = auth.uid() then
    raise exception 'you cannot delete yourself';
  end if;
  delete from auth.users where id = p_user;  -- löscht Profil, Freigaben und Admin-Eintrag per CASCADE mit
end;
$$;

create or replace function public.kln_set_member(p_locker uuid, p_user uuid, p_allowed boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.kln_is_admin() then
    raise exception 'not allowed';
  end if;
  if p_allowed then
    insert into public.kln_locker_members (locker_id, user_id) values (p_locker, p_user) on conflict do nothing;
  else
    delete from public.kln_locker_members where locker_id = p_locker and user_id = p_user;
  end if;
end;
$$;

revoke all on function public.kln_is_admin() from public, anon;
revoke all on function public.kln_can_access(uuid) from public, anon;
revoke all on function public.kln_check_invite(text) from public;
revoke all on function public.kln_list_users() from public, anon;
revoke all on function public.kln_set_admin(uuid, boolean) from public, anon;
revoke all on function public.kln_delete_user(uuid) from public, anon;
revoke all on function public.kln_set_member(uuid, uuid, boolean) from public, anon;
grant execute on function public.kln_is_admin() to authenticated;
grant execute on function public.kln_can_access(uuid) to authenticated;
grant execute on function public.kln_check_invite(text) to anon, authenticated;
grant execute on function public.kln_list_users() to authenticated;
grant execute on function public.kln_set_admin(uuid, boolean) to authenticated;
grant execute on function public.kln_delete_user(uuid) to authenticated;
grant execute on function public.kln_set_member(uuid, uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Registrierung: Die Datenbank erlaubt ein neues Konto nur mit gültigem, unbenutztem Code.
-- Die App schickt Benutzername und Code beim signUp als Metadaten mit.
-- ---------------------------------------------------------------------------
create or replace function public.kln_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(coalesce(new.raw_user_meta_data->>'invite_code', '')));
  v_username text := trim(coalesce(new.raw_user_meta_data->>'username', ''));
  v_id bigint;
begin
  if v_username = '' or length(v_username) > 24 then
    raise exception 'invalid username';
  end if;
  select id into v_id from public.codes where code = v_code and genutzt = false for update;
  if v_id is null then
    raise exception 'invalid invite code';
  end if;
  update public.codes set genutzt = true where id = v_id;
  insert into public.kln_profiles (user_id, username) values (new.id, v_username);
  -- Der allererste Nutzer wird automatisch Admin (solange es noch keinen Admin gibt).
  if not exists (select 1 from public.kln_admins) then
    insert into public.kln_admins (user_id) values (new.id);
  end if;
  return new;
end;
$$;

-- Alte, fremde Trigger auf auth.users entfernen, die in eine Tabelle "profiles" schreiben wollen,
-- die es hier nicht gibt (Rest aus einer Supabase-Vorlage). Sie lassen jede Registrierung mit
-- Fehler 500 scheitern ("relation public.profiles does not exist"). Gibt es die Tabelle, bleibt alles unberührt.
do $$
declare r record;
begin
  if to_regclass('public.profiles') is null then
    for r in
      select t.tgname
      from pg_trigger t
      join pg_proc p on p.oid = t.tgfoid
      where t.tgrelid = 'auth.users'::regclass
        and not t.tgisinternal
        and t.tgname <> 'kln_on_auth_user_created'
        and pg_get_functiondef(p.oid) ~* '(^|[^a-z0-9_])profiles([^a-z0-9_]|$)'
    loop
      execute format('drop trigger %I on auth.users', r.tgname);
    end loop;
  end if;
end
$$;

drop trigger if exists kln_on_auth_user_created on auth.users;
create trigger kln_on_auth_user_created
  after insert on auth.users
  for each row execute function public.kln_handle_new_user();

-- ---------------------------------------------------------------------------
-- Zugriffsregeln (Row Level Security)
-- ---------------------------------------------------------------------------
-- Alte offene Policies entfernen
drop policy if exists "Allow public select codes" on public.codes;
drop policy if exists "Allow public insert codes" on public.codes;
drop policy if exists "Allow public update codes" on public.codes;
drop policy if exists "Allow public delete codes" on public.codes;
drop policy if exists "Allow public select pis" on public.raspberry_pis;
drop policy if exists "Allow public insert pis" on public.raspberry_pis;
drop policy if exists "Allow public update pis" on public.raspberry_pis;
drop policy if exists "Allow public delete pis" on public.raspberry_pis;

-- codes: nur Admins (die Registrierung läuft über den Trigger oben)
alter table public.codes enable row level security;
drop policy if exists kln_codes_admin on public.codes;
create policy kln_codes_admin on public.codes
  for all to authenticated using (public.kln_is_admin()) with check (public.kln_is_admin());

-- raspberry_pis (alte Tabelle): nur noch Admins; wird von der App nicht mehr benutzt
alter table public.raspberry_pis enable row level security;
drop policy if exists kln_pis_admin on public.raspberry_pis;
create policy kln_pis_admin on public.raspberry_pis
  for all to authenticated using (public.kln_is_admin()) with check (public.kln_is_admin());

drop policy if exists kln_profiles_select on public.kln_profiles;
create policy kln_profiles_select on public.kln_profiles
  for select to authenticated using (user_id = auth.uid() or public.kln_is_admin());

drop policy if exists kln_lockers_select on public.kln_lockers;
create policy kln_lockers_select on public.kln_lockers
  for select to authenticated using (public.kln_can_access(id));
drop policy if exists kln_lockers_admin on public.kln_lockers;
create policy kln_lockers_admin on public.kln_lockers
  for all to authenticated using (public.kln_is_admin()) with check (public.kln_is_admin());

drop policy if exists kln_secrets_select on public.kln_locker_secrets;
create policy kln_secrets_select on public.kln_locker_secrets
  for select to authenticated using (public.kln_can_access(locker_id));
drop policy if exists kln_secrets_admin on public.kln_locker_secrets;
create policy kln_secrets_admin on public.kln_locker_secrets
  for all to authenticated using (public.kln_is_admin()) with check (public.kln_is_admin());

drop policy if exists kln_members_select on public.kln_locker_members;
create policy kln_members_select on public.kln_locker_members
  for select to authenticated using (user_id = auth.uid() or public.kln_is_admin());
drop policy if exists kln_members_admin on public.kln_locker_members;
create policy kln_members_admin on public.kln_locker_members
  for all to authenticated using (public.kln_is_admin()) with check (public.kln_is_admin());

-- ---------------------------------------------------------------------------
-- Einladungscode für deine erste Registrierung
-- Gibt es noch keinen Admin und keinen offenen Code, wird ein zufälliger Code angelegt.
-- Der erste Nutzer, der sich damit registriert, wird automatisch Admin.
-- ---------------------------------------------------------------------------
insert into public.codes (code, genutzt)
select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)), false
where not exists (select 1 from public.kln_admins)
  and not exists (select 1 from public.codes where genutzt = false);

-- Optional, empfohlen: alte Klartext-Passwörter aus der codes-Tabelle entfernen. Alte Konten aus dem
-- alten Login funktionieren nicht mehr, Nutzer registrieren sich neu mit einem neuen Code.
--   update public.codes set code2 = null where code2 is not null;

-- ERGEBNIS: deine offenen Einladungscodes (mit dem obersten in der App als Admin registrieren)
select code as einladungscode, 'offen' as status
from public.codes
where genutzt = false
order by id desc;
