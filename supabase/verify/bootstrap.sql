-- A stand-in for the pieces of a Supabase project the migrations lean on, so
-- they can be applied to a throwaway plain Postgres (supabase/verify/README.md).
-- Never run against the real project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant anon, authenticated, service_role to postgres;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete, maintain on tables to anon, authenticated;
alter default privileges in schema public grant usage, select, update on sequences to anon, authenticated;

create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, is_anonymous boolean not null default false);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;

create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;

create schema supabase_migrations;
create table supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations (version, name) values ('20261018020203', '0021_loops');
