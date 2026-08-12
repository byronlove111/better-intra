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
2. build et lance quatre containers : `db` (Postgres), `migrate` (migrations Alembic, puis sort), `backend` (API FastAPI) et `proxy` (nginx, HTTPS).

`Ctrl+C` arrête les logs mais laisse les containers tourner en fond selon ton shell ; utilise `make down` pour vraiment tout stopper.

## Ce qui tourne, et où

| Service | Rôle | URL / port |
|---|---|---|
| `proxy` (nginx) | HTTPS, point d'entrée navigateur | https://localhost:8443 |
| `backend` (FastAPI) | API | https://localhost:8443/... (via le proxy) · aussi sur http://127.0.0.1:8000 pour du debug, **depuis ta machine uniquement** |
| `migrate` (one-shot) | Applique les migrations Alembic, puis sort | pas de port — voir « Migrations » |
| `db` (Postgres 16) | Base de données | interne au réseau Docker uniquement (pas de port publié) |
| `adminer` (optionnel) | Visualiseur de tables | http://localhost:8081, **uniquement** après `make db-ui` |

Ports 8080/8443 (pas 80/443) : `proxy` publie sur des ports non-privilégiés pour rester portable sur toutes les machines de l'équipe — le rootless Podman (sans root) ne peut pas bind un port < 1024, alors que Docker et Podman machine/Desktop n'ont pas cette contrainte. Sur `http://localhost:8080`, nginx répond par une redirection 301 vers `https://localhost:8443`.

Concrètement :

| URL | Utilité |
|---|---|
| https://localhost:8443/health | API vivante (via HTTPS) |
| https://localhost:8443/health/db | API + Postgres OK (via HTTPS) |
| https://localhost:8443/docs | Swagger |
| https://localhost:8443/nginx-health | Le proxy répond (sonde interne, ne touche pas au backend) |
| http://127.0.0.1:8000/docs | Même Swagger, en direct, sans passer par le proxy (pratique pour du `curl` rapide) |

**Règle du sujet :** le navigateur (et donc le futur front de Swan) ne doit **jamais** appeler `http://127.0.0.1:8000` directement — toujours passer par `https://localhost:8443` (le proxy). Le port 8000 en clair n'est là que pour le confort de debug côté terminal ; il est publié sur `127.0.0.1` seulement, donc injoignable depuis le réseau (une autre machine du LAN ne peut pas l'atteindre).

## Ordre de démarrage et healthchecks

Chaque service déclare une sonde, et `depends_on: condition: service_healthy` s'en sert pour **séquencer** le boot — c'est ce qui empêche l'API d'ouvrir son pool de connexions pendant que Postgres est encore en train de s'initialiser.

| Service | Sonde | Ce qu'elle prouve |
|---|---|---|
| `db` | `pg_isready -U … -d …` | Postgres accepte les connexions (pas juste « le process tourne ») |
| `migrate` | *(aucune)* — one-shot, c'est son **code de sortie** qui compte | Le schéma est à jour : `backend` attend son `service_completed_successfully` |
| `backend` | `urllib` sur `/health` | L'API répond en HTTP |
| `proxy` | `wget http://127.0.0.1/nginx-health` | nginx sert ; comme il refuse de démarrer sans certificat lisible, un proxy qui répond est un proxy dont le TLS est chargé |

