# DevOps — Ayoub

Tu es **owner** de tout ce qui concerne le **run** du projet pour le développement d’équipe et surtout pour la **soutenance** :

- conteneurisation (Docker / Podman / équivalent)
- lancement en **une commande**
- **HTTPS** côté navigateur → app
- comment Compose **injecte** les env (sans committer de secrets)
- doc “comment on lance / on arrête / on regarde les logs”
- seed / données de démo si ça aide l’éval
- machine de démo (optionnel mais pratique)

**Les `.env` métier ne sont pas “à toi tout seul”** — voir section plus bas.

Il n’y a **pas** encore de `docker-compose.yml` ni de `Dockerfile` dans le repo : c’est volontaire, pour que ce soit clairement **ta** partie. Tu poses tout ça comme tu veux, tant que le sujet est respecté.

---

## Ce que le sujet exige (non négociable)

1. **Déploiement conteneurisé**  
   Docker, Podman, ou équivalent. Le correcteur doit pouvoir tout démarrer avec **une seule commande** (typiquement `docker compose up --build`).

2. **HTTPS**  
   Toute connexion vers le backend **depuis le navigateur** (ou un script externe) doit passer en HTTPS.  
   En revanche, **à l’intérieur** du réseau Docker (ex. `api` ↔ `db`), le HTTP non chiffré est autorisé.

3. **Chrome**  
   Dernière version stable, sans warnings / erreurs inutiles dans la console liés à votre stack (certificats, mixed content, etc.).

4. **Secrets**  
   Pas de `.env` réels commités. Les `.env.example` sont tenus à jour par **celui qui possède le service** (Malik/Swan) ; toi tu veilles à ce que le run Compose ne committe rien de sensible.

Tu n’as **pas** besoin d’héberger BetterIntra “sur internet pour tout le monde”.  
Le “deploy” du sujet = **comment on lance proprement le projet pour l’éval** (souvent en local ou sur une petite VM), pas un cloud usine (K8s, ELK, etc.).

### Minimum à rendre (obligatoire pour l’équipe / l’éval)

- Compose (ou équivalent) en **1 commande** : `db` + `api` (+ `web` quand Swan a un front)
- **HTTPS** navigateur → app
- Pas de secrets dans git + doc run claire
- Chrome clean (pas de mixed content / cert foireux si évitable)

### Bonus si tu veux aller plus loin (pas requis par notre CDC)

Le cahier des charges coupe volontairement la grosse observabilité (ELK / Prometheus / etc.).  
**Tu peux quand même** ajouter des trucs du genre Grafana, Prometheus, Loki, monitoring, alerting… si ça t’intéresse ou pour des points modules du sujet — **à ta charge**, sans bloquer le reste de l’équipe, et sans en faire une dépendance pour lancer le MVP.

Priorité = le minimum ci-dessus qui marche le jour J.

---

## Ce qui n’est PAS ta partie

| Domaine | Owner |
|---|---|
| Code API, OAuth 42, BDD métier, WebSockets | Malik (`apps/server`) |
| UI, choix de stack front, pages | Swan (`apps/web`) |
| Scoring des recommandations | Kylian |

Tu **coordonnes** avec eux (ports, URL publique, CORS, comment builder le front), mais tu ne développes pas leurs features.

---

## Architecture cible (ce que tu dois faire tourner)

Trois services prévus :

| Service | Rôle | Où dans le repo | Port typique |
|---|---|---|---|
| **db** | PostgreSQL 16 | (image officielle) | `5432` (interne ; exposé ou non selon ton choix) |
| **api** | Backend FastAPI | `apps/server` | `8000` en interne ; en HTTPS via ton reverse proxy en éval |
| **web** | Frontend | `apps/web` (Swan le remplit) | souvent `3000` en dev, `443` en éval derrière nginx/caddy |

Ordre de travail recommandé :

1. **Maintenant** : Compose `db` + `api` qui marche, healthchecks, injection des env Malik, README run.  
2. **Quand Swan a un front buildable** : service `web` + var d’URL API au build.  
3. **Pour l’éval** : HTTPS partout navigateur → entrée (souvent un reverse proxy devant `web` et/ou `api`).

---

## Comment l’équipe avance SANS ton Compose (aujourd’hui)

Malik / Swan peuvent déjà travailler ainsi. Tu n’as pas à bloquer sur ça, mais sache que ça existe.

### Postgres local (Homebrew, macOS)

```bash
brew install postgresql@16
brew services start postgresql@16

createuser -s betterintra 2>/dev/null || true
psql -d postgres -c "ALTER ROLE betterintra WITH LOGIN PASSWORD 'betterintra';"
createdb -O betterintra betterintra 2>/dev/null || true
```

