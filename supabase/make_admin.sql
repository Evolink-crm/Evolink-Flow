-- ============================================================
-- Promouvoir admin@evolink.io en administrateur
-- À exécuter UNE FOIS dans le SQL Editor de Supabase
-- (le compte doit déjà exister dans auth.users)
-- ============================================================

-- 1) S'assurer que la ligne existe dans public.users (au cas où le profil
--    n'a pas encore été créé via l'app)
insert into public.users (id, email, name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), 'admin'
from auth.users u
where u.email = 'admin@evolink.io'
on conflict (id) do update set role = 'admin';

-- 2) Forcer le rôle admin (si la ligne existait déjà avec un autre rôle)
update public.users set role = 'admin' where email = 'admin@evolink.io';

-- ============================================================
-- BONUS : trigger pour auto-promouvoir cet email en admin
-- même s'il s'inscrit plus tard ou est recréé
-- ============================================================
create or replace function public.auto_promote_admin() returns trigger as $$
begin
  if new.email = 'admin@evolink.io' then
    new.role := 'admin';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_auto_promote_admin on public.users;
create trigger trg_auto_promote_admin
  before insert or update on public.users
  for each row execute function public.auto_promote_admin();
