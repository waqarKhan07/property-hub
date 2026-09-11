-- RentHub — 0003: functions
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Promote a regular user to owner (self-service, no admin needed).
create or replace function public.promote_to_owner()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set role = 'owner' where id = auth.uid() and role = 'user';
end;
$$;

-- Admin: set a user's role. Only admins may call.
create or replace function public.admin_set_role(target_user uuid, new_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.profiles set role = new_role, updated_at = now() where id = target_user;
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'set_role', 'profile', target_user, jsonb_build_object('role', new_role));
end;
$$;

-- Admin: set a user's verification status.
create or replace function public.admin_set_verification(target_user uuid, new_status public.verification_status, note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.profiles set verification_status = new_status, updated_at = now() where id = target_user;
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'set_verification', 'profile', target_user, jsonb_build_object('status', new_status, 'note', note));
  insert into public.notifications (user_id, type, title, body, data)
  values (
    target_user,
    'account_verification',
    'Account verification updated',
    case new_status
      when 'verified' then 'Your account is now verified on RentHub.'
      when 'rejected' then 'Your verification was not approved. Please review and resubmit.'
      when 'suspended' then 'Your account has been suspended.'
      else 'Your verification status has been updated.'
    end,
    jsonb_build_object('status', new_status)
  );
end;
$$;

-- Admin: set any property status (approve/reject/suspend/pause).
create or replace function public.admin_set_property_status(property uuid, new_status public.property_status, note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prop public.properties%rowtype;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into prop from public.properties where id = property;
  if not found then
    raise exception 'property not found';
  end if;
  update public.properties set status = new_status, updated_at = now() where id = property;
  insert into public.admin_actions (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'set_property_status', 'property', property, jsonb_build_object('status', new_status, 'note', note));
  insert into public.notifications (user_id, type, title, body, data)
  values (
    prop.owner_id,
    case new_status
      when 'active' then 'listing_approved'
      when 'rejected' then 'listing_rejected'
      else 'listing_status'
    end,
    'Listing update',
    case new_status
      when 'active' then 'Your listing "' || prop.title || '" is now live.'
      when 'rejected' then 'Your listing "' || prop.title || '" was not approved' || coalesce('. ' || note, '.')
      when 'expired' then 'Your listing "' || prop.title || '" has expired.'
      else 'Your listing "' || prop.title || '" status changed to ' || new_status || '.'
    end,
    jsonb_build_object('property_id', property, 'status', new_status)
  );
end;
$$;

-- Owner: publish their own draft/paused/pending property.
create or replace function public.publish_property(property uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prop public.properties%rowtype;
begin
  select * into prop from public.properties where id = property and owner_id = auth.uid();
  if not found then
    raise exception 'property not found';
  end if;
  if prop.status not in ('draft', 'pending', 'paused') then
    raise exception 'invalid_status';
  end if;
  update public.properties
    set status = 'active',
        slug = lower(regexp_replace(regexp_replace(prop.title, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', ''))
               || '-' || left(property::text, 8),
        expires_at = now() + interval '90 days',
        updated_at = now()
    where id = property;
end;
$$;

-- Owner: change status of their own property to an allowed terminal-ish state.
create or replace function public.owner_set_property_status(property uuid, new_status public.property_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prop public.properties%rowtype;
begin
  select * into prop from public.properties where id = property and owner_id = auth.uid();
  if not found then
    raise exception 'property not found';
  end if;
  if new_status not in ('draft', 'paused', 'sold', 'rented', 'expired') then
    raise exception 'invalid_status';
  end if;
  if new_status = 'sold' and prop.listing_type = 'rent' then
    new_status := 'rented';
  end if;
  if new_status = 'rented' and prop.listing_type = 'sale' then
    new_status := 'sold';
  end if;
  update public.properties set status = new_status, updated_at = now() where id = property;
end;
$$;

-- Public: increment property view counter.
create or replace function public.increment_property_view(property uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.properties set views_count = views_count + 1 where id = property;
$$;

-- Start (or fetch existing) conversation between a property owner and a user.
create or replace function public.create_conversation(property_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  existing uuid;
begin
  select p.owner_id into owner_id from public.properties p where p.id = property_id and p.status = 'active';
  if not found then
    raise exception 'property not available';
  end if;
  if owner_id = auth.uid() then
    raise exception 'cannot_converse_with_self';
  end if;
  select c.id into existing
  from public.conversations c
  where c.property_id = property_id
    and c.user_one_id = owner_id
    and c.user_two_id = auth.uid();
  if found then
    return existing;
  end if;
  insert into public.conversations (property_id, user_one_id, user_two_id)
  values (property_id, owner_id, auth.uid())
  returning id into existing;
  return existing;
end;
$$;

-- Mark messages sent by the other side as read for the current user.
create or replace function public.mark_conversation_read(conversation uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages
    set read_at = now()
    where conversation_id = conversation
      and sender_id <> auth.uid()
      and read_at is null;
$$;

-- Expire stale listings (call via scheduled edge function / pg_cron later).
create or replace function public.expire_listings()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  update public.properties
    set status = 'expired', updated_at = now()
    where status = 'active' and expires_at is not null and expires_at < now()
    returning count(*) into n;
  return n;
end;
$$;