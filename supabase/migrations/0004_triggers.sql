-- RentHub — 0004: triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

create trigger visit_requests_updated_at before update on public.visit_requests
  for each row execute function public.set_updated_at();

create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- Create profile on signup + keep email in sync.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-expire draft properties older than 2 days to keep the DB tidy.
create or replace function public.expire_stale_drafts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.properties
    set status = 'expired', updated_at = now()
    where status = 'draft' and created_at < now() - interval '2 days';
  return new;
end;
$$;

-- Maintain favorite counters on properties.
create or replace function public.sync_favorite_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.properties set favorites_count = favorites_count + 1 where id = new.property_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.properties set favorites_count = greatest(favorites_count - 1, 0) where id = old.property_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger favorites_sync_count
  after insert or delete on public.favorites
  for each row execute function public.sync_favorite_count();

-- Notification helper used by other triggers.
create or replace function public.notify_user(target uuid, notif_type text, title text, body text, payload jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, type, title, body, data)
  values (target, notif_type, title, body, payload);
$$;

create or replace function public.notify_admins(notif_type text, title text, body text, payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  select id, notif_type, title, body, payload from public.profiles where role = 'admin';
end;
$$;

-- Chat: update conversation last_message_at + notify recipient.
create or replace function public.on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;

  select case when c.user_one_id = new.sender_id then c.user_two_id else c.user_one_id end
    into recipient
    from public.conversations c where c.id = new.conversation_id;

  if recipient is not null and recipient <> new.sender_id then
    perform public.notify_user(recipient, 'new_message', 'New message', 'You have a new message about a property.', jsonb_build_object('conversation_id', new.conversation_id));
  end if;
  return new;
end;
$$;

create trigger messages_on_insert
  after insert on public.messages
  for each row execute function public.on_message();

-- Visit requests: notify property owner on new request.
create or replace function public.on_visit_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prop public.properties%rowtype;
begin
  select * into prop from public.properties where id = new.property_id;
  if found then
    perform public.notify_user(
      prop.owner_id,
      'visit_request',
      'New visit request',
      new.visit_date || ' at ' || new.visit_time || ' for "' || prop.title || '".',
      jsonb_build_object('visit_id', new.id, 'property_id', prop.id)
    );
  end if;
  return new;
end;
$$;

create trigger visit_requests_on_insert
  after insert on public.visit_requests
  for each row execute function public.on_visit_request();

-- Visit requests: notify the other party when status changes.
create or replace function public.on_visit_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prop public.properties%rowtype;
  recipient uuid;
  notif_type text;
  title text;
  body text;
begin
  if old.status = new.status then
    return new;
  end if;
  select * into prop from public.properties where id = new.property_id;
  if auth.uid() = new.requester_id then
    recipient := prop.owner_id;
    notif_type := 'visit_cancelled';
    title := 'Visit request cancelled';
    body := 'A requested visit for "' || prop.title || '" (' || new.visit_date || ') was cancelled.';
  else
    recipient := new.requester_id;
    case new.status
      when 'confirmed' then
        notif_type := 'visit_accepted'; title := 'Visit confirmed';
        body := 'Your visit for "' || prop.title || '" on ' || new.visit_date || ' at ' || new.visit_time || ' is confirmed.';
      when 'declined' then
        notif_type := 'visit_rejected'; title := 'Visit declined';
        body := 'The owner declined your visit request for "' || prop.title || '".';
      when 'reschedule_requested' then
        notif_type := 'visit_rescheduled'; title := 'Visit reschedule requested';
        body := 'The owner requested a different time for your visit to "' || prop.title || '". Please check and confirm.';
      when 'completed' then
        notif_type := 'visit_completed'; title := 'Visit completed';
        body := 'Your visit for "' || prop.title || '" was completed.';
      else
        notif_type := 'visit_status'; title := 'Visit update';
        body := new.status;
    end case;
  end if;
  if recipient is not null then
    perform public.notify_user(recipient, notif_type, title, body, jsonb_build_object('visit_id', new.id, 'property_id', new.property_id));
  end if;
  return new;
end;
$$;

create trigger visit_requests_on_update
  after update on public.visit_requests
  for each row execute function public.on_visit_request_update();

-- Reports: notify admins.
create or replace function public.on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_admins('new_report', 'New report', 'A ' || new.target_type || ' was reported: ' || new.reason || '.', jsonb_build_object('report_id', new.id, 'target_type', new.target_type, 'target_id', new.target_id));
  return new;
end;
$$;

create trigger reports_on_insert
  after insert on public.reports
  for each row execute function public.on_report();