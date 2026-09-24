'use strict';
const views = new Set(['actions','government','crude','market-1','market-2','market-3','shops','deliveries','upgrades','refinery-0','refinery-1']);
function safeTree(value, depth=0) {
  if(depth>10) return false;
  if(value===null || typeof value==='boolean')return true;
  if(typeof value==='number')return Number.isFinite(value)&&Math.abs(value)<1e9;
  if(typeof value==='string')return value.length<=300 && /^[a-zA-Z0-9 _.,:|/+()#=;\[\]{}-]*$/.test(value);
  if(Array.isArray(value))return value.length<=128&&value.every(v=>safeTree(v,depth+1));
  return value && typeof value==='object' && Object.keys(value).length<=60 && Object.entries(value).every(([k,v])=>/^[a-zA-Z][a-zA-Z0-9]*$/.test(k)&&!['constructor','prototype','__proto__'].includes(k)&&safeTree(v,depth+1));
}
function validatePresence(data) {
  if(!data || JSON.stringify(data).length>24000 || !views.has(data.left)||!views.has(data.right)||typeof data.overview!=='boolean')throw Error('Invalid view.');
  if(!safeTree(data.draft??null)||!safeTree(data.forms??[])||!safeTree(data.cameras??[])||!safeTree(data.scroll??[]))throw Error('Invalid preview.');
  if(data.click!==null && data.click!==undefined && (typeof data.click!=='string'||data.click.length>180||!/^[a-zA-Z0-9 _.,:|/+()=-]*$/.test(data.click)))throw Error('Invalid click.');
  return {left:data.left,right:data.right,overview:data.overview,draft:data.draft??null,forms:data.forms??[],cameras:data.cameras??[],scroll:data.scroll??[],click:data.click??null};
}
module.exports={validatePresence};
