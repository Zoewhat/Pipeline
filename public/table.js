'use strict';
window.PipelineTable=(()=>{
  const E=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={'crude':'Crude market','market-1':'Refined market 1','market-2':'Refined market 2','market-3':'Refined market 3','government':'Government pipes','tanks-pipes':'Tanks & pipes','machines-pipes':'Machines & pipes','contracts-loans':'Contracts & loans','upgrades':'Upgrades','refine':'Run your pipes','engineering':'Engineering','human-resources':'Human resources','refined-markets':'Refined markets','shops':'Shops'};
  const grades=['Crude','Low','Mid','High'];
  const paint={orange:'#d77936',teal:'#307e7b',silver:'#c9c8be'};
  let catalog,faces={},cards={},ctx,draft=null,rotation=0,activePipe=null,activeMachine=null,lastRevision=null;
  let renderedDraft=null, renderedRoom=null, preview=null;
  const sound=name=>window.PipelineSound?.play(name);
  fetch('/catalog.json').then(r=>r.json()).then(c=>{catalog=c;faces=Object.fromEntries(c.pipeTiles.map(p=>[p.id,p]));cards=Object.fromEntries([...c.contracts,...c.orders].map(c=>[c.id,c]));if(ctx)render(...ctx);}).catch(()=>{});
  const btn=(text,attr='',cls='')=>`<button type="button" class="${cls}" ${attr}>${text}</button>`;
  const label=id=>names[id]||id;
  const drop=(color,grade)=>{
    const wedges=['','<path d="M12 12 L12 3 A9 9 0 0 1 19.794 16.5 Z"/>','<path d="M12 12 L12 3 A9 9 0 1 1 4.206 16.5 Z"/>','<circle cx="12" cy="12" r="9"/>'];
    return `<span class="oil-chip ${color} grade-${grade}" role="img" aria-label="${color} ${grades[grade]} oil" title="${color} · ${grades[grade]}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle class="oil-base" cx="12" cy="12" r="10.5"/><g class="oil-fill">${wedges[grade]}</g></svg></span>`;
  };
  function svgTile(id,rot=0,x=0,y=0,size=40){
    if(!faces[id])return '';
    const cells=PipeGeometry.cells({id,x:0,y:0,rotation:rot},faces);
    const port={N:[.5,0],E:[1,.5],S:[.5,1],W:[0,.5]};
    return `<g transform="translate(${x} ${y})">`+cells.map(c=>`<g transform="translate(${c.x*size} ${c.y*size})"><rect width="${size}" height="${size}" fill="#efe8d4" stroke="#b2a991" stroke-width=".6"/>`+c.paths.slice().reverse().map(p=>{
      const [a,b]=p.ports.map(n=>port[n].map(v=>v*size)),d=`M${a} Q${size/2},${size/2} ${b}`;
      return `<path d="${d}" fill="none" stroke="#efe8d4" stroke-width="${size*.29}"/><path d="${d}" fill="none" stroke="#394743" stroke-width="${size*.2}"/><path d="${d}" fill="none" stroke="${paint[p.color]}" stroke-width="${size*.14}"/>`;
    }).join('')+'</g>').join('')+'</g>';
  }
  function tile(id,attrs='',selected=false){const gov=attrs.match(/data-government="\d,(\d)"/),vertical=gov&&PipeGeometry.governmentLayout[Number(gov[1])].rotation===1;return btn(`<svg viewBox="0 0 ${vertical?'40 80':'80 40'}" aria-hidden="true">${svgTile(id,vertical?1:0)}</svg>`,`${attrs} title="${E(id)}" aria-label="Pipe ${E(id)}" aria-pressed="${selected}"`, `pipe-tile ${selected?'chosen':''}`);}
  function card(id,attrs='',chosen=false,filled=[]){if(!id)return '<div class="empty-card">Taken</div>';return btn(`<span class="card-oil">${cards[id].requirements.map((r,i)=>`<span class="${filled.includes(i)?'delivered':''}">${drop(r.color,r.grade)}</span>`).join('')}</span>`,`${attrs} aria-label="${id.startsWith('order')?'Order':'Contract'}: ${cards[id].requirements.map(r=>`${r.color} ${grades[r.grade]}`).join(', ')}"`,`fulfillment-card ${chosen?'chosen':''}`);}
  function isMine(){if(window.PipelinePresence?.following())return false;const [room,session]=ctx;return room.local||session?.seat===actor();}
  function actor(){const s=ctx[0].state;return s.bonuses[0]?.actor??s.turn.actor;}
  function p(){return ctx[0].state.players[actor()];}
  function can(space){const s=ctx[0].state;if(s.phase!=='playing'||!isMine()||s.bonuses.length||s.turn.stage==='machine')return false;if(s.turn.stage==='work')return true;const start=s.spaces.find(x=>x.id===s.turn.mainSpace),end=s.spaces.find(x=>x.id===space);return start&&end&&space!==start.id&&Math.abs(start.x-end.x)+Math.abs(start.y-end.y)<=((p().upgrades['human-resources']||0)>=2?2:1);}
  function start(space){if(!can(space))return;PipelineWorkspace.focus(space);draft={type:'work',space,placements:[],pipes:[],items:[],indexes:[],take:[],upgrades:[],transactions:[]};activePipe=null;activeMachine=null;rotation=0;}
  function ensure(space){if(draft?.space!==space)start(space);return draft?.space===space;}
  function redraw(){render(...ctx);}
  function selectedPipes(){if(!draft)return [];const s=ctx[0].state;if(draft.space==='government'||draft.kind==='government')return (draft.indexes||[]).map(i=>s.government[draft.quadrant].tiles[i]);return draft.pipes||[];}
  function draftNetwork(){return [...p().pipes,...(draft?.placements||[])];}
  function network(player,index,editing=false){
    const tiles=editing?draftNetwork():player.pipes;
    const cells=tiles.flatMap(t=>PipeGeometry.cells(t,faces));
    const minX=Math.min(-2,...cells.map(c=>c.x-2)),minY=Math.min(-2,...cells.map(c=>c.y-2));
    const maxX=Math.max(7,...cells.map(c=>c.x+3)),maxY=Math.max(4,...cells.map(c=>c.y+3));
    const size=42,w=(maxX-minX)*size,h=(maxY-minY)*size;
    let grid='';for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++)grid+=`<rect x="${(x-minX)*size}" y="${(y-minY)*size}" width="${size}" height="${size}" class="grid-cell"/>`;
    let content=tiles.map(t=>{const pending=editing&&draft?.placements?.some(v=>v.id===t.id);return `<g class="${draft?.tile===t.id?'worker-pipe':''} ${pending?'pending-pipe':''}">${svgTile(t.id,t.rotation,(t.x-minX)*size,(t.y-minY)*size,size)}${pending?`<rect x="${(t.x-minX)*size+2}" y="${(t.y-minY)*size+2}" width="${(t.rotation%2?1:2)*size-4}" height="${(t.rotation%2?2:1)*size-4}" fill="#f1ae5533" stroke="#ffe08a" stroke-width="3" stroke-dasharray="6 3"/>`:''}</g>`;}).join('');
    const machines=[...player.machines,...(editing?(draft?.items||[]).filter(i=>i.x!==undefined):[])];
    content+=machines.map(m=>`<g transform="translate(${(m.x-minX)*size} ${(m.y-minY)*size})"><rect x="3" y="3" width="36" height="36" rx="7" fill="#768259" stroke="#efe8d4" stroke-width="3"/><text x="21" y="29" text-anchor="middle" font-size="25" fill="#fff">⚙</text></g>`).join('');
    let hits='';if(editing||index===actor())for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++)hits+=`<rect data-cell="${x},${y}" data-owner="${index}" x="${(x-minX)*size}" y="${(y-minY)*size}" width="${size}" height="${size}" fill="transparent" class="cell-hit" role="button" tabindex="0" aria-label="${editing?'Place here':'Select pipe'} (${x}, ${y})"><title>${editing?'Place here':'Select pipe'} (${x}, ${y})</title></rect>`;
    return `<div class="network-scroll"><svg class="network" data-min-x="${minX}" data-min-y="${minY}" data-columns="${maxX-minX}" data-rows="${maxY-minY}" data-player="${index}" data-editing="${editing}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-label="${E(ctx[0].players[index].name)} pipe network"><g data-network-grid>${grid}</g>${content}<g data-network-hits>${hits}</g>${!tiles.length?`<text x="${w/2}" y="${h/2}" text-anchor="middle" class="empty-network">${editing?'Click a square to place your first tile':'Your pipe network grows here'}</text>`:''}</svg></div>`;
  }
  function resizeNetwork(svg,columns,rows){
    const minX=Number(svg.dataset.minX),minY=Number(svg.dataset.minY),index=Number(svg.dataset.player),editing=svg.dataset.editing==='true',size=42;
    const width=columns*size,height=rows*size;
    if(svg.viewBox.baseVal.width===width&&svg.viewBox.baseVal.height===height)return;
    let grid='',hits='';
    for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
      const x=col*size,y=row*size,cell=`${minX+col},${minY+row}`;
      grid+=`<rect x="${x}" y="${y}" width="42" height="42" class="grid-cell"/>`;
      if(editing||index===actor())hits+=`<rect data-cell="${cell}" data-owner="${index}" x="${x}" y="${y}" width="42" height="42" fill="transparent" class="cell-hit" role="button" tabindex="0" aria-label="${editing?'Place here':'Select pipe'} (${minX+col}, ${minY+row})"/>`;
    }
    svg.querySelector('[data-network-grid]').innerHTML=grid;
    svg.querySelector('[data-network-hits]').innerHTML=hits;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const empty=svg.querySelector('.empty-network');if(empty){empty.setAttribute('x',width/2);empty.setAttribute('y',height/2);}
  }
  function render(room,session,send,notice,busy){
    ctx=[room,session,send,notice,busy];const root=document.getElementById('game-board');
    PipelineWorkspace.capture(root);
    const formValues=renderedDraft===draft&&renderedRoom===room.code&&(lastRevision===room.revision||room.change==='clock')?[...root.querySelectorAll('select[id],input[id]')].map(el=>[el.id,el.value,el.checked]):[];
    if(room.state.phase==='setup'){root.hidden=true;const invite=root.querySelector('.invite');if(invite)document.querySelector('.table-heading').append(invite);return;}root.hidden=false;
    if(!catalog){root.innerHTML='<p>Loading the tile catalog…</p>';return;}
    const s=room.state;
    const preservedInvite=root.querySelector('.invite');if(preservedInvite)document.querySelector('.table-heading').append(preservedInvite);
    if(renderedRoom!==room.code||(lastRevision!==null&&lastRevision!==room.revision&&room.change!=='clock')){draft=null;activePipe=null;activeMachine=null;}
    lastRevision=room.revision;
    if(preview && window.PipelinePresence?.following())draft=preview.revision===room.revision?structuredClone(preview.draft):null;
    const me=actor(),current=s.players[me],mine=isMine(),bonus=s.bonuses[0];
    const phase=s.phase==='finished'?'Game complete':bonus?'Upgrade benefit':s.turn.stage==='work'?'Work phase':s.turn.stage==='secondary'?'Optional secondary action':'Machine phase';
    root.innerHTML=`<div class="turn-banner"><div><span class="eyebrow">YEAR ${s.year}/3 · ROUND ${s.round} OF ${[8,6,4][s.year-1]}</span><h2>${s.phase==='finished'?`${E(room.players[s.winner].name)} wins`:E(room.players[me].name)+' · '+phase}</h2><p>${s.phase==='finished'?s.scores[0].total===s.scores[1].total?'Scores are tied. The player ahead in turn order wins.':'Final assets, valuations, and penalties are counted below.':mine?bonus?`Collect ${E(bonus.source)} before continuing.`:s.turn.stage==='work'?'Choose an action on the table. Buy pipes to begin building your refinery.':s.turn.stage==='secondary'?'Take the paired action, or continue to your machines.':'Run attached pipelines for $15, deliver oil, or end your turn.':'Your partner is taking their turn. You can inspect the whole table.'}</p></div><div class="turn-buttons">${mine&&s.phase==='playing'&&!bonus?(s.turn.stage==='machine'?btn('Run machines',`data-command="machines" ${!current.machines.length||s.turn.machineUsed?'disabled':''}`)+btn('End turn','data-command="end"','primary'):btn(s.turn.stage==='secondary'?'Skip secondary':'Pass work action','data-command="skip"')):''}</div></div>
    ${s.phase==='finished'?scoreboard(s,room):''}
    <div class="table-tools"><span>${s.phase==='finished'?'Final turn order':'Next round'}: ${s.nextOrder.map(i=>E(room.players[i].name)).join(' → ')}</span><details><summary>Refinement & scoring</summary><div class="costs">${Object.entries(s.costs).map(([c,v])=>`<span>${drop(c,0)} ${v.join(' → ')} <small>(cost for each step)</small></span>`).join('')}</div><p>Oil $10 / $20 / $30 · Pipelines $10 / $20 / $30 from crude in one run. Valuation cards are disabled for this table; the separate machine-pipeline tile still scores.</p></details></div>
    <nav class="table-jumps" aria-label="Table areas"><a href="#game-board">Government & actions</a><a href="#markets">Markets</a><a href="#shops">Shops</a><a href="#deliveries">Contracts & orders</a><a href="#refineries">Your refineries ↓</a></nav><div class="play-layout"><div class="shared-board">
    <section class="board-panel government" aria-label="Government pipes"><div class="quadrants">${s.government.map((q,qi)=>`<div class="quadrant" role="group" aria-label="Quadrant ${qi+1} · ${q.open?'Open':'Closed'}"><div class="government-grid">${q.tiles.map((id,i)=>id?tile(id,`data-government="${qi},${i}" ${!(can('government')||(mine&&bonus?.governmentPipes))?'disabled':''}`,draft?.quadrant===qi&&draft?.indexes?.includes(i)):'<div class="pipe-hole"></div>').join('')}</div></div>`).join('')}</div></section>
    <section class="board-panel action-cross"><h3>Work actions</h3><div class="cross-arms">${['crude','market-1','market-2','market-3'].map(id=>{const outer=s.spaces.find(x=>x.id===id);const inner=s.spaces.find(x=>x.id!==id&&Math.abs(x.x-outer.x)+Math.abs(x.y-outer.y)===1);return `<div class="action-arm">${[id,inner.id].map(a=>btn(label(a),`data-action="${a}" ${!can(a)?'disabled':''}`,draft?.space===a?'chosen':'')).join('<span>↔</span>')}</div>`;}).join('')}</div>${btn('Government pipes',`data-action="government" ${!can('government')?'disabled':''}`,'government-action')}<p class="board-help">Each pair is one arm of the board. A secondary action costs $10 before its own purchases. Human resources can change this.</p></section>
    <section class="market-area" id="markets">${s.markets.map(m=>marketBoard(m)).join('')}</section>
    <section class="shop-area" id="shops">${['tank','machine'].map(type=>shopBoard(s,type,bonus,mine)).join('')}</section>
    <section class="board-panel fulfillment" id="deliveries"><h3>Contracts & orders</h3><label class="loan-option"><input type="checkbox" data-loan ${draft?.space==='contracts-loans'&&draft.loan?'checked':''} ${!can('contracts-loans')?'disabled':''}> Take $15 loan · 1 penalty</label><p class="board-help">Take contracts using a work action. Deliver to your contracts and public orders at any time between actions.</p><div class="fulfillment-columns"><div><h4>Contracts · $20 / $35 / $45</h4>${[...s.contracts].reverse().map(row=>`<div class="card-row"><span>${grades[row.grade]}</span>${row.display.map(id=>card(id,`data-contract="${id}" ${!can('contracts-loans')?'disabled':''}`,draft?.take?.some(t=>t.id===id))).join('')}<div class="reserve-preview"><small>Next</small>${row.reserve[0]?card(row.reserve[0],'disabled'):'—'}<small>${row.reserveCount} left</small></div></div>`).join('')}</div><div><h4>Orders · $30 / $45 / $55</h4>${[...s.orders].reverse().map(row=>`<div class="card-row order-row">${row.display.map(id=>card(id,`data-deliver="${id}" ${!mine||bonus||s.phase==='finished'?'disabled':''}`)).join('')}</div>`).join('')}</div></div></section>
    <section class="board-panel"><h3>Upgrades · $20 each</h3><div class="upgrade-grid">${s.upgrades.map(u=>{const owned=current.upgrades[u.id]||0;return `<article class="upgrade-family"><h4>${label(u.id)}${u.locked?' · locked this year':''}</h4>${[1,2,3].map(n=>{
      const selected=draft?.space==='upgrades'&&draft.upgrades.includes(u.id)&&n===owned+1;
      const picked=draft?.space==='upgrades'?draft.upgrades.length:0;
      const fee=s.turn.stage==='secondary'&&!current.upgrades['human-resources']?10:0;
      const available=selected||(can('upgrades')&&!u.locked&&n===owned+1&&u.copies[n-1]>0&&picked<2&&current.cash>=fee+(picked+1)*20);
      return btn(`<b>Level ${n} · ${u.copies[n-1]} left ${owned>=n?'✓':''}</b><span class="upgrade-description">${upgradeText(u.id,n)}</span>`,`data-upgrade="${u.id}" aria-label="${label(u.id)} level ${n}${owned>=n?' · owned':''}" aria-pressed="${Boolean(selected)}" ${available?'':'disabled'}`,`upgrade-level ${owned>=n?'owned':''} ${selected?'chosen':''}`);
    }).join('')}</article>`;}).join('')}</div></section>
    </div><aside class="action-dock" aria-label="Your action">${actionPanel(s,current,bonus,mine||Boolean(preview))}</aside></div>
    <section class="refineries" id="refineries">${s.players.map((pl,i)=>`<article class="refinery"><div class="refinery-heading"><div><span class="eyebrow">${E(room.players[i].name)} / ${room.players[i].connected?'CONNECTED':'AWAY'}</span><h2>${i===session?.seat||room.local?'Your refinery':'Partner’s refinery'}</h2></div><b class="refinery-cash">$${pl.cash}<small>${pl.penalties} penalties</small></b></div><div class="refinery-content"><div>${network(pl,i,false)}${i===me&&can('refine')?btn('Run a pipe tile','data-action="refine"'):''}<div class="line-summary">${pl.pipelines.filter(l=>l.segments>=3).slice(0,12).map(l=>`<span>${drop(l.color,0)} ${l.segments} segments${l.value!==l.segments?` / value ${l.value}`:''}${l.machineAttached?' ⚙':''}</span>`).join('')}</div></div><div class="tank-farm">${[3,2,1,0].map(grade=>{const barrels=pl.oil.filter(b=>b.grade===grade);return `<div class="farm-row"><b>${grades[grade]}</b><span>${pl.tanks[grade]} tanks · ${barrels.length}/${pl.tanks[grade]*2}</span><div class="oil-boxes">${barrels.map(b=>btn(drop(b.color,b.grade),`data-oil="${b.id}" data-owner="${i}" title="${b.color} ${grades[b.grade]}" ${i!==me?'disabled':''}`,`oil-box ${draft?.selectedOil===b.id||draft?.selections?.some(x=>x.barrelId===b.id)||draft?.transactions?.some(t=>t.barrel===b.id)?'chosen':''}`)).join('')}${Array.from({length:Math.max(0,pl.tanks[grade]*2-barrels.length)},()=>'<span class="empty-tank" title="Empty tank space" aria-label="Empty tank space"></span>').join('')}</div></div>`;}).join('')}<h4>Upgrades</h4><p>${Object.entries(pl.upgrades).map(([id,n])=>`${label(id)} ${n}`).join(' · ')||'No upgrades yet'}</p><h4>Your contracts</h4><div class="owned-contracts">${pl.contracts.map(c=>`<div>${card(c.id,`data-deliver="${c.id}" ${!mine||i!==me||bonus||c.deferred||s.phase==='finished'?'disabled':''}`,false,c.filled)}<small>${c.deferred?'Deferred until next year':c.filled.length===cards[c.id].requirements.length?'Complete this year':'Active'}</small></div>`).join('')||'<small>No contracts yet</small>'}</div><p>${pl.completedOrders.length} completed orders</p></div></div></article>`).join('')}</section>`;
    PipelineWorkspace.mount(root,room,session,Boolean(root.querySelector('.action-dock .network-scroll')));
    formValues.forEach(([id,value,checked])=>{const el=document.getElementById(id);if(el){el.value=value;el.checked=checked;}});
    renderedDraft=draft;renderedRoom=room.code;
    bind(root);if(busy||window.PipelinePresence?.following())root.querySelectorAll('button:not([data-panel-tab]):not([data-overview]):not([data-table-info]):not([data-camera]):not([data-overview-area]):not([data-follow]):not(#copy):not(#download-save):not(#leave)').forEach(b=>b.disabled=true);
  }
  function upgradeText(id,n){return ({government:['2 government pipes now; 1 each new year.','4 government pipes now.','6 government pipes now.'],shops:['2 tanks and 1 shop pipe now; 2 tanks each new year.','1 machine and 2 shop pipes now.','1 machine and 4 shop pipes now.'],'human-resources':['Free secondary actions.','Secondary actions up to two spaces away, through the center.','Two main actions each turn; no secondary action.'],engineering:['+1 refinement value per 4 segments.','+2 refinement value per 4 segments. Replaces level I bonus.','All pipelines refine two barrels of the same starting grade.'],'refined-markets':['Refined oil buying and selling prices increase by $5.','Trade in all three refined markets with one action.','Sell any oil color in refined markets. Grades still apply.']})[id][n-1];}
  function marketBoard(m){
    const crude=m.id==='crude';
    return `<section class="board-panel market ${crude?'crude-market':''}"><h3>${label(m.id)}</h3>${m.rows.map((row,ri)=>({row,ri})).sort((a,b)=>b.row.grade-a.row.grade).map(({row,ri})=>`<div class="market-row"><span>${drop(row.color,row.grade)}<small>${grades[row.grade]}</small></span><div class="market-slots">${row.slots.map((slot,si)=>{
      const content=crude?`<span class="oil-chip ${row.color} priced-oil ${slot.barrel?'':'vacant-oil'}"><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="oil-base" cx="20" cy="20" r="17"/><text x="20" y="20" dy=".35em" text-anchor="middle">$${slot.price}</text></svg></span>`:`${slot.barrel?drop(slot.barrel.color,slot.barrel.grade):'<span class="empty-oil">＋</span>'}<small>$${slot.price}</small>`;
      return btn(content,`data-market="${m.id},${ri},${si}" aria-label="${row.color} ${grades[row.grade]} · $${slot.price} · ${slot.barrel?'Buy oil':'Empty space'}" ${!can(m.id)&&!(draft?.space?.startsWith('market-')&&(p().upgrades['refined-markets']||0)>=2)?'disabled':''}`,`${crude?'crude-slot ':''}${draft?.transactions?.some(t=>t.market===m.id&&t.row===ri&&t.slot===si)?'chosen':''}`);
    }).join('')}</div><small class="refresh-value">${row.grade?'−':'+'}${row.refresh}/year</small></div>`).join('')}</section>`;
  }
  function shopBoard(s,type,bonus,mine){const shop=s.shops[type],space=type==='tank'?'tanks-pipes':'machines-pipes';return `<section class="board-panel shop"><h3>${label(space)}</h3><div class="shop-slots">${shop.slots.map(slot=>btn(`<img class="shop-illustration" src="/assets/${type}-market.webp" alt="${type==='tank'?'Storage tank':'Refinery machine'}" width="256" height="256"><small>$${slot.price}</small>${!slot.available?'<span class="shop-stock">Sold</span>':''}`,`data-shopitem="${type},${slot.id}" data-stock="${slot.available?'available':'sold'}" aria-label="${type==='tank'?'Tank':'Machine'} · $${slot.price}${!slot.available?' · sold':''}" ${!slot.available||!(can(space)||(mine&&bonus?.[type==='tank'?'tanks':'machines']))?'disabled':''}`,draft?.items?.some(i=>i.slot===slot.id)?'chosen':'')).join('')}</div><div class="shop-pipes">${shop.pipes.map(id=>tile(id,`data-shoppipe="${type},${id}" ${!(can(space)||(mine&&bonus?.shopPipes))?'disabled':''}`,draft?.pipes?.includes(id))).join('')}</div><p class="board-help">Pipes: choose 2 for $15 or 4 for $40.</p></section>`;}
  function selectOil(id,oil,empty='Choose oil',chosen=''){return `<select id="${id}"><option value="">${empty}</option>${oil.map(b=>`<option value="${b.id}" ${chosen===b.id?'selected':''}>${E(b.color)} · ${grades[b.grade]} · ${b.id.replace('oil-','#')}</option>`).join('')}</select>`;}
  function draftQuote(s,pl){
    if(!draft)return '';
    const fee=draft.type==='work'&&s.turn.stage==='secondary'&&!pl.upgrades['human-resources']?10:0;
    let cost=0,income=0;
    if(draft.type==='bonus')return '<div class="draft-quote">Upgrade benefit · no purchase cost</div>';
    if(draft.type==='machines')cost=15;
    else if(draft.space==='government'){cost=[0,5,10,20,35,55][draft.indexes.length];if(cost===undefined)return '<div class="draft-quote">Choose at most 5 pipes.</div>';}
    else if(['tanks-pipes','machines-pipes'].includes(draft.space)){
      const count=draft.pipes.length;
      if(count&&![2,4].includes(count))return '<div class="draft-quote">Shop pipes: select 2 or 4.</div>';
      const shop=s.shops[draft.space==='tanks-pipes'?'tank':'machine'];
      cost=(count===2?15:count===4?40:0)+draft.items.reduce((sum,item)=>sum+(shop.slots.find(slot=>slot.id===item.slot)?.price||0),0);
    }else if(draft.space==='upgrades')cost=draft.upgrades.length*20;
    else if(s.markets.some(m=>m.id===draft.space)){
      draft.transactions.forEach(t=>{const row=s.markets.find(m=>m.id===t.market).rows[t.row];const price=row.slots[t.slot].price+(row.grade&&pl.upgrades['refined-markets']?5:0);if(t.kind==='buy')cost+=price;else income+=price;});
    }else return fee?`<div class="draft-quote">Secondary action fee $${fee}</div>`:'';
    return `<div class="draft-quote"><b>Selected cost $${cost+fee}</b>${fee?`<small>Includes $${fee} secondary fee</small>`:''}${income?`<small>Selected sales +$${income}</small>`:''}<small>Cash after valid action: $${pl.cash-cost-fee+income}</small></div>`;
  }
  function actionPanel(s,pl,bonus,mine){
    if(!mine||s.phase==='finished')return `<h3>${s.phase==='finished'?'Game complete':'Partner’s turn'}</h3><p>Explore either panel while you plan.</p>`;
    if(!draft){if(bonus)return `<h3>${E(bonus.source)}</h3><p>Click the matching supply to collect:</p><ul>${[['governmentPipes','government pipes'],['shopPipes','shop pipes'],['tanks','tanks'],['machines','machines']].filter(([k])=>bonus[k]).map(([k,n])=>`<li>${bonus[k]} ${n}</li>`).join('')}</ul>${bonus.machines&&!pl.pipes.length&&!bonus.shopPipes?btn('No pipe for machine · forfeit','data-command="forfeit"'):''}`;if(s.turn.stage==='machine')return '<h3>Finish your turn</h3><p>Run machines or deliver oil, then click End turn in the header.</p>';return '<h3>Choose your action</h3><p>Click a government pipe, a shop item, a market slot, or a work action.</p><p>Your refinery stays beside the supplies. Select pipes here, then rotate and place them in the large network.</p>';}
    let html=`<div class="dock-title"><h3>${draft.type==='fulfill'?'Deliver oil':draft.type==='machines'?'Run machines':draft.type==='bonus'?'Collect benefit':label(draft.space)}</h3>${btn('Cancel','data-command="cancel"','text-button')}</div>`;
    if(draft.type==='fulfill'){
      const own=pl.contracts.find(c=>c.id===draft.card),req=cards[draft.card].requirements;
      html+=`<p>${own?'Choose any unfilled requirements to deliver.':'Fill every requirement to complete this order.'} Higher grades can be delivered for the printed payment.</p>`;
      req.forEach((r,i)=>{html+=`<label>${drop(r.color,r.grade)} ${grades[r.grade]} ${own?.filled.includes(i)?'✓ delivered':selectOil(`deliver-${i}`,pl.oil.filter(b=>b.color===r.color&&b.grade>=r.grade),'Leave unfilled')}</label>`;});
    }else if(draft.type==='machines'||draft.space==='refine'){
      const machine=draft.type==='machines',lines=pl.pipelines.filter(l=>machine?l.machineAttached:l.tiles.includes(draft.tile)&&!l.machineAttached);
      html+=`<p>${machine?'Choose oil in your tanks, then its destination below.':'1 · Click a pipe tile for your worker. 2 · Click a colored oil box. 3 · Choose its destination.'}</p><div class="refine-controls"><h4>${machine?'Run machines':'Run pipes'} · choose oil below</h4>`;
      const barrel=pl.oil.find(b=>b.id===draft.selectedOil);
      if(!lines.length)html+='<p>Choose a worker tile with an eligible pipeline.</p>';
      if(barrel)html+=`<p>${drop(barrel.color,barrel.grade)} ${grades[barrel.grade]} →</p>`;
      lines.filter(l=>barrel&&l.color===barrel.color).forEach(l=>{html+=`<div class="refine-route">${drop(l.color,0)} <b>${l.value} segments</b>${[1,2,3].filter(g=>barrel&&barrel.color===l.color&&g>barrel.grade).map(g=>{const cost=s.costs[l.color].slice(barrel.grade,g).reduce((a,b)=>a+b,0);return btn(`${grades[g]} · ${cost}`,`data-refine-target="${E(l.id)},${g}" ${cost>l.value?'disabled':''}`);}).join('')}</div>`;});
      html+=`<div class="refine-batch">${(draft.selections||[]).map((r,i)=>{const b=pl.oil.find(b=>b.id===r.barrelId);return b?`<p>${drop(b.color,b.grade)} ${grades[b.grade]} → ${grades[r.toGrade]} ${btn('×',`data-remove-refine="${i}"`)}</p>`:'';}).join('')}</div></div>`;
    }else if(draft.space==='contracts-loans'){
      html+='<p>Choose up to one contract from each row on the board.</p>'+(draft.take||[]).map((t,i)=>`<div>${card(t.id)}<label><input type="checkbox" data-deferred="${i}" ${t.deferred?'checked':''} ${s.year===3?'disabled':''}> Defer until next year</label></div>`).join('')+`<p>${draft.loan?'Loan selected: +$15 · 1 penalty':'Select a loan in Contracts & orders if needed.'}</p>`;
    }else if(draft.space==='upgrades'){
      html+=`<p>Choose one or two unlocked upgrades on the board.</p><p>${draft.upgrades.map(id=>`${label(id)} ${(pl.upgrades[id]||0)+1}`).join(' + ')||'None selected'} · $${draft.upgrades.length*20}</p><label>Optionally block another upgrade<select id="block-upgrade"><option value="">Do not block</option>${s.upgrades.filter(u=>!u.locked&&!draft.upgrades.includes(u.id)).map(u=>`<option value="${u.id}">${label(u.id)}</option>`).join('')}</select></label>`;
    }else if(s.markets.some(m=>m.id===draft.space)){
      html+='<p>Click occupied market slots to buy. Click an empty slot to sell one of your barrels. Sales resolve before purchases.</p>';
      html+=(draft.transactions||[]).map((t,i)=>{const row=s.markets.find(m=>m.id===t.market).rows[t.row],slot=row.slots[t.slot];return `<div class="transaction"><span>${t.kind==='buy'?'Buy':'Sell'} ${drop(t.kind==='buy'?slot.barrel.color:row.color,row.grade)} · $${slot.price+(row.grade&&(pl.upgrades['refined-markets']||0)>0?5:0)}</span>${t.kind==='sell'?btn(t.barrel?`${drop(pl.oil.find(b=>b.id===t.barrel)?.color||row.color,pl.oil.find(b=>b.id===t.barrel)?.grade||row.grade)} Change oil`:'Click oil in your refinery',`data-sale-choice="${i}"`,draft.saleIndex===i?'chosen':''):''}${btn('Remove',`data-remove-transaction="${i}"`,'text-button')}</div>`;}).join('');
    }else{
      const ids=selectedPipes();
      if(draft.space==='government'||draft.kind==='government')html+=`<p>${draft.indexes.length} selected${draft.type==='bonus'?' free':` · $${[0,5,10,20,35,55][draft.indexes.length]??'—'}`}. The first tile is your worker’s position.</p>`;
      const items=draft.items||[];
      items.forEach((item,i)=>{if(item.slot.startsWith('tank'))html+=`<label>Tank ${i+1} grade<select data-tankgrade="${i}">${grades.map((g,j)=>`<option value="${j}" ${item.grade===j?'selected':''}>${g}</option>`).join('')}</select></label>`;else html+=btn(item.x===undefined?'Place machine':`Machine at ${item.x}, ${item.y}`,`data-machine-place="${i}"`,activeMachine===i?'chosen':'');});
      if(ids.length){
        const pending=ids.filter(id=>!(draft.placements||[]).some(t=>t.id===id));activePipe=activePipe&&ids.includes(activePipe)?activePipe:pending[0]||null;
        html+=`<div class="draft-tiles">${ids.map(id=>tile(id,`data-place-pipe="${id}"`,activePipe===id)).join('')}</div><div class="placement-controls">${btn(`Rotate ↻ (${rotation*90}°)`,'data-command="rotate"')}${btn('Clear placements','data-command="clear-placements"','text-button')}</div>${activePipe?`<svg class="rotation-preview" viewBox="0 0 ${rotation%2?40:80} ${rotation%2?80:40}">${svgTile(activePipe,rotation)}</svg>`:''}<p>${pending.length} pipe${pending.length===1?'':'s'} left to place.</p>`;
      }
      if(ids.length||items.some(i=>i.slot.startsWith('machine')))html+=`<p class="placement-mode">${activeMachine!==null?'Click a pipe half for the machine.':activePipe?'Click to place the selected pipe.':'All pipes placed · ready to confirm.'}</p>${network(pl,actor(),true)}`;
    }
    if(['upgrades','contracts-loans','tanks-pipes','machines-pipes'].includes(draft.space))html+=`<label>Next-round turn order<select id="next-order"><option value="">Keep position</option><option value="0">First</option><option value="1">Second</option></select></label>`;
    return html+draftQuote(s,pl)+btn(draft.type==='fulfill'?'Deliver selected oil':draft.type==='machines'?'Refine · pay $15':draft.type==='bonus'?'Collect & place':draft.space==='refine'?`Refine ${(draft.selections||[]).length} barrel(s)`:'Confirm action','data-command="confirm"','primary wide');
  }
  function scoreboard(s,room){return `<section class="board-panel score-board"><h3>Final valuation</h3><table><thead><tr><th>Assets</th>${room.players.map(p=>`<th>${E(p.name)}</th>`).join('')}</tr></thead><tbody>${Object.entries({cash:'Cash',oil:'Refined oil',pipes:'Pipelines',machines:'Machine pipelines',penalties:'Penalties',total:'TOTAL'}).map(([k,n])=>`<tr><th>${n}</th>${s.scores.map(v=>`<td>${k==='penalties'?'−':''}$${v[k]}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`;}
  function rememberForms(){if(!draft)return;const root=document.getElementById('game-board');root.querySelectorAll('[data-tankgrade]').forEach(el=>draft.items[Number(el.dataset.tankgrade)].grade=Number(el.value));root.querySelectorAll('[data-deferred]').forEach(el=>draft.take[Number(el.dataset.deferred)].deferred=el.checked);}
  async function submit(){const [room,,send]=ctx;rememberForms();const a=structuredClone(draft),pl=p();
    if(a.type==='fulfill'){const own=pl.contracts.find(c=>c.id===a.card);a.delivery=cards[a.card].requirements.flatMap((r,i)=>{const value=document.getElementById(`deliver-${i}`)?.value;return value?[{slot:i,barrel:value}]:[];});}
    if(a.type==='machines'||a.space==='refine')a.selections=draft.selections||[];
    if(a.transactions)a.transactions.sort((a,b)=>(a.kind==='buy')-(b.kind==='buy'));
    const order=document.getElementById('next-order')?.value;if(order)a.orderIndex=Number(order);
    if(a.space==='upgrades')a.lock=document.getElementById('block-upgrade').value||undefined;
    if(a.type==='bonus'&&['tank','machine'].includes(a.kind))a.item=a.items[0];
    await send(a);sound('confirm');draft=null;activePipe=null;activeMachine=null;redraw();
  }
  function bind(root){root.onkeydown=event=>{if(event.target.matches('[data-cell]')&&['Enter',' '].includes(event.key)){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}};root.onclick=async event=>{
    const el=event.target.closest('[data-command],[data-action],[data-government],[data-shoppipe],[data-shopitem],[data-market],[data-contract],[data-deliver],[data-upgrade],[data-place-pipe],[data-machine-place],[data-cell],[data-remove-transaction],[data-loan],[data-oil],[data-refine-target],[data-remove-refine],[data-sale-choice]');
    if(!el||el.disabled||!isMine()||ctx[0].state.phase==='finished')return;
    try{rememberForms();const s=ctx[0].state,bonus=s.bonuses[0];
      if(el.dataset.government)PipelineWorkspace.focus('government');
      if(el.dataset.shoppipe||el.dataset.shopitem)PipelineWorkspace.focus('tanks-pipes');
      if(el.dataset.deliver)PipelineWorkspace.focus('contracts-loans');
      if(el.dataset.command==='machines')PipelineWorkspace.focus('refine');
      if(el.dataset.command){const c=el.dataset.command;
        if(c==='cancel'){draft=null;activePipe=null;activeMachine=null;}
        if(c==='skip'||c==='end'){await ctx[2]({type:c});sound('confirm');return;}
        if(c==='machines'){draft={type:'machines',selections:[]};}
        if(c==='forfeit'){await ctx[2]({type:'bonus',kind:'forfeit-machine'});sound('confirm');return;}
        if(c==='rotate')rotation=(rotation+1)%4;
        if(c==='clear-placements'){draft.placements=[];activePipe=null;}
        if(c==='confirm'){await submit();return;}
      }
      if(el.dataset.action)start(el.dataset.action);
      if(el.hasAttribute('data-loan')){if(!ensure('contracts-loans'))return;draft.loan=el.checked;}
      if(el.dataset.saleChoice!==undefined){draft.saleIndex=Number(el.dataset.saleChoice);PipelineWorkspace.focus('refine');}
      if(el.dataset.oil){if(Number(el.dataset.owner)!==actor())return;if(draft?.type==='machines'||draft?.space==='refine'){draft.selectedOil=el.dataset.oil;}else if(draft?.transactions?.some(t=>t.kind==='sell')){const b=p().oil.find(b=>b.id===el.dataset.oil);const t=draft.transactions[draft.saleIndex]||draft.transactions.find(t=>t.kind==='sell'&&!t.barrel)||draft.transactions.find(t=>t.kind==='sell');const r=s.markets.find(m=>m.id===t.market).rows[t.row];if(b.grade<r.grade||b.color!==r.color&&!(p().upgrades['refined-markets']>=3&&t.market!=='crude'))throw Error('Choose oil matching the selected sale slot.');t.barrel=b.id;}else{if(!ensure('refine'))return;draft.selectedOil=el.dataset.oil;}}
      if(el.dataset.refineTarget){const cut=el.dataset.refineTarget.lastIndexOf(','),pipelineId=el.dataset.refineTarget.slice(0,cut),toGrade=Number(el.dataset.refineTarget.slice(cut+1));draft.selections=(draft.selections||[]).filter(r=>r.barrelId!==draft.selectedOil);const same=draft.selections.filter(r=>r.pipelineId===pipelineId);const b=p().oil.find(b=>b.id===draft.selectedOil);if(same.length>=((p().upgrades.engineering||0)>=3?2:1))throw Error('That pipeline is already assigned.');if(same.some(r=>p().oil.find(o=>o.id===r.barrelId)?.grade!==b.grade))throw Error('Both barrels must start at the same grade.');draft.selections.push({pipelineId,barrelId:b.id,toGrade});draft.selectedOil=null;}
      if(el.dataset.removeRefine!==undefined)draft.selections.splice(Number(el.dataset.removeRefine),1);
      if(el.dataset.government){const [q,i]=el.dataset.government.split(',').map(Number);
        if(bonus?.governmentPipes){if(draft?.kind!=='government')draft={type:'bonus',kind:'government',quadrant:q,indexes:[],placements:[]};}
        else if(!ensure('government'))return;
        if(draft.quadrant!==q){draft.quadrant=q;draft.indexes=[];draft.placements=[];}
        if(draft.indexes.includes(i)){draft.indexes=draft.indexes.filter(x=>x!==i);draft.placements=draft.placements.filter(t=>t.id!==s.government[q].tiles[i]);}
        else draft.indexes.push(i);
        draft.anchor=draft.indexes[0];activePipe=null;
      }
      if(el.dataset.shoppipe){const [type,id]=el.dataset.shoppipe.split(',');
        if(bonus?.shopPipes){if(draft?.kind!=='pipes'||draft.shop!==type)draft={type:'bonus',kind:'pipes',shop:type,pipes:[],placements:[]};}
        else if(!ensure(type==='tank'?'tanks-pipes':'machines-pipes'))return;
        draft.pipes=draft.pipes.includes(id)?draft.pipes.filter(x=>x!==id):[...draft.pipes,id];draft.placements=draft.placements.filter(t=>draft.pipes.includes(t.id));activePipe=null;
      }
      if(el.dataset.shopitem){const [type,id]=el.dataset.shopitem.split(',');
        if(bonus?.[type==='tank'?'tanks':'machines'])draft={type:'bonus',kind:type,items:[],placements:[]};
        else if(!ensure(type==='tank'?'tanks-pipes':'machines-pipes'))return;
        const index=draft.items.findIndex(i=>i.slot===id);if(index>=0)draft.items.splice(index,1);else draft.items.push(type==='tank'?{slot:id,grade:0}:{slot:id});
        if(type==='machine')activeMachine=draft.items.length-1;
      }
      if(el.dataset.market){const [market,ri,si]=el.dataset.market.split(','),row=Number(ri),slot=Number(si);
        if(!(draft?.space?.startsWith('market-')&&market!=='crude'&&(p().upgrades['refined-markets']||0)>=2)&&!ensure(market))return;
        const i=draft.transactions.findIndex(t=>t.market===market&&t.row===row&&t.slot===slot);if(i>=0)draft.transactions.splice(i,1);else draft.transactions.push({market,row,slot,kind:s.markets.find(m=>m.id===market).rows[row].slots[slot].barrel?'buy':'sell'});
        const sale=draft.transactions.findIndex(t=>t.kind==='sell'&&!t.barrel);if(sale>=0){draft.saleIndex=sale;PipelineWorkspace.focus('refine');}
      }
      if(el.dataset.contract){if(!ensure('contracts-loans'))return;const id=el.dataset.contract;draft.take=draft.take.some(t=>t.id===id)?draft.take.filter(t=>t.id!==id):[...draft.take,{id,deferred:false}];}
      if(el.dataset.deliver&&!bonus)draft={type:'fulfill',card:el.dataset.deliver};
      if(el.dataset.upgrade){if(!ensure('upgrades'))return;const id=el.dataset.upgrade;draft.upgrades=draft.upgrades.includes(id)?draft.upgrades.filter(x=>x!==id):[...draft.upgrades,id];}
      if(el.dataset.placePipe){activePipe=el.dataset.placePipe;activeMachine=null;const placed=draft.placements.find(t=>t.id===activePipe);if(placed)rotation=placed.rotation;}
      if(el.dataset.machinePlace!==undefined){activeMachine=Number(el.dataset.machinePlace);activePipe=null;}
      if(el.dataset.cell){
        const [x,y]=el.dataset.cell.split(',').map(Number);if(Number(el.dataset.owner)!==actor())return;
        const pending=draft?.placements?.find(t=>PipeGeometry.cells(t,faces).some(c=>c.x===x&&c.y===y));
        if(pending){draft.placements=draft.placements.filter(t=>t.id!==pending.id);activePipe=pending.id;}
        else if(activeMachine!==null&&draft?.items?.[activeMachine]){const map=PipeGeometry.board(draftNetwork(),faces);if(!map.has(`${x},${y}`))throw new Error('Place the machine on an existing pipe half.');Object.assign(draft.items[activeMachine],{x,y});activeMachine=null;}
        else if(activePipe&&draft){const fresh={id:activePipe,x,y,rotation},others=draft.placements.filter(t=>t.id!==activePipe);PipeGeometry.place(p().pipes,p().machines,[...others,fresh],faces);draft.placements=[...others,fresh];activePipe=null;}
        else if(can('refine')){const c=PipeGeometry.board(p().pipes,faces).get(`${x},${y}`);if(c){ensure('refine');if(draft.tile!==c.tile)draft.selections=[];draft.tile=c.tile;}}
      }
      if(el.dataset.removeTransaction!==undefined)draft.transactions.splice(Number(el.dataset.removeTransaction),1);
      sound(el.dataset.market?'coin':el.dataset.contract||el.dataset.deliver||el.dataset.upgrade?'card':'click');
      redraw();
    }catch(error){ctx[3](error.message);}
  };}
  return {resizeNetwork,illustratePipe:svgTile,illustrateOil:drop,cardRequirements:id=>cards[id]?.requirements||[],render,getDraft:()=>draft,setPreview:value=>{preview=value;if(!value)draft=null;},restoreDraft:value=>{draft=value;},exportPreview:()=>({draft,forms:[...document.querySelectorAll('.action-dock select[id]')].map(n=>[n.id,n.value])})};
})();
