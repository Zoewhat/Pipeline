'use strict';
window.PipelineWorkspace=(()=>{
  const shared=[['actions','Action pairs'],['government','Government'],['crude','Crude'],['market-1','Refined 1'],['market-2','Refined 2'],['market-3','Refined 3'],['shops','Shops'],['deliveries','Contracts & orders'],['upgrades','Upgrades']];
  let roomCode,left='actions',right='refinery-0',own=0,overview=false,infoOpen=false,split=50,root,renderPanels,incoming=null;
  const positions=new Map(),cameras=new Map();
  let networkObservers=[];
  const E=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try{split=Math.max(30,Math.min(70,Number(localStorage.getItem('pipeline.split'))||50));}catch{}
  function capture(el){el.querySelectorAll('[data-scroll-key]').forEach(n=>positions.set(n.dataset.scrollKey,[n.scrollLeft,n.scrollTop]));}
  function focus(space){
    const id=space==='contracts-loans'?'deliveries':['tanks-pipes','machines-pipes'].includes(space)?'shops':space==='refine'?`refinery-${own}`:space;
    if(shared.some(x=>x[0]===id)&&left!==id&&right!==id)left=id;
    if(space==='refine'||['government','tanks-pipes','machines-pipes'].includes(space)){
      if(left!==`refinery-${own}`&&right!==`refinery-${own}`)right=`refinery-${own}`;
    }
    overview=false;
  }
  function snapshot(){capture(root||document);return {left,right,overview,cameras:[...cameras],scroll:[...positions]};}
  function follow(v){incoming=v;}
  function applyFollow(v){left=v.left;right=v.right;overview=v.overview;cameras.clear();positions.clear();for(const pair of v.cameras||[])if(Array.isArray(pair)&&pair.length===2&&typeof pair[0]==='string'&&typeof pair[1]==='number')cameras.set(...pair);for(const pair of v.scroll||[])if(Array.isArray(pair)&&pair.length===2&&Array.isArray(pair[1]))positions.set(...pair);}
  function diagram(s){
    const names=Object.fromEntries(shared), grades=['Crude','Low','Mid','High'];
    const actionNames={...names,'contracts-loans':'Contracts & loans','tanks-pipes':'Tanks & pipes','machines-pipes':'Machines & pipes'};
    const oil=window.PipelineTable.illustrateOil;
    const tile=(id,rotation=0)=>id?`<svg viewBox="0 0 ${rotation?'40 80':'80 40'}" aria-hidden="true">${window.PipelineTable.illustratePipe(id,rotation)}</svg>`:'<span class="map-vacant" aria-label="Taken pipe"></span>';
    const area=(id,title,cls,content)=>`<button type="button" class="map-area ${cls}" data-overview-area="${id}" aria-label="Open ${E(title)}"><span class="map-heading">${E(title)}</span>${content}</button>`;
    const market=m=>{
      const groups=m.id==='crude'?m.rows.map(r=>[r]):[3,2,1,0].map(g=>m.rows.filter(r=>r.grade===g)).filter(r=>r.length);
      return area(m.id,m.id==='crude'?'Crude market':names[m.id],`map-${m.id}`,`<span class="map-market">${groups.map(rows=>`<span class="map-oil-row"><span>${grades[rows[0].grade]}</span><span class="map-oil-slots">${rows.map(r=>`<span class="map-oil-group">${r.slots.map(slot=>`<span class="map-oil-slot" title="${r.color} ${grades[r.grade]} · $${slot.price}">${slot.barrel?oil(slot.barrel.color,slot.barrel.grade):`<span class="map-empty-oil ${r.color}" aria-label="Empty ${r.color} ${grades[r.grade]} oil space"></span>`}</span>`).join('')}</span>`).join('')}</span></span>`).join('')}</span>`);
    };
    const cards=rows=>`<span class="map-card-rows">${[...rows].reverse().map(r=>`<span class="map-card-row">${r.display.map(id=>`<span class="map-card ${id?'':'map-vacant'}">${id?window.PipelineTable.cardRequirements(id).map(req=>oil(req.color,req.grade)).join(''):''}</span>`).join('')}</span>`).join('')}</span>`;
    const shop=type=>area('shops',type==='machine'?'Machines & pipes':'Tanks & pipes',`map-${type}`,`<span class="map-equipment">${s.shops[type].slots.map(slot=>`<span class="${slot.available?'':'map-sold'}" title="$${slot.price}${slot.available?'':' · sold'}"><img src="/assets/${type}-market.webp" alt="${type}" width="48" height="48"></span>`).join('')}</span><span class="map-shop-pipes">${s.shops[type].pipes.map(id=>tile(id)).join('')}</span>`);
    const quadrant=(q,i)=>area('government',`Government ${i+1}${q.open?' · open':''}`,'map-quadrant',`<span class="map-pipe-grid">${q.tiles.map((id,j)=>{const p=PipeGeometry.governmentLayout[j];return `<span class="map-pipe-position-${j}">${tile(id,p.rotation)}</span>`;}).join('')}</span>`);
    const pairs=[[0,1],[3,2],[5,4],[7,6]].map(pair=>`<span class="map-action-pair">${pair.map(i=>`<span>${E(actionNames[s.spaces[i].id])}</span>`).join('<span aria-hidden="true">↔</span>')}</span>`).join('');
    return `<div class="table-map" aria-label="Whole table, arranged like the physical board">
      ${market(s.markets[0])}
      ${area('upgrades','Upgrades','map-upgrades',`<span class="map-upgrade-families">${s.upgrades.map(u=>`<span><span>${E({'government':'Government','engineering':'Engineering','human-resources':'Human resources','refined-markets':'Refined markets','shops':'Shops'}[u.id])}</span><span class="map-levels">${u.copies.map((n,i)=>`<span class="${!n?'map-sold':''}">${['I','II','III'][i]}</span>`).join('')}</span></span>`).join('')}</span>`)}
      ${area('deliveries','Contracts','map-contracts',cards(s.contracts))}
      <div class="map-government">${quadrant(s.government[0],0)}${quadrant(s.government[1],1)}${area('actions','Action pairs','map-actions',pairs)}${quadrant(s.government[2],2)}${quadrant(s.government[3],3)}</div>
      ${shop('machine')}
      ${area('deliveries','Orders','map-orders',cards(s.orders))}
      ${shop('tank')}
      ${s.markets.slice(1).map(market).join('')}
    </div>`;
  }
  function mount(el,room,session,editing){
    root=el;const s=room.state,actor=s.bonuses[0]?.actor??s.turn.actor;own=room.local?actor:session?.seat??0;
    if(roomCode!==room.code){roomCode=room.code;left='actions';right=`refinery-${own}`;overview=false;positions.clear();cameras.clear();}
    if(incoming){applyFollow(incoming);incoming=null;}
    const templates=new Map();
    templates.set('actions',root.querySelector('.action-cross'));templates.set('government',root.querySelector('.government'));
    root.querySelectorAll('.market').forEach((m,i)=>templates.set(s.markets[i].id,m));
    templates.set('shops',root.querySelector('.shop-area'));templates.set('deliveries',root.querySelector('.fulfillment'));templates.set('upgrades',root.querySelector('.upgrade-grid').parentElement);
    const dock=root.querySelector('.action-dock'),articles=[...root.querySelector('.refineries').children];
    const edit=dock.querySelector('.network-scroll');if(edit)articles[actor].querySelector('.network-scroll').replaceWith(edit);
    articles.forEach((a,i)=>{a.dataset.player=i;a.querySelector('.refinery-heading h2').textContent=room.players[i].name+'’s refinery';templates.set(`refinery-${i}`,a);});
    const banner=root.querySelector('.turn-banner'),invite=document.querySelector('.invite');invite.querySelectorAll('button').forEach(b=>b.disabled=false);
    const status=document.createElement('div');status.className='player-pulse';status.innerHTML=s.players.map((p,i)=>`<span class="${actor===i?'taking-turn':''}"><b>${E(room.players[i].name)}</b><strong>$${p.cash}</strong><small>${p.oil.length} oil · ${p.penalties} penalties</small><time data-turn-clock="${i}">5:00</time></span>`).join('');
    banner.insertBefore(status,banner.querySelector('.turn-buttons'));
    const costs=document.createElement('div');costs.className='persistent-costs';costs.innerHTML=Object.entries(s.costs).map(([c,v])=>`<span class="cost-color ${c}"><b>${c}</b> Low <strong>${v[0]}</strong> → Mid <strong>${v[1]}</strong> → High <strong>${v[2]}</strong></span>`).join('')+'<span class="scoring-cost" title="Valuation cards off. Machine lines add their separate value.">Oil / pipes: Low $10 · Mid $20 · High $30</span>';
    const toolbar=document.createElement('nav');toolbar.className='workspace-nav';toolbar.innerHTML=`<button data-overview>▦ Whole table</button><button data-table-info>Activity & turn order</button>${!room.local?'<button data-follow>Follow partner</button>':''}`;
    const referenceBar=document.createElement('div');referenceBar.className='table-reference-bar';referenceBar.append(costs,invite);banner.insertBefore(toolbar,banner.querySelector('.turn-buttons'));
    status.title='5 min per turn, then $5 per full extra minute';
    const info=document.createElement('div');info.className='workspace-information';info.hidden=!infoOpen;info.innerHTML=`<b>Next round: ${s.nextOrder.map(i=>E(room.players[i].name)).join(' → ')}</b><ol>${[...room.log].reverse().slice(0,12).map(l=>`<li>${E(l.text)}</li>`).join('')}</ol>`;
    const stage=document.createElement('div');stage.className='workspace-stage twin-stage';stage.style.setProperty('--public-width',`${split}%`);stage.innerHTML='<section class="twin-panel" data-panel="left"><nav class="panel-tabs"></nav><div class="panel-page public-workspace refinery-pages"></div></section><div class="workspace-divider" role="separator" tabindex="0" aria-label="Resize panels" aria-orientation="vertical" aria-valuemin="30" aria-valuemax="70"></div><section class="twin-panel" data-panel="right"><nav class="panel-tabs"></nav><div class="panel-page public-workspace refinery-pages"></div></section>';
    const map=document.createElement('section');map.className='whole-table';map.innerHTML=diagram(s)+`<details><summary>Show board details</summary><div class="map-details">${shared.map(([id,title])=>`<button data-overview-area="${id}">${title}</button>`).join('')}</div><p>${s.government.filter(q=>q.open).length} open quadrants · ${s.deckCount} pipes in supply · ${s.contracts.reduce((n,r)=>n+r.display.filter(Boolean).length,0)} contracts · ${s.orders.reduce((n,r)=>n+r.display.filter(Boolean).length,0)} orders</p></details>`;
    const tabs=[...shared,[`refinery-${own}`,'My refinery'],[`refinery-${1-own}`,'Partner’s refinery']];
    const confirmation=dock.querySelector('[data-command="confirm"]');const body=document.createElement('div');body.className='action-body';body.dataset.scrollKey='action';[...dock.childNodes].forEach(n=>{if(n!==confirmation)body.append(n);});dock.append(body);
    if(confirmation){const commit=document.createElement('div');commit.className='action-commit';const quote=body.querySelector('.draft-quote');if(quote)commit.append(quote);commit.append(confirmation);dock.append(commit);}
    // Refining controls live next to the selectable tank inventory, not in a second scrolling tray.
    const refine=body.querySelector('.refine-controls');if(refine){templates.get(`refinery-${actor}`).querySelector('[data-action="refine"]')?.remove();templates.get(`refinery-${actor}`).querySelector('.tank-farm').prepend(refine);dock.classList.add('refining');}
    root.querySelector('.table-tools').remove();root.querySelector('.table-jumps').remove();root.querySelector('.play-layout').remove();root.querySelector('.refineries').remove();
    root.prepend(referenceBar);root.append(info,stage,map,dock);
    renderPanels=()=>{
      networkObservers.forEach(observer=>observer.disconnect());networkObservers=[];
      stage.hidden=overview;map.hidden=!overview;dock.hidden=overview;toolbar.querySelector('[data-overview]').setAttribute('aria-pressed',String(overview));
      for(const side of ['left','right']){
        const id=side==='left'?left:right,panel=stage.querySelector(`[data-panel="${side}"]`),nav=panel.querySelector('nav'),page=panel.querySelector('.panel-page');
        nav.innerHTML=tabs.map(([key,title])=>`<button data-panel-tab="${key}" class="${key.startsWith('refinery')?'refinery-tab':''}" aria-pressed="${key===id}">${title}</button>`).join('');
        page.replaceChildren(templates.get(id).cloneNode(true));page.dataset.scrollKey=`${side}-${id}`;
        page.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
        page.querySelectorAll('[data-loan]').forEach(n=>n.checked=Boolean(PipelineTable.getDraft()?.loan));
        const viewport=page.querySelector('.network-scroll');
        if(viewport){
          const key=`${side}-${id}`,svg=viewport.querySelector('svg'),i=Number(id.slice(-1));viewport.dataset.scrollKey=`network-${key}`;
          const tools=document.createElement('div');tools.className='network-tools';tools.innerHTML=`<span>${editing&&i===actor?'DASHED TILES · unconfirmed':'PIPE NETWORK'}</span><button data-camera="out">−</button><output>${Math.round((cameras.get(key)||1)*100)}%</output><button data-camera="in">+</button><button data-camera="fit">Fit</button><button data-camera="reset">1:1</button>`;viewport.before(tools);
          const columns=Number(svg.dataset.columns),rows=Number(svg.dataset.rows);
          let lastSize='';
          const size=()=>{if(!viewport.isConnected||!viewport.clientWidth||!viewport.clientHeight)return;const z=cameras.get(key)||1;
            const cols=Math.max(columns,Math.ceil(viewport.clientWidth/(42*z))),lines=Math.max(rows,Math.ceil(viewport.clientHeight/(42*z)));
            const signature=`${cols},${lines},${z}`;if(signature===lastSize)return;lastSize=signature;
            PipelineTable.resizeNetwork(svg,cols,lines);svg.style.width=`${cols*42*z}px`;svg.style.height=`${lines*42*z}px`;
            tools.querySelector('output').textContent=`${Math.round(z*100)}%`;
          };size();
          const observer=new ResizeObserver(size);observer.observe(viewport);networkObservers.push(observer);
          tools.onclick=e=>{const a=e.target.dataset.camera;if(!a)return;const old=cameras.get(key)||1,w=columns*42,h=rows*42;const next=Math.max(.1,Math.min(3,a==='fit'?Math.min((viewport.clientWidth-4)/w,(viewport.clientHeight-4)/h):a==='reset'?1:old*(a==='in'?1.2:1/1.2)));cameras.set(key,next);size();};
          let drag=null,suppress=false;viewport.onpointerdown=e=>{if(e.button===0)drag={x:e.clientX,y:e.clientY,l:viewport.scrollLeft,t:viewport.scrollTop};};viewport.onpointermove=e=>{if(!drag||!e.buttons)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5){suppress=true;viewport.setPointerCapture(e.pointerId);viewport.scrollLeft=drag.l+drag.x-e.clientX;viewport.scrollTop=drag.t+drag.y-e.clientY;}};viewport.onpointerup=()=>{drag=null;};viewport.onpointercancel=()=>{drag=null;};viewport.addEventListener('click',e=>{if(suppress){e.stopPropagation();suppress=false;}},true);
        }
        page.querySelectorAll('[data-scroll-key]').forEach(n=>{const pos=positions.get(n.dataset.scrollKey);if(pos){n.scrollLeft=pos[0];n.scrollTop=pos[1];}});const pos=positions.get(page.dataset.scrollKey);if(pos){page.scrollLeft=pos[0];page.scrollTop=pos[1];}
      }
      if(window.PipelinePresence?.following())stage.querySelectorAll('button:not([data-panel-tab]):not([data-camera]),input,select').forEach(n=>n.disabled=true);
    };
    renderPanels();
    stage.addEventListener('click',e=>{const b=e.target.closest('[data-panel-tab]');if(!b)return;capture(root);if(b.closest('[data-panel]').dataset.panel==='left')left=b.dataset.panelTab;else right=b.dataset.panelTab;renderPanels();});
    toolbar.onclick=e=>{if(e.target.closest('[data-overview]')){overview=!overview;renderPanels();}if(e.target.closest('[data-table-info]')){infoOpen=!infoOpen;info.hidden=!infoOpen;}if(e.target.closest('[data-follow]'))window.PipelinePresence?.toggle();};
    map.onclick=e=>{const n=e.target.closest('[data-overview-area]');if(n){left=n.dataset.overviewArea;overview=false;renderPanels();}};
    map.onkeydown=e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-overview-area]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}};
    const divider=stage.querySelector('.workspace-divider');const resize=v=>{split=Math.max(30,Math.min(70,v));stage.style.setProperty('--public-width',`${split}%`);divider.setAttribute('aria-valuenow',String(Math.round(split)));try{localStorage.setItem('pipeline.split',split);}catch{}};resize(split);divider.onpointerdown=e=>divider.setPointerCapture(e.pointerId);divider.onpointermove=e=>{if(divider.hasPointerCapture(e.pointerId)&&e.buttons){const r=stage.getBoundingClientRect();resize((e.clientX-r.left)/r.width*100);}};divider.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();resize(split+(e.key==='ArrowRight'?2:-2));}};
    const actionPosition=positions.get('action');if(actionPosition){body.scrollLeft=actionPosition[0];body.scrollTop=actionPosition[1];}
    window.PipelinePresence?.decorate();
  }
  return {capture,focus,mount,snapshot,follow};
})();