URL attendue par l’API (voir `apps/server/.env.example`) :

```text
postgresql+psycopg://betterintra:betterintra@localhost:5432/betterintra
```

### API sans Docker

```bash
cd apps/server
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

| URL | Utilité |
|---|---|
| http://localhost:8000/docs | Swagger (liste des endpoints) |
| http://localhost:8000/health | API vivante |
| http://localhost:8000/health/db | API + Postgres OK |

Dès que ton Compose est prêt, l’équipe pourra l’utiliser à la place de Homebrew + `uvicorn` manuel.

---

## Variables d’environnement — qui gère quoi ?

| Qui | Gère |
|---|---|
| **Malik** | Quelles vars l’API lit (`DATABASE_URL`, `CORS_ORIGINS`, `FORTY_TWO_*`…) + `apps/server/.env.example` |
| **Swan** | Quelles vars le front lit (`VITE_API_URL`, etc.) + son `.env.example` front |
| **Toi (Ayoub)** | Comment le **Compose / HTTPS** les injecte au run (fichier `.env` à la racine, `env_file:`, secrets Docker, doc `cp .env.example .env` avant `up`) + **aucun secret dans git** |

En gros : Malik/Swan **définissent** les variables. Toi tu fais en sorte que, le jour de l’éval, elles soient **branchées correctement** dans les containers sans être commités.

Côté API aujourd’hui (`apps/server/.env.example`) :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion Postgres |
| `CORS_ORIGINS` | Origines front autorisées (virgules si plusieurs) |
| `FORTY_TWO_*` | OAuth 42 (plus tard) — jamais en clair dans git |

Côté front (Swan) : une var du genre `VITE_API_URL` vers l’URL **HTTPS** publique de l’API en éval (souvent figée au build).

---

## Livrables concrets attendus de toi

### 1. Conteneurs

- `Dockerfile` pour l’API (`apps/server`) — Python / UV / uvicorn  
- `Dockerfile` (ou multi-stage) pour le front quand Swan livre un build  
- `docker-compose.yml` (ou équivalent) qui orchestre `db` + `api` (+ `web`)

### 2. HTTPS

- Reverse proxy (nginx, Caddy, Traefik…)  
- Certificats (Let’s Encrypt en vrai host, ou certs locaux pour démo — l’important = HTTPS + Chrome clean)  
- Pas de mixed content (page HTTPS qui appelle une API en HTTP)

### 3. DX / éval

- Une commande documentée pour tout démarrer  
- Une commande pour tout arrêter  
- Comment voir les logs (`compose logs`, etc.)  
- Healthchecks Compose si possible (`/health`, Postgres `pg_isready`)

### 4. Doc

- Section dans le README racine **ou** un README dédié : “Run for evaluation”  
- Liste des ports / URLs finales (https://…)

### 5. Bonus (optionnel)

- Seed SQL / script de données de démo  
- Petite VM / VPS déjà up le jour J  
- Backup minimal de la DB de démo  
- Monitoring (Grafana, Prometheus, etc.) si tu veux — **pas** dans le minimum BetterIntra

---

## Coordination avec Swan et Malik

- **Swan** : dès qu’il a un `build` front, tu ajoutes le service `web`. Tu lui donnes l’URL HTTPS de l’API à mettre dans sa var d’env de build.  
- **Malik** : l’API doit juste démarrer avec les bonnes env (`DATABASE_URL`, `CORS_ORIGINS`). Si le container API crash, c’est souvent un souci d’env / ordre de boot → à toi de fiabiliser (`depends_on` + healthcheck DB).  
- **CORS** : l’origine exacte du front en HTTPS doit être dans `CORS_ORIGINS`, sinon le navigateur bloque.

---

## Checklist “prêt pour l’éval”

- [ ] `docker compose up --build` (ou équivalent) démarre tout sans étape manuelle obscure  
- [ ] Le site s’ouvre en **HTTPS** dans Chrome  
- [ ] `/health` et `/health/db` OK  
- [ ] Front charge et appelle l’API sans erreur CORS / mixed content  
- [ ] Aucun secret dans git ; examples Malik/Swan branchés correctement dans Compose  
- [ ] README : comment lancer, arrêter, où cliquer  
- [ ] (Optionnel) seed + machine déjà chaude le jour de la soutenance

---

## Liens utiles dans le repo

- Produit / scope : `docs/cahier-des-charges.md`  
- Front (comment appeler l’API en dev) : `apps/web/README.md`  
- API : `apps/server/` · Swagger une fois lancé : `/docs`

Questions d’archi run (ports, proxy, certs) : c’est **toi** le décideur. Malik et Swan s’adaptent au contrat que tu documentes.
