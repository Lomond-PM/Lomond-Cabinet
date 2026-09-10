"use strict";
// Test inputs and observations only; both validators are the actual production exports.
const contracts = require("../../client/js/vela/velaCapabilityContracts");
const units = s => Array.from({ length: s.length }, (_, i) => s.charCodeAt(i));
function cases() {
 const rows=[]; const add=(id,name,valid,bytes)=>rows.push({id,name,valid,bytes});
 for(const code of [0xD800,0xDBFF,0xDC00,0xDFFF]) {
  const s=String.fromCharCode(code);
  for(const [position,name] of [["single",s],["start",s+"A"],["middle","A"+s+"B"],["end","A"+s]]) add(code.toString(16)+"-"+position,name,false);
 }
 for(const [id,codes] of [["reverse",[0xDC00,0xD800]],["two-high",[0xD800,0xDBFF]],["pair-high",[0xD800,0xDC00,0xDBFF]],["pair-low",[0xD800,0xDC00,0xDFFF]]]) add(id,String.fromCharCode(...codes),false);
 for(const [id,name] of [["min-pair",String.fromCharCode(0xD800,0xDC00)],["max-pair",String.fromCharCode(0xDBFF,0xDFFF)],["two-pairs","😀🚀"],["mixed"," 标题日本語 العربية 😀 "],["ascii","Hero"],["chinese","主标题"],["terminal-pair","Hero😀"]]) add(id,name,true,Buffer.byteLength(name,"utf8"));
 for(const n of [255,256,257]) {add("ascii-"+n,"a".repeat(n),n<=256,n);add("chinese-"+n,"中".repeat(85)+"a".repeat(n-255),n<=256,n);add("pair-"+n,"😀".repeat(63)+"中"+"a".repeat(n-255),n<=256,n);}
 for(const name of ["","   ","A\nB","A\tB","A\u0000","A\u007f"]) add("existing-invalid-"+units(name).join("-"),name,false);
 return rows;
}
function observe() {
 return cases().flatMap(sample=>["validateCapabilityParams","validateRepresentationCapabilityParams"].map(entry=>{
  const record={...sample,codeUnits:units(sample.name),entry};
  try {record.result=entry==="validateCapabilityParams"?contracts[entry](contracts.getLocalProjection("set-layer-name-v1"),{name:sample.name}):contracts[entry]("set-layer-name-v1",{name:sample.name});record.accepted=true;record.frozen=Object.isFrozen(record.result);}catch(e){record.accepted=false;record.error={code:e.code,message:e.message};}
  return record;
 }));
}
module.exports={cases,observe,units};
