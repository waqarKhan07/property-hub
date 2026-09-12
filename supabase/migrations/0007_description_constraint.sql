-- Add a length cap on property descriptions to match client-side validation.
alter table public.properties
  add constraint properties_description_length check (char_length(description) between 0 and 10000);