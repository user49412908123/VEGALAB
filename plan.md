1. Remove every demo/local fallback from the Supabase data layer.
2. Align session/cycle/check-in payloads with the real Supabase columns, especially the `cycle_id` relation.
3. Update the pages to load/save only through Supabase and surface errors instead of simulating local storage.
4. Verify the app builds and that the main data flow is consistent end to end.
