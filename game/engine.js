'use strict';
const {randomInt}=require('node:crypto');
const C=require('../data/components.json');
const G=require('../public/geometry');
const R=require('./rules');
const faces=Object.fromEntries(C.pipeTiles.map(p=>[p.id,p]));
const cards=Object.fromEntries([...C.contracts,...C.orders].map(c=>[c.id,c]));
const families=['government','engineering','human-resources','refined-markets','shops'];
const colors=['orange','teal','silver'];
const rounds=[8,6,4];
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const list=(v,max=100)=>{assert(Array.isArray(v)&&v.length<=max,'Invalid selection list.');return v;};
function shuffle(items,rng=randomInt){const a=[...items];for(let i=a.length-1;i>0;i--){const j=rng(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
const level=(p,f)=>p.upgrades[f]||0;
function capacity(p){for(let g=0;g<4;g++)assert(p.oil.filter(b=>b.grade===g).length<=p.tanks[g]*2,'Not enough tank capacity for that grade.');}
function pay(p,n){assert(Number.isSafeInteger(n)&&n>=0&&p.cash>=n,`You need $${n} for this action.`);p.cash-=n;}
function oil(s,color,grade){return {id:`oil-${s.serial++}`,color,grade};}
function beginTurn(s){
  const actor=s.order[s.turnIndex],p=s.players[actor];
  s.turn={actor,stage:'work',mainCount:0,mainSpace:null,machineUsed:false};
  if(s.round===1&&s.year>1&&p.benefitYear!==s.year){
    p.benefitYear=s.year;
    if(level(p,'government'))s.bonuses.push({actor,source:'Annual government benefit',governmentPipes:1,tanks:0,machines:0,shopPipes:0});
    if(level(p,'shops'))s.bonuses.push({actor,source:'Annual shop benefit',governmentPipes:0,tanks:2,machines:0,shopPipes:0});
  }
}
function restock(s){
  for(const type of ['tank','machine']){
    const def=C.shopSlots.find(x=>x.type===type);
    s.shops[type].slots=def.priceRows.flatMap((price,row)=>Array.from({length:def.twoPlayerSlotsPerRow},(_,i)=>({id:`${type}-${row}-${i}`,price,available:true})));
    s.shops[type].pipes=s.deck.splice(0,4);
  }
}
function createGame(setup,rng=randomInt){
  assert(setup.phase==='setup'&&setup.ready.every(Boolean),'Both players must lock their tank setup.');
  const markers=shuffle(C.refinementMarkers.filter(m=>m.value!==7).map(m=>m.value),rng);
  const action=shuffle(['upgrades','tanks-pipes','machines-pipes','contracts-loans'],rng);
  const s={schema:2,phase:'playing',year:1,round:1,serial:1,order:shuffle([0,1],rng),nextOrder:[],turnIndex:0,
    players:setup.tanks.map(tanks=>({cash:40,tanks:[...tanks],oil:[],pipes:[],machines:[],contracts:[],completedOrders:[],upgrades:{},penalties:0})),
    costs:Object.fromEntries(colors.map((c,i)=>[c,markers.slice(i*3,i*3+3)])),
    deck:shuffle(C.pipeTiles.map(p=>p.id),rng),government:[],shops:{tank:{},machine:{}},
    spaces:[{id:'crude',x:2,y:0},{id:action[0],x:2,y:1},{id:action[1],x:1,y:2},{id:'market-1',x:0,y:2},{id:action[2],x:2,y:3},{id:'market-2',x:2,y:4},{id:action[3],x:3,y:2},{id:'market-3',x:4,y:2}],
    markets:[],contracts:[],orders:[],upgrades:families.map(id=>({id,locked:false,copies:[3,1,1]})),bonuses:[],events:[]};
  s.nextOrder=[...s.order];
  for(let q=0;q<4;q++)s.government.push({open:false,tiles:s.deck.splice(0,8)});
  restock(s);
  s.markets=C.markets.map(m=>({id:m.id,rows:m.rows.map(r=>({color:r.color,grade:r.grade,refresh:r.refresh.maximum,slots:r.twoPlayerSlots.map(i=>({price:r.printedSlotPrices[i],barrel:r.grade===0?oil(s,r.color,0):null}))}))}));
  for(let grade=1;grade<=3;grade++){
    const selected=shuffle(C.contracts.filter(c=>c.setupGroup===grade).map(c=>c.id),rng).slice(0,4);
    s.contracts.push({grade,display:selected.splice(0,2),reserve:selected});
    s.orders.push({size:grade+2,display:shuffle(C.orders.filter(c=>c.setupGroup===grade+2).map(c=>c.id),rng).slice(0,2)});
  }
  beginTurn(s);return s;
}
function pipelines(s,p){return G.analyze(p.pipes,p.machines,faces).map(l=>({...l,value:R.refinementValue(l.segments,Math.min(2,level(p,'engineering')))}));}
function publicState(state){
  if(state.phase==='setup')return state;
  const s=structuredClone(state);if(s.phase==='finished')s.round=4;if(s.year===3)s.government.forEach(q=>q.open=true);s.deckCount=s.deck.length;delete s.deck;
  s.contracts=s.contracts.map(row=>({...row,reserveCount:row.reserve.length,reserve:row.reserve.slice(0,1)}));
  s.players.forEach(p=>{p.pipelines=pipelines(s,p);});return s;
}
function buyPipes(s,p,ids,placements){
  list(ids,8);list(placements,8);
  assert(new Set(ids).size===ids.length&&placements.length===ids.length&&placements.every(t=>ids.includes(t.id)),'Place each selected pipe exactly once.');
  p.pipes=G.place(p.pipes,p.machines,placements,faces);
}
function openQuadrant(s,q,bonus=false){
  R.integer(q,'Government quadrant',0,3);const region=s.government[q];
  if(!region.open){assert(s.government.filter(x=>x.open).length<Math.min(4,s.year+1),'No more government quadrants can open this year.');if(bonus)assert(!s.government.some(q=>q.openedYear===s.year),'A government benefit may open a quadrant only if none has opened this year.');region.open=true;region.openedYear=s.year;}
  return region;
}
function government(s,p,a,free=false){
  const q=openQuadrant(s,a.quadrant,free), indexes=list(a.indexes,free?8:5);
  assert(indexes.length>0&&new Set(indexes).size===indexes.length,'Choose government pipes.');
  indexes.forEach(i=>{R.integer(i,'Pipe space',0,7);assert(q.tiles[i],'That government pipe has already been taken.');});
  if(!free){R.integer(a.anchor,'Worker pipe',0,7);assert(indexes.includes(a.anchor),'Buy the pipe underneath your worker.');
    assert(indexes.every(i=>G.governmentAdjacent(i,a.anchor)),'Select pipes sharing an edge with the worker’s tile; diagonal-only neighbors do not count.');
    pay(p,R.quoteGovernmentPipes(indexes.length));}
  const ids=indexes.map(i=>q.tiles[i]);buyPipes(s,p,ids,a.placements);indexes.forEach(i=>q.tiles[i]=null);
  return ids.length;
}
function takeTank(p,grade){R.integer(grade,'Tank grade',0,3);assert(p.tanks[grade]<5,'Each grade has space for five tanks.');p.tanks[grade]++;}
function takeMachine(s,p,where){
  assert(where&&Number.isSafeInteger(where.x)&&Number.isSafeInteger(where.y),'Choose a pipe half for the machine.');
  assert(G.board(p.pipes,faces).has(`${where.x},${where.y}`),'A machine must cover one half of an existing pipe.');
  assert(!p.machines.some(m=>m.x===where.x&&m.y===where.y),'That pipe half already has a machine.');
  p.machines.push({id:`machine-${s.serial++}`,x:where.x,y:where.y});
}
function shop(s,p,a,type,free=false){
  const st=s.shops[type],pipes=list(a.pipes||[],4), items=list(a.items||[],6);
  assert(pipes.length||items.length,'Choose something from the shop.');
  if(pipes.length){assert(new Set(pipes).size===pipes.length&&pipes.every(id=>st.pipes.includes(id)),'Select available shop pipes.');if(!free)pay(p,R.quoteShopPipes(pipes.length));buyPipes(s,p,pipes,a.placements);st.pipes=st.pipes.filter(id=>!pipes.includes(id));}
  for(const item of items){const slot=st.slots.find(x=>x.id===item.slot);assert(slot?.available,'That shop space is empty.');if(!free)pay(p,slot.price);
    if(type==='tank')takeTank(p,item.grade);else takeMachine(s,p,item);slot.available=false;}
}
function market(s,p,a){
  const transactions=list(a.transactions,60);assert(transactions.length,'Choose oil to buy or sell.');
  let buying=false;const sold=new Set();
  for(const t of transactions){
    assert(['buy','sell'].includes(t.kind),'Choose buy or sell.');
    if(t.kind==='buy')buying=true;else assert(!buying,'Complete all sales before buying oil.');
    const m=s.markets.find(m=>m.id===t.market);
    assert(m&&(m.id===a.space||(a.space!=='crude'&&m.id!=='crude'&&level(p,'refined-markets')>=2)),'That market is not available from this action.');
    const row=m.rows[t.row],slot=row?.slots[t.slot];assert(slot,'Unknown market slot.');
    const price=slot.price+(row.grade>0&&level(p,'refined-markets')>=1?5:0);
    if(t.kind==='buy'){
      assert(slot.barrel,'That oil cannot be bought in this transaction.');pay(p,price);p.oil.push(slot.barrel);slot.barrel=null;
    }else{
      const b=p.oil.find(b=>b.id===t.barrel);assert(b&&!slot.barrel,'Select your oil and an empty market slot.');
      assert(b.grade>=row.grade,'The oil grade is too low for this space.');
      assert(b.color===row.color||(level(p,'refined-markets')>=3&&m.id!=='crude'),'Oil color must match this market row.');
      p.oil=p.oil.filter(x=>x.id!==b.id);slot.barrel={...b,grade:row.grade};sold.add(b.id);p.cash+=price;
    }
  }capacity(p);
}
function contracts(s,p,a){
  const take=list(a.take||[],3);assert(take.length||a.loan===true,'Choose a contract or take a loan.');
  const rows=new Set();for(const t of take){const row=s.contracts.find(r=>r.display.includes(t.id));assert(row&&!rows.has(row.grade),'Take at most one available contract from each row.');
    assert(t.deferred===true||t.deferred===false,'Choose active or deferred.');assert(!t.deferred||s.year<3,'Contracts cannot be deferred in the final year.');
    row.display[row.display.indexOf(t.id)]=null;rows.add(row.grade);p.contracts.push({id:t.id,deferred:t.deferred,filled:[]});}
  if(a.loan===true){p.cash+=15;p.penalties++;}
}
function queueBonus(s,actor,id,n){
  const b={actor,source:`${id} ${n}`,tanks:0,machines:0,shopPipes:0,governmentPipes:0};
  if(id==='government')b.governmentPipes=n*2;
  if(id==='shops'){b.tanks=n===1?2:0;b.machines=n>1?1:0;b.shopPipes=[0,1,2,4][n];}
  if(b.tanks+b.machines+b.shopPipes+b.governmentPipes)s.bonuses.push(b);
}
function upgrade(s,p,a,actor){
  const ids=list(a.upgrades,2);assert(ids.length&&new Set(ids).size===ids.length,'Choose one or two different upgrades.');
  for(const id of ids){const u=s.upgrades.find(u=>u.id===id),n=level(p,id)+1;assert(u&&!u.locked&&n<=3&&u.copies[n-1]>0,'That upgrade is unavailable.');pay(p,20);u.locked=true;u.copies[n-1]--;p.upgrades[id]=n;queueBonus(s,actor,id,n);}
  if(a.lock){const u=s.upgrades.find(u=>u.id===a.lock);assert(u&&!u.locked,'Choose an unlocked upgrade to block.');u.locked=true;}
}
function refine(s,p,a,machine){
  let lines=pipelines(s,p);
  if(machine){assert(!s.turn.machineUsed,'Machines already ran this turn.');lines=lines.filter(l=>l.machineAttached);}
  else {assert(p.pipes.some(t=>t.id===a.tile),'Select a tile in your pipe network.');lines=lines.filter(l=>l.tiles.includes(a.tile)&&!l.machineAttached);}
  const selections=list(a.selections,100);assert(selections.length,'Select at least one barrel to refine.');
  const used=new Map(),barrels=new Set(),changes=new Map();
  for(const sel of selections){const l=lines.find(l=>l.id===sel.pipelineId),b=p.oil.find(b=>b.id===sel.barrelId);
    assert(l&&b,'Choose an eligible pipeline and your oil.');assert(!barrels.has(b.id),'A barrel may run only once in a batch.');
    const previous=used.get(l.id)||[];assert(previous.length<(level(p,'engineering')>=3?2:1),'This pipeline has reached its throughput.');
    if(previous.length)assert(previous[0].grade===b.grade,'Engineering III barrels must begin at the same grade.');
    assert(b.color===l.color&&l.value>=R.refinementCost(s.costs[b.color],b.grade,sel.toGrade),'The pipeline cannot refine this oil to that grade.');
    previous.push(b);used.set(l.id,previous);barrels.add(b.id);changes.set(b.id,sel.toGrade);
  }
  if(machine){pay(p,15);s.turn.machineUsed=true;}
  p.oil=p.oil.map(b=>({...b,grade:changes.get(b.id)??b.grade}));capacity(p);
}
function fulfill(s,p,a){
  let c=p.contracts.find(c=>c.id===a.card),order=false,row;
  if(!c){row=s.orders.find(r=>r.display.includes(a.card));assert(row,'Select your contract or an available order.');c={id:a.card,filled:[]};order=true;}
  assert(!c.deferred,'Deferred contracts activate next year.');const requirements=cards[c.id].requirements;
  const delivery=list(a.delivery,5);assert(delivery.length&&(!order||delivery.length===requirements.length),'An order must be filled completely at once.');
  for(const d of delivery){const b=p.oil.find(b=>b.id===d.barrel),r=requirements[d.slot];assert(b&&r&&!c.filled.includes(d.slot),'Select oil for an unfilled requirement.');assert(b.color===r.color&&b.grade>=r.grade,'Match the color and meet the required oil grade.');
    p.oil=p.oil.filter(x=>x.id!==b.id);c.filled.push(d.slot);p.cash+=R.barrelRevenue(order?'order':'contract',r.grade);}
  if(order){row.display[row.display.indexOf(c.id)]=null;p.completedOrders.push(c.id);}
}
function secondarySpaces(s,p){
  const start=s.spaces.find(x=>x.id===s.turn.mainSpace);if(!start)return [];
  return s.spaces.filter(x=>x.id!==start.id&&Math.abs(x.x-start.x)+Math.abs(x.y-start.y)<=(level(p,'human-resources')>=2?2:1)).map(x=>x.id);
}
function finishWorkAction(s,p,a){
  if(a.orderIndex!==undefined){assert(['upgrades','contracts-loans','tanks-pipes','machines-pipes'].includes(a.space),'This action has no turn-order symbol.');R.integer(a.orderIndex,'Next-round order',0,1);s.nextOrder=s.nextOrder.filter(x=>x!==s.turn.actor);s.nextOrder.splice(a.orderIndex,0,s.turn.actor);}
  if(s.turn.stage==='secondary'){s.turn.stage='machine';return;}
  s.turn.mainCount++;s.turn.mainSpace=a.space||null;
  s.turn.stage=level(p,'human-resources')>=3&&s.turn.mainCount<2?'work':level(p,'human-resources')<3&&s.spaces.some(x=>x.id===a.space)?'secondary':'machine';
}
function cleanContracts(s,final=false){for(const p of s.players){p.contracts=p.contracts.filter(c=>{if(c.deferred){c.deferred=false;return true;}if(c.filled.length<cards[c.id].requirements.length){p.penalties++;return false;}c.filled=final?c.filled:[];return true;});}}
function score(s){
  s.scores=s.players.map(p=>{
    const oilValue=p.oil.reduce((v,b)=>v+R.barrelRevenue('oilAtEnd',b.grade),0);
    const lines=pipelines(s,p),pipeValue=lines.reduce((v,l)=>v+R.pipelineAssetValue(s.costs[l.color],l.value),0);
    const machineValue=lines.filter(l=>l.machineAttached).reduce((v,l)=>v+R.pipelineAssetValue(s.costs[l.color],l.value),0);
    const tankValue=p.tanks.reduce((a,b)=>a+b,0)*10;
    const penalties=5*p.penalties*(p.penalties+3);
    return {cash:p.cash,oil:oilValue,pipes:pipeValue,valuation1:oilValue,valuation2:pipeValue,valuation3:tankValue,machines:machineValue,penalties,total:p.cash+2*oilValue+2*pipeValue+tankValue+machineValue-penalties};
  });s.winner=s.scores[0].total===s.scores[1].total?s.order[0]:s.scores[0].total>s.scores[1].total?0:1;s.phase='finished';
}
function nextTurn(s){
  s.turnIndex++;
  if(s.turnIndex===2){s.turnIndex=0;s.order=[...s.nextOrder];s.round++;
    if(s.round>rounds[s.year-1]){
      cleanContracts(s,s.year===3);
      if(s.year===3){s.round=4;score(s);return;}
      s.year++;s.round=1;if(s.year===3)s.government.forEach(q=>q.open=true);s.events.push(`Year ${s.year}: contracts settled, markets refreshed, shops restocked, upgrades unlocked.`);
      for(const row of s.contracts)row.display=[row.reserve.shift()||null,row.display[0]];
      for(const m of s.markets)for(const row of m.rows){let n=row.refresh;for(let i=row.slots.length-1;i>=0&&n;i--){const slot=row.slots[i];if(row.grade===0&&!slot.barrel){slot.barrel=oil(s,row.color,0);n--;}else if(row.grade>0&&slot.barrel){slot.barrel=null;n--;}}}
      restock(s);s.upgrades.forEach(u=>u.locked=false);
    }
  }beginTurn(s);
}
function normalizeBonuses(s){
  while(s.bonuses.length){const b=s.bonuses[0],p=s.players[b.actor];
    if(!s.shops.tank.slots.some(x=>x.available)||p.tanks.every(n=>n>=5))b.tanks=0;
    if(!s.shops.machine.slots.some(x=>x.available))b.machines=0;
    if(!s.shops.tank.pipes.length&&!s.shops.machine.pipes.length)b.shopPipes=0;
    if(!s.government.some(q=>q.tiles.some(Boolean)&&(q.open||!s.government.some(r=>r.openedYear===s.year)&&s.government.filter(q=>q.open).length<Math.min(4,s.year+1))))b.governmentPipes=0;
    if(b.tanks+b.machines+b.shopPipes+b.governmentPipes)break;s.bonuses.shift();
  }
}
function bonus(s,p,a){const b=s.bonuses[0];
  if(a.kind==='government'){
    assert(b.governmentPipes>0,'No government benefit remains.');const n=list(a.indexes,8).length;assert(n<=b.governmentPipes,'Too many free pipes.');
    government(s,p,a,true);b.governmentPipes-=n;
  }else if(a.kind==='pipes'){
    assert(['tank','machine'].includes(a.shop),'Select a shop.');const ids=list(a.pipes,4);assert(ids.length>0&&ids.length<=b.shopPipes,'Too many free shop pipes.');shop(s,p,{pipes:ids,placements:a.placements,items:[]},a.shop,true);b.shopPipes-=ids.length;
  }else if(a.kind==='tank'||a.kind==='machine'){
    const field=a.kind==='tank'?'tanks':'machines';assert(b[field]>0,'No benefit of that type remains.');shop(s,p,{items:[a.item]},a.kind,true);b[field]--;
  }else if(a.kind==='forfeit-machine'){
    assert(b.machines>0&&!p.pipes.length&&b.shopPipes===0,'A machine can only be forfeited when there is no pipe to place it on.');b.machines=0;
  }else throw new Error('Choose a pending upgrade benefit.');
}
function applyAction(state,actor,a){
  assert(state.phase==='playing','This game is not in progress.');assert(actor===0||actor===1,'Invalid seat.');assert(a&&typeof a==='object'&&!Array.isArray(a),'Invalid action.');
  const s=structuredClone(state);normalizeBonuses(s);
  const expected=s.bonuses[0]?.actor??s.turn.actor;assert(actor===expected,'Wait for your turn.');const p=s.players[actor];
  if(s.bonuses.length){assert(a.type==='bonus','Resolve the upgrade benefit first.');bonus(s,p,a);}
  else if(a.type==='fulfill')fulfill(s,p,a);
  else if(a.type==='machines'){assert(s.turn.stage==='machine','Finish the work phase first.');refine(s,p,a,true);}
  else if(a.type==='end'){assert(s.turn.stage==='machine','Finish or skip the work action first.');nextTurn(s);}
  else if(a.type==='skip'){
    if(s.turn.stage==='work'){s.turn.mainCount++;s.turn.stage=level(p,'human-resources')>=3&&s.turn.mainCount<2?'work':'machine';}
    else if(s.turn.stage==='secondary')s.turn.stage='machine';else throw new Error('Use End turn after the machine phase.');
  }else if(a.type==='work'){
    assert(['work','secondary'].includes(s.turn.stage),'The work phase has ended.');
    if(s.turn.stage==='secondary'){assert(secondarySpaces(s,p).includes(a.space),'Choose the paired secondary action.');if(!level(p,'human-resources'))pay(p,10);}
    switch(a.space){case 'government':government(s,p,a);break;case 'refine':refine(s,p,a,false);break;case 'tanks-pipes':shop(s,p,a,'tank');break;case 'machines-pipes':shop(s,p,a,'machine');break;case 'contracts-loans':contracts(s,p,a);break;case 'upgrades':upgrade(s,p,a,actor);break;default:assert(s.markets.some(m=>m.id===a.space),'Unknown work action.');market(s,p,a);}
    finishWorkAction(s,p,a);
  }else throw new Error('Unknown game action.');
  normalizeBonuses(s);return s;
}
module.exports={createGame,applyAction,publicState,pipelines,secondarySpaces,faces,cards,families,score};
