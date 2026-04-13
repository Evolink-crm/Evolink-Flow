-- ============================================================
-- Système de documents — partage de fichiers entre utilisateurs
-- ============================================================

-- 1) BUCKET STORAGE (créer dans Dashboard > Storage si pas déjà fait)
-- Nom: "documents"
-- Public: NON (privé, accès via signed URLs)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 2) TABLE documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_path text not null,            -- chemin dans le bucket "documents"
  mime_type text,
  size_bytes bigint,
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid references public.users(id) on delete cascade, -- null = visible par tous
  task_id uuid references public.tasks(id) on delete set null,
  message text,
  created_at timestamptz default now()
);

create index if not exists idx_documents_recipient on public.documents(recipient_id);
create index if not exists idx_documents_sender on public.documents(sender_id);

-- 3) RLS
alter table public.documents enable row level security;

drop policy if exists docs_select on public.documents;
create policy docs_select on public.documents for select
using (
  sender_id = auth.uid()
  or recipient_id = auth.uid()
  or recipient_id is null               -- broadcast à toute l'équipe
  or public.is_admin()
);

drop policy if exists docs_insert on public.documents;
create policy docs_insert on public.documents for insert
with check (sender_id = auth.uid());

drop policy if exists docs_delete on public.documents;
create policy docs_delete on public.documents for delete
using (sender_id = auth.uid() or public.is_admin());

-- 4) Notification automatique lors de l'envoi
create or replace function public.notify_document() returns trigger as $$
begin
  if new.recipient_id is not null then
    insert into public.notifications(user_id, title, message, link)
    values (new.recipient_id, 'Nouveau document reçu', new.name, '/documents');
  else
    -- broadcast : notifier tout le monde sauf l'expéditeur
    insert into public.notifications(user_id, title, message, link)
    select id, 'Nouveau document partagé', new.name, '/documents'
    from public.users where id <> new.sender_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_documents_notify on public.documents;
create trigger trg_documents_notify after insert on public.documents
for each row execute function public.notify_document();

-- 5) RLS sur le bucket storage
-- (les policies sur storage.objects)

-- Lecture : sender, recipient, broadcast, admin
drop policy if exists "documents_read" on storage.objects;
create policy "documents_read" on storage.objects for select
using (
  bucket_id = 'documents' and (
    public.is_admin()
    or exists (
      select 1 from public.documents d
      where d.file_path = storage.objects.name
        and (d.sender_id = auth.uid() or d.recipient_id = auth.uid() or d.recipient_id is null)
    )
  )
);

-- Upload : utilisateur authentifié dans son dossier (uid/...)
drop policy if exists "documents_insert" on storage.objects;
create policy "documents_insert" on storage.objects for insert
with check (
  bucket_id = 'documents'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Suppression : seulement le propriétaire (dossier = uid) ou admin
drop policy if exists "documents_delete" on storage.objects;
create policy "documents_delete" on storage.objects for delete
using (
  bucket_id = 'documents' and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 6) Realtime
alter publication supabase_realtime add table public.documents;
