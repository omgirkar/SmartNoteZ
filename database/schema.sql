-- SmartNoteZ Supabase setup
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_name text,
  file_type text,
  extracted_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid references public.notes(id) on delete set null,
  title text not null,
  questions jsonb not null,
  duration_minutes int not null default 10,
  question_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid references public.tests(id) on delete cascade,
  score int not null default 0,
  total int not null default 0,
  accuracy numeric not null default 0,
  time_taken_seconds int not null default 0,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;
alter table public.tests enable row level security;
alter table public.attempts enable row level security;

-- Notes policies
drop policy if exists "Users can read own notes" on public.notes;
create policy "Users can read own notes"
on public.notes for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own notes" on public.notes;
create policy "Users can create own notes"
on public.notes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes"
on public.notes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes"
on public.notes for delete
to authenticated
using (auth.uid() = user_id);

-- Tests policies
drop policy if exists "Users can read own tests" on public.tests;
create policy "Users can read own tests"
on public.tests for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own tests" on public.tests;
create policy "Users can create own tests"
on public.tests for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own tests" on public.tests;
create policy "Users can update own tests"
on public.tests for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tests" on public.tests;
create policy "Users can delete own tests"
on public.tests for delete
to authenticated
using (auth.uid() = user_id);

-- Attempts policies
drop policy if exists "Users can read own attempts" on public.attempts;
create policy "Users can read own attempts"
on public.attempts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own attempts" on public.attempts;
create policy "Users can create own attempts"
on public.attempts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own attempts" on public.attempts;
create policy "Users can delete own attempts"
on public.attempts for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists notes_user_id_created_at_idx on public.notes(user_id, created_at desc);
create index if not exists tests_user_id_created_at_idx on public.tests(user_id, created_at desc);
create index if not exists attempts_user_id_created_at_idx on public.attempts(user_id, created_at desc);
