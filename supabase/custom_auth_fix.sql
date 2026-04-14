-- ============================================================
-- FIX : pgcrypto est dans le schéma "extensions" sur Supabase
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- Re-créer les RPC avec search_path qui inclut extensions
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
set search_path = public, extensions
as $$
declare
  new_user public.users;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'Seul un administrateur peut créer des membres';
  end if;

  if p_role not in ('uiux','developer') then
    raise exception 'Rôle invalide (uiux ou developer uniquement)';
  end if;

  insert into public.users (username, password_hash, name, email, role, is_auth_user)
  values (
    lower(p_username),
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    p_name,
    p_email,
    p_role,
    false
  )
  returning * into new_user;

  return new_user;
end;
$$;

create or replace function public.authenticate_team_user(
  p_username text,
  p_password text
) returns public.users
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.users;
begin
  select * into u from public.users
  where username = lower(p_username) and is_auth_user = false
  limit 1;

  if u.id is null then return null; end if;
  if u.password_hash = extensions.crypt(p_password, u.password_hash) then
    return u;
  end if;
  return null;
end;
$$;

create or replace function public.set_team_user_password(
  p_user_id uuid,
  p_password text
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'Seul un administrateur peut modifier le mot de passe';
  end if;
  update public.users
  set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10))
  where id = p_user_id and is_auth_user = false;
end;
$$;

grant execute on function public.authenticate_team_user(text, text) to anon, authenticated;
grant execute on function public.create_team_user(text, text, text, text, text) to authenticated;
grant execute on function public.set_team_user_password(uuid, text) to authenticated;
