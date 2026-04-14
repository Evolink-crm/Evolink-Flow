-- Remplacer la RPC par une version qui retourne SETOF users
-- (renvoie zéro ligne si pas de match, au lieu d'une ligne avec nulls)

drop function if exists public.authenticate_team_user(text, text);

create or replace function public.authenticate_team_user(
  p_username text,
  p_password text
) returns setof public.users
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

  if u.id is null then
    return;  -- aucune ligne retournée
  end if;

  if u.password_hash = extensions.crypt(p_password, u.password_hash) then
    return next u;
  end if;
  return;
end;
$$;

grant execute on function public.authenticate_team_user(text, text) to anon, authenticated;
