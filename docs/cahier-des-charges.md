# Cahier des charges — BetterIntra

**Cadre :** ft_transcendence Surprise · **Cible :** 15 pts · **v1.12** · 21 août 2026

> **v1.12** — Recherche events avancée retirée du scope (Web Minor hors cible).  
> **v1.11** — Peer recommendations retirées du scope (module of choice hors cible).  
> **v1.10** — i18n retiré du scope (hors bonus / hors cible).  
> **v1.9** — Major *Web public API* rétabli : **profils BetterIntra (bio…)** à la place des slots. Slots restent hors scope.

---

## 1. Vision

Intra 42 moderne : compte BetterIntra (email/password), **lien OAuth 42** pour lire les vraies data école, couche sociale/orga **chez nous** (PostgreSQL). Pas d’écriture sur l’API 42. Sans Intra lié → pas de data 42 (CTA « Lie ton Intra »).

**Règle :** lecture API 42 · écriture BDD BetterIntra · secrets 42 uniquement côté backend.

---

## 2. Auth

| Mode | Accès |
|---|---|
| Email + password | Compte local (exigence sujet). Features BetterIntra (amis, chat, profil étendu, notifs…). |
| + OAuth 42 lié | Tokens en BDD → profil 42, projets, events, évals, logtime… |

Email/password **ne remplace pas** OAuth (module +1). OAuth **ne remplace pas** email/password (base obligatoire).

---

## 3. Features

### 3.1 Data 42 (lecture seule — Intra lié requis)

Sans compte 42 lié, ces écrans affichent un CTA « Lie ton Intra » (pas d’appel API 42).

- **Profil 42** — login, avatar, displayname, campus, wallet et points de correction (lecture)
- **Cursus** — niveau, grade, progression
- **Projets** — liste des projets, statut, notes
- **Events** — agenda campus (lecture) via feed unifié ; pas de module « recherche avancée »
- **Évaluations** — historique (correcteur / corrigé)
- **Logtime** — présence / locations + stats d’heures à l’école
- **Recherche users** — trouver et ouvrir le profil d’un autre élève

### 3.2 Features BetterIntra (notre BDD / notre logique)

- **Profil unifié Intra-first** — `GET /users/me` + `GET /users/{login}` (tout login 42). Flag `is_betterintra_linked` pour le front ; bio/id seulement si compte BI. Bio éditable seulement si Intra lié
- **Events BetterIntra** — CRUD JWT sur `/events` ; `GET /events` = feed unifié Intra + BetterIntra (DTO `source` / id composite)
- **API publique events + clés API** — ≥ 5 endpoints CRUD `/api/v1/events`, **clé API** personnelle (`X-API-Key`), **rate limit**, OpenAPI (Major Web public API — voir §6)
- **Amis (follows Intra-first)** — follow n’importe quel login 42 ; `intra_people` + `is_betterintra_linked` (+ bio si BI) ; following/followers + compteurs ; JWT + Intra lié côté follower
- **Chat DM** — messages privés 1-to-1 entre comptes BetterIntra Intra-liés ; thread auto au 1er message ; last-read ; block ; WS live
- **Statut online** — présence globale via WebSocket
- **Notifications** — inbox simple (`type`, `body`, `url`, `created_at`) ; purge auto 7j ; push WS ; pas de mute/read
- **WebSockets** — online, nouveaux messages, read receipts (pas de typing)
- **Analytics logtime** — `GET /analytics/logtime` (totaux, jours actifs, par jour/semaine/weekday) + **export PDF/CSV**

### 3.3 Hors scope

- **Recherche events avancée** (filtres/tri/pagination type Web Minor) — hors cible ; agenda simple + CRUD BI suffit
- **Peer recommendations** (module of choice) — hors cible
- **i18n** (3 langues / language switcher) — hors cible ; UI en français (ou EN README seulement)
- **Slots d’évaluation** (simulés ou réels) — coupe v1.8, non repris
- Toute **écriture** sur l’API 42 (subscribe projet, vrais slots, wallet…)
- Moulinette, shop, map clusters live
- Affichage achievements 42 / skills
- Gamification BetterIntra (badges, XP, leaderboard)
- Favoris d’events, préférences UI avancées
- IA / ML (dont le Major « recommendation system » du sujet), jeux, ELK / Prometheus, RTL / multi-browser

