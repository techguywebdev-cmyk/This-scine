-- Cine Arcs ratings + discussion (run once)
create table if not exists public.arc_ratings (
  arc_id text not null,
  user_id text not null,
  rating int not null check (rating between 1 and 5),
  primary key (arc_id, user_id)
);
create table if not exists public.arc_comments (
  id uuid default gen_random_uuid() primary key,
  arc_id text not null,
  user_id text not null,
  username text,
  avatar_url text,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists arc_comments_arc_id on public.arc_comments (arc_id, created_at desc);
alter table public.arc_ratings enable row level security;
alter table public.arc_comments enable row level security;
drop policy if exists "allow all via anon key" on public.arc_ratings;
create policy "allow all via anon key" on public.arc_ratings for all using (true) with check (true);
drop policy if exists "allow all via anon key" on public.arc_comments;
create policy "allow all via anon key" on public.arc_comments for all using (true) with check (true);
