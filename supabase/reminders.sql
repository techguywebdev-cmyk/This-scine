-- Release reminders (run once in Supabase SQL editor)
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  movie_id integer not null,
  media_type text not null default 'movie',
  title text,
  poster text,
  release_date date not null,
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, movie_id, media_type)
);
create index if not exists reminders_user_idx on reminders (user_id);
create index if not exists reminders_due_idx on reminders (notified, release_date);

alter table reminders enable row level security;
drop policy if exists "allow all via anon key" on reminders;
create policy "allow all via anon key" on reminders for all using (true) with check (true);

-- In-app release notifications have no sender and carry movie info
alter table notifications alter column from_user_id drop not null;
alter table notifications add column if not exists data jsonb;
