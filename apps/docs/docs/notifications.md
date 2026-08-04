# Notifications

Les notifications BetterIntra sont une inbox volontairement simple. Pas de « lu / non lu », pas de mute, pas de préférences fines : une ligne apparaît, tu la listes, tu cliques, tu navigues. Elles expirent automatiquement au bout de **sept jours** pour ne pas pourrir la base.

Auth : JWT + Intra lié.

## À quoi ça sert dans le produit

Trois moments du CDC poussent une notif aujourd’hui. Quand quelqu’un t’écrit en DM, tu reçois un `type: "dm"` avec une `url` vers la conversation. Quand quelqu’un te follow (et que tu as un compte BI), tu reçois un `follow`. Quand quelqu’un crée un event BetterIntra, **tous les autres** users BI reçoivent un `event` — pour faire connaître l’orga sans spam Intra.

Chaque item porte un `body` affichable tel quel, et une `url` front (chemin relatif) pour le deep-link au clic. Tu n’as pas à reconstruire l’URL toi-même.

## Lister l’inbox

```js
const { items } = await fetch(
  "http://localhost:8000/notifications?limit=50",
  { headers: { Authorization: `Bearer ${access_token}` } },
).then((r) => r.json());
```

## Le live

Le même objet est poussé en WebSocket sous `notification.created`. Le socket est documenté dans [Chat & temps réel](./chat-realtime) — pas besoin d’un second canal.

```js
// event WS reçu
// { type: "notification.created", payload: { …même shape que l’item REST… } }
```

Il n’y a pas d’endpoint « mark as read » : le modèle ne le fournit pas, et ce n’est pas demandé par le CDC.

Suite : [Chat](./chat-realtime) (origine des DM), [Events](./events) (origine des notifs event), [Cookbook](./frontend-cookbook).
