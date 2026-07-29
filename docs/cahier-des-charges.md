# Cahier des charges — BetterIntra

**Cadre :** ft_transcendence Surprise · **Cible :** 18 pts · **v1.7** · 29 juil. 2026

---

## 1. Vision

Intra 42 moderne : compte BetterIntra (email/password), **lien OAuth 42** pour lire les vraies data école, couche sociale/orga **chez nous** (PostgreSQL). Pas d’écriture sur l’API 42. Sans Intra lié → pas de data 42 (CTA « Lie ton Intra »).

**Règle :** lecture API 42 · écriture BDD BetterIntra · secrets 42 uniquement côté backend.

---

## 2. Auth

| Mode | Accès |
|---|---|
| Email + password | Compte local (exigence sujet). Features BetterIntra (amis, chat, slots, notifs…). |
| + OAuth 42 lié | Tokens en BDD → profil, projets, events, évals, logtime, reco… |

Email/password **ne remplace pas** OAuth (module +1). OAuth **ne remplace pas** email/password (base obligatoire).

---

## 3. Features

### 3.1 Data 42 (lecture seule — Intra lié requis)

Sans compte 42 lié, ces écrans affichent un CTA « Lie ton Intra » (pas d’appel API 42).

- **Profil** — login, avatar, displayname, campus, wallet et points de correction (lecture)
- **Cursus** — niveau, grade, progression
- **Projets** — liste des projets, statut, notes
- **Events** — agenda campus + recherche avancée (filtres, tri, pagination)
- **Évaluations** — historique (correcteur / corrigé)
- **Logtime** — présence / locations + stats d’heures à l’école
- **Recherche users** — trouver et ouvrir le profil d’un autre élève

### 3.2 Features BetterIntra (notre BDD / notre logique)

- **Slots d’évaluation** — créer, lister, réserver, annuler, supprimer des créneaux *simulés* (pas les vrais slots Intra)
- **API publique des slots** — ≥ 5 endpoints CRUD, clé API, rate limit, documentation OpenAPI
- **Amis** — ajouter / retirer, liste d’amis
- **Statut online** — présence en temps réel des amis connectés à BetterIntra
- **Chat DM** — messages privés 1-to-1
- **Notifications** — centre de notifs (slots, amis, messages…) persistées + push live
- **WebSockets** — online, nouveaux messages, notifs, events slots
- **Analytics logtime** — calendrier / graphiques, filtres de dates, **export** (PDF/CSV inclus dans ce module)
- **i18n** — au moins 3 langues complètes, language switcher, textes user-facing traduisibles
- **Recommandations** — suggestions de personnes à contacter (même projet / avancée proche + overlap d’horaires à l’école) ; scoring déterministe ; module of choice (voir §5.1)

### 3.3 Hors scope

- Toute **écriture** sur l’API 42 (subscribe projet, vrais slots, wallet…)
- Moulinette, shop, map clusters live
- Affichage achievements 42 / skills
- Gamification BetterIntra (badges, XP, leaderboard)
- Favoris d’events, préférences UI avancées (hors switcher i18n)
- IA / ML (dont le Major « recommendation system » du sujet), jeux, ELK / Prometheus, RTL / multi-browser

---

## 4. Pages

| Page | Contenu |
|---|---|
| Login / Signup | Email + password · lien OAuth 42 |
| Dashboard | Synthèse (niveau, points, prochaines évals/events, notifs) |
| Profil | Soi / autres · data 42 si lié · amis |
| Projets | Liste, statut, notes |
| Agenda | Events + recherche avancée |
| Évaluations | Historique + Manage Slots |
| Logtime | Calendrier + analytics + export |
| Amis | Liste, ajout/retrait, online |
| Chat | Conversations DM |
| Notifications | Centre de notifications |
| Recommandations | Suggestions + raisons + CTA |
| Legal | Privacy Policy + Terms of Service |
| *(global)* | Language switcher i18n |

---

## 5. Modules → 18 pts

| # | Module | Cat. | Pts |
|---|---|---|---|
| 1 | Frameworks FE + BE | Web Major | 2 |
| 2 | OAuth 42 | User Mgmt Minor | 1 |
| 3 | Profil, avatar, amis, online | User Mgmt Major | 2 |
| 4 | Chat + profil + amis | Web interaction Major | 2 |
| 5 | WebSockets | Web realtime Major | 2 |
| 6 | API publique slots | Web public API Major | 2 |
| 7 | ORM | Web Minor | 1 |
| 8 | Notifications | Web Minor | 1 |
| 9 | Recherche events avancée | Web Minor | 1 |
| 10 | Analytics logtime + export | Data Major | 2 |
| 11 | i18n (3 langues) | Accessibility Minor | 1 |
| 12 | Peer recommendations | **Modules of choice** Minor | 1 |
| | | **Total** | **18** |

Email/password = exigence base (**0 pt**). Export PDF = inclus dans #10 (pas un Minor à part). Reco ≠ module AI/ML.

Seuil sujet = **14** ; modules incomplets = 0 à l’éval.

### 5.1 Reco (module of choice)

Matching déterministe : même projet / avancée proche + overlap logtime (+ bonus « à l’école maintenant »). Pool v1 = users BetterIntra avec Intra lié. Endpoint `GET /recommendations` + UI avec **raisons** + CTA profil/ami/DM.

**README (EN) obligatoire** — section *Custom module (Minor) — Peer recommendations* : why / challenges (cache API 42, rate limit, scoring explicable) / value / why 1 pt. Draft détaillé : conserver depuis l’historique git v1.4 §5.1 si besoin.

Owners : Kylian (scoring) · Swan (UI) · Malik (proxy/cache 42).

---

## 6. API publique (slots)

Clé API · rate limit · docs · ≥ 5 endpoints : `GET/POST /api/slots`, `GET/PUT/DELETE /api/slots/:id`

---

## 7. Temps réel

WS : online · nouveaux DM · notifs · slot réservé/annulé · reconnexion propre.

---

## 8. Stack

React + Vite SPA · TanStack Router/Query · Tailwind/shadcn · FastAPI · SQLAlchemy/Alembic · PostgreSQL · Docker Compose (`web` nginx + `api` + `db`) · UV / pnpm · monorepo `apps/web` + `apps/server`

---

## 9. Modèle BDD (min)

`User` (email/hash + lien 42 optionnel) · `Friendship` · `Slot` · `Conversation`/`Message` · `Notification` · cache reco si besoin

---

## 10. Contraintes / livrables

Docker 1 commande · HTTPS · Chrome sans warnings · `.env` + example · Privacy + Terms · README EN (rôles PO/PM/TL + modules) · commits multi-auteurs · validation inputs FE+BE

**MVP ok si :** auth dual · data 42 si lié · slots UI+API publique · social+WS · analytics+export · i18n 3 langues · reco démo · compose up · README custom module.

---

## 11. Équipe (ownership produit)

| Rôle | Focus |
|---|---|
| Malik | Backend / OAuth / proxy 42 / slots / social API / WS |
| Swan | Frontend / pages / i18n / UI reco |
| Ayoub | DevOps / Compose / HTTPS / envs / seed démo |
| Kylian | Scoring recommandations |

Rôles sujets (PO / PM / TL) à documenter dans le README.

---

*Scoping équipe. Toute coupe de feature → mettre à jour ce fichier + le README.*
