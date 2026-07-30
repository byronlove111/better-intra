# Déploiement — comment lancer BetterIntra

> Ce que tu dois savoir pour dev avec l'infra Docker : une commande, HTTPS local,
> bind mount / hot-reload. Brief complet du rôle DevOps : [`docs/devops.md`](devops.md).

## Prérequis

- Docker (avec le plugin `compose`) **ou** Podman (avec `podman-compose`) — le `Makefile` détecte automatiquement lequel est installé.
- `openssl` (déjà présent sur macOS/Linux) — sert à générer le certificat HTTPS local.

Rien d'autre : pas besoin d'installer Python, UV ou Postgres en local pour faire tourner l'API.

## Une commande

```bash
cp .env.example .env      # une seule fois — jamais ce fichier dans git
```

Puis **remplis les valeurs manquantes dans ton `.env`** (secrets 42 OAuth
`FORTY_TWO_CLIENT_ID` / `FORTY_TWO_CLIENT_SECRET`, etc. — voir Malik pour les
obtenir). Le reste des valeurs par défaut de `.env.example` suffit pour lancer
`db` + `backend` + `proxy` en local. Ton `.env` rempli ne doit **jamais** être
committé ni partagé en clair (Slack, PR, issue…) — chacun le garde localement.

```bash
make up
```

`make up` fait deux choses :
1. génère un certificat HTTPS self-signed pour `localhost` s'il n'existe pas encore (`make certs`, voir plus bas) ;
2. build et lance trois containers : `db` (Postgres), `backend` (API FastAPI) et `proxy` (nginx, HTTPS).

`Ctrl+C` arrête les logs mais laisse les containers tourner en fond selon ton shell ; utilise `make down` pour vraiment tout stopper.

## Ce qui tourne, et où

| Service | Rôle | URL / port |
|---|---|---|
| `proxy` (nginx) | HTTPS, point d'entrée navigateur | https://localhost:8443 |
| `backend` (FastAPI) | API | https://localhost:8443/... (via le proxy) · aussi exposé en direct sur http://localhost:8000 pour du debug |
| `db` (Postgres 16) | Base de données | interne au réseau Docker uniquement (pas de port publié) |

Ports 8080/8443 (pas 80/443) : `proxy` publie sur des ports non-privilégiés pour rester portable sur toutes les machines de l'équipe — le rootless Podman (sans root) ne peut pas bind un port < 1024, alors que Docker et Podman machine/Desktop n'ont pas cette contrainte. Sur `http://localhost:8080`, nginx répond par une redirection 301 vers `https://localhost:8443`.

Concrètement :

| URL | Utilité |
|---|---|
| https://localhost:8443/health | API vivante (via HTTPS) |
| https://localhost:8443/health/db | API + Postgres OK (via HTTPS) |
| https://localhost:8443/docs | Swagger |
| http://localhost:8000/docs | Même Swagger, en direct, sans passer par le proxy (pratique pour du `curl` rapide) |

**Règle du sujet :** le navigateur (et donc le futur front de Swan) ne doit **jamais** appeler `http://localhost:8000` directement — toujours passer par `https://localhost:8443` (le proxy). Le port 8000 en clair n'est là que pour le confort de debug côté terminal.

## HTTPS en local

Le certificat servi par `proxy` est **self-signed**, généré sur ta machine via `make certs` — jamais dans l'image nginx, jamais committé (`.gitignore` : `infra/nginx/certs/`), monté en lecture seule dans le container. Chrome affichera un avertissement (« Your connection is not private ») la première fois : c'est attendu, pas un bug.

- Pour continuer : `Avancé` → `Continuer vers localhost:8443 (dangereux)`.
- Tu ne verras cet écran qu'une fois par machine tant que le certificat ne change pas.

Ce self-signed suffit largement pour développer avec une vraie connexion chiffrée (pas de mixed content, WebSocket `wss://` fonctionnel plus tard).

### Régénérer le certificat

```bash
make certs
```

Ne fait rien s'il existe déjà. Pour forcer une regénération (ex. après avoir changé de machine) :

```bash
rm -rf infra/nginx/certs && make certs
```

## Bind mount / hot-reload

Le code de l'API (`apps/server/app`) est monté en live dans le container `backend` (bind mount), avec `uvicorn --reload`. Concrètement :

- Tu modifies un fichier dans `apps/server/app/` → l'API redémarre toute seule, **pas besoin de rebuild**.
- Si tu ajoutes une **dépendance** (`pyproject.toml` / `uv.lock` change) → il faut rebuild l'image :
  ```bash
  make up   # relance "up --build", refait le build si le Dockerfile/deps ont changé
  ```

Les données Postgres, elles, vivent dans un volume Docker nommé (`db_data`) — pas un bind mount — donc rien à perdre si tu changes de dossier ou d'OS.

## Variables d'environnement

Le `.env` à la racine (copié depuis `.env.example`, jamais committé) est lu automatiquement par `docker compose` / `podman compose`.

| Variable | Sert à |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Le container `db` (image Postgres officielle) |
| `DATABASE_URL` | Valeur par défaut pour le dev **hors Docker** (Homebrew). Dans `compose.yml`, elle est surchargée pour viser `db:5432` (nom du service, pas `localhost`) |
| `CORS_ORIGINS` | Origines front autorisées côté API |
| `VITE_API_URL` | URL que le futur front (Swan) doit appeler — `https://localhost:8443`, jamais l'API en clair |
| `FORTY_TWO_*` | OAuth 42 — à remplir toi-même dans ton `.env` local, jamais en clair dans git |

