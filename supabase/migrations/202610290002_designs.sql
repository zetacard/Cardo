
create table public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled design',
  design_type text not null default 'business_card'
    check (design_type in (
      'business_card',
      'invitation',
      'menu',
      'poster',
      'social_post'
    )),
  content jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.designs enable row level security;

create policy "Users can view their own designs"
on public.designs for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own designs"
on public.designs for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own designs"
on public.designs for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own designs"
on public.designs for delete
to authenticated
using ((select auth.uid()) = user_id);

create index designs_user_updated_idx
on public.designs (user_id, updated_at desc);
