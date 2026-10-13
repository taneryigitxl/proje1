import { findGridPath } from './Pathfinding.js';
export class Navigation {
  constructor(halfSize) { this.halfSize = halfSize; this.obstacles = []; this.heightProvider = () => 0; }
  setHeightProvider(provider) { this.heightProvider = provider; }
  heightAt(x, z) { return this.heightProvider(x, z); }
  addObstacle(x, z, radius) { this.obstacles.push({ x, z, radius }); }
  findPath(from, desired, radius=.45) {
    const point=this.clamp(desired.clone());
    if(!this.canOccupy(point,radius)) return [];
    return findGridPath(from,point,p=>this.canOccupy(p,radius),this.halfSize-.5).map(p=>new BABYLON.Vector3(p.x,this.heightAt(p.x,p.z),p.z));
  }
  canOccupy(position, radius = 0.45) {
    if (!Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return false;
    if (Math.abs(position.x) > this.halfSize - radius || Math.abs(position.z) > this.halfSize - radius) return false;
    if(this.areaAllowed && !this.areaAllowed(position.x,position.z)) return false;
    return !this.obstacles.some((o) => Math.hypot(position.x - o.x, position.z - o.z) < o.radius + radius);
  }
  resolvePath(from, desired, radius = .45) {
    const point=this.clamp(desired.clone());
    const direct=this.findPath(from,point,radius);
    if(direct.length)return direct;
    // Search nearest free goals, then the last free point on the click ray. Bounded work per click.
    let attempts=0;
    for(let ring=.6;ring<=4.2;ring+=.6){
      const candidates=Array.from({length:12},(_,i)=>new BABYLON.Vector3(point.x+Math.cos(i*Math.PI/6)*ring,0,point.z+Math.sin(i*Math.PI/6)*ring)).filter(p=>this.canOccupy(p,radius)).sort((a,b)=>BABYLON.Vector3.DistanceSquared(a,from)-BABYLON.Vector3.DistanceSquared(b,from));
      for(const candidate of candidates){const path=this.findPath(from,candidate,radius);if(path.length)return path;if(++attempts>=8)break;}
      if(attempts>=8)break;
    }
    const last=this.findReachable(from,point,radius);return this.findPath(from,last,radius);
  }
  clamp(position) {
    position.x = Math.max(-this.halfSize + 0.5, Math.min(this.halfSize - 0.5, position.x));
    position.z = Math.max(-this.halfSize + 0.5, Math.min(this.halfSize - 0.5, position.z));
    return position;
  }
  findReachable(from, desired, radius = 0.45) {
    const point = this.clamp(desired.clone());
    const delta = point.subtract(from); delta.y = 0;
    const steps=Math.max(1,Math.ceil(delta.length()/.2));let last=from.clone();
    for (let i = 1; i <= steps; i++) {
      const test = from.add(delta.scale(i / steps));
      if (!this.canOccupy(test, radius)) return last;
      last=test;
    }
    last.y=this.heightAt(last.x,last.z);return last;
  }
}
