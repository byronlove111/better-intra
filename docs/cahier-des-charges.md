# Cahier des charges — BetterIntra

**Projet :** BetterIntra  
**Cadre :** ft_transcendence Surprise (42 Common Core)  
**Objectif de points :** 18 pts (14 obligatoires + 4 bonus)  
**Version :** 1.0  
**Date :** 24 juillet 2026  

---

## 1. Vision

BetterIntra est une **réinterprétation moderne et minimale** de l’intranet 42.

Le correcteur se connecte avec son compte Intra (OAuth 42) et découvre une nouvelle interface : ses **vraies données 42 en lecture**, et une **couche d’interaction sociale / organisationnelle** gérée dans **notre base de données**.

> On ne recrée pas l’Intra officiel.  
> On affiche la data 42, et on simule les écritures chez nous.

---

## 2. Principes techniques

| Couche | Source | Exemples |
|---|---|---|
| **Lecture** | API 42 (OAuth) | profil, projets, events, évaluations, logtime, achievements, skills |
| **Écriture** | Base de données BetterIntra | slots, favoris, amis, chat, notifications, badges |
| **Interdit** | Write sur l’API 42 | inscription projet réelle, vrais slots Intra, wallet, moulinette |

### Contraintes sujet (obligatoires)

- Application web : frontend + backend + base de données
- Conteneurisation (Docker) — lancement en **une commande**
- Compatible Google Chrome (dernière version stable)
- Aucune erreur / warning console navigateur
- HTTPS pour toute connexion vers le backend
- Auth minimale : email/password **ou** OAuth (ici OAuth 42 + éventuel fallback)
- Multi-utilisateurs simultanés sans corruption de données
- Credentials dans `.env` (gitignored) + `.env.example`
- Pages **Privacy Policy** et **Terms of Service** accessibles et non vides
- README complet (rôles, stack, schema, modules, contributions)
- CSS framework / solution de styling au choix

---

## 3. Périmètre fonctionnel

### 3.1 Données lues depuis l’API 42

| Donnée | Endpoint(s) indicatifs | Affichage |
|---|---|---|
| Profil connecté | `GET /v2/me` | avatar, login, displayname, campus, wallet, correction points |
| Cursus / niveau / grade | `cursus_users` (via `/v2/me`) | niveau, % progression, grade |
| Projets | `GET /v2/users/:id/projects_users` | liste, statut, note |
| Events campus | `GET /v2/campus/:id/events` | agenda + filtres |
| Évaluations | `GET /v2/me/scale_teams/as_corrector` & `as_corrected` | historique |
| Logtime | `GET /v2/users/:id/locations` / `locations_stats` | calendrier + stats |
| Achievements | endpoints achievements / achievements_users | badges 42 |
| Skills | skills liés au cursus | radar / scores |
| Recherche users | `GET /v2/users` (filtres) | pages profils tiers |

### 3.2 Fonctionnalités écrites dans notre BDD

| Feature | Description |
|---|---|
| **Slots d’évaluation** | Créer / lister / réserver / annuler / supprimer des créneaux (simulation Intra) |
| **Favoris d’events** | Marquer / retirer un event comme favori |
| **Amis** | Ajouter / retirer un ami (référence user 42), voir liste |
| **Statut online** | Présence temps réel des amis connectés |
| **Chat DM** | Messages privés 1-to-1 entre utilisateurs BetterIntra |
| **Notifications** | Notifs sur création / update / delete (slots, amis, messages, etc.) |
| **Badges custom** | Système de gamification (au moins 3 mécaniques : badges, XP/level ou leaderboard, etc.) |
| **Export PDF** | Transcript / récap projets + notes exportable |
| **Préférences** | Préférences UI locales (langue, etc. si i18n plus tard) |

### 3.3 Hors scope (explicitement exclus)

- Moulinette / correction automatique
- Vidéosurveillance / clusters map live
- Gestion financière réelle du Wallet / shop
- Écriture sur l’API 42 (subscribe projet, vrais slots, etc.)
- Forum, notions e-learning, matching d’éval réel
- IA (RAG/LLM), Blockchain, DevOps lourd (ELK, Prometheus)
- Jeux / tournois

---

## 4. Pages de l’application

