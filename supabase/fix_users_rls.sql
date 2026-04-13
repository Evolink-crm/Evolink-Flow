-- ============================================================
-- Fix : permettre à l'admin de créer / modifier / supprimer
-- les profils des autres utilisateurs
-- ============================================================

-- INSERT : soi-même OU admin
drop policy if exists users_insert_self on public.users;
drop policy if exists users_insert on public.users;
create policy users_insert on public.users for insert
with check (auth.uid() = id or public.is_admin());

-- UPDATE : soi-même OU admin (déjà ok mais on remet pour être sûr)
drop policy if exists users_update_self on public.users;
drop policy if exists users_update on public.users;
create policy users_update on public.users for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- DELETE : admin uniquement
drop policy if exists users_delete on public.users;
create policy users_delete on public.users for delete
using (public.is_admin());
