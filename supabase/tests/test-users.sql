-- TEST ONLY: an admin login for the local mock stack (owner@example.ee / test-password-123).
insert into auth.users (email, encrypted_password)
values ('owner@example.ee', extensions.crypt('test-password-123', extensions.gen_salt('bf')))
on conflict (email) do nothing;
insert into public.admins (email) values ('owner@example.ee') on conflict do nothing;
-- A signed-in user who is NOT an admin.
insert into auth.users (email, encrypted_password)
values ('stranger@example.com', extensions.crypt('test-password-123', extensions.gen_salt('bf')))
on conflict (email) do nothing;
