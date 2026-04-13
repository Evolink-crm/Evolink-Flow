-- ============================================================
-- Chat — messagerie privée entre utilisateurs
-- ============================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_messages_pair on public.messages(sender_id, recipient_id);
create index if not exists idx_messages_recipient on public.messages(recipient_id);
create index if not exists idx_messages_created on public.messages(created_at desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.messages enable row level security;

-- Lecture : seulement expéditeur ou destinataire (ou admin)
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

-- Envoi : seulement comme soi-même
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
with check (sender_id = auth.uid());

-- Marquer comme lu : destinataire peut modifier read_at
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update
using (recipient_id = auth.uid() or public.is_admin())
with check (recipient_id = auth.uid() or public.is_admin());

-- SUPPRESSION : ADMIN UNIQUEMENT (les users ne peuvent pas supprimer)
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete
using (public.is_admin());

-- ============================================================
-- Notification automatique (badge dans topbar)
-- ============================================================
create or replace function public.notify_message() returns trigger as $$
declare sender_name text;
begin
  select name into sender_name from public.users where id = new.sender_id;
  insert into public.notifications(user_id, title, message, link)
  values (new.recipient_id, 'Message de ' || coalesce(sender_name, 'un membre'), left(new.content, 120), '/chat');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_messages_notify on public.messages;
create trigger trg_messages_notify after insert on public.messages
for each row execute function public.notify_message();

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table public.messages;
