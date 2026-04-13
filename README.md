# Evolink Flow — ERP Project Management (React + Supabase)

SaaS de gestion de projets ERP avec **workflow de validation**, **Kanban temps réel**, modules, sous-tâches, commentaires et notifications.

## Stack
- **Frontend** : React 18 + Vite + Tailwind CSS + dnd-kit + Recharts
- **Backend** : Supabase (Postgres + Auth + Realtime + RLS)
- **Routing** : React Router v6
- **UI** : Lucide icons, react-hot-toast

## Hiérarchie
`Projet → Modules → Tâches → Sous-tâches → Commentaires`

## Rôles
- `admin` (Chef de projet) — accès total, valide les tâches
- `uiux` — crée tâches (en attente validation)
- `developer` — crée tâches (en attente validation)

---

## 🚀 Démarrage

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer Supabase
Le fichier `.env` est déjà rempli avec vos credentials :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

### 3. Initialiser la base de données
Dans le **SQL Editor** de Supabase, exécuter :
```
supabase/schema.sql
```
Cela crée toutes les tables, triggers (notifications auto, activity logs), policies RLS et active Realtime.

### 4. Créer votre premier compte admin
1. `npm run dev`
2. Ouvrir l'app → **S'inscrire** avec rôle "Admin"
3. Vous pouvez ensuite créer projets / modules / tâches.

### 5. (Optionnel) Données mock
Éditer `supabase/seed.sql` avec votre UUID admin et l'exécuter.

---

## 🏗️ Architecture

```
src/
  components/
    layout/      # Sidebar, Topbar, Layout
    tasks/       # KanbanBoard, TaskCard, TaskForm
    ui/          # Modal
  context/       # AuthContext, ThemeContext
  hooks/         # useProjects, useTasks
  pages/         # Dashboard, Projects, ProjectDetail, Tasks, TaskDetail, ValidationCenter, Notifications, Settings, Login
  services/      # supabase.js
  App.jsx, main.jsx, index.css
supabase/
  schema.sql, seed.sql
```

---

## ⚙️ Logique métier — Workflow de validation

### Création de tâche
- **Admin** → `is_validated = true`, `status = 'todo'`, `badge = 'admin'`
- **UI/UX & Dev** → `is_validated = false`, `status = 'pending_validation'`, `badge = 'team'`

### Validation Center (`/validation`)
L'admin peut :
- ✅ **Valider** : passe en `todo`, peut assigner directement
- ❌ **Refuser** : suppression
- 👥 **Assigner** : choix du membre via dropdown

### Notifications automatiques (triggers SQL)
- Tâche assignée → notif au membre
- Tâche validée → notif au créateur
- Tâche soumise → notif aux admins
- Nouveau commentaire → notif à l'assignée + créateur

---

## 🔐 Sécurité (RLS)

- **Admin** : accès total sur tout
- **Membres** :
  - Voient toutes les tâches
  - Créent uniquement des tâches `pending_validation`
  - Modifient leurs propres tâches **non validées**, ou celles qui leur sont **assignées**
  - Suppriment leurs propres tâches non validées

---

## 📊 Fonctionnalités

- ✅ Dashboard avec stats + graphiques (BarChart, PieChart)
- ✅ Projets / Modules CRUD
- ✅ Tâches : Kanban (drag & drop dnd-kit) + Vue Liste + Filtres
- ✅ Détail tâche : sous-tâches, commentaires temps réel
- ✅ Validation Center pour admin
- ✅ Notifications temps réel (Supabase Realtime)
- ✅ Auth Supabase (email/password)
- ✅ Dark mode
- ✅ UI moderne SaaS responsive
- ✅ Activity logs (table + triggers)

## 🎯 BONUS prévus
- Recherche globale (input présent dans Topbar — connecter à Supabase full-text)
- Upload fichiers via Supabase Storage (créer un bucket `task-files`)
- Export CSV/PDF (à brancher sur les listes)
- Multi-tenant (ajouter `organization_id` aux tables)

---

## 📜 Scripts
```bash
npm run dev      # serveur dev (port 5173)
npm run build    # build prod
npm run preview  # preview prod
```

---

© Evolink — Pilotez vos projets ERP en toute fluidité.
