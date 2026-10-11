/** Bounded A*, including swept segment checks and no corner cutting. */
export function findGridPath(from, goal, canOccupy, halfSize, step = .8) {
  const segment = (a,b) => {
    const count = Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2);
    for(let i=1;i<=count;i++) if(!canOccupy({x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count})) return false;
    return true;
  };
  if (!canOccupy(goal)) return [];
  if (segment(from,goal)) return [goal];
  const size = Math.floor(halfSize*2/step)+1;
  const cell = p => ({x:Math.round((p.x+halfSize)/step),z:Math.round((p.z+halfSize)/step)});
  const point = (x,z) => ({x:x*step-halfSize,z:z*step-halfSize});
  const start=cell(from), target=cell(goal), key=(x,z)=>z*size+x;
  const first={...start,g:0,f:0,parent:null}; const open=[first], seen=new Map([[key(start.x,start.z),first]]);
  const closed=new Set(); let end=null;
  for(let budget=0;open.length && budget<12000;budget++) {
    let best=0; for(let i=1;i<open.length;i++) if(open[i].f<open[best].f) best=i;
    const cur=open.splice(best,1)[0], k=key(cur.x,cur.z); if(closed.has(k)) continue;
    closed.add(k);
    if(cur.x===target.x && cur.z===target.z) {end=cur;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const x=cur.x+dx,z=cur.z+dz,k2=key(x,z);
      if(x<0||z<0||x>=size||z>=size||closed.has(k2)) continue;
      const next=point(x,z), oldPoint=cur===first?from:point(cur.x,cur.z);
      if(!canOccupy(next)||!segment(oldPoint,next)) continue;
      const g=cur.g+Math.hypot(dx,dz), prev=seen.get(k2);
      if(prev && prev.g<=g) continue;
      const node={x,z,g,f:g+Math.hypot(x-target.x,z-target.z),parent:cur};seen.set(k2,node);open.push(node);
    }
  }
  if(!end) return [];
  const route=[goal]; for(let n=end;n.parent;n=n.parent) route.unshift(point(n.x,n.z));
  const smooth=[];let anchor=from,at=0;
  while(at<route.length) {let far=at; while(far+1<route.length && segment(anchor,route[far+1])) far++;smooth.push(route[far]);anchor=route[far];at=far+1;}
  return smooth;
}
