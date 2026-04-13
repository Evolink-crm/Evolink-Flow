-- ============================================================
-- Confirmer manuellement les emails (contourne "Email not confirmed")
-- ============================================================

-- Confirmer TOUS les utilisateurs existants
-- (confirmed_at est une colonne générée, ne pas y toucher)
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- Ou ne confirmer qu'un email précis :
-- update auth.users
-- set email_confirmed_at = now()
-- where email = 'user@example.com';
