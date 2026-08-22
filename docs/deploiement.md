# Déploiement — comment lancer BetterIntra

Déploiement conteneurisé, en une commande, avec un seul point d'entrée HTTPS
(`https://localhost:8443`). Ce document couvre le mode **eval/soutenance** —
pas de notion de dev ici (hot-reload, ports de debug) : voir tout en bas si
tu dois quand même le réactiver localement.

## Prérequis

- Docker (avec le plugin `compose`) **ou** Podman (avec `podman-compose`) — le `Makefile` détecte automatiquement lequel est installé.
- `openssl` (déjà présent sur macOS/Linux) — sert à générer le certificat HTTPS local.

Rien d'autre : pas besoin d'installer Python, UV, Node/pnpm ou Postgres en local — tout est buildé dans les images.

## Variables d'environnement

```bash
cp .env.example .env      # une seule fois — jamais ce fichier dans git
```

`.env` (racine, jamais committé) est lu automatiquement par `docker compose` / `podman compose`.

Aucune de ces variables n'est passée en vrac au container (pas de `env_file:`).
Chacune est listée explicitement dans `environment:`.
Si une seule manque ou est vide, `docker compose up` refuse de démarrer -> `.env.example` seul (sans creds 42 remplis) ne peut **plus** lancer la stack tel quel — voir plus bas.

| Variable | Sert à |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Le container `db` (image Postgres officielle) — et réinjectées dans `DATABASE_URL` côté `backend`/`migrate` |
| `DOMAIN_NAME` | `host:port` utilisé pour composer `FRONTEND_URL` et `FORTY_TWO_REDIRECT_URI` (interpolation dans `compose.yml`, pas dans `.env` lui-même — les valeurs d'un `env_file` ne s'interpolent pas entre elles). Défaut dev : `localhost:8443` — changer ici pour héberger ailleurs (ex. un hostname du réseau 42) |
| `DATABASE_URL` | Valeur par défaut pour le dev **hors Docker** (Homebrew). Dans `compose.yml`, elle est reconstruite à partir des `POSTGRES_*` pour viser `db:5432` (nom du service, pas `localhost`) |
| `VITE_API_URL` | Build arg de `apps/web/Dockerfile`, figée dans le bundle Vite au build. Reste **relative** (`/api`) — jamais un domaine en dur : le proxy sert front + API sur la même origine, un chemin absolu (`https://<host>/api`) casse ce same-origin dès que `DOMAIN_NAME` change et déclenche du CORS. Changer sa valeur exige un rebuild de `web`, pas juste un restart |
| `JWT_SECRET` / `JWT_ALGORITHM` / `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` / `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Signature des tokens d'auth côté `backend` |
| `FORTY_TWO_CLIENT_ID` / `FORTY_TWO_CLIENT_SECRET` | Identifiants de ton app OAuth 42 (https://profile.intra.42.fr/oauth/applications) — à remplir toi-même, jamais en clair dans git |
| `FORTY_TWO_REDIRECT_URI` | Dérivée de `DOMAIN_NAME` dans `compose.yml` (`https://${DOMAIN_NAME}/api/auth/callback`) — doit être **exactement identique** à ce qui est déclaré côté 42, voir ci-dessous |
| `API_KEY_RATE_LIMIT_PER_MINUTE` | Rate limit des clés API publiques côté `backend` |
| `REDIS_URL` | Cache TTL des réponses Intra (service Compose `redis`). Défaut : `redis://redis:6379/0` |


### Déclarer ta clé 42 (redirect URI)

Sur https://profile.intra.42.fr/oauth/applications, la redirect URI déclarée sur ton app doit être **caractère pour caractère** celle que `compose.yml` construit à partir de `DOMAIN_NAME` :

```
https://<DOMAIN_NAME>/api/auth/callback
# ex. avec le défaut dev : https://localhost:8443/api/auth/callback
```