---

## 4. Pages

| Page | Contenu |
|---|---|
| Login / Signup | Email + password · lien OAuth 42 |
| Dashboard | Synthèse (niveau, points, prochaines évals/events, notifs) |
| Profil | Soi / autres · data 42 si lié · bio BetterIntra · amis |
| Projets | Liste, statut, notes |
| Agenda | `GET /events` unifié (Intra + BI) · CRUD BI |
| Évaluations | Historique (correcteur / corrigé) |
| Logtime | Calendrier + analytics + export |
| Amis | Liste, ajout/retrait, online |
| Chat | Conversations DM |
| Notifications | Centre de notifications |
| Legal | Privacy Policy + Terms of Service |

---

## 5. Modules → 15 pts

| # | Module | Cat. | Pts |
|---|---|---|---|
| 1 | Frameworks FE + BE | Web Major | 2 |
| 2 | OAuth 42 | User Mgmt Minor | 1 |
| 3 | Profil, avatar, amis, online | User Mgmt Major | 2 |
| 4 | Chat + profil + amis | Web interaction Major | 2 |
| 5 | WebSockets | Web realtime Major | 2 |
| 6 | API publique events + clés API | Web public API Major | 2 |
| 7 | ORM | Web Minor | 1 |
| 8 | Notifications | Web Minor | 1 |
| 9 | Analytics logtime + export | Data Major | 2 |
| | | **Total** | **15** |

Email/password = exigence base (**0 pt**). Export PDF = inclus dans #9. i18n + peer reco + recherche events avancée **hors scope**.

Seuil sujet = **14** ; modules incomplets = 0 à l’éval. Cible équipe = **15** (filet léger au-dessus de 14).

---

## 6. API publique (events)

Ressource : **events BetterIntra** stockés chez nous (pas d’écriture sur l’API 42).

Deux modes d’accès :
1. **JWT (front)** — `GET /events` = feed unifié ; `POST/PATCH/DELETE /events` pour les events BetterIntra (sans clé API).
2. **Clé API (automation / Major)** — utilisateur génère une clé via `POST /api-keys` (JWT), puis appelle `/api/v1/events` avec `X-API-Key`.

Exigences du Major :
- **Clé API** (header `X-API-Key`)
- **Rate limit** (par clé)
- **Docs OpenAPI** (`/docs`)
- **≥ 5 endpoints** :
  - `GET /api/v1/events`
  - `POST /api/v1/events`
  - `GET /api/v1/events/:id`
  - `PUT /api/v1/events/:id`
  - `DELETE /api/v1/events/:id`

Gestion des clés (JWT) : `POST/GET /api-keys`, `DELETE /api-keys/:id` (la raw key n’est renvoyée qu’à la création).

---

## 7. Temps réel

WS : online · nouveaux DM · notifs · reconnexion propre.

---

## 8. Stack

React + Vite SPA · TanStack Router/Query · Tailwind/shadcn · FastAPI · SQLAlchemy/Alembic · PostgreSQL · Docker Compose (`web` nginx + `api` + `db`) · UV / pnpm · monorepo `apps/web` + `apps/server`

---

## 9. Modèle BDD (min)

`User` · `IntraPerson` · `Friendship` · `Event` · `ApiKey` · `Conversation`/`Message`/`ConversationRead` · `UserBlock` · `Notification`

---

## 10. Contraintes / livrables

Docker 1 commande · HTTPS · Chrome sans warnings · `.env` + example · Privacy + Terms · README EN (rôles PO/PM/TL + modules) · commits multi-auteurs · validation inputs FE+BE

**MVP ok si :** auth dual · data 42 si lié · profil bio · events BI + API publique events (clés) · social+WS · analytics+export · Privacy/ToS · compose up · README EN.

---

## 11. Équipe (ownership produit)

| Rôle | Focus |
|---|---|
| Malik | Backend / OAuth / proxy 42 / profils / events + API publique / social API / WS |
| Swan | Frontend / pages / legal |
| Ayoub | DevOps / Compose / HTTPS / envs / seed démo |
| Kylian | *(reco coupée)* — à réassigner (social front, notifs, tests, README…) |

Rôles sujets (PO / PM / TL) à documenter dans le README.

---

*Scoping équipe. Toute coupe de feature → mettre à jour ce fichier + le README.*
