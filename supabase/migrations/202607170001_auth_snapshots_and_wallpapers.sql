create table if not exists public.user_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.user_snapshots enable row level security;

create policy "Users can read their own snapshot"
on public.user_snapshots for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own snapshot"
on public.user_snapshots for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own snapshot"
on public.user_snapshots for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lock-wallpapers',
  'lock-wallpapers',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read their own lock wallpaper"
on storage.objects for select
to authenticated
using (
  bucket_id = 'lock-wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can upload their own lock wallpaper"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lock-wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can update their own lock wallpaper"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lock-wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'lock-wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete their own lock wallpaper"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lock-wallpapers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
