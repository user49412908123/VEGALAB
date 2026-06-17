But : commandes à copier/coller pour que l'app utilise Supabase en production (Vercel) — ajoute colonnes manquantes, policies (DEV), et options pour recréer tables si besoin.

PRÉ-REQUIS
- Vous avez accès au SQL Editor Supabase (Dashboard -> SQL Editor).
- Vous avez configuré NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel.
- Branche git avec vos changements prêts à push.

-----
1) (Option sûre) Ajouter les colonnes manquantes (idempotent)
-- Exécuter dans Supabase SQL Editor.

BEGIN;
-- Sessions: colonnes anglaises + françaises utilisées par le client
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS time TEXT,
  ADD COLUMN IF NOT EXISTS duration INTEGER,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS type_seance TEXT,
  ADD COLUMN IF NOT EXISTS internal_load INTEGER,
  ADD COLUMN IF NOT EXISTS charge_interne INTEGER,
  ADD COLUMN IF NOT EXISTS success_rate INTEGER,
  ADD COLUMN IF NOT EXISTS taux_reussite INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_muscular_form INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_finger_form INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_neural_form INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_general_form INTEGER,
  ADD COLUMN IF NOT EXISTS forme_musculaire INTEGER,
  ADD COLUMN IF NOT EXISTS forme_doigts INTEGER,
  ADD COLUMN IF NOT EXISTS forme_nerveuse INTEGER,
  ADD COLUMN IF NOT EXISTS forme_generale INTEGER,
  ADD COLUMN IF NOT EXISTS one_arm_hang_feeling TEXT,
  ADD COLUMN IF NOT EXISTS suspension_1bras TEXT,
  ADD COLUMN IF NOT EXISTS explosive_pull_feeling TEXT,
  ADD COLUMN IF NOT EXISTS traction_explosive TEXT;

-- Cycles: colonnes anglaises + françaises
ALTER TABLE public.cycles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS main_theme TEXT,
  ADD COLUMN IF NOT EXISTS couleur TEXT;

-- Daily telemetry: colonnes anglaises + françaises
ALTER TABLE public.daily_telemetry
  ADD COLUMN IF NOT EXISTS date DATE,
  ADD COLUMN IF NOT EXISTS sleep_quality INTEGER,
  ADD COLUMN IF NOT EXISTS bedtime TEXT,
  ADD COLUMN IF NOT EXISTS wake_time TEXT,
  ADD COLUMN IF NOT EXISTS naps_count INTEGER,
  ADD COLUMN IF NOT EXISTS naps_total_duration INTEGER,
  ADD COLUMN IF NOT EXISTS stress_personal INTEGER,
  ADD COLUMN IF NOT EXISTS personal_stress INTEGER,
  ADD COLUMN IF NOT EXISTS interactions_ecran INTEGER,
  ADD COLUMN IF NOT EXISTS interactions_ecrans INTEGER;

COMMIT;

-----
2) (Option DEV rapide) Activer RLS et ajouter policies permissives
-- Si vous voulez RLS activé (recommandé uniquement si vous savez ce que vous faites). Sinon ignorez cette étape.

-- Activer RLS (idempotent)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_telemetry ENABLE ROW LEVEL SECURITY;

-- Policies DEV (TRÈS permissives - seulement pour DEV)
CREATE POLICY IF NOT EXISTS anon_sessions_all ON public.sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS anon_cycles_all ON public.cycles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS anon_telemetry_all ON public.daily_telemetry FOR ALL USING (true) WITH CHECK (true);

-- Alternative plus limitée : seulement SELECT/INSERT
--CREATE POLICY IF NOT EXISTS anon_sessions_select ON public.sessions FOR SELECT USING (true);
--CREATE POLICY IF NOT EXISTS anon_sessions_insert ON public.sessions FOR INSERT WITH CHECK (true);

-----
3) (Option: recréer tables fraîches) DROP & CREATE
-- Si vous préférez repartir à zéro. ATTENTION : supprime toutes les données.

DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.cycles CASCADE;
DROP TABLE IF EXISTS public.daily_telemetry CASCADE;

-- Recréer cycles
CREATE TABLE public.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  name TEXT,
  nom TEXT,
  start_date DATE,
  date_debut DATE,
  end_date DATE,
  date_fin DATE,
  main_theme TEXT,
  theme_principal TEXT,
  objectif TEXT,
  couleur TEXT
);

