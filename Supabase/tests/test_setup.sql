-- Prüft das Verhalten von setup.sql (nach auth_stub.sql und setup.sql ausführen). Bricht bei einem Fehler ab.
-- NICHT in Supabase ausführen.
\set ON_ERROR_STOP 1
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

create or replace function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'TEST FEHLGESCHLAGEN: %', msg; end if;
  raise notice 'ok: %', msg;
end $$;

insert into public.codes (code) values ('TESTCOD2'), ('TESTCOD3');

-- Erster Nutzer (mit dem automatisch erzeugten Code) wird Admin, zweiter nicht
insert into auth.users (id, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000001',
       jsonb_build_object('username', 'erster', 'invite_code',
         (select code from public.codes where genutzt = false and code not like 'TEST%' limit 1));
insert into auth.users (id, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000002', '{"username":"zweiter","invite_code":"TESTCOD2"}');
select pg_temp.check((select count(*) = 1 from public.kln_admins
                      where user_id = '00000000-0000-0000-0000-000000000001'), 'erster Nutzer ist Admin');
select pg_temp.check((select count(*) = 1 from public.kln_admins), 'nur ein Admin');

-- Letzter Admin gelöscht: der nächste Nutzer wird NICHT automatisch Admin
delete from auth.users where id = '00000000-0000-0000-0000-000000000001';
insert into auth.users (id, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000003', '{"username":"dritter","invite_code":"TESTCOD3"}');
select pg_temp.check((select count(*) = 0 from public.kln_admins), 'kein automatischer Admin nach Löschen');

-- Benutzter Code funktioniert kein zweites Mal
do $$ begin
  insert into auth.users (raw_user_meta_data) values ('{"username":"vierter","invite_code":"TESTCOD3"}');
  raise exception 'TEST FEHLGESCHLAGEN: Code doppelt benutzt';
exception when raise_exception then
  if sqlerrm like 'TEST FEHLGESCHLAGEN%' then raise; end if;
end $$;

-- anon sieht keine Schlüssel und keine Codes
set role anon;
select pg_temp.check((select count(*) = 0 from public.kln_locker_secrets), 'anon sieht keine Schlüssel');
select pg_temp.check((select count(*) = 0 from public.codes), 'anon sieht keine Codes');
reset role;

-- normaler Nutzer: keine Codes, keine Einstellungen, darf nichts anlegen und sich nicht zum Admin machen
set role authenticated;
select set_config('request.jwt.sub', '00000000-0000-0000-0000-000000000002', false);
select pg_temp.check((select count(*) = 0 from public.codes), 'Nutzer sieht keine Codes');
select pg_temp.check((select count(*) = 0 from public.kln_settings), 'Nutzer sieht keine Einstellungen');
do $$ begin
  insert into public.kln_lockers (id, name, host) values (gen_random_uuid(), 'x', '1.2.3.4');
  raise exception 'TEST FEHLGESCHLAGEN: Nutzer konnte Locker anlegen';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.kln_set_admin('00000000-0000-0000-0000-000000000002', true);
  raise exception 'TEST FEHLGESCHLAGEN: Nutzer konnte sich zum Admin machen';
exception when raise_exception then
  if sqlerrm like 'TEST FEHLGESCHLAGEN%' then raise; end if;
end $$;
reset role;

select pg_temp.check((select column_default = 'true' from information_schema.columns
                      where table_name = 'kln_lockers' and column_name = 'https'), 'HTTPS ist Standard');
