Supabase RLS et policies recommandées (développement rapide)

Si vous voulez que l'app cliente (clé anon) puisse lire/écrire pendant le développement, ajoutez des policies permissives pour les tables : sessions, cycles, daily_telemetry.

-- Activer RLS (si non activé) -----------------------------------------------
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_telemetry ENABLE ROW LEVEL SECURITY;

-- Policy très permissive (DEV only) ----------------------------------------
CREATE POLICY anon_sessions_all ON public.sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY anon_cycles_all ON public.cycles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY anon_telemetry_all ON public.daily_telemetry FOR ALL USING (true) WITH CHECK (true);

-- Production : limiter aux METHODES nécessaires --------------------------------
-- Allow anonymous SELECT on sessions (public read)
CREATE POLICY anon_sessions_select ON public.sessions FOR SELECT USING (true);
-- Allow anonymous INSERT for sessions (when client sends data)
CREATE POLICY anon_sessions_insert ON public.sessions FOR INSERT WITH CHECK (true);
-- Allow anonymous UPDATE/DELETE only if authorized (example: by owner column) - adjust as needed.

Notes:
- These policies are intentionally permissive for rapid setup. For production, replace with checks that restrict by user or server-side auth.
- Alternatively, create server-side endpoints (Edge Functions) using service_role key to perform writes securely.

Troubleshooting logs:
- Après avoir appliqué ces policies, redéployez l'app ou rechargez la page et regardez les logs de la console navigateur : des erreurs supabase seront imprimées via console.error (vegalabData.js). Copiez-les si ça échoue.
- Vérifiez le dashboard Supabase > Logs pour voir les requêtes et erreurs RLS/auth.
