const ITEMS = ['rusty-sword','leather-vest','health-potion','mana-potion','wolf-fang','torch-oil','iron-blade','gold'];
export function itemArt(id, extra = '') {
 const index = Math.max(0, ITEMS.indexOf(id));
 return '<span class="art-icon item-art '+extra+'" aria-hidden="true" style="background-position:'+index%4*100/3+'% '+Math.floor(index/4)*100+'%"></span>';
}
