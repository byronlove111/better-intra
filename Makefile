.PHONY: help up down restart logs ps clean kill hard-reset certs monitoring-up monitoring-down

help:
	@echo "BetterIntra — commandes :"
	@echo "  make up       - genere le certif HTTPS local si besoin, build et lance db+backend+web+proxy"
	@echo "  make down     - stoppe les containers (garde le volume Postgres)"
	@echo "  make restart  - down puis up"
	@echo "  make logs     - suit les logs de tous les services"
	@echo "  make ps       - liste les containers et leur etat"
	@echo "  make clean    - down + supprime les images buildees (garde le volume Postgres)"
	@echo "  make kill     - stoppe et supprime TOUS les containers du projet + toutes les images (garde les volumes)"
	@echo "  make hard-reset - kill puis up : repart de zero sur une base propre"
	@echo "  make certs    - (re)genere le certificat self-signed du proxy nginx"
	@echo "  make monitoring-up   - lance Prometheus/Grafana en plus (profile monitoring)"
	@echo "  make monitoring-down - stoppe les containers du profile monitoring"

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

# Nucléaire : stoppe et supprime tous les containers du projet
# Volumes safe
kill:
	@printf "Supprime TOUS les containers et TOUTES les images du projet (volumes conserves). Continuer ? [y/N] "; \
	read -r reply; \
	case "$$reply" in \
		[yY]|[yY][eE][sS]) ;; \
		*) echo "Annule."; exit 1 ;; \
	esac
	$(COMPOSE) --profile monitoring down --rmi all --remove-orphans

# kill puis up, pour repartir sur une base propre.
hard-reset: kill up

# Profile monitoring : jamais un prerequis de "make up", opt-in seulement.
monitoring-up:
	$(COMPOSE) --profile monitoring up -d
	@echo "Prometheus : http://localhost:9090 (pas de port publie -> exec docker ou tunnel ssh en attendant Grafana)"

monitoring-down:
	$(COMPOSE) --profile monitoring stop