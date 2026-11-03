# Vacayo

Planificateur de voyages à plusieurs : hôtels, restos, activités, planning jour par
jour, carte, et un assistant IA (Claude Haiku). Vue 3 + Vite + Vant + Tailwind,
données dans Firebase (Auth + Firestore), déployé sur GitHub Pages.

## Démarrer

```bash
npm install
npm run dev            # contre le Firebase de prod
```

### En local, sans toucher la prod (émulateurs Firebase)

Il faut Java (pour l'émulateur Firestore) et `firebase-tools`.

```bash
npm run emulators       # terminal 1 : Auth + Firestore locaux (UI sur :4000)
npm run seed:emulators  # une fois : compte démo + voyage « Japon 2026 »
npm run dev:emulators   # terminal 2 : l'app branchée sur les émulateurs
```

Compte démo : voir l'en-tête de `scripts/seed-emulators.js` (n'existe que dans l'émulateur).

## Sur iPhone

L'interface suit les codes d'iOS (typo système, grands titres, listes groupées,
balayages, feuilles et alertes natives) et s'installe comme une app : dans Safari,
**Partager → Sur l'écran d'accueil**. Elle s'ouvre alors en plein écran, avec son icône
(`public/apple-touch-icon.png`, manifeste dans `public/manifest.webmanifest`).

## Assistant IA (Claude Haiku)

Toutes les fonctions passent par `src/services/ai.js` (modèle `claude-haiku-5-5`,
SDK `@anthropic-ai/sdk` chargé à la demande) :

| Fonction | Où | Ce qu'elle fait |
|---|---|---|
| Copilote | ✨ en haut d'un voyage, « Conseils de l'IA » sur une fiche, « Optimiser la journée » au planning | Chat en streaming qui connaît tout le voyage |
| Ajout magique | bouton + → Ajout magique | Colle un mail de réservation / une liste → fiches pré-remplies à valider |
| Idées | bouton + → Idées, ou liste vide | Suggestions de lieux selon les villes étapes, ajoutées en wishlist |
| Planifier la wishlist | résumé du voyage, onglet Planning | Répartit les éléments sans date sur les jours (selon la ville où l'on dort), à valider |
| Compléter avec l'IA | formulaire d'ajout | Remplit ville, catégorie, prix estimé, priorité et conseils à partir du nom |

Rien n'est écrit sans validation de l'utilisateur, sauf la complétion du formulaire
(qui ne remplit que les champs vides, avant enregistrement).

Trois façons de fournir la clé Anthropic :

1. **Proxy (recommandé en prod)** : déployer `ai-proxy/` sur Vercel (voir son
   README) et définir la variable de dépôt GitHub `VITE_AI_PROXY_URL`. La clé reste
   sur le proxy, qui n'accepte que les utilisateurs Firebase connectés.
2. **Clé perso** : sans proxy, chaque utilisateur colle sa clé dans
   Compte → Assistant IA. Elle reste dans le `localStorage` de son appareil.
3. **Dev local** : dans `.env.local` (ignoré par git)
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   VITE_AI_PROXY_URL=/anthropic
   ```
   Le serveur Vite ajoute la clé côté serveur (`vite.config.js`), elle n'atteint jamais le navigateur.

## Structure

- `src/views/` : connexion, liste des voyages, détail d'un voyage
- `src/components/` : cartes, fiches (bottom sheets), onglets (`tabs/`), IA (`ai/`)
- `src/stores/` : Pinia (auth, voyages, éléments, thème, IA)
- `src/style.css` : jetons de design (`--vc-*`) partagés avec Vant (`--van-*`), clair et sombre
- `ai-proxy/` : Vercel Function qui garde la clé Anthropic
