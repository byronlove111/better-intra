# Le sujet accepte Docker OU Podman (cf. docs/devops.md) : docker en priorité
# s'il est présent sur la machine, sinon fallback podman.
COMPOSE := $(shell command -v docker >/dev/null 2>&1 && echo "docker compose" || echo "podman compose")
CERT_DIR := infra/nginx/certs

.PHONY: help up down restart logs ps clean certs

help:
	@echo "BetterIntra — commandes :"
	@echo "  make up       - genere le certif HTTPS local si besoin, build et lance db+backend+proxy"
	@echo "  make down     - stoppe les containers (garde le volume Postgres)"
	@echo "  make restart  - down puis up"
	@echo "  make logs     - suit les logs de tous les services"
	@echo "  make ps       - liste les containers et leur etat"
	@echo "  make clean    - down + supprime les images buildees (garde le volume Postgres)"
	@echo "  make certs    - (re)genere le certificat self-signed du proxy nginx"

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
