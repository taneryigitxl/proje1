import { NetworkAdapter } from './NetworkAdapter.js';
/** Transport boundary for a future authenticated server; no simulated accounts/results. */
export class OnlineNetworkAdapter extends NetworkAdapter {
  constructor(transport){super('online');this.transport=transport;this.revision=-1;}
  async connect(){
    if(!this.transport)throw new Error('Çevrimiçi sunucu transportu yapılandırılmadı.');
    const handshake=await this.transport.connect();
    if(handshake?.protocolVersion!==1||handshake.authoritative!==true){this.transport.disconnect?.();throw new Error('Server-authoritative protocol v1 bağlantısı gerekli.');}
    if(typeof this.transport.onSnapshot!=='function'||typeof this.transport.send!=='function'){this.transport.disconnect?.();throw new Error('Çevrimiçi transport için snapshot aboneliği ve intent gönderimi gerekli.');}
    this.unsubscribe=this.transport.onSnapshot(snapshot=>this.receiveSnapshot(snapshot));this.connected=true;this.capabilities=handshake.capabilities||{};this.emit('connected',{mode:this.mode,authoritative:true,capabilities:this.capabilities});return handshake;
  }
  sendInput(input){if(!this.connected)return false;return this.transport.send({type:'intent',sequence:++this.sequence,clientTime:performance.now(),input});}
  sendChat(text,channel='general'){if(!this.connected||!this.capabilities.chat?.[channel])return false;return this.sendInput({type:'chat',channel,text});}
  receiveSnapshot(snapshot){if(!snapshot||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<=this.revision||!Array.isArray(snapshot.entities))return false;this.revision=snapshot.revision;this.emit('snapshot',{...snapshot,authoritative:true});return true;}
  publishSnapshot(){throw new Error('Online modda kritik sonucu yalnız sunucu yayınlayabilir.');}
  disconnect(){this.unsubscribe?.();this.unsubscribe=null;this.transport?.disconnect?.();super.disconnect();}
}
