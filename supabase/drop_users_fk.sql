-- ============================================================
-- Supprimer la FK users.id -> auth.users.id
-- (nécessaire pour permettre des users "custom" sans compte auth)
-- ============================================================

alter table public.users drop constraint if exists users_id_fkey;

-- Les users Supabase Auth auront toujours leur id = auth.users.id (géré côté app),
-- mais la contrainte n'est plus imposée au niveau DB.
