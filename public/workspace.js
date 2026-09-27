'use strict';
window.PipelineWorkspace=(()=>{
  const shared=[['government','Government'],['crude','Crude'],['upgrades','Upgrades'],['market-1','Refined 1'],['tanks-pipes','Tanks & pipes'],['market-2','Refined 2'],['machines-pipes','Machines & pipes'],['market-3','Refined 3'],['contracts-loans','Contracts & orders']];
  const outerActions=['crude','market-1','market-2','market-3'];
  let roomCode,left='government',right='refinery-0',own=0,overview=false,split=50,root,renderPanels,incoming=null,menuCloserBound=false;
  const positions=new Map(),cameras=new Map();
  let networkObservers=[];
  const E=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try{split=Math.max(30,Math.min(70,Number(localStorage.getItem('pipeline.split'))||50));}catch{}
  function capture(el){el.querySelectorAll('[data-scroll-key]').forEach(n=>positions.set(n.dataset.scrollKey,[n.scrollLeft,n.scrollTop]));}
  function focus(space){
    const id=space==='refine'?`refinery-${own}`:space;
    if(shared.some(x=>x[0]===id)&&left!==id)left=id;
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
    const shop=type=>area(type==='machine'?'machines-pipes':'tanks-pipes',type==='machine'?'Machines & pipes':'Tanks & pipes',`map-${type}`,`<span class="map-equipment">${s.shops[type].slots.map(slot=>`<span class="${slot.available?'':'map-sold'}" title="$${slot.price}${slot.available?'':' · sold'}"><img src="/assets/${type}-market.webp" alt="${type}" width="48" height="48"></span>`).join('')}</span><span class="map-shop-pipes">${s.shops[type].pipes.map(id=>tile(id)).join('')}</span>`);
    const quadrant=(q,i)=>area('government',`Government ${i+1}${q.open?' · open':''}`,'map-quadrant',`<span class="map-pipe-grid">${q.tiles.map((id,j)=>{const p=PipeGeometry.governmentLayout[j];return `<span class="map-pipe-position-${j}">${tile(id,p.rotation)}</span>`;}).join('')}</span>`);
    const pairs=[[0,1],[3,2],[5,4],[7,6]].map(pair=>`<span class="map-action-pair">${pair.map(i=>`<span>${E(actionNames[s.spaces[i].id])}</span>`).join('<span aria-hidden="true">↔</span>')}</span>`).join('');
    return `<div class="table-map" aria-label="Whole table, arranged like the physical board">
      ${market(s.markets[0])}
      ${area('upgrades','Upgrades','map-upgrades',`<span class="map-upgrade-families">${s.upgrades.map(u=>`<span><span>${E({'government':'Government','engineering':'Engineering','human-resources':'Human resources','refined-markets':'Refined markets','shops':'Shops'}[u.id])}</span><span class="map-levels">${u.copies.map((n,i)=>`<span class="${!n?'map-sold':''}">${['I','II','III'][i]}</span>`).join('')}</span></span>`).join('')}</span>`)}
      ${area('contracts-loans','Contracts','map-contracts',cards(s.contracts))}
      <div class="map-government">${quadrant(s.government[0],0)}${quadrant(s.government[1],1)}<div class="map-area map-actions"><span class="map-heading">Action pairs</span>${pairs}</div>${quadrant(s.government[2],2)}${quadrant(s.government[3],3)}</div>
      ${shop('machine')}
      ${area('contracts-loans','Orders','map-orders',cards(s.orders))}
      ${shop('tank')}
      ${s.markets.slice(1).map(market).join('')}
    </div>`;
  }
  function mount(el,room,session,editing){
    root=el;const s=room.state,actor=s.bonuses[0]?.actor??s.turn.actor;own=room.local?actor:session?.seat??0;
    if(roomCode!==room.code){roomCode=room.code;left='government';right=`refinery-${own}`;overview=false;positions.clear();cameras.clear();}
    if(incoming){applyFollow(incoming);incoming=null;}
    const templates=new Map();
    templates.set('government',root.querySelector('.government'));
    root.querySelectorAll('.market').forEach((m,i)=>templates.set(s.markets[i].id,m));
    const shopPanels=[...root.querySelectorAll('.shop-area .shop')];templates.set('tanks-pipes',shopPanels[0]);templates.set('machines-pipes',shopPanels[1]);templates.set('contracts-loans',root.querySelector('.fulfillment'));templates.set('upgrades',root.querySelector('.upgrade-grid').parentElement);
    const dock=root.querySelector('.action-dock'),articles=[...root.querySelector('.refineries').children];
    const edit=dock.querySelector('.network-scroll');if(edit)articles[actor].querySelector('.network-scroll').replaceWith(edit);
    articles.forEach((a,i)=>{a.dataset.player=i;templates.set(`refinery-${i}`,a);});
    const banner=root.querySelector('.turn-banner'),invite=document.querySelector('.invite');invite.querySelectorAll('button').forEach(b=>b.disabled=false);
    const turnSummary=banner.firstElementChild,turnButtons=banner.querySelector('.turn-buttons');turnSummary.classList.add('turn-summary');
    const costs=document.createElement('div');costs.className='persistent-costs';costs.innerHTML=Object.entries(s.costs).map(([c,v])=>`<span class="cost-color ${c}"><b>${c}</b> Low <strong>${v[0]}</strong> → Mid <strong>${v[1]}</strong> → High <strong>${v[2]}</strong></span>`).join('')+'<span class="scoring-cost" title="Valuation cards off. Machine lines add their separate value.">Oil / pipes: Low $10 · Mid $20 · High $30</span>';
    const toolbar=document.createElement('nav');toolbar.className='workspace-nav';toolbar.innerHTML=!room.local?'<button data-follow>Follow partner</button>':'';
    let gameMenu=invite.querySelector('.game-menu');
    if(!gameMenu){gameMenu=document.createElement('details');gameMenu.className='game-menu';const summary=document.createElement('summary');summary.textContent='Menu';const menuBody=document.createElement('div');menuBody.className='game-menu-popover';const save=invite.querySelector('#download-save'),leave=invite.querySelector('#leave');menuBody.append(save,leave);gameMenu.append(summary,menuBody);invite.append(gameMenu);}
    if(!menuCloserBound){document.addEventListener('pointerdown',event=>document.querySelectorAll('.game-menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;}));menuCloserBound=true;}
    gameMenu.addEventListener('click',event=>{if(event.target.closest('button'))gameMenu.open=false;});
    const referenceBar=document.createElement('div');referenceBar.className='table-reference-bar';referenceBar.append(turnSummary,costs);if(toolbar.childElementCount)referenceBar.append(toolbar);referenceBar.append(invite);banner.remove();
    const stage=document.createElement('div');stage.className='workspace-stage twin-stage';stage.style.setProperty('--public-width',`${split}%`);stage.innerHTML='<section class="twin-panel" data-panel="left"><nav class="panel-tabs"></nav><div class="panel-page public-workspace refinery-pages"></div></section><div class="workspace-divider" role="separator" tabindex="0" aria-label="Resize panels" aria-orientation="vertical" aria-valuemin="30" aria-valuemax="70"></div><section class="twin-panel" data-panel="right"><nav class="panel-tabs"></nav><div class="panel-page public-workspace refinery-pages"></div></section>';
    const map=document.createElement('section');map.className='whole-table';map.innerHTML=diagram(s);
    const refineryLabel=(i,title)=>{const p=s.players[i];return `<span class="refinery-tab-label"><b>${title}</b><small>$${p.cash} · ${p.oil.length} oil · ${p.penalties} penalties · <time data-turn-clock="${i}">5:00</time></small></span>`;};
    const refineryTabs=[[`refinery-${own}`,refineryLabel(own,'My refinery')],[`refinery-${1-own}`,refineryLabel(1-own,'Partner’s refinery')]];
    const titles=Object.fromEntries(shared);
    const actionPairs=outerActions.map(outer=>{const a=s.spaces.find(x=>x.id===outer),inner=s.spaces.find(x=>x.id!==outer&&Math.abs(x.x-a.x)+Math.abs(x.y-a.y)===1);return [outer,inner.id];});
    const tabButton=(key,title,id,extra='')=>`<button data-panel-tab="${key}" class="${extra}" aria-pressed="${key===id}">${title}</button>`;
    const actionTabs=id=>`${tabButton('government','Government',id,'government-tab')}${actionPairs.map(pair=>`<span class="action-pair-tabs" role="group" aria-label="Paired actions">${pair.map((key,i)=>`${i?'<span class="pair-link" aria-hidden="true">↔</span>':''}${tabButton(key,titles[key],id)}`).join('')}</span>`).join('')}`;
    const confirmation=dock.querySelector('[data-command="confirm"]');const body=document.createElement('div');body.className='action-body';body.dataset.scrollKey='action';[...dock.childNodes].forEach(n=>{if(n!==confirmation)body.append(n);});dock.append(body);
    if(confirmation){const commit=document.createElement('div');commit.className='action-commit';const quote=body.querySelector('.draft-quote');if(quote)commit.append(quote);commit.append(confirmation);dock.append(commit);}
    // Refining controls live next to the selectable tank inventory, not in a second scrolling tray.
    const refine=body.querySelector('.refine-controls');if(refine){templates.get(`refinery-${actor}`).querySelector('[data-action="refine"]')?.remove();templates.get(`refinery-${actor}`).querySelector('.tank-farm').prepend(refine);dock.classList.add('refining');}
    root.querySelector('.table-tools').remove();root.querySelector('.table-jumps').remove();root.querySelector('.play-layout').remove();root.querySelector('.refineries').remove();
    root.prepend(referenceBar);root.append(stage,dock);
    renderPanels=()=>{
      networkObservers.forEach(observer=>observer.disconnect());networkObservers=[];
      stage.hidden=false;stage.classList.toggle('overview-mode',overview);dock.hidden=overview;
      for(const side of ['left','right']){
        const id=side==='left'?left:right,panel=stage.querySelector(`[data-panel="${side}"]`),nav=panel.querySelector('nav'),page=panel.querySelector('.panel-page');
        nav.className=`panel-tabs ${side==='left'?'action-panel-tabs':'refinery-panel-tabs'}`;
        nav.innerHTML=side==='left'?actionTabs(id):refineryTabs.map(([key,title])=>tabButton(key,title,id,'refinery-tab')).join('')+`<button data-overview aria-pressed="${overview}">Whole table</button>`;
        if(side==='right'&&turnButtons.childElementCount){turnButtons.classList.add('refinery-turn-actions');nav.append(turnButtons);}
        page.replaceChildren(overview&&side==='right'?map.cloneNode(true):templates.get(id).cloneNode(true));page.dataset.scrollKey=`${side}-${overview&&side==='right'?'whole-table':id}`;
        page.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
        page.querySelectorAll('[data-loan]').forEach(n=>n.checked=Boolean(PipelineTable.getDraft()?.loan));
        const viewport=page.querySelector('.network-scroll');
        if(viewport){
          const key=`${side}-${id}`,svg=viewport.querySelector('svg'),i=Number(id.slice(-1));viewport.dataset.scrollKey=`network-${key}`;
          const tools=document.createElement('div');tools.className='network-tools';tools.innerHTML=`<button data-camera="out" aria-label="Zoom out">−</button><output>${Math.round((cameras.get(key)||1)*100)}%</output><button data-camera="in" aria-label="Zoom in">+</button><button data-camera="fit">Fit</button><button data-camera="reset">1:1</button>`;viewport.before(tools);
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
    stage.addEventListener('click',e=>{const overviewButton=e.target.closest('[data-overview]');if(overviewButton){overview=true;renderPanels();return;}const area=e.target.closest('[data-overview-area]');if(area&&shared.some(([id])=>id===area.dataset.overviewArea)){left=area.dataset.overviewArea;overview=false;renderPanels();return;}const b=e.target.closest('[data-panel-tab]');if(!b)return;capture(root);if(b.closest('[data-panel]').dataset.panel==='left')left=b.dataset.panelTab;else{right=b.dataset.panelTab;overview=false;}renderPanels();});
    stage.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-overview-area]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
    toolbar.onclick=e=>{if(e.target.closest('[data-follow]'))window.PipelinePresence?.toggle();};
    const divider=stage.querySelector('.workspace-divider');const resize=v=>{split=Math.max(30,Math.min(70,v));stage.style.setProperty('--public-width',`${split}%`);divider.setAttribute('aria-valuenow',String(Math.round(split)));try{localStorage.setItem('pipeline.split',split);}catch{}};resize(split);divider.onpointerdown=e=>divider.setPointerCapture(e.pointerId);divider.onpointermove=e=>{if(divider.hasPointerCapture(e.pointerId)&&e.buttons){const r=stage.getBoundingClientRect();resize((e.clientX-r.left)/r.width*100);}};divider.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();resize(split+(e.key==='ArrowRight'?2:-2));}};
    const actionPosition=positions.get('action');if(actionPosition){body.scrollLeft=actionPosition[0];body.scrollTop=actionPosition[1];}
    window.PipelinePresence?.decorate();
  }
  return {capture,focus,mount,snapshot,follow};
})();
