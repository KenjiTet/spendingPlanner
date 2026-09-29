-- Spending Planner schema, stored in a single SQLite file on the Railway volume.
-- A plan holds one or two slots: a slot is a place in the plan, taken by at most one account.
-- A NULL owner_id means the row belongs to the household (common part), otherwise to one slot.

create table if not exists users (
  id text primary key,
  username text not null unique,
  display_name text not null,
  password text not null,
  net_monthly real not null default 0,
  -- Budget sections this account works with, hidden from its budget editor when off
  show_savings integer not null default 1 check (show_savings in (0, 1)),
  show_taxes integer not null default 1 check (show_taxes in (0, 1)),
  -- The guided tour, shown once to accounts created since it exists: signup sets it to 0 explicitly
  tutorial_done integer not null default 1 check (tutorial_done in (0, 1)),
  created_at text not null
);

create table if not exists plans (
  id text primary key,
  name text not null,
  tax_timing text not null default 'monthly' check (tax_timing in ('monthly', 'yearly')),
  share_code text not null unique,
  is_template integer not null default 0 check (is_template in (0, 1)),
  created_by text not null references users (id) on delete cascade,
  -- Common expenses entered before this moment never enter a settlement, '' meaning since the start
  settlements_since text not null default '',
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
  -- The settlement that covered this common expense, NULL while it belongs to the open sequence
  settlement_id text references settlements (id) on delete set null,
  created_at text not null
);

-- A repayment between the two places of a plan, covering the common expenses attached to it.
-- Declared by the debtor (pending), then validated by the creditor; refused or cancelled, the row is deleted
create table if not exists settlements (
  id text primary key,
  plan_id text not null references plans (id) on delete cascade,
  debtor_id text not null references plan_slots (id) on delete cascade,
  creditor_id text not null references plan_slots (id) on delete cascade,
  amount real not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'validated')),
  declared_at text not null,
  validated_at text
);

-- Expense sub-groups a place always shows on its expense form, whatever its habits
create table if not exists slot_pinned_groups (
  slot_id text not null references plan_slots (id) on delete cascade,
  group_id text not null references plan_groups (id) on delete cascade,
  primary key (slot_id, group_id)
);

-- Expense sub-groups a place took off its expense form, even when its habits would show them
create table if not exists slot_hidden_groups (
  slot_id text not null references plan_slots (id) on delete cascade,
  group_id text not null references plan_groups (id) on delete cascade,
  primary key (slot_id, group_id)
);

-- One-tap expenses of a place: a fixed amount on one line, e.g. the bus ticket
create table if not exists expense_presets (
  id text primary key,
  plan_id text not null references plans (id) on delete cascade,
  slot_id text not null references plan_slots (id) on delete cascade,
  line_id text not null references plan_lines (id) on delete cascade,
  label text not null,
  amount real not null check (amount > 0),
  created_at text not null
);

-- An account holds at most one slot per plan; SQLite keeps NULLs distinct, so free slots are unaffected
create unique index if not exists plan_slots_member_idx on plan_slots (plan_id, user_id);
create index if not exists plan_slots_user_idx on plan_slots (user_id);
create index if not exists plan_groups_plan_idx on plan_groups (plan_id);
create index if not exists plan_lines_plan_idx on plan_lines (plan_id);
create index if not exists expenses_plan_month_idx on expenses (plan_id, spent_on);
create index if not exists expenses_slot_idx on expenses (slot_id);
create index if not exists expense_presets_slot_idx on expense_presets (slot_id);
create index if not exists settlements_plan_idx on settlements (plan_id);
