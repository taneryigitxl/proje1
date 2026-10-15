const ITEMS = ['rusty-sword','leather-vest','health-potion','mana-potion','wolf-fang','torch-oil','iron-blade','gold'];
const PATHS = {
 sword:'m5 19 14-14-1 5-9 9M4 14l6 6m-5-1-2 2',
 shield:'M12 3 4 6v5c0 5 4 8 8 10 4-2 8-5 8-10V6z',
 helmet:'M5 15V10a7 7 0 0 1 14 0v5l-4 3v-6H9v6zM12 3v8',
 armor:'m8 3 4 2 4-2 5 5-4 3v10H7V11L3 8z',
 hand:'M8 12V5a1 1 0 0 1 2 0v5-7a1 1 0 0 1 2 0v7-6a1 1 0 0 1 2 0v6-4a1 1 0 0 1 2 0v8l3-3 1 2-5 8H9l-5-7 1-2z',
 boots:'M8 3h7v12l5 3v3H5v-6h3z',
 necklace:'M5 4c0 8 2 12 7 12s7-4 7-12M12 15l3 3-3 4-3-4z',
 ring:'M8 5l4-3 4 3-4 4zM8 9a7 7 0 1 0 8 0',
 cape:'M8 3h8l5 18H3zM8 3l4 5 4-5',
 slow:'M12 2v20M3 7l18 10M3 17 21 7M8 4l4 4 4-4M8 20l4-4 4 4',
 burn:'M13 2c1 7-5 7-2 12 1-2 3-3 4-5 6 8 3 13-3 13S2 16 7 10c-1 5 1 5 1 5 0-6 4-8 5-13Z',
 bleed:'M12 3c-2 5-7 9-7 13a7 7 0 0 0 14 0c0-4-5-8-7-13Z',
 poison:'M9 3h6M10 3v7l-6 9c-1 2 1 3 3 3h10c2 0 4-1 3-3l-6-9V3M7 16h10',
 stun:'m12 2 2 6 7 1-5 4 2 8-6-4-6 4 2-8-5-4 7-1z',
 regeneration:'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z',
 check:'m5 12 4 4L19 6',
 chevron:'m6 14 6-6 6 6',
};
export function uiIcon(name) {
 return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(PATHS[name]||PATHS.shield)+'"/></svg>';
}
export function itemArt(id, extra = '') {
 const extraItems=['apprentice-staff','cloth-robe','trail-ration','arcane-scroll'];const extraIndex=extraItems.indexOf(id==='jade-staff'?'apprentice-staff':id);if(extraIndex>=0)return '<span class="art-icon class-item-art '+extra+'" aria-hidden="true" style="background-position:'+extraIndex%2*100+'% '+Math.floor(extraIndex/2)*100+'%"></span>';
 const index = Math.max(0, ITEMS.indexOf(id));
 return '<span class="art-icon item-art '+extra+'" aria-hidden="true" style="background-position:'+index%4*100/3+'% '+Math.floor(index/4)*100+'%"></span>';
}
