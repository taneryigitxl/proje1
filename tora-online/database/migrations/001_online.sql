CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id uuid PRIMARY KEY,
  username varchar(24) NOT NULL,
  username_key varchar(24) NOT NULL UNIQUE,
  email varchar(254) NOT NULL,
  email_key varchar(254) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_account_idx ON sessions(account_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE characters (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name varchar(16) NOT NULL,
  name_key varchar(32) NOT NULL UNIQUE,
  class_id varchar(16) NOT NULL CHECK (class_id IN ('warrior','mage')),
  level int NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp int NOT NULL DEFAULT 0 CHECK (xp >= 0),
  gold int NOT NULL DEFAULT 50 CHECK (gold >= 0),
  health int NOT NULL CHECK (health >= 0),
  mana int NOT NULL CHECK (mana >= 0),
  region_id varchar(16) NOT NULL DEFAULT 'village',
  position_x double precision NOT NULL DEFAULT 0,
  position_z double precision NOT NULL DEFAULT -9,
  rotation double precision NOT NULL DEFAULT 0,
  strength int NOT NULL,
  vitality int NOT NULL,
  intelligence int NOT NULL,
  dexterity int NOT NULL,
  stat_points int NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX characters_account_idx ON characters(account_id);

CREATE TABLE inventory_items (
  id uuid PRIMARY KEY,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot int NOT NULL CHECK (slot BETWEEN 0 AND 23),
  item_id varchar(64) NOT NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 999),
  UNIQUE (character_id,slot)
);
CREATE TABLE equipment (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot varchar(16) NOT NULL,
  inventory_item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  PRIMARY KEY (character_id,slot),
  UNIQUE (inventory_item_id)
);
CREATE TABLE character_skills (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_slot int NOT NULL CHECK (skill_slot BETWEEN 1 AND 9),
  unlocked boolean NOT NULL DEFAULT true,
  PRIMARY KEY (character_id,skill_slot)
);
CREATE TABLE character_quests (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_id varchar(64) NOT NULL,
  progress int NOT NULL DEFAULT 0,
  accepted boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (character_id,quest_id)
);
CREATE TABLE character_chests (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  chest_id varchar(64) NOT NULL,
  looted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (character_id,chest_id)
);

CREATE TABLE guilds (id uuid PRIMARY KEY,name varchar(40) NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE guild_members (guild_id uuid NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,role varchar(16) NOT NULL DEFAULT 'member',PRIMARY KEY (guild_id,account_id));
CREATE TABLE friends (account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,friend_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,status varchar(16) NOT NULL DEFAULT 'pending',PRIMARY KEY (account_id,friend_id),CHECK (account_id<>friend_id));
