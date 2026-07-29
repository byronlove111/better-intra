# BetterIntra — concept équipe

## Intro

BetterIntra, c’est une Intra 42 plus moderne et plus sociale. Tu te connectes avec ton vrai compte 42, tu retrouves tes vraies infos d’école, et tu gagnes en plus des features que l’Intra ne couvre pas bien : slots d’éval entre potes, amis, chat, notifs, et des suggestions de personnes à contacter pour avancer sur un projet.

Pour afficher la réalité d’un élève, on s’appuie sur **l’API officielle 42**. Quand quelqu’un se connecte en OAuth, notre backend récupère ses données Intra (et celles qu’on a le droit de lire) et les expose à notre interface. Tout ce qui est “social / organisationnel” (amis BetterIntra, chat, slots simulés, notifs, reco) est stocké **chez nous**, dans PostgreSQL. On ne réécrit jamais l’Intra officiel.

Cadre : ft_transcendence Surprise, cible **18 pts**, app conteneurisée avec HTTPS. Pas de moulinette, pas d’IA.

---

## L’API 42 : ce qu’on récupère, ce qu’on peut en faire

L’API 42 est notre source de vérité pour tout ce qui concerne l’école. Après le login OAuth, le backend appelle 42 en lecture seule et peut notamment récupérer :

- le **profil** (login, avatar, campus, wallet, points de correction…)
- le **cursus** (niveau, grade, progression)
- les **projets** (liste, statut, notes)
- les **events** du campus
- l’historique d’**évaluations** (en tant que correcteur / corrigé)
- le **logtime** / la **présence** (locations, stats d’heures à l’école, qui est logué sur le campus maintenant)
- les **achievements** et **skills**
- la **recherche d’autres users** (pour afficher un profil tiers)

Avec ça, on peut construire le dashboard, les pages profil / projets / agenda / logtime / évals, alimenter l’export PDF, et surtout calculer les **recommandations** (même projet / avancée proche + créneaux de présence qui se chevauchent).

Ce qu’on ne fait **pas** avec l’API 42 : écrire. Pas d’inscription réelle à un projet, pas de vrais slots Intra, pas de modification de wallet. Les actions BetterIntra vivent dans notre base.

Point d’attention : l’API 42 a un **rate limit**. On ne spamme pas 42 à chaque clic : le backend met en cache et sert le front (et la reco) via nos propres endpoints.

---

## Features de base (data 42, relue et réaffichée chez nous)

- Connexion OAuth 42
- Dashboard (niveau, points d’éval, prochaines évals / events…)
- Profil (soi + autres) à partir des données Intra
- Projets (statut, notes)
- Agenda events avec recherche (filtres, tri, pagination)
- Historique d’évaluations
- Logtime / analytics (calendrier, graphiques, filtres de dates)
- Export PDF (transcript)
- Pages Privacy Policy + Terms of Service

## Ce qu’on rajoute (écrit dans notre BDD / logique BetterIntra)

- **Amis** + statut online
- **Messages privés** (chat DM)
- **Recommandations** : personnes à contacter selon le même projet / avancée proche + horaires de présence à l’école qui se chevauchent
- Gestion de slots d’évaluation (créneaux simulés, pas les vrais slots Intra)
- API publique des slots (clé API, rate limit, docs)
- Notifications (persistées + live)

---

## Répartition

### Malik — Backend

Malik porte l’API : OAuth 42, proxy lecture vers l’API 42 (avec cache), modèles / migrations, slots + API publique, amis, chat, notifications, export PDF, et le temps réel (présence, push messages / notifs). Le front et la reco ne parlent jamais directement à 42 : tout passe par lui.

### Swan — Frontend

Swan porte l’UI : shell de l’app, login, toutes les pages listées plus haut, dark mode, parcours propre sur Chrome. Pour la reco, il construit l’écran des suggestions (pourquoi cette personne, actions profil / ami / message) sans calculer le matching lui-même.

### Ayoub — DevOps

Ayoub porte le run : Docker Compose (web + api + db) en une commande, HTTPS, secrets / envs, machine de démo, README de lancement, seed minimal pour la soutenance. Pas de DevOps “usine” (ELK, etc.) : juste ce qu’il faut pour une éval propre.

### Kylian — Recommandations

Kylian porte le matching “qui contacter”. Idée : proposer des gens sur le **même projet** (ou une progression proche) dont le **logtime** se chevauche souvent avec le tien — pour favoriser l’entraide IRL. Les données viennent de l’API 42 (projets, cursus, locations / logtime, présents sur le campus), déjà agrégées côté backend. Scoring simple et explicable, pas d’IA. En v1, on cible surtout les users déjà inscrits sur BetterIntra (rate limit 42).

---

## Fin

On s’entraide aux frontières (contrats API tôt, URLs / HTTPS figés, UI branchée sur des réponses stables). La reco différencie le produit sans sortir du sujet. Doc à itérer après feedback d’équipe.
