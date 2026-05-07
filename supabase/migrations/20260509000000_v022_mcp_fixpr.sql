-- v0.2.2: MCP server support + Fix-to-GitHub-Issue tracking
-- Adds: last_sent_at on report_schedules, fix_pr_requests table

-- Add last_sent_at to report_schedules if missing (created in v0.3.0 migration)
alter table if exists report_schedules
  add column if not exists last_sent_at timestamptz;

-- Track GitHub issue creation for governance fixes
create table if not exists fix_issue_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  scan_id       uuid,
  repo_owner    text not null,
  repo_name     text not null,
  issue_number  integer,
  issue_url     text,
  status        text not null default 'pending' check (status in ('pending','created','failed')),
  error         text,
  created_at    timestamptz not null default now()
);

alter table fix_issue_requests enable row level security;

create policy "users manage own fix issue requests"
  on fix_issue_requests
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists fix_issue_requests_user_id_idx
  on fix_issue_requests (user_id, created_at desc);

create index if not exists fix_issue_requests_scan_id_idx
  on fix_issue_requests (scan_id);