-- Recréer sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
  name TEXT,
  nom TEXT,
  date DATE,
  time TEXT,
  heure TIME,
  duration INTEGER,
  duration_minutes INTEGER,
  duree_minutes INTEGER,
  location TEXT,
  lieu TEXT,
  objective TEXT,
  objectif TEXT,
  notes TEXT,
  type TEXT,
  type_seance TEXT,
  rpe INTEGER,
  internal_load INTEGER,
  charge_interne INTEGER,
  success_rate INTEGER,
  taux_reussite INTEGER,
  motivation INTEGER,
  predicted_muscular_form INTEGER,
  predicted_finger_form INTEGER,
  predicted_neural_form INTEGER,
  predicted_general_form INTEGER,
  forme_musculaire INTEGER,
  forme_doigts INTEGER,
  forme_nerveuse INTEGER,
  forme_generale INTEGER,
  one_arm_hang_feeling TEXT,
  suspension_1bras TEXT,
  explosive_pull_feeling TEXT,
  traction_explosive TEXT
);

-- Recréer daily_telemetry
CREATE TABLE public.daily_telemetry (
  date DATE PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  sleep_quality INTEGER,
  sommeil_qualite INTEGER,
  bedtime TEXT,
  sommeil_horaire_coucher TIME,
  wake_time TEXT,
  sommeil_horaire_reveil TIME,
  naps_count INTEGER DEFAULT 0,
  sieste_nombre INTEGER DEFAULT 0,
  naps_total_duration INTEGER DEFAULT 0,
  sieste_duree INTEGER DEFAULT 0,
  work_stress INTEGER,
  stress_travail INTEGER,
  work_volume INTEGER,
  volume_travail INTEGER,
  personal_stress INTEGER,
  stress_perso INTEGER,
  work_satisfaction INTEGER,
  satisfaction_travail INTEGER,
  motivation INTEGER,
  confidence INTEGER,
  confiance INTEGER,
  mood INTEGER,
  humeur INTEGER,
  meditation BOOLEAN DEFAULT FALSE,
  hydration INTEGER,
  hydratation INTEGER,
  breakfast_quality INTEGER,
  qualite_repas_matin INTEGER,
  lunch_quality INTEGER,
  qualite_repas_midi INTEGER,
  dinner_quality INTEGER,
  qualite_repas_soir INTEGER,
  morning_mobility BOOLEAN DEFAULT FALSE,
  mobilite_matinale BOOLEAN DEFAULT FALSE,
  soreness_index INTEGER,
  indice_courbature_generale INTEGER,
  screen_interactions INTEGER,
  interactions_ecran INTEGER,
  interactions_ecrans INTEGER
);

-----
4) Git / Vercel: push et redeploy
# depuis la racine du projet local
git add -A
git commit -m "supabase: add columns + policies + logging" || true
# pousser sur la branche principale (adapt: main ou master ou votre branche)
git push origin main

-- Vercel :
- Le push déclenchera un nouveau déploiement (si le repo est connecté).
- Si vous utilisez la CLI et souhaitez forcer : vercel --prod (nécessite vercel login/config)

-----
5) Tests rapides (commande curl de test INSERT via REST supabase)
# Remplacez <SUPABASE_URL> et <ANON_KEY> par vos valeurs (ou utilisez export)
# Exemple : insérer une séance de test
curl -s -X POST "<SUPABASE_URL>/rest/v1/sessions" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"nom":"Test séance","date":"2026-06-17","heure":"18:30","duree_minutes":60}'

# Vérifiez la réponse JSON (ou erreur). Si 201/200 OK, l'insert côté client doit aussi fonctionner.

-----
6) Dépannage si ça ne marche pas
- Ouvrir la console du navigateur (F12) et regarder erreurs console.error (vegalabData.js les imprime).
- Dans Supabase Dashboard > Logs, rechercher Realtime/REST logs et erreurs RLS.
- Si la requête retourne 401/403 -> problème de clé ou RLS.
- Si la requête retourne 400 -> payload mismatch (vérifier types/format DATE/TIME).

-----
Notes finales
- Le SQL ci‑dessus est idempotent (ADD COLUMN IF NOT EXISTS / CREATE POLICY IF NOT EXISTS) — sûr à coller plusieurs fois.
- Pour la prod, remplacez policies permissives par politiques basées sur l'utilisateur (JWT) ou passez par des fonctions serveurs utilisant la service_role key.

Si vous voulez, j'ajoute maintenant un fichier create_and_policies.sql dans le repo (avec ces commandes) pour que vous puissiez exécuter en un clic dans Supabase. Voulez-vous que je l'ajoute ?
