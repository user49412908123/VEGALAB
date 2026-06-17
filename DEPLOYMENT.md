Déploiement sur Vercel

1) Créer un projet sur Vercel et connecter le dépôt GitHub (ou importer depuis le repo local).

2) Ajouter les variables d'environnement dans les Settings du projet Vercel:
   - NEXT_PUBLIC_SUPABASE_URL = https://<your-project>.supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = pk.<your_public_anon_key>

3) Construire et déployer: Vercel détectera Next.js et utilisera `npm run build`.

4) Pour travailler localement, copier `.env.example` en `.env.local` et remplir les valeurs. Puis lancer:
   npm install
   npm run dev

Notes:
- Le code détecte l'absence des variables Supabase et bascule sur les données de démonstration (console.warn). Assurez-vous d'ajouter les clés dans Vercel pour activer l'accès réel à Supabase.
- Les filtres (Aujourd'hui / 3 prochains jours / 7 prochains jours / Toutes) limitent les sessions côté requête Supabase afin d'éviter de charger toutes les séances inutilement.
