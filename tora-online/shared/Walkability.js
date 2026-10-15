const STATIC={
  village:[[-12,8,3.6],[13,9,3.6],[15,-13,3.6],[8,-10,1.3],[-15,-14,1.2],[-7,-3,.5],[-8,1,.6],[-8,3.4,.5],[11,-6,.45],[11,-8,.5]],
  forest:[[-1.5,3,.3],[1.5,3,.3],[-5,1.5,.45],[7,4.4,.4],[-9,9,1],[8,9,.4]],
  ruins:[...[-11,11].flatMap(x=>Array.from({length:5},(_,i)=>[x,-6+i*4,1])),...Array.from({length:5},(_,i)=>[-9+i*4.5,20,1]),[-13,15,.75],[13,15,.75],[0,17,.65]],
};
export function canOccupy(region,x,z,radius=.45){
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>25-radius||Math.abs(z)>25-radius)return false;
  if(region==='forest'&&Math.abs(z-3)<1.45+radius&&Math.abs(x)>1.6-radius)return false;
  return !(STATIC[region]||[]).some(([ox,oz,r])=>Math.hypot(x-ox,z-oz)<r+radius);
}
export function safeStep(region,from,dx,dz){
  const next={x:from.x,z:from.z};
  if(canOccupy(region,next.x+dx,next.z))next.x+=dx;
  if(canOccupy(region,next.x,next.z+dz))next.z+=dz;
  return next;
}
export function hasLineOfSight(region,from,to){
 const dx=to.x-from.x,dz=to.z-from.z,length2=dx*dx+dz*dz;
 return !(STATIC[region]||[]).some(([x,z,r])=>{const t=length2?Math.max(0,Math.min(1,((x-from.x)*dx+(z-from.z)*dz)/length2)):0;return Math.hypot(from.x+t*dx-x,from.z+t*dz-z)<r;});
}
