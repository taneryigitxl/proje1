let nextEntityId = 1;

export class Entity {
  constructor({ type, name, level = 1, health = 100, mana = 0 }) {
    this.id = `${type}-${nextEntityId++}`;
    this.type = type;
    this.name = name;
    this.level = level;
    this.maxHealth = health;
    this.health = health;
    this.maxMana = mana;
    this.mana = mana;
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = 0;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.state = "idle";
    this.targetId = null;
    this.alive = true;
  }

  serialize() {
    return { id: this.id, type: this.type, position: { ...this.position }, rotation: this.rotation,
      velocity: { ...this.velocity }, health: this.health, mana: this.mana, level: this.level,
      state: this.state, targetId: this.targetId };
  }
}
