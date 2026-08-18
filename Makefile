# Le sujet accepte Docker OU Podman (cf. docs/devops.md) : docker en priorité
# s'il est présent sur la machine, sinon fallback podman.
COMPOSE := $(shell command -v docker >/dev/null 2>&1 && echo "docker compose" || echo "podman compose")
CONTAINER := $(shell command -v docker >/dev/null 2>&1 && echo "docker" || echo "podman")
CERT_DIR := infra/nginx/certs

# Base jetable du job CI backend-tests. Port 5433 : ne gene pas un Postgres local.
CI_PG := betterintra-ci-pg
CI_PG_PORT := 5433
CI_PG_IMAGE := postgres:16-alpine
# Sondes psql sur le Postgres de l'hote ; l'URL des tests recoit le port au runtime.
CI_LOCAL_URL := postgresql://betterintra:betterintra@localhost:5432
CI_DB_URL_BASE := postgresql+psycopg://betterintra:betterintra@localhost

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

up: certs
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

restart: down up

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

# Stoppe tout et supprime les images buildées par ce compose (db/backend/proxy),
# pour repartir d'un build propre sans toucher au volume de données Postgres.
clean: down
	$(COMPOSE) down --rmi all

# Adminer est sous "profiles: [tools]" dans le compose : il n'existe pour aucune
# commande qui ne passe pas --profile, y compris "up". "down" le stoppe quand
# même, la commande porte sur tout le projet.
db-ui:
	$(COMPOSE) --profile tools up -d adminer
	@echo "Adminer : http://localhost:8081  (serveur pre-rempli : db:5432)"
	@echo "Identifiants : POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB de ton .env"

db-ui-down:
	$(COMPOSE) --profile tools stop adminer

# Meme chaine de commandes que le job backend-tests.
# Prefere un Postgres local s'il repond ; sinon propose un container jetable, que
# le trap supprime meme si pytest echoue, sans masquer son code de sortie.
# Nescessite uv et pytest installés sur l'hôte (ou dans un venv) pour lancer les tests
ci-backend:
	@if psql "$(CI_LOCAL_URL)/postgres" -c '\q' >/dev/null 2>&1; then \
		if psql "$(CI_LOCAL_URL)/betterintra_test" -c '\q' >/dev/null 2>&1; then \
			echo "Postgres local 5432 : base betterintra_test deja presente."; \
		else \
			echo "Postgres local 5432 : creation de betterintra_test."; \
			PGPASSWORD=betterintra createdb -h localhost -p 5432 -U betterintra -O betterintra betterintra_test || exit 1; \
		fi; \
		PORT=5432; \
	else \
		echo "Pas de Postgres local joignable sur 5432 (role betterintra)."; \
		if ! $(CONTAINER) image inspect $(CI_PG_IMAGE) >/dev/null 2>&1; then \
			printf "Image $(CI_PG_IMAGE) absente (~111 Mo). La telecharger ? [y/N] "; \
			read -r ans || ans=n; \
			case "$$ans" in [yY]*) ;; *) echo "Abandon."; exit 1;; esac; \
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
		PORT=$(CI_PG_PORT); \
	fi; \
	cd apps/server && \
	uv sync --frozen --group dev && \
	TEST_DATABASE_URL=$(CI_DB_URL_BASE):$$PORT/betterintra_test uv run pytest -q
