export const EQUIPMENT_SLOTS = Object.freeze([
  {id:'weapon',label:'Silah',active:true,icon:'sword'},
  {id:'offhand',label:'İkincil el',active:false,icon:'shield'},
  {id:'helmet',label:'Kask',active:false,icon:'helmet'},
  {id:'chest',label:'Göğüs',active:true,icon:'armor'},
  {id:'gloves',label:'Eldiven',active:false,icon:'hand'},
  {id:'boots',label:'Ayakkabı',active:false,icon:'boots'},
  {id:'necklace',label:'Kolye',active:false,icon:'necklace'},
  {id:'ring1',label:'Yüzük',active:false,icon:'ring'},
  {id:'ring2',label:'Yüzük',active:false,icon:'ring'},
  {id:'cape',label:'Pelerin',active:false,icon:'cape'},
]);
export const RARITIES = Object.freeze({
  common:{label:'Sıradan',color:'#aeb6b2'}, uncommon:{label:'Ender',color:'#85b894'},
  rare:{label:'Nadir',color:'#85afcb'}, epic:{label:'Destansı',color:'#b591cc'},
  legendary:{label:'Efsanevi',color:'#d5ac61'},
});
export const equipmentSlot = id => id === 'armor' ? 'chest' : id;
export function createEquipment(saved = {}) {
  const equipment = Object.fromEntries(EQUIPMENT_SLOTS.map(({id})=>[id,saved[id] || (id==='chest'?saved.armor:null) || null]));
  // Read compatibility for previous saves/API callers; only canonical slots are serialized.
  Object.defineProperty(equipment,'armor',{get(){return this.chest;},set(value){this.chest=value;},enumerable:false});
  return equipment;
}
