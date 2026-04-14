-- ============================================================
-- Authentification custom (username + password) pour les membres
-- Seul l'admin conserve Supabase Auth (email + password)
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Nouvelles colonnes sur public.users
alter table public.users add column if not exists username text unique;
alter table public.users add column if not exists password_hash text;
alter table public.users add column if not exists is_auth_user boolean default true;

-- Les users créés par Supabase Auth ont is_auth_user = true
-- Les users créés par l'admin (username/password) auront is_auth_user = false

-- Permettre id auto pour les custom users (ceux sans auth.users)
alter table public.users alter column id set default gen_random_uuid();

-- ============================================================
-- 2) RPC : créer un membre d'équipe (appelé par l'admin)
-- ============================================================
create or replace function public.create_team_user(
  p_username text,
  p_password text,
  p_name text,
  p_email text,
  p_role text
) returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  new_user public.users;
begin
  -- Vérifier que l'appelant est admin (via auth.uid())
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'Seul un administrateur peut créer des membres';
  end if;

  if p_role not in ('uiux','developer') then
    raise exception 'Rôle invalide pour un membre (uiux ou developer uniquement)';
  end if;

  insert into public.users (username, password_hash, name, email, role, is_auth_user)
  values (
    lower(p_username),
    crypt(p_password, gen_salt('bf', 10)),
    p_name,
    p_email,
    p_role,
    false
  )
  returning * into new_user;

  return new_user;
end;
$$;

-- ============================================================
-- 3) RPC : authentifier un membre par username/password
-- Retourne la ligne users si OK, null sinon
-- ============================================================
create or replace function public.authenticate_team_user(
  p_username text,
  p_password text
) returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  u public.users;
begin
  select * into u from public.users
  where username = lower(p_username) and is_auth_user = false
  limit 1;

  if u.id is null then return null; end if;
  if u.password_hash = crypt(p_password, u.password_hash) then
    return u;
  end if;
  return null;
end;
$$;

grant execute on function public.authenticate_team_user(text, text) to anon, authenticated;
grant execute on function public.create_team_user(text, text, text, text, text) to authenticated;

-- ============================================================
-- 4) RPC : changer le mot de passe d'un membre (admin uniquement)
-- ============================================================
create or replace function public.set_team_user_password(
  p_user_id uuid,
  p_password text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'Seul un administrateur peut modifier le mot de passe';
  end if;
  update public.users set password_hash = crypt(p_password, gen_salt('bf', 10))
  where id = p_user_id and is_auth_user = false;
end;
$$;

grant execute on function public.set_team_user_password(uuid, text) to authenticated;

-- ============================================================
-- 5) Relâcher les RLS pour permettre aux custom users (anon) d'accéder
-- ⚠️ Les custom users utilisent la clé anon, pas auth.uid().
-- L'autorisation est enforcée côté app + par les RPC security definer.
-- ============================================================

-- USERS : lecture publique (pour le login lookup + listing team)
drop policy if exists users_select on public.users;
create policy users_select on public.users for select using (true);

-- PROJECTS, MODULES : lecture ouverte
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select using (true);

drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules for select using (true);

-- TASKS : lecture ouverte
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select using (true);

-- Autoriser insert/update pour anon aussi (custom users)
-- La validation du created_by est faite côté app
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert with check (true);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update using (true) with check (true);

drop policy if exists subtasks_select on public.subtasks;
create policy subtasks_select on public.subtasks for select using (true);
drop policy if exists subtasks_write on public.subtasks;
create policy subtasks_write on public.subtasks for all using (true) with check (true);

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select using (true);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert with check (true);

drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select using (true);
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update using (true);

drop policy if exists docs_select on public.documents;
create policy docs_select on public.documents for select using (true);
drop policy if exists docs_insert on public.documents;
create policy docs_insert on public.documents for insert with check (true);

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (true);
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (true);
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update using (true) with check (true);
