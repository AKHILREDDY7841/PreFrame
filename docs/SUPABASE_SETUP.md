# Supabase and Google OAuth integration gate

Prompts 02–03 require a real Supabase development project. This public GitHub Pages preview intentionally has no URL, publishable key, service-role key, or OAuth credentials.

1. Create a Supabase development project and apply `supabase/migrations/202609240001_core.sql` through the Supabase CLI or SQL editor.
2. Generate database types from that project into `src/supabase-types.ts`; do not hand-edit generated output.
3. In Supabase Auth, enable Google and enter the Google OAuth client ID and secret.
4. Add `http://localhost:4173/auth/callback` and `https://akhilreddy7841.github.io/PreFrame/auth/callback` as redirect URLs. Also register those exact URLs in Google Cloud Console.
5. Provide the project URL and **publishable/anon** key to the app through local environment configuration. Never commit a service-role key or Google client secret.
6. Run the SQL authorization suite against a local Supabase stack before enabling production writes.

The designated owner UUID is provisioned only by an operator using `provision_owner(uuid)`. An email, avatar, profile field, or frontend flag cannot confer Admin.
