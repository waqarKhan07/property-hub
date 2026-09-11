-- RentHub — 0006: storage buckets + policies
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "property_images_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'property-images');

create policy "property_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "property_images_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "property_images_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-images' and (storage.foldername(name))[1] = auth.uid()::text);