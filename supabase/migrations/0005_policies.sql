-- RentHub — 0005: row level security + column-level privileges
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.visit_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.verification_requests enable row level security;
alter table public.admin_actions enable row level security;

-- Column-level security: users can never read another user's email,
-- and can never alter roles / verification statuses / counters directly.
revoke select (email) on public.profiles from anon, authenticated;
revoke update (email, role, verification_status, created_at, updated_at) on public.profiles from anon, authenticated;
revoke update (status, verification_status, views_count, favorites_count, owner_id, slug, expires_at, created_at, updated_at, id) on public.properties from anon, authenticated;

-- ============ profiles ============a
create policy profiles_select on public.profiles for select to anon, authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ============ properties ============
create policy properties_select_public on public.properties for select to anon, authenticated using (status = 'active' and verification_status <> 'suspended');
create policy properties_select_owner on public.properties for select to authenticated using (owner_id = auth.uid());
create policy properties_select_admin on public.properties for select to authenticated using (public.is_admin());
create policy properties_insert_owner on public.properties for insert to authenticated with check (owner_id = auth.uid());
create policy properties_update_owner on public.properties for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy properties_update_admin on public.properties for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy properties_delete_owner on public.properties for delete to authenticated using (owner_id = auth.uid());
create policy properties_delete_admin on public.properties for delete to authenticated using (public.is_admin());

-- ============ favorites ============
create policy favorites_select_own on public.favorites for select to authenticated using (user_id = auth.uid());
create policy favorites_insert_own on public.favorites for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.properties p where p.id = property_id and p.owner_id <> auth.uid() and p.status = 'active')
);
create policy favorites_delete_own on public.favorites for delete to authenticated using (user_id = auth.uid());

-- ============ conversations ============
create policy conversations_select_participant on public.conversations for select to authenticated using (user_one_id = auth.uid() or user_two_id = auth.uid());
create policy conversations_insert_participant on public.conversations for insert to authenticated with check (user_one_id = auth.uid() or user_two_id = auth.uid());
create policy conversations_delete_participant on public.conversations for delete to authenticated using (user_one_id = auth.uid() or user_two_id = auth.uid());

-- ============ messages ============
create policy messages_select_participant on public.messages for select to authenticated using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_one_id = auth.uid() or c.user_two_id = auth.uid()))
);
create policy messages_insert_participant on public.messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_one_id = auth.uid() or c.user_two_id = auth.uid()))
);
create policy messages_update_participant on public.messages for update to authenticated using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_one_id = auth.uid() or c.user_two_id = auth.uid()))
) with check (
  exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_one_id = auth.uid() or c.user_two_id = auth.uid()))
);

-- ============ visit requests ============
create policy visits_select_related on public.visit_requests for select to authenticated using (
  requester_id = auth.uid()
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  or public.is_admin()
);
create policy visits_insert_own on public.visit_requests for insert to authenticated with check (
  requester_id = auth.uid()
  and exists (select 1 from public.properties p where p.id = property_id and p.status = 'active' and p.owner_id <> auth.uid())
);
create policy visits_update_related on public.visit_requests for update to authenticated using (
  requester_id = auth.uid()
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  or public.is_admin()
) with check (
  requester_id = auth.uid()
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  or public.is_admin()
);

-- ============ notifications ============
create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete to authenticated using (user_id = auth.uid());

-- ============ reports ============
create policy reports_select_related on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy reports_insert_own on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_update_admin on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reports_delete_admin on public.reports for delete to authenticated using (public.is_admin());

-- ============ verification requests ============
create policy verification_select_related on public.verification_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy verification_insert_own on public.verification_requests for insert to authenticated with check (user_id = auth.uid());
create policy verification_update_admin on public.verification_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ admin actions ============
create policy admin_actions_select on public.admin_actions for select to authenticated using (public.is_admin());
create policy admin_actions_insert on public.admin_actions for insert to authenticated with check (public.is_admin());

-- ============ saved searches ============
