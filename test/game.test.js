'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../game/engine');
const G=require('../public/geometry');
const C=require('../data/components.json');
const initial=()=>E.createGame({phase:'setup',ready:[true,true],tanks:[[2,1,1,1],[2,1,1,1]]},n=>n-1);
const act=(s,a,who=s.bonuses[0]?.actor??s.turn.actor)=>E.applyAction(s,who,a);
const finish=s=>{while(s.turn.stage!=='machine')s=act(s,{type:'skip'});return act(s,{type:'end'});};
test('all 135 physical pipes have four ports per half, three through paths, and valid rotations',()=>{
  assert.equal(Object.keys(E.faces).length,135);
  for(const tile of C.pipeTiles){
    assert.equal(tile.halves.length,2);for(const half of tile.halves){assert.equal(half.length,2);assert.deepEqual(half.flatMap(p=>p.ports).sort(),['E','N','S','W']);}
    for(let r=0;r<4;r++){const placement={id:tile.id,x:0,y:0,rotation:r},cells=G.cells(placement,E.faces);assert.equal(new Set(cells.map(c=>`${c.x},${c.y}`)).size,2);const lines=G.analyze([placement],[],E.faces);assert.equal(lines.reduce((a,l)=>a+l.segments,0),4);assert.equal(lines.length,3);}
  }
});
test('crossings remain separate, different colors do not join, and machines cut out their half',()=>{
  const fixtures={a:{halves:[[{color:'teal',ports:['N','S']},{color:'orange',ports:['E','W']}],[{color:'orange',ports:['W','E']},{color:'teal',ports:['N','S']}]]},b:{halves:[[{color:'teal',ports:['N','S']},{color:'silver',ports:['E','W']}],[{color:'silver',ports:['W','E']},{color:'teal',ports:['N','S']}]]}};
  const a={id:'a',x:0,y:0,rotation:0},b={id:'b',x:2,y:0,rotation:0};
  assert.equal(G.analyze([a,b],[],fixtures).length,6);
  const cut=G.analyze([a,b],[{id:'m',x:1,y:0}],fixtures);assert.equal(cut.reduce((v,l)=>v+l.segments,0),6);assert.equal(cut.filter(l=>l.machineAttached).length,2);
  assert.throws(()=>G.place([a],[],[{...b,x:0}],fixtures),/overlap/);assert.throws(()=>G.place([a],[],[{...b,x:10}],fixtures),/Connect/);
  assert.throws(()=>G.place([a],[],[{...b,rotation:NaN}],fixtures),/Invalid/);
});
test('setup deals unique government and shop tiles, masks markets, and hides reserve order',()=>{
  const s=initial();assert.equal(s.government.length,4);assert.ok(s.government.every(q=>q.tiles.length===8));
  const ids=[...s.deck,...s.government.flatMap(q=>q.tiles),...Object.values(s.shops).flatMap(x=>x.pipes)];assert.equal(ids.length,135);assert.equal(new Set(ids).size,135);
  assert.equal(s.markets[0].rows[0].slots.length,6);assert.equal(s.markets[1].rows[1].slots.length,2);
  const view=E.publicState(s);assert.equal(view.deck,undefined);assert.equal(view.contracts[0].reserve.length,1);assert.equal(s.contracts[0].reserve.length,2);
});
test('government purchase is atomic, validates adjacency and preserves owned positions',()=>{
  let s=initial();const id=s.government[0].tiles[0];const action={type:'work',space:'government',quadrant:0,anchor:0,indexes:[0],placements:[{id,x:0,y:0,rotation:0}]};
  const before=structuredClone(s);assert.throws(()=>act(s,{...action,placements:[{id:'not-owned',x:0,y:0,rotation:0}]}),/selected/);assert.deepEqual(s,before);
  assert.throws(()=>act(s,{...action,indexes:[0,7]}),/sharing an edge/);
  s=act(s,action);assert.equal(s.players[0].cash,35);assert.equal(s.government[0].tiles[0],null);assert.equal(s.turn.stage,'machine');assert.equal(s.players[0].pipes.length,1);
  assert.throws(()=>act(s,{type:'work',space:'government'}),/ended/);assert.throws(()=>act(s,{type:'end'},1),/turn/);
});
test('shop bundles, tank placement and machine covering are validated together',()=>{
  let s=initial();const shop=s.shops.machine,ids=shop.pipes.slice(0,2);
  const action={type:'work',space:'machines-pipes',pipes:ids,placements:ids.map((id,i)=>({id,x:i*2,y:0,rotation:0})),items:[{slot:shop.slots[0].id,x:0,y:0}]};
  const next=act(s,action);assert.equal(next.players[0].cash,5);assert.equal(next.players[0].machines.length,1);assert.equal(next.players[0].pipes.length,2);assert.equal(next.shops.machine.pipes.length,2);
  assert.throws(()=>act(s,{...action,items:[{slot:shop.slots[0].id,x:20,y:0}]}),/half/);assert.equal(s.players[0].cash,40);
  assert.throws(()=>act(s,{...action,pipes:ids.slice(0,1)}),/bundle/);
});
test('central secondary is paired, charged first, with HR range and free-action effects',()=>{
  let s=initial();const pair=s.spaces.find(x=>x.x===2&&x.y===1).id;
  s=act(s,{type:'work',space:'crude',transactions:[{kind:'buy',market:'crude',row:0,slot:0}]});assert.equal(s.turn.stage,'secondary');assert.deepEqual(E.secondarySpaces(s,s.players[0]),[pair]);
  assert.throws(()=>act(s,{type:'work',space:'market-1',transactions:[]}),/paired/);
  s.players[0].cash=25;assert.throws(()=>act(s,{type:'work',space:pair,upgrades:['engineering']}),/need/);
  s.players[0].upgrades['human-resources']=1;s=act(s,{type:'work',space:pair,upgrades:['engineering']});assert.equal(s.players[0].cash,5);assert.equal(s.turn.stage,'machine');
});
test('market trades downgrade oil, use printed prices, sell before buy, and enforce final capacity',()=>{
  let s=initial();s.players[0].oil=[{id:'test-oil',color:'orange',grade:3}];
  const a={type:'work',space:'market-1',transactions:[{kind:'sell',market:'market-1',row:1,slot:0,barrel:'test-oil'}]};
  const n=act(s,a);assert.equal(n.players[0].cash,65);assert.equal(n.markets[1].rows[1].slots[0].barrel.grade,1);
  assert.throws(()=>act(s,{...a,transactions:[{kind:'buy',market:'market-1',row:0,slot:0},...a.transactions]}),/sales before/);
  s.players[0].tanks[0]=0;assert.throws(()=>act(s,{type:'work',space:'crude',transactions:[{kind:'buy',market:'crude',row:0,slot:0}]}),/capacity/);
});
test('contracts accept partial and higher-grade deliveries; orders require all barrels atomically',()=>{
  let s=initial(),id=s.contracts[0].display[0],requirements=E.cards[id].requirements;
  s=act(s,{type:'work',space:'contracts-loans',take:[{id,deferred:false}],loan:true});assert.equal(s.players[0].cash,55);assert.equal(s.players[0].penalties,1);
  s.players[0].oil=[{id:'test-oil',color:requirements[0].color,grade:3}];s=act(s,{type:'fulfill',card:id,delivery:[{slot:0,barrel:'test-oil'}]});assert.equal(s.players[0].cash,75);assert.deepEqual(s.players[0].contracts[0].filled,[0]);
  assert.throws(()=>act(s,{type:'fulfill',card:s.orders[0].display[0],delivery:[]}),/completely/);
  const order=s.orders[0].display[0];s.players[0].oil=E.cards[order].requirements.map((r,i)=>({...r,id:`b${i}`}));
  s=act(s,{type:'fulfill',card:order,delivery:E.cards[order].requirements.map((r,i)=>({slot:i,barrel:`b${i}`}))});assert.equal(s.players[0].completedOrders.length,1);assert.equal(s.orders[0].display[0],null);
});
test('upgrades lock families, give persisted benefits, and HR III adds an immediate main action',()=>{
  let s=initial();s=act(s,{type:'work',space:'upgrades',upgrades:['government'],lock:'engineering'});assert.equal(s.bonuses[0].governmentPipes,2);assert.equal(s.upgrades.find(u=>u.id==='engineering').locked,true);
  assert.throws(()=>act(s,{type:'end'}),/benefit/);assert.throws(()=>act(s,{type:'bonus',kind:'government',quadrant:0,indexes:[0],placements:[]},1),/turn/);
  const ids=s.government[0].tiles.slice(0,2);s=act(s,{type:'bonus',kind:'government',quadrant:0,indexes:[0,1],placements:ids.map((id,i)=>({id,x:i*2,y:0,rotation:0}))});assert.equal(s.bonuses.length,0);assert.equal(s.players[0].pipes.length,2);
  s=initial();s.players[0].upgrades['human-resources']=2;s=act(s,{type:'work',space:'upgrades',upgrades:['human-resources']});assert.equal(s.turn.stage,'work');s=act(s,{type:'skip'});assert.equal(s.turn.stage,'machine');
});
test('refinement uses geometry, simultaneous capacity, Engineering throughput and machine eligibility',()=>{
  let s=initial();const tile=C.pipeTiles.find(t=>t.halves.every(h=>h.some(p=>p.color==='teal')));
  s.players[0].pipes=[{id:tile.id,x:0,y:0,rotation:0}];s.costs.teal=[1,1,1];
  const l=E.pipelines(s,s.players[0]).find(l=>l.color==='teal'&&l.segments>=2);assert.ok(l);
  s.players[0].oil=[{id:'a',color:'teal',grade:0},{id:'b',color:'teal',grade:0}];
  const a={type:'work',space:'refine',tile:tile.id,selections:[{pipelineId:l.id,barrelId:'a',toGrade:2},{pipelineId:l.id,barrelId:'b',toGrade:2}]};assert.throws(()=>act(s,a),/throughput/);
  s.players[0].upgrades.engineering=3;s=act(s,a);assert.ok(s.players[0].oil.every(b=>b.grade===2));
  const before=structuredClone(s);assert.throws(()=>act(s,{type:'machines',selections:[{pipelineId:l.id,barrelId:'a',toGrade:3}]}),/eligible/);assert.deepEqual(s,before);
});
test('all eighteen rounds complete, year refresh proceeds right-to-left, and scoring omits the disabled valuation cards',()=>{
  let s=initial();s.players[0].oil=[{id:'end-oil',color:'orange',grade:2}];s.players[0].penalties=2;
  s.markets[0].rows[0].slots.forEach(slot=>slot.barrel=null);
  for(let turn=0;turn<16;turn++)s=finish(s);
  assert.equal(s.year,2);assert.equal(s.round,1);assert.deepEqual(s.markets[0].rows[0].slots.map(x=>!!x.barrel),[false,false,true,true,true,true]);
  for(let turn=0;turn<20;turn++)s=finish(s);
  assert.equal(s.phase,'finished');assert.equal(s.scores[0].total,10);assert.equal(s.scores[1].total,40);assert.equal(s.winner,1);
  assert.throws(()=>act(s,{type:'end'}),/not in progress/);
});
test('malformed actions and failed bonus choices never mutate authoritative state',()=>{
  const s=initial(),before=structuredClone(s);
  for(const action of [null,[],{}, {type:'work',space:'government',quadrant:NaN}, {type:'work',space:'crude',transactions:[null]}, {type:'work',space:'tanks-pipes',items:[null]}, {type:'work',space:'upgrades',upgrades:['__proto__']}])assert.throws(()=>act(s,action));
  assert.deepEqual(s,before);
});

