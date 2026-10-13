/** One major panel, with modal priority supplied by Game's existing input gate. */
export class PanelManager {
  constructor({blocked=()=>false,onChange=()=>{}}={}) {this.panels=new Map();this.active=null;this.blocked=blocked;this.onChange=onChange;}
  register(id, {element,onOpen=()=>{},onClose=()=>{}}) {this.panels.set(id,{element,onOpen,onClose});}
  open(id) {
    if(this.blocked()||!this.panels.has(id))return false;
    this.close();this.active=id;const panel=this.panels.get(id);panel.element.hidden=false;panel.onOpen();this.onChange(id);return true;
  }
  toggle(id,force) {const shouldOpen=typeof force==='boolean'?force:this.active!==id;return shouldOpen?this.open(id):this.close();}
  close() {
    if(!this.active)return false;const panel=this.panels.get(this.active);this.active=null;panel.element.hidden=true;panel.onClose();this.onChange(null);return true;
  }
  dispose() {this.close();this.panels.clear();}
}
