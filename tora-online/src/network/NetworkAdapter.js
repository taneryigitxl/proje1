export class NetworkAdapter extends EventTarget {
  constructor(mode){super();this.mode=mode;this.connected=false;this.sequence=0;this.capabilities={};}
  async connect(){throw new Error('Bir ağ adapter implementasyonu seçilmeli.');}
  disconnect(){this.connected=false;}
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  sendInput(){throw new Error('Adapter input implementasyonu eksik.');}
  sendChat(){throw new Error('Adapter sohbet implementasyonu eksik.');}
  publishSnapshot(){throw new Error('Snapshot yetkisi adapter tarafından belirlenmeli.');}
}
