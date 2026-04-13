-- ============================================================
-- Evolink Flow — Schéma PostgreSQL Supabase
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text unique not null,
  role text not null check (role in ('admin','uiux','developer')) default 'developer',
  created_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('pending_validation','todo','in_progress','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  assigned_to uuid references public.users(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  is_validated boolean not null default false,
  badge text not null default 'team' check (badge in ('admin','team')),
  start_date date,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  content text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text,
  link text,
  read boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_tasks_module on public.tasks(module_id);
create index if not exists idx_tasks_assigned on public.tasks(assigned_to);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_modules_project on public.modules(project_id);
create index if not exists idx_subtasks_task on public.subtasks(task_id);
create index if not exists idx_comments_task on public.comments(task_id);
create index if not exists idx_notifications_user on public.notifications(user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at auto sur tasks
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated before update on public.tasks
for each row execute function public.set_updated_at();

-- Notifications automatiques
create or replace function public.notify_task_event() returns trigger as $$
declare creator_name text;
begin
  -- assignation
  if (TG_OP = 'INSERT' and new.assigned_to is not null) or
     (TG_OP = 'UPDATE' and new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null) then
    insert into public.notifications(user_id, title, message, link)
    values (new.assigned_to, 'Nouvelle tâche assignée', new.title, '/tasks/' || new.id);
  end if;
  -- validation
  if TG_OP = 'UPDATE' and new.is_validated = true and old.is_validated = false then
    if new.created_by is not null then
      insert into public.notifications(user_id, title, message, link)
      values (new.created_by, 'Tâche validée', new.title, '/tasks/' || new.id);
    end if;
  end if;
  -- soumission à validation -> notifier admins
  if TG_OP = 'INSERT' and new.is_validated = false then
    insert into public.notifications(user_id, title, message, link)
    select u.id, 'Tâche en attente de validation', new.title, '/validation'
    from public.users u where u.role = 'admin';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_tasks_notify on public.tasks;
create trigger trg_tasks_notify after insert or update on public.tasks
for each row execute function public.notify_task_event();

create or replace function public.notify_comment() returns trigger as $$
declare t record;
begin
  select * into t from public.tasks where id = new.task_id;
  if t.assigned_to is not null and t.assigned_to <> new.created_by then
    insert into public.notifications(user_id, title, message, link)
    values (t.assigned_to, 'Nouveau commentaire', left(new.content, 100), '/tasks/' || t.id);
  end if;
  if t.created_by is not null and t.created_by <> new.created_by and t.created_by <> coalesce(t.assigned_to, '00000000-0000-0000-0000-000000000000'::uuid) then
    insert into public.notifications(user_id, title, message, link)
    values (t.created_by, 'Nouveau commentaire', left(new.content, 100), '/tasks/' || t.id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_comments_notify on public.comments;
create trigger trg_comments_notify after insert on public.comments
for each row execute function public.notify_comment();

-- Activity logs
create or replace function public.log_activity() returns trigger as $$
declare actor uuid := auth.uid();
begin
  insert into public.activity_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    actor,
    TG_OP || ' ' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    coalesce((case when TG_OP='DELETE' then old.id else new.id end), null),
    case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists trg_log_tasks on public.tasks;
create trigger trg_log_tasks after insert or update or delete on public.tasks
for each row execute function public.log_activity();

drop trigger if exists trg_log_projects on public.projects;
create trigger trg_log_projects after insert or update or delete on public.projects
for each row execute function public.log_activity();

-- ============================================================
-- HELPER : is_admin()
-- ============================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer
as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.modules enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- USERS
drop policy if exists users_select on public.users;
create policy users_select on public.users for select using (true);
drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users for insert with check (auth.uid() = id);
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update using (auth.uid() = id or public.is_admin());

-- PROJECTS — admin full ; autres lecture
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select using (auth.role() = 'authenticated');
drop policy if exists projects_admin on public.projects;
create policy projects_admin on public.projects for all using (public.is_admin()) with check (public.is_admin());

-- MODULES — idem
drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules for select using (auth.role() = 'authenticated');
drop policy if exists modules_admin on public.modules;
create policy modules_admin on public.modules for all using (public.is_admin()) with check (public.is_admin());

-- TASKS
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select using (auth.role() = 'authenticated');

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert
with check (
  auth.uid() = created_by
  and (
    public.is_admin()
    or (is_validated = false and status = 'pending_validation' and badge = 'team')
  )
);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update
using (
  public.is_admin()
  or auth.uid() = assigned_to
  or (auth.uid() = created_by and is_validated = false)
)
with check (
  public.is_admin()
  or auth.uid() = assigned_to
  or (auth.uid() = created_by and is_validated = false)
);

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete
using (public.is_admin() or (auth.uid() = created_by and is_validated = false));

-- SUBTASKS
drop policy if exists subtasks_select on public.subtasks;
create policy subtasks_select on public.subtasks for select using (auth.role() = 'authenticated');
drop policy if exists subtasks_write on public.subtasks;
create policy subtasks_write on public.subtasks for all
using (
  public.is_admin() or exists(
    select 1 from public.tasks t where t.id = task_id
      and (t.assigned_to = auth.uid() or t.created_by = auth.uid())
  )
)
with check (
  public.is_admin() or exists(
    select 1 from public.tasks t where t.id = task_id
      and (t.assigned_to = auth.uid() or t.created_by = auth.uid())
  )
);

-- COMMENTS
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select using (auth.role() = 'authenticated');
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert with check (auth.uid() = created_by);
drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments for update using (auth.uid() = created_by or public.is_admin());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete using (auth.uid() = created_by or public.is_admin());

-- NOTIFICATIONS
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select using (user_id = auth.uid());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update using (user_id = auth.uid());
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert with check (true);
drop policy if exists notif_delete on public.notifications;
create policy notif_delete on public.notifications for delete using (user_id = auth.uid());

-- ACTIVITY LOGS
drop policy if exists logs_select on public.activity_logs;
create policy logs_select on public.activity_logs for select using (auth.role() = 'authenticated');
drop policy if exists logs_insert on public.activity_logs;
create policy logs_insert on public.activity_logs for insert with check (true);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.subtasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;
