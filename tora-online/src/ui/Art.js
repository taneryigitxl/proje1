const ITEMS = ['rusty-sword','leather-vest','health-potion','mana-potion','wolf-fang','torch-oil','iron-blade','gold'];
export function itemArt(id, extra = '') {
 const extraItems=['apprentice-staff','cloth-robe','trail-ration','arcane-scroll'];const extraIndex=extraItems.indexOf(id==='jade-staff'?'apprentice-staff':id);if(extraIndex>=0)return '<span class="art-icon class-item-art '+extra+'" aria-hidden="true" style="background-position:'+extraIndex%2*100+'% '+Math.floor(extraIndex/2)*100+'%"></span>';
 const index = Math.max(0, ITEMS.indexOf(id));
 return '<span class="art-icon item-art '+extra+'" aria-hidden="true" style="background-position:'+index%4*100/3+'% '+Math.floor(index/4)*100+'%"></span>';
}
