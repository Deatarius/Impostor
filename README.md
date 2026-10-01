# Impostor

A party game for 3–10 players. Everyone gets the same secret word except one
player, the impostor, who has to bluff their way through.

- **Online** (`index.html`): every player uses their own phone. One person creates a
  room and shares the 4-letter code or invite link.
- **Pass & play** (`local.html`): one phone passed around the group.

## How online play works

There is no backend. The host's browser runs the game and the other phones connect
to it directly over WebRTC using [PeerJS](https://peerjs.com/). PeerJS's free public
broker is only used to introduce the phones to each other.

- The host must keep the game open. If the host's tab closes, the room ends.
  Reloading or briefly locking the phone is fine: the room comes back under the same code.
- Players who reload or lose signal reconnect automatically.
- Each phone only receives its own role.

## Run locally

Any static file server works:

```
npx http-server -p 8080 -c-1
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo, open **Settings → Pages**, set **Source** to "Deploy from a branch",
   and pick `main` / `(root)`.
3. The game is live at `https://<user>.github.io/<repo>/` within a minute or two.

## Adding words

Edit `words.js`. Each key is a category and each value is its list of words.