`apps/server/.env.example` documente les mêmes variables côté API si tu veux lancer l'API sans Docker (voir README racine).

## Commandes disponibles (`make help`)

```bash
make help      # affiche cette liste (c'est aussi la commande par défaut : `make` tout court)
make up        # génère le certif si besoin, build + lance db/backend/proxy
make down      # stoppe les containers (garde les données Postgres)
make restart   # down puis up
make logs      # suit les logs de tous les services (Ctrl+C pour sortir, ne stoppe rien)
make ps        # liste les containers et leur état
make clean     # down + supprime les images buildées (garde le volume Postgres)
make certs     # (re)génère le certificat HTTPS local si absent
```

## Le lancement manuel sans Docker reste disponible

Rien n'oblige à passer par Compose : Postgres via Homebrew + `uv run uvicorn --reload` en local, tel que documenté dans le [`README`](../README.md), reste possible dans tous les cas — Malik et Swan peuvent continuer à bosser comme ça sans dépendre de Compose.

## Problèmes fréquents

| Symptôme | Cause probable | Solution |
|---|---|---|
| `port is already allocated` sur 8080/8443/8000 | Un autre service tourne déjà sur ces ports (ex. un ancien `uvicorn` local sur 8000) | `make down` ailleurs, stopper le process local, ou changer le port publié dans `compose.yml` |
| `rootlessport cannot expose privileged port` (Podman) | Podman rootless (sans root) ne peut pas bind un port < 1024 — mais `proxy` publie déjà sur 8080/8443, donc ça ne devrait pas arriver avec la conf actuelle | Vérifie que `compose.yml` publie bien `8080:80` / `8443:443` et pas `80:80` / `443:443` |
| `Connection is not private` dans Chrome | Certificat self-signed (normal, voir plus haut) | `Avancé` → `Continuer vers localhost:8443` |
| L'API renvoie une erreur DB au démarrage | `backend` a démarré avant que `db` soit prêt à accepter des connexions | Réessaie / `make restart` ; un vrai healthcheck Compose est prévu en amélioration |
| CORS bloqué côté front | `CORS_ORIGINS` ne contient pas l'origine exacte du front | Ajouter l'origine dans `.env` (`CORS_ORIGINS`), redémarrer l'API |

## Ce qui n'est pas encore fait (prochaines étapes DevOps)

- Service `web` dans `compose.yml` dès que Swan a un front buildable (Dockerfile + build servi par `proxy`).
- Healthchecks Compose (`db` → `pg_isready`, `backend` → `/health`) + `depends_on: condition: service_healthy`.
- Seed / données de démo, éventuelle machine de démo déjà chaude.
- Endpoints WebSocket (chat, notifs, online) : le `proxy` est déjà prêt à les faire passer (upgrade HTTP→WS géré dans `infra/nginx/nginx.conf`, forcément en `wss://` côté navigateur puisque tout passe par HTTPS) — mais rien n'existe encore côté `apps/server/app/` ni côté front. À coder quand le module WS du CDC démarre.
- Bonus monitoring (Prometheus + Grafana) si le sujet le permet/le temps le permet : pas encore de service dans `compose.yml`, à évaluer une fois le socle (web + WS + healthchecks) posé.

Suivi détaillé de ces points : [`docs/devops.md`](devops.md).

## Raccourcis dev — à nettoyer avant la correction

La machine reste `localhost` (pas de vrai domaine/prod à prévoir), mais côté correction : soit `nginx` (`proxy`) reste le **seul** point d'entrée accessible depuis l'extérieur de la machine, soit tout autre point d'entrée qui subsiste doit lui aussi parler HTTPS — jamais de port en clair exposé. Ce qui suit est acceptable pour bosser au quotidien mais casse cette règle si c'est encore là le jour J :

- **Port 8000 du `backend` publié directement sur l'hôte, en clair** (`compose.yml`, `ports: "8000:8000"`) : pratique pour `curl`/Swagger en dev, mais c'est un deuxième point d'entrée non chiffré. **Avant la correction : soit le retirer** (ou le restreindre derrière un profile Compose type `debug` qu'on n'active pas ce jour-là), **soit le faire passer en HTTPS** si on veut le garder exposé.
- **`FORTY_TWO_REDIRECT_URI=http://localhost:8000/auth/callback`** (`.env.example`) : pointe par défaut sur le port backend en clair, pas sur le proxy HTTPS (`8443`). À corriger en `https://localhost:8443/auth/callback` dès que l'auth 42 est branchée — sinon l'échange du code OAuth transite par le point d'entrée non chiffré du point précédent.
- **CORS large** : `allow_methods=["*"]` / `allow_headers=["*"]` avec `allow_credentials=True` dans `apps/server/app/main.py`. Sans vrai risque tant que tous les points d'entrée exposés sont en HTTPS, mais à resserrer si le port 8000 reste accessible en clair.

Le reste (cert self-signé, pas de headers HTTP genre HSTS/CSP) n'a pas besoin d'être traité : la machine reste `localhost`, pas de vrai domaine public à durcir.
