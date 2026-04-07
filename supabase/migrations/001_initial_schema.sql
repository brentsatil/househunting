-- NestTogether - Australian Home Search Coordination App
-- Initial database schema

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  mode text check (mode in ('rent', 'buy')) default 'rent',
  created_at timestamptz default now()
);

-- Partnerships (two-user collaboration)
create table partnerships (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references profiles(id),
  user2_id uuid references profiles(id),
  invite_code text unique not null,
  mode text check (mode in ('rent', 'buy')) not null,
  status text check (status in ('pending', 'active')) default 'pending',
  created_at timestamptz default now()
);

-- Properties
create table properties (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnerships(id) on delete cascade,

  -- Source
  source text not null check (source in ('domain', 'rea', 'facebook', 'manual')),
  source_url text,
  external_id text,

  -- Location
  address text not null,
  suburb text not null,
  postcode text not null,
  state text not null check (state in ('NSW','VIC','QLD','WA','SA','TAS','ACT','NT')),
  lat double precision,
  lng double precision,

  -- Details
  property_type text,
  bedrooms smallint,
  bathrooms smallint,
  parking smallint,
  land_size_sqm integer,
  building_size_sqm integer,

  -- Pricing (rental) - stored in cents
  rent_weekly integer,
  bond integer,

  -- Pricing (buying) - stored in cents
  sale_price integer,
  price_guide text,
  auction_date timestamptz,
  strata_fees_quarterly integer,
  council_rates_annual integer,

  -- Content
  description text,
  images text[] default '{}',
  floor_plan_url text,
  virtual_tour_url text,

  -- Agent
  agent_name text,
  agent_agency text,
  agent_phone text,
  agent_email text,

  -- Lease/rental specifics
  lease_length text,
  available_date date,
  pet_policy text check (pet_policy in ('allowed','not_allowed','negotiable')),
  furnished boolean default false,

  -- Buying specifics
  cooling_off_days smallint,

  -- Status
  status text default 'interested' check (status in (
    'interested', 'inspection_booked', 'inspected', 'applied',
    'offer_made', 'passed', 'won', 'lost'
  )),

  -- AI-generated
  ai_summary text,

  listed_date date,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Per-user ratings & notes
create table property_interactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references profiles(id),
  rating smallint check (rating between 1 and 5),
  pros text,
  cons text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(property_id, user_id)
);

-- Comment thread per property
create table comments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- Inspections
create table inspections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  datetime timestamptz not null,
  attendees uuid[] default '{}',
  notes text,
  post_inspection_notes text,
  created_at timestamptz default now()
);

-- Enrichment data (JSON blob per property)
create table enrichment_data (
  id uuid primary key default gen_random_uuid(),
  property_id uuid unique not null references properties(id) on delete cascade,
  suburb_stats jsonb,
  council_zoning jsonb,
  comparables jsonb,
  fetched_at timestamptz default now()
);

-- Indexes
create index idx_properties_partnership on properties(partnership_id);
create index idx_properties_suburb on properties(suburb);
create index idx_properties_status on properties(status);
create index idx_property_interactions_property on property_interactions(property_id);
create index idx_comments_property on comments(property_id);
create index idx_inspections_property on inspections(property_id);
create index idx_partnerships_invite on partnerships(invite_code);
create index idx_partnerships_users on partnerships(user1_id, user2_id);

-- Row Level Security
alter table profiles enable row level security;
alter table partnerships enable row level security;
alter table properties enable row level security;
alter table property_interactions enable row level security;
alter table comments enable row level security;
alter table inspections enable row level security;
alter table enrichment_data enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users read own profile" on profiles
  for select using (id = auth.uid());

create policy "Users update own profile" on profiles
  for update using (id = auth.uid());

create policy "Users insert own profile" on profiles
  for insert with check (id = auth.uid());

-- Partnerships: either partner has full access
create policy "Partnership select" on partnerships
  for select using (user1_id = auth.uid() or user2_id = auth.uid());

create policy "Partnership insert" on partnerships
  for insert with check (user1_id = auth.uid());

create policy "Partnership update" on partnerships
  for update using (user1_id = auth.uid() or user2_id = auth.uid());

-- Allow reading partnerships by invite code (for joining)
create policy "Partnership join by code" on partnerships
  for select using (true);

-- Properties: accessible by partnership members
create policy "Property access" on properties
  for all using (
    partnership_id in (
      select id from partnerships where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

-- Interactions: accessible by partnership members
create policy "Interaction access" on property_interactions
  for all using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

-- Comments: accessible by partnership members
create policy "Comment access" on comments
  for all using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

-- Inspections: accessible by partnership members
create policy "Inspection access" on inspections
  for all using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

-- Enrichment: accessible by partnership members
create policy "Enrichment access" on enrichment_data
  for all using (
    property_id in (
      select p.id from properties p
      join partnerships pa on p.partnership_id = pa.id
      where pa.user1_id = auth.uid() or pa.user2_id = auth.uid()
    )
  );

-- Enable realtime for collaboration tables
alter publication supabase_realtime add table properties;
alter publication supabase_realtime add table property_interactions;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table inspections;

-- Auto-create profile on signup via trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'User'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
