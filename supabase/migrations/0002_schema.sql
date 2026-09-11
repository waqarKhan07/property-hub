-- RentHub — 0002: schema
-- Core enums
create type public.user_role as enum ('user', 'owner', 'admin');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected', 'suspended');
create type public.listing_type as enum ('rent', 'sale');
create type public.property_type as enum ('house', 'apartment', 'portion', 'room', 'plot', 'shop', 'office', 'warehouse');
create type public.property_status as enum ('draft', 'pending', 'active', 'paused', 'sold', 'rented', 'expired', 'rejected', 'suspended');
create type public.price_unit as enum ('monthly', 'yearly', 'total');
create type public.area_unit as enum ('marla', 'kanal', 'sqft', 'sqm');
create type public.visit_status as enum ('pending', 'confirmed', 'reschedule_requested', 'completed', 'cancelled', 'declined');

-- Profiles (role-aware). Email is copied from auth for server-side use only.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  verification_status public.verification_status not null default 'unverified',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Properties
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  listing_type public.listing_type not null,
  property_type public.property_type not null,
  title text not null check (char_length(title) between 3 and 200),
  description text not null default '',
  price numeric(14,2) not null check (price >= 0),
  price_unit public.price_unit not null default 'monthly',
  city text not null,
  area text not null,
  address text,
  latitude double precision,
  longitude double precision,
  bedrooms integer check (bedrooms between 0 and 50),
  bathrooms integer check (bathrooms between 0 and 50),
  area_size numeric(12,2),
  area_unit public.area_unit,
  furnished boolean,
  amenities text[] not null default '{}',
  images text[] not null default '{}',
  video_url text,
  status public.property_status not null default 'draft',
  verification_status public.verification_status not null default 'unverified',
  views_count integer not null default 0 check (views_count >= 0),
  favorites_count integer not null default 0 check (favorites_count >= 0),
  contact_name text,
  contact_phone text,
  slug text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_status_listing_idx on public.properties (status, listing_type);
create index properties_city_idx on public.properties (city, area);
create index properties_listing_type_idx on public.properties (status, listing_type, property_type);
create index properties_price_idx on public.properties (status, listing_type, price);
create index properties_created_at_idx on public.properties (status, created_at desc);
create index properties_owner_idx on public.properties (owner_id, status);
create index properties_title_trgm_idx on public.properties using gin (title gin_trgm_ops);
create index properties_city_trgm_idx on public.properties using gin (city gin_trgm_ops);
create index properties_area_trgm_idx on public.properties using gin (area gin_trgm_ops);

-- Favorites
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create index favorites_user_idx on public.favorites (user_id, created_at desc);

-- Conversations (chat is tied to a property; owner is user_one, inquirer is user_two)
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  user_one_id uuid not null references public.profiles (id) on delete cascade,
  user_two_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_distinct_users check (user_one_id <> user_two_id),
  constraint conversations_unique_pair unique (property_id, user_one_id, user_two_id)
);

create index conversations_user_one_idx on public.conversations (user_one_id, last_message_at desc);
create index conversations_user_two_idx on public.conversations (user_two_id, last_message_at desc);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_unread_idx on public.messages (conversation_id) where read_at is null;

-- Visit requests
create table public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  visit_date date not null,
  visit_time time not null,
  guests integer not null default 1 check (guests between 1 and 20),
  message text,
  status public.visit_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index visit_requests_property_idx on public.visit_requests (property_id, status);
create index visit_requests_requester_idx on public.visit_requests (requester_id, status);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- Reports (anti-fraud)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('property', 'user')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

-- Verification requests
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('owner', 'property')),
  property_id uuid references public.properties (id) on delete set null,
  documents jsonb not null default '{}',
  status public.verification_status not null default 'pending',
  admin_note text,
  reviewed_by uuid references public.profiles (id),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index verification_requests_status_idx on public.verification_requests (status, submitted_at desc);

-- Admin audit trail
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index admin_actions_admin_idx on public.admin_actions (admin_id, created_at desc);

-- Future: subscriptions, payments, transactions, reviews, property_services.
-- These are intentionally NOT created yet; the schema leaves room via profiles.role,
-- properties.price/price_unit, admin_actions.details and jsonb fields.