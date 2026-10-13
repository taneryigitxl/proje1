export const ITEM_DEFS = Object.freeze({
  "rusty-sword": {
    id: "rusty-sword", name: "Paslı Kılıç", type: "weapon", slot: "weapon", rarity: "common",
    description: "Başlangıç kılıcı. Güç +2.", bonuses: { strength: 2 }, allowedClasses: ['warrior'],
  },
  "leather-vest": {
    id: "leather-vest", name: "Deri Yelek", type: "armor", slot: "chest", rarity: "common",
    description: "Hafif zırh. Canlılık +2.", bonuses: { vitality: 2 }, allowedClasses: ['warrior'],
  },
  "health-potion": {
    id: "health-potion", name: "Can İksiri", type: "consumable", rarity: "common",
    description: "40 can yeniler.", effect: { health: 40 }, cooldown: 5,
  },
  "mana-potion": {
    id: "mana-potion", name: "Mana İksiri", type: "consumable", rarity: "common",
    description: "35 mana yeniler.", effect: { mana: 35 }, cooldown: 5,
  },
  "wolf-fang": {
    id: "wolf-fang", name: "Kadim Diş", type: "material", rarity: "uncommon",
    description: "Görev / craft malzemesi.",
  },
  "torch-oil": {
    id: "torch-oil", name: "Meşale Yağı", type: "material", rarity: "common",
    description: "Kamp malzemesi.",
  },
  "iron-blade": {
    id: "iron-blade", name: "Demir Kılıç", type: "weapon", slot: "weapon", rarity: "uncommon",
    description: "Demirci işi kılıç. Güç +4.", bonuses: { strength: 4 }, allowedClasses: ['warrior'],
  },
  'apprentice-staff': {id:'apprentice-staff',name:'Acemi Asası',type:'weapon',slot:'weapon',rarity:'common',description:'Yeşim uçlu başlangıç asası. Zeka +2.',bonuses:{intelligence:2},allowedClasses:['mage']},
  'jade-staff': {id:'jade-staff',name:'Yeşim Asası',type:'weapon',slot:'weapon',rarity:'uncommon',description:'Ayame tarafından işlenmiş asa. Zeka +4.',bonuses:{intelligence:4},allowedClasses:['mage']},
  'cloth-robe': {id:'cloth-robe',name:'Kumaş Cübbe',type:'armor',slot:'chest',rarity:'common',description:'Büyücü cübbesi. Canlılık +1, Zeka +1.',bonuses:{vitality:1,intelligence:1},allowedClasses:['mage']},
  'trail-ration': {id:'trail-ration',name:'Yol Azığı',type:'consumable',rarity:'common',description:'25 can ve 10 mana yeniler.',effect:{health:25,mana:10},cooldown:8},
  'arcane-scroll': {id:'arcane-scroll',name:'Arkane Parşömen',type:'consumable',rarity:'uncommon',description:'50 mana yeniler.',effect:{mana:50},cooldown:10},
});
