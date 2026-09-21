-- Spending Planner schema, stored in a single SQLite file on the Railway volume.
-- A NULL owner_id means the row belongs to the household (common part), otherwise to one member.

create table if not exists users (
  id text primary key,
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  created_at text not null
);

create table if not exists plans (
  id text primary key,
  name text not null,
  tax_timing text not null default 'monthly' check (tax_timing in ('monthly', 'yearly')),
  created_by text not null references users (id) on delete cascade,
  created_at text not null
);

create table if not exists plan_members (
  plan_id text not null references plans (id) on delete cascade,
  user_id text not null references users (id) on delete cascade,
  net_monthly real not null default 0,
  annual_tax real not null default 0,
  joined_at text not null,
  primary key (plan_id, user_id)
);

create table if not exists plan_groups (
  id text primary key,
  plan_id text not null references plans (id) on delete cascade,
  kind text not null check (kind in ('expense', 'saving')),
  label text not null default '',
  color text not null default '1',
  owner_id text references users (id) on delete cascade,
  position integer not null default 0
);

create table if not exists plan_lines (
  id text primary key,
  plan_id text not null references plans (id) on delete cascade,
  kind text not null check (kind in ('expense', 'saving')),
  label text not null default '',
  amount real not null default 0,
  owner_id text references users (id) on delete cascade,
  group_id text references plan_groups (id) on delete set null,
  position integer not null default 0
);

create table if not exists expenses (
  id text primary key,
  plan_id text not null references plans (id) on delete cascade,
  line_id text references plan_lines (id) on delete set null,
  user_id text not null references users (id) on delete cascade,
  amount real not null check (amount > 0),
  spent_on text not null,
  note text not null default '',
  created_at text not null
);

create index if not exists plan_groups_plan_idx on plan_groups (plan_id);
create index if not exists plan_lines_plan_idx on plan_lines (plan_id);
create index if not exists expenses_plan_month_idx on expenses (plan_id, spent_on);
