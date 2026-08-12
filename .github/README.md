# Intégration continue (GitHub Actions)

`.github/workflows/ci.yml` — le job `backend-tests` est lancé sur chaque PR vers `main` et chaque push sur `main`.

Il build un environnement de test Ubuntu sur lequel il installe uv et Python, plus un container Postgres fourni par Actions. Ensuite il lance les tests de `apps/server/tests/` (fixtures dans `conftest.py`).

**Un échec de pytest fait échouer le job**, et bloque donc le merge — à condition que le check soit déclaré requis dans les réglages du dépôt (Settings → Branches). Sans ça, la CI informe mais n'empêche rien.

Le code testé ne tourne **pas** dans Docker : pas de build d'image, la suite s'exécute en natif sur le runner.

| Point | Choix |
|---|---|
| Base de test | Service `postgres:16-alpine`, `POSTGRES_DB: betterintra_test` — la base est créée au démarrage du container, donc **pas de `createdb`** |
| Connexion | `TEST_DATABASE_URL` sur `localhost:5432` ; `conftest.py` la recopie dans `DATABASE_URL` avant d'importer l'app |
| Secrets | **Aucun secret de dépôt.** Les tests ne touchent pas `api.intra.42.fr`, et `JWT_SECRET` est une valeur bidon (voir `apps/server/tests/conftest.py`) |
| Schéma | Créé par `Base.metadata.create_all`, pas par Alembic |
| Dépendances | `uv sync --frozen --group dev` — `--frozen` fait échouer la CI si `uv.lock` est périmé, même contrat que le `Dockerfile` |

## Rejouer la CI en **local**

```bash
make ci-backend
```

Mêmes commandes que le job. La cible choisit sa base toute seule :

| Situation | Ce qu'elle fait |
|---|---|
| Postgres local sur 5432, base `betterintra_test` présente | l'utilise directement |
| Postgres local sur 5432, base absente | `createdb`, puis l'utilise |
| Pas de Postgres local, image `postgres:16-alpine` déjà tirée | container jetable sur 5433 |
| Pas de Postgres local, image absente | demande confirmation avant de télécharger (~111 Mo) |

Le container jetable est supprimé à la fin, même si les tests échouent, et sans masquer le code de sortie de pytest. Un Postgres local, lui, garde sa base `betterintra_test` entre deux runs.

**Nécessite** `uv` sur la machine, contrairement à `make up` qui n'a besoin que de Docker/Podman.

## Ce que cette CI ne couvre pas

Les tables sont créées par SQLAlchemy, donc les migrations Alembic ne sont jamais jouées.

Prochains jobs :

- test de build (image + `alembic upgrade head` + `alembic check`)
- tests unitaires frontend
