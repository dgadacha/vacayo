# vacayo-ai-proxy

Petit Cloudflare Worker qui relaie les appels à l'API Claude pour l'app Vacayo.

GitHub Pages ne sert que des fichiers statiques et ne peut pas garder de secret :
ce Worker détient la clé API Anthropic et ne répond qu'aux utilisateurs connectés
du projet Firebase `vacayo-77ad3`.

## Ce qu'il fait

- Accepte uniquement `POST /v1/messages` (le chemin qu'appelle le SDK Anthropic
  quand on lui donne l'URL du Worker comme `baseURL`). Tout le reste répond 404.
- CORS : seules les origines listées dans `ALLOWED_ORIGINS` (`wrangler.toml`) sont
  acceptées, les autres reçoivent un 403. Le préflight `OPTIONS` répond 204.
- Vérifie le jeton d'identité Firebase envoyé en `Authorization: Bearer <token>`
  (signature Google, émetteur et audience du projet). Jeton absent ou invalide → 401.
- N'autorise que le modèle `claude-haiku-5-5` et plafonne `max_tokens` à 16 000.
- Transmet la requête à `https://api.anthropic.com/v1/messages` avec la clé du
  Worker. Seuls `content-type`, `x-api-key` et `anthropic-version` partent vers
  Anthropic ; le jeton Firebase n'est jamais transmis.
- Renvoie la réponse telle quelle, en flux : les réponses `stream: true` (SSE)
  arrivent au navigateur au fil de l'eau, sans être mises en mémoire tampon.

Les erreurs du Worker ont le même format que celles de l'API Anthropic
(`{ "type": "error", "error": { "type": "...", "message": "..." } }`), donc le
SDK les remonte comme n'importe quelle erreur d'API.

## Déployer

Depuis ce dossier, avec un compte Cloudflare :

```bash
npm install
npx wrangler secret put ANTHROPIC_API_KEY   # colle la clé Anthropic quand on te la demande
npx wrangler deploy
```

`wrangler deploy` affiche l'URL du Worker, de la forme
`https://vacayo-ai-proxy.<sous-domaine>.workers.dev`.

La clé ne doit jamais apparaître dans `wrangler.toml` ni dans le dépôt. Pour tester
en local : mettre `ANTHROPIC_API_KEY=...` dans un fichier `.dev.vars` (ignoré par
le `.gitignore` de ce dossier), puis `npm run dev`.

Pour ajouter une origine (autre domaine, autre port Vite), modifier
`ALLOWED_ORIGINS` dans `wrangler.toml` puis redéployer.

## Brancher l'app

1. Dans GitHub, **Settings → Secrets and variables → Actions → Variables**, créer la
   variable de dépôt `VITE_AI_PROXY_URL` avec l'URL du Worker, par exemple
   `https://vacayo-ai-proxy.<sous-domaine>.workers.dev`.
2. C'est tout : `.github/workflows/deploy.yml` passe déjà cette variable au build
   (`VITE_AI_PROXY_URL: ${{ vars.VITE_AI_PROXY_URL }}`). Relancer le workflow pour
   la prendre en compte.
3. En local, mettre la même valeur dans `.env.local` :
   `VITE_AI_PROXY_URL=https://vacayo-ai-proxy.<sous-domaine>.workers.dev`.

Sans `VITE_AI_PROXY_URL`, l'app n'utilise pas de proxy : chaque utilisateur doit
alors coller sa propre clé API Anthropic pour accéder aux fonctions IA.
