const VERSION=1;
const LEGACY={inventory:'tora-inventory-v1',stats:'tora-stats-v1',progress:'tora-progress-v1',world:'tora-world-v1',chests:'tora-chests-v1'};
export class SaveService {
 constructor(characterId,storage=globalThis.localStorage){if(!/^[\w-]+$/.test(characterId))throw new Error('Invalid character ID');this.id=characterId;this.storage=storage;}
 key(section){return `tora-character:${this.id}:${section}`;}
 read(section,fallback=null){try{const data=JSON.parse(this.storage.getItem(this.key(section)));return data?.version===VERSION&&data.value!==undefined?data.value:fallback;}catch{return fallback;}}
 write(section,value){try{this.storage.setItem(this.key(section),JSON.stringify({version:VERSION,value}));return true;}catch{return false;}}
 remove(){for(const section of [...Object.keys(LEGACY),'quick-items'])this.storage.removeItem(this.key(section));}
 static legacy(storage=globalThis.localStorage){const values={};for(const [section,key]of Object.entries(LEGACY)){try{const raw=storage.getItem(key);if(raw!==null)values[section]=JSON.parse(raw);}catch{}}return values;}
}
