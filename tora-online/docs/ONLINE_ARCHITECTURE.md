# Tora Online: local play and online migration

The published GitHub Pages game is a playable **local, offline** RPG. It has no authenticated account, shared world, server authority, or server persistence. The UI therefore disables party, guild, friend and private chat actions instead of inventing remote players or messages.

`NetworkAdapter` is the contract for connection, input intents, chat and snapshots. `LocalNetworkAdapter` preserves the current one-player simulation and explicitly labels its snapshots `authoritative: false`. `OnlineNetworkAdapter` requires a protocol-v1 authoritative handshake, an intent transport, and monotonically increasing snapshot revisions. It is an integration boundary, not an enabled online mode. `Game` currently instantiates the local adapter.

An online server must own account registration/login/session, character selection and saved progression. The server must validate movement and position; HP, mana, buffs and combat; mobs, loot and gold; XP, quests, inventory and equipment; and chat, party, guild and friends. The client should send sequenced intents and render server snapshots/events. It must not publish its own combat or progression results in online mode. Reconnection needs a fresh authoritative snapshot and reconciliation of pending intents.

Persist account, character, inventory, equipment, stats, quests, skills and social relationships in the server database. Migrate current per-character local saves explicitly after account ownership is established; do not silently merge or overwrite either source. Once online mode exists, localStorage should hold only graphics, audio, control and UI preferences for that mode. Offline saves can continue as a separate local mode.

Equipment has a ten-slot schema (`weapon`, `offhand`, `helmet`, `chest`, `gloves`, `boots`, `necklace`, `ring1`, `ring2`, `cape`). Only `weapon` and `chest` have gameplay effects today. The legacy saved `armor` key maps to `chest`; inactive slots stay disabled until item definitions and server rules support them.

The next online milestone requires a real service, database migration, authentication, secure transport, protocol and abuse validation, automated server/client integration tests, and an explicit migration UX. None is shipped by the static Pages deployment.
