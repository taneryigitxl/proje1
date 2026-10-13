export const REGIONS = Object.freeze({
  village: { name:'Ayaz Köyü', subtitle:'Güvenli bölge · Demirci Ayame', terrain:'grassland', seed:13, spawn:[0,-9], exits:[{id:'forest',x:0,z:19,name:'Sisli Orman'}], mobs:[] },
  forest: { name:'Sisli Orman', subtitle:'Av bölgesi · Seviye 1–3', terrain:'grassland', seed:42, spawn:[0,-17], exits:[{id:'village',x:0,z:-20,name:'Ayaz Köyü'},{id:'ruins',x:0,z:20,name:'Kadim Harabe'}], mobs:[{x:5,z:-11,type:0,patrol:true},{x:12,z:-3,type:1,patrol:true},{x:-11,z:6,type:2,patrol:true},{x:9,z:13,type:0,patrol:true},{x:-4,z:16,type:1,patrol:true}] },
  ruins: { name:'Kadim Harabe', subtitle:'Seviye 3–5 · Kül Muhafızı', terrain:'rock', seed:91, spawn:[0,-17], exits:[{id:'forest',x:0,z:-20,name:'Sisli Orman'}], mobs:[{x:-6,z:-3,type:2,patrol:true},{x:7,z:1,type:1,patrol:true},{x:0,z:12,type:3,boss:true}] },
});
