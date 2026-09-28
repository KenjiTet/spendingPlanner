-- Spending Planner schema, stored in a single SQLite file on the Railway volume.
-- A plan holds one or two slots: a slot is a place in the plan, taken by at most one account.
-- A NULL owner_id means the row belongs to the household (common part), otherwise to one slot.

create table if not exists users (
  id text primary key,
  username text not null unique,
  display_name text not null,
  password text not null,
  net_monthly real not null default 0,
  created_at text not null
);

create table if not exists plans (
  id text primary key,
  name text not null,
  tax_timing text not null default 'monthly' check (tax_timing in ('monthly', 'yearly')),
  share_code text not null unique,
  is_template integer not null default 0 check (is_template in (0, 1)),
  created_by text not null references users (id) on delete cascade,
  created_at text not null
);

-- Free until an account takes it; once taken, the income is read from that account's profile,
-- while the tax is set per place in the budget
create table if not exists plan_slots (
  id text primary key,
  plan_id text not null references plans (id) on delete cascade,
  label text not null default '',
  user_id text references users (id) on delete set null,
  net_monthly real not null default 0,
  annual_tax real not null default 0,
  position integer not null default 0
);

create table if not exists plan_groups (
  id text primary key,
  plan_id text not null references plans (id) on delete cascade,
  kind text not null check (kind in ('expense', 'saving')),
  label text not null default '',
  color text not null default '1',
  owner_id text references plan_slots (id) on delete cascade,
  position integer not null default 0
);

create table if not exists plan_lines (
  id text primary key,
  plan_id text not null references plans (id) on delete cascade,
  kind text not null check (kind in ('expense', 'saving')),
  label text not null default '',
  amount real not null default 0,
  -- A debit that happens every month on its own, counted as spent from the first day
  auto_book integer not null default 0 check (auto_book in (0, 1)),
  owner_id text references plan_slots (id) on delete cascade,
  group_id text references plan_groups (id) on delete set null,
  position integer not null default 0
);

create table if not exists expenses (
  id text primary key,
  plan_id text not null references plans (id) on delete cascade,
  line_id text references plan_lines (id) on delete set null,
  slot_id text not null references plan_slots (id) on delete cascade,
  amount real not null check (amount > 0),
  spent_on text not null,
  note text not null default '',
  created_at text not null
);

-- An account holds at most one slot per plan; SQLite keeps NULLs distinct, so free slots are unaffected
create unique index if not exists plan_slots_member_idx on plan_slots (plan_id, user_id);
create index if not exists plan_slots_user_idx on plan_slots (user_id);
create index if not exists plan_groups_plan_idx on plan_groups (plan_id);
create index if not exists plan_lines_plan_idx on plan_lines (plan_id);
create index if not exists expenses_plan_month_idx on expenses (plan_id, spent_on);
create index if not exists expenses_slot_idx on expenses (slot_id);
