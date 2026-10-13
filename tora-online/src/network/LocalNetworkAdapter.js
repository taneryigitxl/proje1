import { NetworkAdapter } from './NetworkAdapter.js';
/** Local gameplay remains playable. This adapter never claims server authority. */
export class LocalNetworkAdapter extends NetworkAdapter {
  constructor(){super('offline');this.capabilities={chat:{general:true,near:true},party:false,friends:false,guild:false};}
  async connect(){this.connected=true;const result={mode:this.mode,authoritative:false,capabilities:this.capabilities};this.emit('connected',result);return result;}
  sendInput(input){const packet={sequence:++this.sequence,clientTime:performance.now(),input};this.emit('input',packet);return packet;}
  sendChat(text,channel='general'){if(!this.connected||!this.capabilities.chat[channel])return false;this.emit('chat',{text,channel,local:true});return true;}
  publishSnapshot(entities){const snapshot={sequence:this.sequence,serverTime:performance.now(),entities:entities.map(entity=>entity.serialize()),authoritative:false};this.emit('snapshot',snapshot);return snapshot;}
}
