# Le sujet accepte Docker OU Podman (cf. docs/devops.md) : docker en priorité
# s'il est présent sur la machine, sinon fallback podman.
COMPOSE := $(shell command -v docker >/dev/null 2>&1 && echo "docker compose" || echo "podman compose")
CERT_DIR := infra/nginx/certs

.PHONY: help up down restart logs ps clean certs db-ui db-ui-down

help:
	@echo "BetterIntra — commandes :"
	@echo "  make up       - genere le certif HTTPS local si besoin, build et lance db+backend+proxy"
	@echo "  make down     - stoppe les containers (garde le volume Postgres)"
	@echo "  make restart  - down puis up"
	@echo "  make logs     - suit les logs de tous les services"
	@echo "  make ps       - liste les containers et leur etat"
	@echo "  make clean    - down + supprime les images buildees (garde le volume Postgres)"
	@echo "  make certs    - (re)genere le certificat self-signed du proxy nginx"
	@echo "  make db-ui    - lance Adminer sur http://localhost:8081 (visualiseur de tables)"
	@echo "  make db-ui-down - stoppe Adminer"

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