Au premier `make up` sur un volume vide, la séquence est donc : `db` démarre → *Waiting* → *Healthy* → `migrate` démarre → *Exited (0)* → `backend` démarre → *Waiting* → *Healthy* → `proxy` démarre. Compter ~50 s à froid (l'`initdb` de Postgres domine, les 7 migrations ajoutent quelques secondes) ; les démarrages suivants sont bien plus rapides.

```bash
make ps   # colonne STATUS : "Up X (healthy)" pour db/backend/proxy, "Exited (0)" pour migrate
```

`healthy` dit que l'image est buildée et que le container démarre et répond. Pas que le service est utilisable : la vérification fonctionnelle est le rôle des tests (CI), pas des sondes.

`make up` rend la main dès que `proxy` est *Started*, pas *Healthy* — un `curl` lancé dans la seconde qui suit peut encore échouer en erreur TLS.

## Migrations

Le schéma est créé et mis à jour par le service `migrate` : un one-shot qui joue `alembic upgrade head` sur la même image que `backend`, puis sort.

```yaml
migrate:  depends_on: db (service_healthy)          # attend Postgres
backend:  depends_on: migrate (service_completed_successfully)   # attend le schéma
```

Il tourne à **chaque** `make up`, et c'est voulu : Alembic lit la table `alembic_version` de la base et ne joue que les révisions postérieures. Sur une base déjà à jour, c'est un no-op de deux secondes ; sur un volume neuf, il crée les 11 tables ; si Malik ajoute une migration, seule la nouvelle est jouée.

Un point à connaître :

- **Une base créée hors Alembic échoue.** Si des tables ont été créées à la main ou par `Base.metadata.create_all()`, il n'y a pas de `alembic_version`, Alembic croit repartir de zéro et bute sur `relation "users" already exists`. Rattrapage : `alembic stamp head`, qui enregistre la révision courante sans rien jouer. À garder en tête si on importe un dump : il doit contenir `alembic_version`.

Le contenu des migrations (les `revision --autogenerate`) reste écrit côté `apps/server` par le owner de l'API ; le compose ne fait que les appliquer dans le chemin de déploiement.

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

Le code de l'API (`apps/server/app`) est monté en live dans le container `backend` (bind mount), avec `uvicorn --reload`.

Le hot reload demande **deux** conditions : le fichier est dans un dossier monté, et c'est un `.py`. Le watcher est restreint à `/app/app` (`--reload-dir`), donc seul le code que l'API exécute la fait redémarrer.

| Ce que tu modifies | Effet | Commande |
|---|---|---|
| `.py` dans `apps/server/app/` | uvicorn relance le process serveur (~1 s) | **aucune** |
| autre fichier dans `app/` (`.json`, template…) | visible dans le container, mais le watcher ne suit que `*.py` | `docker compose restart backend` |
| `.py` dans `apps/server/alembic/` | aucun effet tant que `migrate` n'a pas tourné (l'API n'importe pas Alembic) | `make up` |
| `pyproject.toml` / `uv.lock` | le `.venv` vit dans l'image, pas sur l'hôte | `make up` (rebuild) |
| `alembic.ini`, `Dockerfile`, `.dockerignore` | non montés — ils n'existent que dans l'image | `make up` (rebuild) |
| `.env`, `compose.yml` | env et config sont figés à la **création** du container | `make up` (recrée) |
| `infra/nginx/nginx.conf` | bind mount de *fichier* : l'éditeur écrit un nouvel inode | `make down && make up` |

`make up` fait `up --build`, donc il couvre toutes les lignes ci-dessus sauf la dernière. En pratique : le dev code dans `app/` sans rien taper, et relance `make up` dans tous les autres cas.

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

`apps/server/.env.example` documente les mêmes variables côté API si tu veux lancer l'API sans Docker (voir README racine). Les deux fichiers doivent donc rester alignés : en Docker, `apps/server/.env` n'existe pas (exclu par le `.dockerignore`), l'API ne voit que ce que Compose injecte depuis la racine.

**À centraliser** — deux fichiers à tenir à la main, c'est une variable oubliée qui retombe silencieusement sur le défaut de `config.py`. Pistes : une règle `make` qui génère les `.env` des services depuis celui de la racine, et les secrets Compose (`secrets:` + convention `_FILE`) pour sortir `JWT_SECRET` et `FORTY_TWO_CLIENT_SECRET` du fichier d'environnement. Objectif : une seule source de vérité, et chaque dev garde la vue sur son scope.

## Intégration continue (GitHub Actions)

Le job `backend-tests` tourne sur chaque PR vers `main` et chaque push sur `main`. Détail du workflow: [`.github/README.md`](../.github/README.md).

Le rejouer en local : `make ci-backend`.

## Commandes disponibles (`make help`)

```bash
make help      # affiche cette liste (c'est aussi la commande par défaut : `make` tout court)
make up        # génère le certif si besoin, build + lance db/migrate/backend/proxy
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

**Provisoire** : c'est un dépannage en attendant mieux (schéma généré en Mermaid dans la doc, ou autre visualiseur). Se retire en supprimant le service `adminer` du compose et les deux cibles `make`.

## Le lancement manuel sans Docker reste disponible

Rien n'oblige à passer par Compose : Postgres via Homebrew + `uv run uvicorn --reload` en local, tel que documenté dans le [`README`](../README.md), reste possible dans tous les cas — Malik et Swan peuvent continuer à bosser comme ça sans dépendre de Compose.

## Problèmes fréquents

| Symptôme | Cause probable | Solution |
|---|---|---|
| `port is already allocated` sur 8080/8443/8000 | Un autre service tourne déjà sur ces ports (ex. un ancien `uvicorn` local sur 8000) | `make down` ailleurs, stopper le process local, ou changer le port publié dans `compose.yml` |
| `rootlessport cannot expose privileged port` (Podman) | Podman rootless (sans root) ne peut pas bind un port < 1024 — mais `proxy` publie déjà sur 8080/8443, donc ça ne devrait pas arriver avec la conf actuelle | Vérifie que `compose.yml` publie bien `8080:80` / `8443:443` et pas `80:80` / `443:443` |
| `Connection is not private` dans Chrome | Certificat self-signed (normal, voir plus haut) | `Avancé` → `Continuer vers localhost:8443` |
| L'API renvoie une erreur DB au démarrage | Ne devrait plus arriver : `backend` attend que `db` soit *healthy* | Si ça se produit quand même, `make ps` pour voir quel service est `unhealthy`, puis `make logs` |
| Une modif de `infra/nginx/nginx.conf` n'a aucun effet | `make restart` (ou `nginx -s reload`) ne suffit pas : le fichier est monté en bind mount **fichier**, attaché à son inode d'origine. La plupart des éditeurs écrivent un nouveau fichier puis le renomment → nouvel inode, et le container continue de servir l'ancien contenu | `make down && make up` (recrée les containers, donc remonte le fichier). Pour vérifier ce que voit vraiment nginx : `docker compose exec proxy cat /etc/nginx/conf.d/default.conf` |
| `proxy` reste `unhealthy` alors que le site répond | La sonde `/nginx-health` ne renvoie pas 200 | `docker compose exec proxy wget -qO- http://127.0.0.1/nginx-health` doit afficher `ok`. Attention : un `return` placé directement dans un bloc `server` s'exécute avant la sélection des `location` et court-circuiterait la sonde |
| CORS bloqué côté front | `CORS_ORIGINS` ne contient pas l'origine exacte du front | Ajouter l'origine dans `.env` (`CORS_ORIGINS`), redémarrer l'API |

## Ce qui n'est pas encore fait (prochaines étapes DevOps)

- **CI d'infra** : les tests backend tournent désormais sur chaque PR (voir « Intégration continue »), mais rien ne vérifie encore que l'image build, que les migrations Alembic passent, ni que la stack complète répond. C'est le second job à écrire.
- **Outils de visualisation des tables** et documentation du schéma (ERD généré).
- **Centraliser env et secrets** pour builder proprement, en gardant la lisibilité pour chaque dev (chacun son scope). Aujourd'hui `backend` reçoit tout le fichier `.env`, `JWT_SECRET` et `FORTY_TWO_CLIENT_SECRET` compris ; les secrets Compose (`secrets:` + convention `_FILE`) seraient plus propres, mais demandent que `app/config.py` sache lire une valeur depuis un fichier — à arbitrer avec Malik.
- Service `web` dans `compose.yml` dès que Swan a un front buildable (Dockerfile + build servi par `proxy`).
- Seed / données de démo, éventuelle machine de démo déjà chaude.
- Endpoints WebSocket (chat, notifs, online) : le `proxy` est déjà prêt à les faire passer (upgrade HTTP→WS géré dans `infra/nginx/nginx.conf`, forcément en `wss://` côté navigateur puisque tout passe par HTTPS) — mais rien n'existe encore côté `apps/server/app/` ni côté front. À coder quand le module WS du CDC démarre.
- Bonus monitoring (Prometheus + Grafana) si le sujet le permet/le temps le permet : pas encore de service dans `compose.yml`, à évaluer une fois le socle (web + WS + healthchecks) posé.

Suivi détaillé de ces points : [`docs/devops.md`](devops.md).

## Raccourcis dev — à nettoyer avant la correction

La machine reste `localhost` (pas de vrai domaine/prod à prévoir), mais côté correction : soit `nginx` (`proxy`) reste le **seul** point d'entrée accessible depuis l'extérieur de la machine, soit tout autre point d'entrée qui subsiste doit lui aussi parler HTTPS — jamais de port en clair exposé. Ce qui suit est acceptable pour bosser au quotidien mais casse cette règle si c'est encore là le jour J :

- **Port 8000 du `backend` publié en clair sur la loopback** (`compose.yml`, `ports: "127.0.0.1:8000:8000"`) : le bind sur `127.0.0.1` le rend injoignable depuis le réseau — ce n'est donc plus un point d'entrée exposé, seulement un raccourci local pour `curl`/Swagger. Reste que ça demeure du HTTP en clair : **avant la correction, le plus propre est de le retirer** (ou de le passer derrière un profile Compose type `debug` qu'on n'active pas ce jour-là), pour n'avoir qu'un seul chemin, celui du proxy.
- **`FORTY_TWO_REDIRECT_URI=http://localhost:8000/auth/callback`** (`.env.example`) : pointe par défaut sur le port backend en clair, pas sur le proxy HTTPS (`8443`). À corriger en `https://localhost:8443/auth/callback` dès que l'auth 42 est branchée — sinon l'échange du code OAuth transite par le point d'entrée non chiffré du point précédent.
- **Adminer sur `127.0.0.1:8081`** en HTTP clair, avec un accès complet en écriture à la base.
- **CORS large** : `allow_methods=["*"]` / `allow_headers=["*"]` avec `allow_credentials=True` dans `apps/server/app/main.py`. Sans vrai risque tant que tous les points d'entrée exposés sont en HTTPS, mais à resserrer si le port 8000 reste accessible en clair.

Le reste (cert self-signé, pas de headers HTTP genre HSTS/CSP) n'a pas besoin d'être traité : la machine reste `localhost`, pas de vrai domaine public à durcir.
