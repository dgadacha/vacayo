# vacayo-ai-proxy

Petite Vercel Function qui relaie les appels à l'API Claude pour l'app Vacayo.

GitHub Pages ne sert que des fichiers statiques et ne peut pas garder de secret :
ce proxy détient la clé API Anthropic et ne répond qu'aux utilisateurs connectés
du projet Firebase `vacayo-77ad3`.

## Ce qu'il fait

- Répond sur `POST /v1/messages` (le chemin qu'appelle le SDK Anthropic quand on lui
  donne l'URL du projet comme `baseURL`), réécrit vers `api/v1/messages.js` par
  `vercel.json`. Les autres méthodes répondent 405.
- CORS : seules les origines autorisées sont acceptées (403 sinon). Le préflight
  `OPTIONS` répond 204.
- Vérifie le jeton d'identité Firebase envoyé en `Authorization: Bearer <token>`
  (signature Google, émetteur et audience du projet). Jeton absent ou invalide → 401.
- N'autorise que le modèle `claude-haiku-5-5` et plafonne `max_tokens` à 16 000.
- Transmet la requête à `https://api.anthropic.com/v1/messages` avec la clé du
  proxy. Seuls `content-type`, `x-api-key` et `anthropic-version` partent vers
  Anthropic ; le jeton Firebase n'est jamais transmis.
- Renvoie la réponse en flux : les réponses `stream: true` (SSE) arrivent au
  navigateur au fil de l'eau, sans être mises en mémoire tampon.

Les erreurs du proxy ont le même format que celles de l'API Anthropic
(`{ "type": "error", "error": { "type": "...", "message": "..." } }`), donc le
SDK les remonte comme n'importe quelle erreur d'API.

La logique est dans `proxy.js` ; `api/v1/messages.js` n'est que le point d'entrée Vercel.

## Variables d'environnement (Vercel)

| Variable | Obligatoire | Valeur par défaut |
|---|---|---|
| `ANTHROPIC_API_KEY` | oui | — |
| `FIREBASE_PROJECT_ID` | non | `vacayo-77ad3` |
| `ALLOWED_ORIGINS` | non | `https://dgadacha.github.io` + `http://localhost:5173` à `5175` |

## Déployer

Depuis ce dossier, avec un compte Vercel (le plan gratuit suffit) :

```bash
npx vercel login
npx vercel link                                   # crée le projet « vacayo-ai-proxy »
npx vercel env add ANTHROPIC_API_KEY production   # colle la clé quand on te la demande
npx vercel deploy --prod
```

L'URL à utiliser est l'alias de production, de la forme
`https://vacayo-ai-proxy.vercel.app` (pas l'URL avec un identifiant de déploiement,
qui est protégée par Vercel).

La clé ne doit jamais apparaître dans le dépôt. Après toute modification d'une
variable d'environnement, redéployer (`npx vercel deploy --prod`).

## Brancher l'app

1. Dans GitHub, **Settings → Secrets and variables → Actions → Variables**, créer la
   variable de dépôt `VITE_AI_PROXY_URL` avec l'URL de production, par exemple
   `https://vacayo-ai-proxy.vercel.app`.
2. `.github/workflows/deploy.yml` passe déjà cette variable au build : elle sera
   prise en compte au prochain déploiement de `main`.
3. En local, mettre la même valeur dans `.env.local` à la racine de l'app.

Sans `VITE_AI_PROXY_URL`, l'app n'utilise pas de proxy : chaque utilisateur doit
alors coller sa propre clé API Anthropic pour accéder aux fonctions IA.