Le préfixe `/api/` compte : c'est celui que route `proxy` vers `backend` (voir « Ce qui tourne »). Une valeur différente (ex. sans `/api`, un autre `DOMAIN_NAME`, ou en direct backend) fait échouer l'échange OAuth avec une erreur de redirect URI côté 42, puisque l'API 42 compare l'URI reçue à celle déclarée au caractère près. Si tu changes `DOMAIN_NAME` (ex. pour héberger sur un hostname du réseau 42), il faut aussi mettre à jour la redirect URI déclarée sur `profile.intra.42.fr`.

Copier `.env.example` en `.env` ne suffit **pas** à lancer la stack tel quel : `FORTY_TWO_CLIENT_ID`/`FORTY_TWO_CLIENT_SECRET` y sont vides par design (secrets, jamais commités), et chaque variable requise fait crasher `docker compose up` si elle est absente ou vide (`${VAR:?manquant dans .env}`, voir tableau ci-dessus). Il faut au minimum remplir tes creds OAuth 42 avant `make up`.
Ton `.env` rempli ne doit **jamais** être committé ni partagé en clair (Slack, PR, issue…) — chacun le garde localement.

Reste ouvert : `JWT_SECRET` et `FORTY_TWO_CLIENT_SECRET` transitent en clair dans le fichier d'environnement du container. Les secrets Compose (`secrets:` + convention `_FILE`) seraient plus propres, mais demandent que `app/config.py` sache lire une valeur depuis un fichier — à arbitrer avec Malik, pas fait.

## Une commande

```bash
make up
```

`make up` fait deux choses :
1. génère un certificat HTTPS self-signed pour `localhost` s'il n'existe pas encore (`make certs`, voir plus bas) ;
2. build et lance cinq containers : `db` (Postgres), `migrate` (migrations Alembic, puis sort), `backend` (API FastAPI), `web` (front de Swan, build statique servi par nginx) et `proxy` (nginx, HTTPS).

`make up` tourne en foreground (`docker compose up --build`, pas de `-d`) : `Ctrl+C` envoie un SIGINT à Compose et **stoppe tous les containers**, ce n'est pas juste un détachement des logs. Pour les laisser tourner et juste te détacher, il faudrait lancer `docker compose up -d --build` directement (pas ce que fait `make up` actuellement).

## Ce qui tourne, et où

| Service | Rôle | URL / port |
|---|---|---|
| `proxy` (nginx) | HTTPS, point d'entrée navigateur | https://localhost:8443 |
| `web` (nginx) | Front de Swan, build statique | https://localhost:8443/ (via le proxy) — pas de port publié, joignable uniquement via `proxy` |
| `backend` (FastAPI) | API | https://localhost:8443/api/... (via le proxy) — aucun port publié directement sur l'hôte |
| `migrate` (one-shot) | Applique les migrations Alembic, puis sort | pas de port — voir « Migrations » |
| `db` (Postgres 16) | Base de données | interne au réseau Docker uniquement (pas de port publié) |
| `adminer` (provisoire) | Visualiseur de tables | http://localhost:8081, **uniquement** après `make db-ui` — prévu pour être retiré une fois le seeding testé |

`proxy` route par préfixe (`infra/nginx/nginx.conf`) : `/api/` vers `backend` (le slash final sur `proxy_pass` fait sauter le préfixe — le backend ne connaît que des routes à la racine, `/health`, `/auth/callback`...), tout le reste vers `web`.

Concrètement :

| URL | Utilité |
|---|---|
| https://localhost:8443/ | Le front (React/Vite), servi via le proxy |
| https://localhost:8443/api/health | API vivante (via HTTPS) |
| https://localhost:8443/api/health/db | API + Postgres OK (via HTTPS) |
| https://localhost:8443/api/docs | Swagger |

