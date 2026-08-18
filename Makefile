.PHONY: help up down restart logs ps clean certs db-ui db-ui-down ci-backend

help:
	@echo "BetterIntra — commandes :"
	@echo "  make up       - genere le certif HTTPS local si besoin, build et lance db+backend+web+proxy"
	@echo "  make down     - stoppe les containers (garde le volume Postgres)"
	@echo "  make restart  - down puis up"
	@echo "  make logs     - suit les logs de tous les services"
	@echo "  make ps       - liste les containers et leur etat"
	@echo "  make clean    - down + supprime les images buildees (garde le volume Postgres)"
	@echo "  make certs    - (re)genere le certificat self-signed du proxy nginx"
	@echo "  make db-ui    - lance Adminer sur http://localhost:8081 (visualiseur de tables)"
	@echo "  make db-ui-down - stoppe Adminer"
	@echo "  make ci-backend - rejoue en local le job CI des tests backend (cf. .github/workflows/README.md)"

CERT_DIR := infra/nginx/certs
# Certif self-signed local pour nginx tls:
# généré une fois sur l'hôte via openssl, jamais committé (.gitignore),
# régénéré seulement s'il manque.
certs:
	@mkdir -p $(CERT_DIR)
	@if [ ! -f $(CERT_DIR)/fullchain.pem ]; then \
		openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
			-keyout $(CERT_DIR)/privkey.pem \
			-out $(CERT_DIR)/fullchain.pem \
			-subj "/CN=localhost" \
			-addext "subjectAltName=DNS:localhost,IP:127.0.0.1"; \
		echo "Certificat self-signed genere dans $(CERT_DIR)/"; \
	fi

# Le sujet accepte Docker OU Podman (cf. docs/devops.md) : docker en priorité
# s'il est présent sur la machine, sinon fallback podman.
COMPOSE := $(shell command -v docker >/dev/null 2>&1 && echo "docker compose" || echo "podman compose")
CONTAINER := $(shell command -v docker >/dev/null 2>&1 && echo "docker" || echo "podman")
up: certs
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

restart: down up

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

# Stoppe tout les containers
# Supprime les images buildées
# Ne touche pas au volume de données Postgres.
clean: down
	$(COMPOSE) down --rmi all

# Adminer appartien au profil "[tools]" dans le compose
# "down" le stoppe quand même
db-ui:
	$(COMPOSE) --profile tools up -d adminer
	@echo "Adminer : http://localhost:8081  (serveur pre-rempli : db:5432)"
	@echo "Identifiants : POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB de ton .env"

db-ui-down:
	$(COMPOSE) --profile tools stop adminer

# Base jetable du job CI backend-tests. Port 5433 : ne gene pas un Postgres local.
CI_PG := betterintra-ci-pg
CI_PG_PORT := 5433
CI_PG_IMAGE := postgres:16-alpine
CI_DB_URL_BASE := postgresql+psycopg://betterintra:betterintra@localhost

# Meme chaine de commandes que le job backend-tests sur une DB Postgres jetable
# Nescessite uv et pytest installés sur l'hôte (ou dans un venv) pour lancer les tests
ci-backend:
	@if ! $(CONTAINER) image inspect $(CI_PG_IMAGE) >/dev/null 2>&1; then \
		echo "Image $(CI_PG_IMAGE) absente (~111 Mo), telechargement..."; \
		$(CONTAINER) pull $(CI_PG_IMAGE) || exit 1; \
	fi; \
	echo "Container jetable sur le port $(CI_PG_PORT)."; \
	$(CONTAINER) rm -f $(CI_PG) >/dev/null 2>&1 || true; \
	$(CONTAINER) run -d --rm --name $(CI_PG) -p $(CI_PG_PORT):5432 \
		-e POSTGRES_USER=betterintra -e POSTGRES_PASSWORD=betterintra -e POSTGRES_DB=betterintra_test \
		$(CI_PG_IMAGE) >/dev/null || exit 1; \
	trap '$(CONTAINER) stop $(CI_PG) >/dev/null 2>&1' EXIT INT TERM; \
	for i in $$(seq 1 30); do \
		$(CONTAINER) exec $(CI_PG) pg_isready -U betterintra -d betterintra_test >/dev/null 2>&1 && break; \
		sleep 1; \
	done; \
	cd apps/server && \
	uv sync --frozen --group dev && \
	TEST_DATABASE_URL=$(CI_DB_URL_BASE):$(CI_PG_PORT)/betterintra_test uv run pytest -q
