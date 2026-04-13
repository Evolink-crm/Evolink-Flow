-- Données mock — à exécuter APRÈS avoir créé au moins un compte admin via l'app
-- Remplacez l'UUID admin par celui de votre user admin (table public.users).

-- Exemple :
-- insert into public.projects (name, description, created_by) values
--   ('ERP Logistique', 'Refonte module stock', '<ADMIN-UUID>'),
--   ('Portail Client', 'Espace client v2', '<ADMIN-UUID>');

-- insert into public.modules (project_id, name, description) values
--   ((select id from public.projects where name='ERP Logistique'), 'Stock', 'Gestion entrepôt'),
--   ((select id from public.projects where name='ERP Logistique'), 'Achats', 'Bons de commande');