**Note** : `/nginx-health` (la sonde du proxy) n'est déclarée que sur le bloc `:80` de `infra/nginx/nginx.conf`, qui n'est plus publié sur l'hôte (voir « HTTPS en local »). Elle n'est donc **plus accessible depuis le navigateur** à `https://localhost:8443/nginx-health` — seul le healthcheck Docker/Podman la tape en interne (`http://127.0.0.1/nginx-health` vu depuis *l'intérieur* du container `proxy`). Pour vérifier manuellement : `docker compose exec proxy wget -qO- http://127.0.0.1/nginx-health`.

**Règle du sujet :** tout point d'entrée accessible depuis l'extérieur de la machine doit être sécurisé (HTTPS), WebSocket compris.

## Ordre de démarrage et healthchecks

Chaque service déclare une sonde, et `depends_on: condition: service_healthy` s'en sert pour **séquencer** le boot — c'est ce qui empêche l'API d'ouvrir son pool de connexions pendant que Postgres est encore en train de s'initialiser.

| Service | Sonde | Ce qu'elle prouve |
|---|---|---|
| `db` | `pg_isready -U … -d …` | Postgres accepte les connexions (pas juste « le process tourne ») |
| `migrate` | *(aucune)* — one-shot, c'est son **code de sortie** qui compte | Le schéma est à jour : `backend` attend son `service_completed_successfully` |
| `backend` | `urllib` sur `/health` | L'API répond en HTTP |
| `web` | `wget http://127.0.0.1/nginx-health` | Le nginx du front sert (mêmes fichiers statiques que la sonde) |
| `proxy` | `wget http://127.0.0.1/nginx-health` | nginx sert ; comme il refuse de démarrer sans certificat lisible, un proxy qui répond est un proxy dont le TLS est chargé |

Au premier `make up` sur un volume vide, la séquence est donc : `db` démarre → *Waiting* → *Healthy* → `migrate` démarre → *Exited (0)* → `backend` et `web` démarrent en parallèle → tous deux *Healthy* → `proxy` démarre (il attend les deux). Compter ~50 s à froid (l'`initdb` de Postgres domine, les migrations ajoutent quelques secondes) ; les démarrages suivants sont bien plus rapides.

```bash
make ps   # colonne STATUS : "Up X (healthy)" pour db/backend/web/proxy, "Exited (0)" pour migrate
```

`healthy` dit que l'image est buildée et que le container démarre et répond. Pas que le service est utilisable : la vérification fonctionnelle est le rôle des tests (CI), pas des sondes.

`make up` rend la main dès que `proxy` est *Started*, pas *Healthy* — un `curl` lancé dans la seconde qui suit peut encore échouer en erreur TLS.

## HTTPS en local

Le certificat servi par `proxy` est **self-signed**, généré sur ta machine via `make certs` — jamais dans l'image nginx, jamais committé (`.gitignore` : `infra/nginx/certs/`), monté en lecture seule dans le container. Chrome affichera un avertissement (« Your connection is not private ») la première fois : c'est attendu, pas un bug.

- Pour continuer : `Avancé` → `Continuer vers localhost:8443 (dangereux)`.
- Tu ne verras cet écran qu'une fois par machine tant que le certificat ne change pas.

Seul le port `8443` (HTTPS) est publié côté hôte (`compose.yml`) — le port `80` du proxy (redirection HTTP→HTTPS + `/nginx-health`) reste interne au réseau Docker, jamais exposé.

### Régénérer le certificat

```bash
make certs
```

Ne fait rien s'il existe déjà. Pour forcer une regénération (ex. après avoir changé de machine) :

```bash
rm -rf infra/nginx/certs && make certs
```

## Intégration continue (GitHub Actions)

Le job `backend-tests` tourne sur chaque PR vers `main` et chaque push sur `main`. Détail du workflow : [`.github/workflows/README.md`](../.github/workflows/README.md).

Le rejouer en local : `make ci-backend` (Postgres jetable en container, `pytest` tourne côté hôte via `uv`).

## Commandes disponibles (`make help`)

```bash
make help      # affiche cette liste (c'est aussi la commande par défaut : `make` tout court)
make up        # génère le certif si besoin, build + lance db/migrate/backend/web/proxy
make down      # stoppe les containers (garde les données Postgres)
make restart   # down puis up
make logs      # suit les logs de tous les services (Ctrl+C pour sortir, ne stoppe rien)
make ps        # liste les containers et leur état
make clean     # down + supprime les images buildées (garde le volume Postgres)
make certs     # (re)génère le certificat HTTPS local si absent
make db-ui     # lance Adminer sur http://localhost:8081 (visualiseur de tables)
make db-ui-down # stoppe Adminer
make ci-backend # rejoue en local le job CI des tests backend
```

### Visualiser les tables (Adminer)

Entrer le nom de la db, l'user et le mot de passe (les `POSTGRES_*` du `.env`) pour visualiser les tables dans l'UI Adminer.

**Provisoire** : dépannage en attendant mieux (schéma généré en Mermaid, ou autre visualiseur). Se retire en supprimant le service `adminer` du compose et les deux cibles `make`.

## Le lancement manuel sans Docker reste disponible

Rien n'oblige à passer par Compose : Postgres via Homebrew + `uv run uvicorn` en local, tel que documenté dans le [`README`](../README.md), reste possible dans tous les cas — Malik et Swan peuvent continuer à bosser comme ça sans dépendre de Compose.

## Problèmes fréquents

| Symptôme | Cause probable | Solution |
|---|---|---|
| `port is already allocated` sur 8443 | Un autre service tourne déjà dessus | `make down` ailleurs, ou changer le port publié dans `compose.yml` |
| `rootlessport cannot expose privileged port` (Podman) | Podman rootless (sans root) ne peut pas bind un port < 1024 — mais `proxy` publie déjà sur `8443` (non-privilégié), donc ça ne devrait pas arriver avec la conf actuelle | Vérifie que `compose.yml` publie bien `8443:443` et pas `443:443` |
| `Connection is not private` dans Chrome | Certificat self-signed (normal, voir plus haut) | `Avancé` → `Continuer vers localhost:8443` |
| L'API renvoie une erreur DB au démarrage | Ne devrait plus arriver : `backend` attend que `db` soit *healthy* | Si ça se produit quand même, `make ps` pour voir quel service est `unhealthy`, puis `make logs` |
| Une modif de `infra/nginx/nginx.conf` n'a aucun effet | `make restart` (ou `nginx -s reload`) ne suffit pas : le fichier est monté en bind mount **fichier**, attaché à son inode d'origine. La plupart des éditeurs écrivent un nouveau fichier puis le renomment → nouvel inode, et le container continue de servir l'ancien contenu | `make down && make up` (recrée les containers, donc remonte le fichier). Pour vérifier ce que voit vraiment nginx : `docker compose exec proxy cat /etc/nginx/conf.d/default.conf` |
| `proxy` reste `unhealthy` alors que le site répond | La sonde `/nginx-health` ne renvoie pas 200 | `docker compose exec proxy wget -qO- http://127.0.0.1/nginx-health` doit afficher `ok`. Attention : un `return` placé directement dans un bloc `server` s'exécute avant la sélection des `location` et court-circuiterait la sonde |
| Erreur de redirect URI au login 42 | `FORTY_TWO_REDIRECT_URI` (`.env`) ne correspond pas *exactement* à l'URI déclarée sur https://profile.intra.42.fr/oauth/applications | Les deux doivent être identiques caractère pour caractère : `https://localhost:8443/api/auth/callback` |
| CORS bloqué côté front | `VITE_API_URL` n'est pas relative (`/api`) — tout doit passer par `proxy`, aucun cross-origin prévu | Vérifier `VITE_API_URL=/api` dans `.env`, rebuild `web` |

## Ce qui n'est pas encore fait (prochaines étapes DevOps)

- **CI d'infra** : les tests backend tournent sur chaque PR (voir « Intégration continue »), mais rien ne vérifie encore que l'image build, que les migrations Alembic passent, ni que la stack complète répond. C'est le second job à écrire.
- **Outils de visualisation des tables** et documentation du schéma (ERD généré) — `adminer` est un pansement provisoire.
- **Secrets Compose** : `JWT_SECRET` et `FORTY_TWO_CLIENT_SECRET` transitent en clair dans le fichier d'environnement du container `backend`. Les secrets Compose (`secrets:` + convention `_FILE`) seraient plus propres, mais demandent que `app/config.py` sache lire une valeur depuis un fichier — à arbitrer avec Malik.
- Seed / données de démo, éventuelle machine de démo déjà chaude.
- Endpoints WebSocket (chat, notifs, online) : le backend a déjà l'implémentation (`app/realtime/`, `app/chat/`, DM + presence), et le `proxy` est déjà prêt à les faire passer (upgrade HTTP→WS géré dans `infra/nginx/nginx.conf` sur `/api/`, forcément en `wss://` côté navigateur puisque tout passe par HTTPS) — mais rien côté front (`apps/web`) ne les consomme encore.
- Bonus monitoring (Prometheus + Grafana) si le temps le permet : pas encore de service dans `compose.yml`. Les métriques HTTP standard (endpoints les plus appelés) seraient quasi gratuites (`prometheus-fastapi-instrumentator`) ; suivre la conso de quota API 42 par endpoint demanderait un compteur custom côté `app/intra/`, à voir avec Malik.

Suivi détaillé de ces points : [`docs/devops.md`](devops.md).

## Raccourcis dev — à nettoyer avant la correction

La machine reste `localhost` (pas de vrai domaine/prod à prévoir), mais côté correction : `proxy` doit rester le **seul** point d'entrée accessible depuis l'extérieur de la machine, en HTTPS — jamais de port en clair exposé.

Déjà réglé :
- ~~Port 8000 du `backend` publié en clair~~ — retiré, `backend` ne publie plus aucun port (voir `compose.yml`).
- ~~`FORTY_TWO_REDIRECT_URI` pointant sur `:8000`~~ — `.env.example` déclare déjà `https://localhost:8443/api/auth/callback`.
- ~~Port `8080` (HTTP) du proxy~~ — retiré de `compose.yml`, plus rien ne publie le port 80 côté hôte.

Encore ouvert :
- **Adminer sur `127.0.0.1:8081`** en HTTP clair, avec un accès complet en écriture à la base — à retirer avant la correction (ou profiler différemment).
- **CORS large** : `allow_methods=["*"]` / `allow_headers=["*"]` avec `allow_credentials=True` dans `apps/server/app/main.py`. Sans vrai risque tant que tous les points d'entrée exposés sont en HTTPS, mais à resserrer si possible.

Le reste (cert self-signé, pas de headers HTTP genre HSTS/CSP) n'a pas besoin d'être traité : la machine reste `localhost`, pas de vrai domaine public à durcir.

---

## Annexe — Front (Swan) : build et service

`web` est un build **statique**, en deux temps dans `apps/web/Dockerfile` :

1. Stage `node:22-alpine` : `pnpm install --frozen-lockfile` puis `pnpm build` (= `tsc -b && vite build`) — produit `dist/` (HTML/CSS/JS figés). `VITE_API_URL` est passée en **build arg**, pas `environment:` dans `compose.yml` : Vite fait un remplacement textuel statique dans le bundle au moment du build, ce n'est pas une lecture au runtime comme pour le backend. Conséquence directe : changer `VITE_API_URL` dans `.env` exige un **rebuild** de l'image `web` (`make up`, qui fait `--build`), un simple restart ne suffit pas.
2. Stage `nginx:1.27-alpine` : copie `dist/` dans `/usr/share/nginx/html` et sert avec `apps/web/nginx.conf` — un `try_files $uri $uri/ /index.html` classique pour le fallback SPA (react-router gère le routing côté client ; sans ce fallback, un refresh sur une route type `/profile` renverrait un 404 nginx).

Aucun process Node ne tourne au runtime : `web` ne fait que du service de fichiers statiques, comme `proxy`. Toute la logique applicative du front (routing, appels API) s'exécute dans le navigateur, pas dans le container. Pas de bind mount sur `apps/web` : une modif de code front n'est visible qu'après un rebuild de l'image (`make up`).

## Annexe — Migrations

Le schéma est créé et mis à jour par le service `migrate` : un one-shot qui joue `alembic upgrade head` sur la même image que `backend`, puis sort.

```yaml
migrate:  depends_on: db (service_healthy)          # attend Postgres
backend:  depends_on: migrate (service_completed_successfully)   # attend le schéma
```

Il tourne à **chaque** `make up`, et c'est voulu : Alembic lit la table `alembic_version` de la base et ne joue que les révisions postérieures. Sur une base déjà à jour, c'est un no-op de deux secondes ; sur un volume neuf, il crée les tables ; si Malik ajoute une migration, seule la nouvelle est jouée.

Un point à connaître :

- **Une base créée hors Alembic échoue.** Si des tables ont été créées à la main ou par `Base.metadata.create_all()`, il n'y a pas de `alembic_version`, Alembic croit repartir de zéro et bute sur `relation "users" already exists`. Rattrapage : `alembic stamp head`, qui enregistre la révision courante sans rien jouer. À garder en tête si on importe un dump : il doit contenir `alembic_version`.

Le contenu des migrations (les `revision --autogenerate`) reste écrit côté `apps/server` par le owner de l'API ; le compose ne fait que les appliquer dans le chemin de déploiement.

## Annexe — Réactiver le hot-reload (dev uniquement, pas le mode par défaut)

Par défaut (config actuelle, orientée eval/prod), `backend` tourne sur le code figé dans l'image, sans bind mount ni `--reload` — voir `x-server-base` et le service `backend` dans `compose.yml` (les lignes concernées sont commentées, pas supprimées). Pour retrouver le hot-reload en dev local :

1. Décommenter dans `x-server-base` :
   ```yaml
   volumes:
     - ./apps/server/app:/app/app
     - ./apps/server/alembic:/app/alembic
   ```
2. Décommenter dans le service `backend` :
   ```yaml
   command: ["--reload", "--reload-dir", "/app/app"]
   ```
3. `make up` (rebuild + recrée les containers avec les nouveaux mounts).

Le hot reload demande **deux** conditions : le fichier est dans un dossier monté, et c'est un `.py`. Le watcher est restreint à `/app/app` (`--reload-dir`), donc seul le code que l'API exécute la fait redémarrer.

| Ce que tu modifies | Effet |
|---|---|
| `.py` dans `apps/server/app/` | uvicorn relance le process serveur (~1 s), aucune commande à taper |
| autre fichier dans `app/` (`.json`, template…) | visible dans le container, mais le watcher ne suit que `*.py` → `docker compose restart backend` |
| `.py` dans `apps/server/alembic/` | aucun effet tant que `migrate` n'a pas tourné → `make up` |
| `pyproject.toml` / `uv.lock`, `alembic.ini`, `Dockerfile` | non montés, figés dans l'image → `make up` (rebuild) |
| `.env`, `compose.yml` | figés à la création du container → `make up` (recrée) |
| `infra/nginx/nginx.conf` | bind mount de fichier, attaché à son inode d'origine → `make down && make up` |

Les données Postgres, elles, vivent toujours dans un volume Docker nommé (`db_data`) — pas un bind mount — donc rien à perdre en repassant d'un mode à l'autre.