test('annual benefits trigger on each owner’s first turn, and Government can draw across open quadrants',()=>{
  let s=initial();s.players[0].upgrades.shops=1;s.players[1].upgrades.shops=1;s.year=1;s.round=8;s.turnIndex=1;s.turn.actor=s.order[1];s.turn.stage='machine';
  s=act(s,{type:'end'});assert.equal(s.year,2);assert.ok(s.bonuses.every(b=>b.actor===s.order[0]));
  for(let i=0;i<2;i++)s=act(s,{type:'bonus',kind:'tank',item:{slot:s.shops.tank.slots.find(x=>x.available).id,grade:0}});
  s=finish(s);assert.ok(s.bonuses.length);assert.ok(s.bonuses.every(b=>b.actor===s.order[1]));
  s=initial();s.government[0].open=true;s.government[1].open=true;s.government[0].openedYear=1;s.players[0].upgrades.government=1;
  s=act(s,{type:'work',space:'upgrades',upgrades:['government']});
  let id=s.government[0].tiles[0];s=act(s,{type:'bonus',kind:'government',quadrant:0,indexes:[0],placements:[{id,x:0,y:0,rotation:0}]});
  id=s.government[1].tiles[0];s=act(s,{type:'bonus',kind:'government',quadrant:1,indexes:[0],placements:[{id,x:2,y:0,rotation:0}]});assert.equal(s.bonuses[0].governmentPipes,2);
});