| Page | Contenu principal |
|---|---|
| **Login** | Connexion OAuth 42 |
| **Home / Dashboard** | Synthèse : niveau, wallet, eval points, prochaines évals, events à venir, notifs |
| **Profil** | Soi + autres users (data 42 + amis + badges BetterIntra) |
| **Projets** | Liste des projets avec statut / notes |
| **Agenda** | Events avec recherche avancée (filtres, tri, pagination) |
| **Évaluations** | Historique + **Manage Slots** (CRUD slots BDD) |
| **Logtime** | Calendrier de présence + graphiques analytics |
| **Amis** | Liste, ajout/suppression, statut online |
| **Chat** | Conversations DM |
| **Notifications** | Centre de notifications |
| **Legal** | Privacy Policy + Terms of Service |

---

## 5. Modules et points

| # | Feature / module | Catégorie sujet | Type | Pts |
|---|---|---|---|---|
| 1 | Frameworks frontend + backend | Web | Major | **2** |
| 2 | Login OAuth 42 | User Management | Minor | **1** |
| 3 | Profil, avatar, amis, online status | User Management | Major | **2** |
| 4 | Chat DM + profil + amis | Web — User interaction | Major | **2** |
| 5 | WebSockets (notifs live, présence) | Web — Realtime | Major | **2** |
| 6 | API publique slots (5+ endpoints CRUD, API key, rate limit, docs) | Web — Public API | Major | **2** |
| 7 | ORM | Web | Minor | **1** |
| 8 | Système de notifications | Web | Minor | **1** |
| 9 | Recherche avancée events (filtres, tri, pagination) | Web | Minor | **1** |
| 10 | Gamification (badges / XP / leaderboard — min. 3 mécaniques) | Gaming & UX | Minor | **1** |
| 11 | Export PDF (transcript) | Data & Analytics | Minor | **1** |
| 12 | Dashboard analytics (logtime + charts interactifs, export, filtres dates) | Data & Analytics | Major | **2** |
| | | | **Total** | **18** |

**Répartition :** 14 pts minimum sujet + **4 pts bonus** (User interaction + Realtime).

> Lors de l’évaluation, chaque module doit être **démontrable et fonctionnel**. Un module incomplet = 0 pt.

---

## 6. API publique (module Major)

Exposée pour le module « Public API », indépendante de l’usage UI interne.

**Exigences sujet :**

- Clé API sécurisée
- Rate limiting
- Documentation
- Au minimum 5 endpoints couvrant GET / POST / PUT / DELETE

**Ressource principale proposée : slots d’évaluation**

| Méthode | Endpoint (exemple) | Action |
|---|---|---|
| `GET` | `/api/slots` | Lister les slots |
| `GET` | `/api/slots/:id` | Détail d’un slot |
| `POST` | `/api/slots` | Créer un slot |
| `PUT` | `/api/slots/:id` | Modifier un slot |
| `DELETE` | `/api/slots/:id` | Supprimer un slot |

*(Des endpoints favoris / notifications peuvent compléter la doc si besoin.)*

---

## 7. Temps réel (WebSockets)

| Événement | Comportement |
|---|---|
| Connexion / déconnexion | Mise à jour du statut online |
| Nouveau message DM | Push vers le destinataire |
| Nouvelle notification | Push centre de notifs |
| Slot réservé / annulé | Notif aux parties concernées |

Gestion propre des déconnexions et reconnexions.

---

## 8. Stack technique

| Couche | Choix | Justification |
|---|---|---|
| **Frontend** | **TanStack Start** (React) + Tailwind CSS | Framework React moderne (routing, SSR, data loading) — compte module Web FE |
| **Backend** | **Python + FastAPI** | Framework backend (équivalent sujet : Django/Flask/…) — API REST + WebSockets, stack utile pro |
| **Base de données** | **PostgreSQL** | Relationnel clair (users, slots, amis, notifs) |
| **ORM** | **SQLAlchemy** (+ Alembic pour migrations) | Module ORM mineur |
| **Auth** | OAuth 2.0 — provider **42** | Login Intra réel |
| **Temps réel** | WebSockets (FastAPI / Starlette) | Notifs live + présence online |
| **Conteneurs** | Docker Compose — `docker compose up --build` | Images `web` + `api` + `db` (Postgres) — exigence sujet |
| **Secrets** | `.env` + `.env.example` | Exigence sujet |
| **Tooling** | UV (Python), pnpm (front) | Setup monorepo déjà en place |

