# Architecture

Cette page ne liste pas les routes : elle explique **comment** BetterIntra est découpé, où vivent les secrets, et pourquoi certaines features exigent Intra alors que d’autres se contentent d’un JWT.

## Le modèle mental

Le navigateur (ou tout client) parle uniquement à FastAPI. FastAPI écrit dans Postgres BetterIntra pour tout ce qui est « à nous » (profil bio, follows, events BI, chat, notifs, clés API), et lit `api.intra.42.fr` en utilisant les tokens OAuth stockés sur l’utilisateur. Le front ne doit **jamais** appeler Intra directement : les secrets 42 restent côté serveur.

Trois idées à garder en tête. D’abord, un compte email/password et un lien Intra sont deux choses distinctes : tu peux avoir un compte BI sans Intra, mais alors le campus et le social Intra-first sont fermés. Ensuite, le graphe d’amis est Intra-first : tu follow un login 42, qu’il ait ou non un compte BetterIntra ; les champs bio / online n’apparaissent que s’il est aussi lié BI. Enfin, la présence WebSocket n’est pas un annuaire global du campus : elle ne montre que les gens que tu follow et qui sont connectés.

## Où se trouve le code

Sous `apps/server/app/`, chaque dossier porte une responsabilité claire. `auth/` gère register, login, refresh et le flux OAuth 42. `users/` construit les profils unifiés. `friends/` matérialise les follows. `intra/` proxifie l’API 42 et maintient le cache `intra_people`. `events/` et `agenda/` fusionnent le calendrier campus avec les events BetterIntra. `api_keys/` émet les clés du Major public API et applique le rate limit. `chat/` plus `realtime/` couvrent les DM et le hub WebSocket. `notifications/` alimente l’inbox et les hooks. `analytics/` agrège le logtime et exporte CSV/PDF.

Tu n’as pas besoin de tout ouvrir pour brancher un écran : le cookbook te renvoie vers le guide utile.

## Qui a le droit d’appeler quoi

Les routes publiques, ce sont surtout register/login/refresh, le callback OAuth (le navigateur y arrive depuis 42), et les health checks. Dès que tu touches au compte, aux clés API ou au CRUD events JWT, il faut un Bearer. Dès que tu touches au profil d’un autre login, aux follows, au proxy Intra, au chat, à la présence, aux notifs, aux analytics ou au WebSocket, il faut en plus qu’Intra soit lié — sinon **403**.

L’exception du Major, c’est `/api/v1/events` : pas de JWT, mais un header `X-API-Key` appartenant à un user. La clé ne voit que les events de son propriétaire.

## Les flags que le front doit comprendre

Dans les JSON, `is_intra_linked` dit si **ce** compte BetterIntra a connecté OAuth. `is_betterintra_linked` apparaît sur les profils / cartes d’amis et dit si **cette** identité Intra a aussi un compte chez nous (donc bio, DM, online possibles). `login` et `forty_two_id` sont l’identité école. `is_online` n’a de sens que pour un compte BI : `true`/`false` s’il peut avoir un WS, `null` s’il est Intra-only.

Mal lire ces flags, c’est afficher un bouton Message à quelqu’un qui ne peut pas recevoir de DM, ou cacher une bio qui existe.

## Temps réel

Le hub WebSocket vit en mémoire dans un seul process (`realtime/ws_manager.py`). Tu te connectes avec `ws://localhost:8000/ws?token=<access_jwt>` (Intra obligatoire ; en prod `wss://…`). Tu reçois la présence scopée aux follows, les nouveaux messages, les read receipts et les notifications. Ce n’est pas encore multi-worker : pour scaler plus tard il faudrait Redis. Pour le sujet, un process suffit.

## Secrets

Les passwords users sont Argon2id dans `password_hash`. Les clés API sont hashées SHA-256 ; la valeur brute n’est renvoyée qu’à la création. Les tokens 42 access/refresh sont stockés pour que le backend puisse appeler Intra — c’est normal et nécessaire, ce n’est pas le password utilisateur.

## Docs produit autour

Le [cahier des charges](https://github.com/byronlove111/better-intra/blob/main/docs/cahier-des-charges.md) fixe le scope 15 pts (i18n + peer reco + recherche events avancée hors scope). Le déploiement et le brief DevOps sont dans `docs/deploiement.md` et `docs/devops.md`.

Ensuite : [Premiers pas](./getting-started) si tu n’as pas encore de token, [Authentification](./auth) pour OAuth, [Cookbook front](./frontend-cookbook) pour l’intégration écran par écran.