test('machine batches charge once, honor Engineering III, and cannot run again in the same phase',()=>{
  let s=initial(),tile=C.pipeTiles[0];s.players[0].pipes=[{id:tile.id,x:0,y:0,rotation:0}];s.players[0].machines=[{id:'machine-test',x:0,y:0}];s.players[0].upgrades.engineering=3;s.costs={orange:[1,1,1],teal:[1,1,1],silver:[1,1,1]};s.turn.stage='machine';
  const line=E.pipelines(s,s.players[0]).find(l=>l.machineAttached);assert.ok(line);s.players[0].oil=[{id:'ma',color:line.color,grade:0},{id:'mb',color:line.color,grade:0}];
  const a={type:'machines',selections:[{pipelineId:line.id,barrelId:'ma',toGrade:1},{pipelineId:line.id,barrelId:'mb',toGrade:1}]};s=act(s,a);assert.equal(s.players[0].cash,25);assert.deepEqual(s.players[0].oil.map(b=>b.grade),[1,1]);assert.throws(()=>act(s,a),/already ran/);
});

test('government adjacency follows the printed pinwheel and excludes corner-only neighbors',()=>{
  assert.deepEqual(Array.from({length:8},(_,i)=>i).filter(i=>G.governmentAdjacent(1,i)),[0,1,2,4,5]);
  assert.equal(G.governmentAdjacent(0,6),false);
  let s=initial();s.players[0].cash=55;const indexes=[1,0,2,4,5],ids=indexes.map(i=>s.government[0].tiles[i]);
  s=act(s,{type:'work',space:'government',quadrant:0,anchor:1,indexes,placements:ids.map((id,i)=>({id,x:i*2,y:0,rotation:0}))});assert.equal(s.players[0].cash,0);assert.equal(s.players[0].pipes.length,5);
});

test('Refined Markets III retains the sold cube color and uses the slot grade on repurchase',()=>{
  let s=initial();s.players[0].upgrades['refined-markets']=3;s.players[0].oil=[{id:'off-color',color:'teal',grade:2}];
  s=act(s,{type:'work',space:'market-1',transactions:[{kind:'sell',market:'market-1',row:1,slot:0,barrel:'off-color'}]});assert.equal(s.players[0].cash,70);assert.deepEqual(s.markets[1].rows[1].slots[0].barrel,{id:'off-color',color:'teal',grade:1});
});
