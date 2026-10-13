# Tora Online UI / combat feedback revision — 2026-10-13

Baseline: `936104901e21dcbe89bbeaf71e756b58334a03bd`. The site remains a static, local/offline game at `/tora-online/`.

## BUFF VFX

Guard reads `player.buffs.guard` (6 s) and uses one pooled, translucent steel-blue shield, a moving rim and restrained energy particles. Rage reads `player.buffs.rage` (8 s), attaches emissive/flame/trail effects to the current weapon, enhances attack trails and adds a light foot aura. Recasting refreshes the same effects; expiry fades and restores weapon materials. Icons by the portrait show radial progress, tenths of a second and tooltips. The real browser regression casts all nine skills for both classes and checks VFX attachment and cleanup.

## INTERACTION UI

The old projected DOM buttons for NPCs, chests and exits are gone. A single compact, screen-fixed prompt appears on proximity, hover or selection; the only world-projected element is a smoothed, offscreen-hidden NPC nameplate. **F interacts; E remains the quick-item key** as requested. F also takes all from an open loot bag. The browser test exercises both keys.

## CHEST

The prior code began a looping `chest_opened` clip after opening and again when restoring a looted chest; the generic GLB import also allowed animation autoplay before code stopped the groups. Imported groups now start stopped. `WorldPropAnimation` starts the opening clip once and samples a static final pose, including restored chests. Sound is called only on `CLOSED → OPENING`. The state machine rejects repeat opens and loot is saved. Unit and real browser tests verify one cue, one opening, no loop and a single loot transition.

## MINIMAP

Terrain, roads, water, buildings and borders use a region-cached canvas; a separate canvas draws markers about every 77 ms. Player direction, normal/elite/boss mobs, NPC/quest states, exits, unlooted chests, important loot and reserved party/event marker types have distinct treatment. Zoom has three bounded states; mouse wheel does not affect camera zoom. M opens the full map with regions and filters. Browser checks cover layer separation, markers, zoom and camera independence.

## PLAYER HUD

The frame has a compact portrait/name/class/level hierarchy, eased HP/MP, a delayed damage bar, a thin XP strip and restrained damage/heal/level pulses. The buff icons sit beside it. The quest tracker is smaller and collapsible. Target frames distinguish normal, elite and boss targets, with target outline/ring and real status icon support. The visual language shares dark, gold and steel tokens.

## SHORTCUTS

Nine icon buttons under the profile open character, inventory, skills, quests, party, friends, guild, map and settings. Hover reveals label/key and the buttons support badges. C/I/K/J/M remain shortcuts; party/friends/guild panels show honest empty states. One major panel is open at a time, with Escape closing it.

## SKILLBAR

All nine skills keep keyboard 1–9, but visible number labels were removed. Larger class icons show mana cost, unavailable state, radial cooldown with decimal seconds, active buff glow and a short ready flash. Tooltips show the skill's actual cost, range, cooldown and effect.

## INVENTORY

The wider three-part panel shows an actual idle-animated full-body Babylon rig with equipped clothing and weapon; drag turns it and the wheel adjusts a bounded zoom. It uses an isolated preview scene, reuses that scene between I/C, and does not read GPU pixels or modify the live rig buffers. The ten-slot equipment schema migrates legacy `armor` to `chest`; only weapon and chest are active. Item tooltips display rarity, type, real bonuses and comparison against equipped gear.

## CHARACTER / STATS

The character panel reuses the animated preview and groups truthful basic, attack, defense and movement values, with calculation hints on derived stats.

## MMORPG FOUNDATION

`NetworkAdapter`, `LocalNetworkAdapter` and a guarded `OnlineNetworkAdapter` now separate local simulation from future server intents/snapshots. The static site uses only local mode. Online mode requires a real authenticated, authoritative server and database; the migration plan is in [ONLINE_ARCHITECTURE.md](../../docs/ONLINE_ARCHITECTURE.md). Chat is local general/near/system; online-only channels and social actions are disabled without fake users.

## TEST

Thirty unit tests pass. Production build passes. Edge browser gameplay regression passed separately for Warrior and Mage: character creation/saves, movement/navigation, NPC/shop/quests, loot, exits, nine skills/VFX, death/respawn, UI and console/network errors. The focused Edge browser run passed for both classes at **1366×768, 1920×1080 and 2560×1440**, including panel/preview, F chest one-shot, E quick item, cached minimap and no console/asset errors. See [browser.json](browser.json), [Warrior regression](regression/warrior-browser.json), [Mage regression](regression/mage-browser.json), [before](before/) and [after](after/) screenshots. These are automated browser observations; audio was verified as one call on the chest transition, not by a listening panel.

## KALAN EKSİKLER

This static deployment is not a live MMORPG. Registration, login, sessions, server-synced players/combat/economy/progression, persistent server database, party/friends/guild services and online chat are unimplemented. Their UI actions remain visibly unavailable. The acceptance checks above are for this local polish release, not a claim of live multiplayer.
