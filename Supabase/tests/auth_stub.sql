-- Nur für Tests (CI / lokal mit einem leeren Postgres): bildet den Teil von Supabase nach, den setup.sql
-- voraussetzt (Rollen anon/authenticated, Schema auth mit users-Tabelle und auth.uid()).
-- NICHT in Supabase ausführen.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), raw_user_meta_data jsonb);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
grant usage on schema auth, public to anon, authenticated;
