import { CLASS_DEFS } from './ClassDefs.js';
import { SaveService } from './SaveService.js';
const KEY='tora-characters-v2';
export class CharacterStore {
 constructor(profile,storage=globalThis.localStorage){this.storage=storage;this.profile=profile.trim().toLocaleLowerCase('tr');this.data={version:2,profiles:{},migrated:false};try{const data=JSON.parse(storage.getItem(KEY));if(data?.version===2&&data.profiles&&typeof data.profiles==='object'&&!Array.isArray(data.profiles))this.data=data;}catch{const broken=storage.getItem(KEY);if(broken)try{storage.setItem(KEY+':corrupt',broken);}catch{}}
  if(!Object.hasOwn(this.data.profiles,this.profile)||!this.data.profiles[this.profile]||typeof this.data.profiles[this.profile]!=='object')Object.defineProperty(this.data.profiles,this.profile,{value:{characters:[],selected:null},enumerable:true,writable:true,configurable:true});this.record=this.data.profiles[this.profile];
  if(!Array.isArray(this.record.characters))this.record.characters=[];
  this.record.characters=this.record.characters.filter(c=>c&&/^[\w-]+$/.test(c.id)&&Object.hasOwn(CLASS_DEFS,c.classId)&&typeof c.name==='string').slice(0,3);
  this.migrate(profile);
 }
 list(){return this.record.characters.map(c=>({...c}));}
 selected(){return this.record.characters.find(c=>c.id===this.record.selected)||this.record.characters[0]||null;}
 validateName(name){const clean=name.trim();if(clean.length<2||clean.length>16||!/^\p{L}[\p{L}\p{N}_-]*$/u.test(clean))return '2–16 harf/rakam kullan; boşluk veya HTML işaretleri kullanma.';if(this.record.characters.some(c=>c.name.toLocaleLowerCase('tr')===clean.toLocaleLowerCase('tr')))return 'Bu profilde aynı adlı bir karakter var.';return null;}
 create(name,classId){if(this.record.characters.length>=3)throw new Error('Üç karakter yuvan dolu.');const error=this.validateName(name);if(error)throw new Error(error);if(!Object.hasOwn(CLASS_DEFS,classId))throw new Error('Geçersiz sınıf.');const c={id:globalThis.crypto.randomUUID(),name:name.trim(),classId,level:1,region:'village',createdAt:Date.now()};this.record.characters.push(c);this.record.selected=c.id;if(!this.persist()){this.record.characters.pop();throw new Error('Karakter kaydedilemedi. Tarayıcı depolamasını kontrol et.');}return {...c};}
 select(id){if(!this.record.characters.some(c=>c.id===id))return false;this.record.selected=id;return this.persist();}
 delete(id,confirmation){const c=this.record.characters.find(c=>c.id===id);if(!c||c.name!==confirmation)return false;const before=this.record.characters;this.record.characters=before.filter(c=>c.id!==id);this.record.selected=this.record.characters[0]?.id||null;if(!this.persist()){this.record.characters=before;return false;}new SaveService(id,this.storage).remove();return true;}
 update(id,patch){const c=this.record.characters.find(c=>c.id===id);if(!c)return;for(const k of ['level','region','lastPlayed'])if(patch[k]!==undefined)c[k]=patch[k];this.persist();}
 persist(){try{this.storage.setItem(KEY,JSON.stringify(this.data));return true;}catch{return false;}}
 migrate(name){if(this.data.migrated)return;const legacy=SaveService.legacy(this.storage);if(!Object.keys(legacy).length)return;const id='legacy-warrior',save=new SaveService(id,this.storage);for(const [section,value]of Object.entries(legacy)){if(!save.write(section,value))return;if(JSON.stringify(save.read(section))!==JSON.stringify(value))return;}
  if(!this.record.characters.some(c=>c.id===id)){this.record.characters.unshift({id,name:/^\p{L}[\p{L}\p{N}_-]{1,15}$/u.test(name)?name:'Ayaz',classId:'warrior',level:legacy.progress?.level||1,region:legacy.world?.region||'village',migrated:true});this.record.selected=id;}
  this.data.migrated=true;if(!this.persist())this.data.migrated=false;
 }
}