**Architecture :**

```
[ TanStack Start (React) ]  --HTTPS-->  [ FastAPI (Python) ]  --  [ PostgreSQL ]
         ^                                      |
         |              WebSockets (notifs, chat, online)
```

- Le front consomme l’API BetterIntra + affiche les données agrégées (API 42 proxyfiées côté backend).
- Le backend parle à l’API 42 (tokens OAuth), gère la BDD, l’API publique, et les WebSockets.
- Aucun secret 42 côté navigateur : les appels API 42 passent par le backend.
- Layout monorepo : `apps/web` (TanStack Start) + `apps/server` (FastAPI).
- Contexte agent / commandes scaffold : `AGENTS.md` à la racine.

*(Justification détaillée à reporter dans le README « Technical Stack ».)*

---

## 9. Modèle de données (couche BetterIntra)

Entités minimales à prévoir :

| Entité | Rôle |
|---|---|
| `User` | Cache / miroir du user 42 (id 42, login, avatar URL, tokens…) |
| `Friendship` | Relation d’amitié entre deux users |
| `Slot` | Créneau d’évaluation (owner, start, end, status, booked_by…) |
| `EventFavorite` | Favori d’un event 42 (event_id + user_id) |
| `Conversation` / `Message` | Chat DM |
| `Notification` | Notifications persistées |
| `Badge` / `UserBadge` | Gamification |
| `UserStats` (optionnel) | XP, level, compteurs pour leaderboard |

> Le schéma détaillé (types, relations, contraintes) sera formalisé dans un document / README dédié avant l’implémentation.

---

## 10. Exigences non fonctionnelles

- UI **claire, responsive, accessible** sur desktop et mobile
- Validation des inputs **frontend et backend**
- Pas de secrets commités
- Commits Git clairs, provenant de **tous** les membres de l’équipe
- Performance correcte en multi-utilisateurs (pas de race condition évidente sur slots / amis)
- Code compréhensible : chaque membre doit pouvoir expliquer sa partie à l’éval

---

## 11. Organisation équipe (rappel sujet)

Rôles à assigner et documenter dans le README :

- **Product Owner (PO)**
- **Project Manager / Scrum Master (PM)**
- **Technical Lead / Architect**
- **Developers** (tous)

Tous les membres contribuent à la partie obligatoire **et** aux modules.

---

## 12. Critères d’acceptation (MVP)

Le projet est considéré prêt pour évaluation lorsque :

1. Un utilisateur se connecte via OAuth 42 et voit son profil réel.
2. Les pages Projets, Agenda, Évals, Logtime affichent des données API 42 cohérentes.
3. Les slots sont gérables en CRUD via l’UI **et** l’API publique documentée.
4. Amis + chat DM + notifications fonctionnent entre au moins 2 comptes.
5. Le statut online et les notifs passent en temps réel (WebSocket).
6. Le dashboard analytics (logtime / charts) est interactif avec filtres de dates.
7. L’export PDF du transcript fonctionne.
8. Au moins 3 mécaniques de gamification sont persistées en BDD.
9. Privacy Policy + Terms of Service sont accessibles et pertinents.
10. `docker compose up` lance l’ensemble du projet.
11. Le README couvre toutes les sections exigées par le sujet.
12. Aucun warning/erreur console sur le parcours nominal Chrome.

---

## 13. Livrables

- Dépôt Git avec historique multi-auteurs
- Application conteneurisée
- `.env.example`
- README.md (EN) conforme au sujet
- Documentation API publique
- Privacy Policy + Terms of Service
- Le présent cahier des charges (`docs/cahier-des-charges.md`)

---

## 14. Synthèse

**BetterIntra = Intra en lecture (API 42) + couche sociale/orga (BDD) + UI moderne minimale.**

| Objectif | Valeur |
|---|---|
| Points ciblés | **18** |
| Pages principales | 10 |
| Modules Major | 6 (12 pts) |
| Modules Minor | 6 (6 pts) |
| Écriture API 42 | Non |
| Jeu / IA / Blockchain / DevOps lourd | Non |

---

*Document de référence pour le scoping équipe. Toute évolution de périmètre doit être validée collectivement et répercutée ici + dans le README.*
