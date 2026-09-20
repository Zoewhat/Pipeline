'use strict';

// Presentation only. All game actions still go through PipelineTable and the server.
window.PipelineWorkspace = (() => {
  const areas = [['government','Government'],['markets','Markets'],['shops','Shops'],['deliveries','Contracts & orders'],['upgrades','Upgrades'],['actions','Action pairs']];
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let area = 'government', marketView = 'crude', view = 'mine', overview = false, infoOpen = false, roomCode, lastLocalActor;
  let split = 48;
  try { split = Math.max(36, Math.min(62, Number(localStorage.getItem('pipeline.split')) || 48)); } catch {}
  const cameras = new Map(), positions = new Map();
  function capture(root) {
    root.querySelectorAll('[data-scroll-key]').forEach(el => {
      const svg=el.querySelector('svg.network');
      positions.set(el.dataset.scrollKey, [el.scrollLeft, el.scrollTop, Number(svg?.dataset.minX), Number(svg?.dataset.minY)]);
    });
  }
  function focus(space) {
    if(space==='crude'||space?.startsWith('market-'))marketView=space;
    area = space === 'government' ? 'government' : space?.startsWith('market-') || space === 'crude' ? 'markets' : ['tanks-pipes','machines-pipes'].includes(space) ? 'shops' : space === 'contracts-loans' ? 'deliveries' : space === 'upgrades' ? 'upgrades' : area;
    view = 'mine'; overview = false;
  }
  function mount(root, room, session, editing) {
    if (roomCode !== room.code) {
      roomCode = room.code; area = 'government'; marketView='crude'; view = 'mine'; overview = false; infoOpen = false;
      cameras.clear(); positions.clear(); lastLocalActor = null;
    }
    const actor = room.state.bonuses[0]?.actor ?? room.state.turn.actor;
    const own = room.local ? actor : session?.seat ?? 0;
    if (room.local && lastLocalActor !== actor) view = 'mine';
    lastLocalActor = actor;
    const shared = root.querySelector('.shared-board'), dock = root.querySelector('.action-dock');
    const refineries = root.querySelector('.refineries');
    const panels = [shared.querySelector('.government'), shared.querySelector('.market-area'), shared.querySelector('.shop-area'), shared.querySelector('.fulfillment'), shared.lastElementChild, shared.querySelector('.action-cross')];
    panels.forEach((panel, i) => { panel.dataset.area = areas[i][0]; });
    const articles = [...refineries.children];
    const editingNetwork = dock.querySelector('.network-scroll');
    if (editingNetwork) {
      articles[actor].querySelector('.network-scroll').replaceWith(editingNetwork);
      articles[actor].querySelector('[data-action="refine"]')?.remove();
    }
    const status = document.createElement('div'); status.className = 'player-pulse';
    status.innerHTML = room.state.players.map((pl,i) => `<span class="${i===actor?'taking-turn':''}"><b>${esc(room.players[i].name)}</b> <strong>$${pl.cash}</strong> · ${pl.oil.length} oil · ${pl.tanks.reduce((a,b)=>a+b,0)} tanks · ${pl.penalties} penalties <small>${room.players[i].connected?'● Connected':'○ Away'}</small></span>`).join('');
    const toolbar = document.createElement('nav'); toolbar.className = 'workspace-nav'; toolbar.setAttribute('aria-label','Table views');
    toolbar.innerHTML = `<div class="area-tabs">${areas.map(([id,title])=>`<button data-area-view="${id}" aria-controls="public-workspace">${title}</button>`).join('')}</div><button data-overview>Whole table</button><button data-table-info>Table info</button>`;
    const stage = document.createElement('div'); stage.className = 'workspace-stage'; stage.style.setProperty('--public-width', `${split}%`);
    stage.innerHTML = '<section id="public-workspace" class="public-workspace" aria-label="Public supplies" data-scroll-key="public"></section><div class="workspace-divider" role="separator" tabindex="0" aria-label="Resize public area" aria-orientation="vertical" aria-valuemin="36" aria-valuemax="62"></div><section class="personal-workspace" aria-label="Refinery workspace"><nav class="refinery-tabs" aria-label="Refinery views"><button data-refinery-view="mine">My refinery</button><button data-refinery-view="partner">Partner</button><button data-refinery-view="both">Compare both</button></nav><div class="refinery-pages" data-scroll-key="refineries"></div></section>';
    panels.forEach(panel => stage.querySelector('.public-workspace').append(panel));
    const marketTabs=document.createElement('nav');marketTabs.className='market-tabs';marketTabs.setAttribute('aria-label','Oil markets');
    marketTabs.innerHTML=room.state.markets.map(m=>`<button data-market-view="${m.id}">${m.id==='crude'?'Crude':`Refined ${m.id.slice(-1)}`}</button>`).join('');
    panels[1].prepend(marketTabs);
    const summaries = document.createElement('div'); summaries.className='overview-cards';
    const s=room.state;
    const descriptions = [
      s.government.map((q,i)=>`Quadrant ${i+1}: ${q.tiles.filter(Boolean).length} pipes · ${q.open?'open':'unopened'}`).join('<br>'),
      s.markets.map(m=>`${m.id==='crude'?'Crude':`Refined ${m.id.slice(-1)}`}: ${m.rows.reduce((n,r)=>n+r.slots.filter(slot=>slot.barrel).length,0)} oil available`).join('<br>'),
      `${s.shops.tank.slots.filter(slot=>slot.available).length} tanks · ${s.shops.tank.pipes.length} pipes<br>${s.shops.machine.slots.filter(slot=>slot.available).length} machines · ${s.shops.machine.pipes.length} pipes`,
      `${s.contracts.reduce((n,r)=>n+r.display.filter(Boolean).length,0)} contracts on display<br>${s.orders.reduce((n,r)=>n+r.display.filter(Boolean).length,0)} orders on display`,
      s.upgrades.map(u=>`${esc(u.id.replaceAll('-',' '))}: ${u.locked?'locked':'available'}`).join('<br>'),
      'Four paired arms<br>Main action → adjacent secondary<br>Open to inspect the current pairs'
    ];
    summaries.innerHTML=areas.map(([id,title],i)=>`<button data-overview-area="${id}"><b>${title} <span>↗</span></b><small>${descriptions[i]}</small></button>`).join('');
    stage.querySelector('.public-workspace').append(summaries);
    articles.forEach((article,i) => {
      article.dataset.player = i;
      const viewport = article.querySelector('.network-scroll'); viewport.dataset.scrollKey = `network-${i}`;
      viewport.dataset.camera = i;
      const tools = document.createElement('div'); tools.className = 'network-tools';
      tools.innerHTML = `<span>${editing && i===actor?'PLACING · unconfirmed':'PIPE NETWORK'}</span><button data-camera-action="out" data-camera-owner="${i}" aria-label="Zoom out">−</button><output data-zoom-label="${i}">100%</output><button data-camera-action="in" data-camera-owner="${i}" aria-label="Zoom in">+</button><button data-camera-action="fit" data-camera-owner="${i}">Fit</button><button data-camera-action="reset" data-camera-owner="${i}">1:1</button><small>Drag empty space to pan</small>`;
      viewport.before(tools);
      article.querySelector('.refinery-heading h2').textContent = i===own?'My refinery':'Partner’s refinery';
      stage.querySelector('.refinery-pages').append(article);
      const svg = viewport.querySelector('svg');
      const scale = cameras.get(i) || 1;
      svg.style.width = `${svg.viewBox.baseVal.width * scale}px`;
      svg.style.height = `${svg.viewBox.baseVal.height * scale}px`;
      tools.querySelector('output').textContent = `${Math.round(scale*100)}%`;
      let drag = null, suppressClick = false;
      viewport.onpointerdown = e => {
        if (e.button !== 0 || e.target.closest('button')) return;
        drag = {x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false};
      };
      viewport.onpointermove = e => {
        if (!drag || !e.buttons) { drag=null; return; }
        if (Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5) {
          drag.moved=true; viewport.setPointerCapture(e.pointerId);
          viewport.scrollLeft=drag.left-(e.clientX-drag.x); viewport.scrollTop=drag.top-(e.clientY-drag.y);
        }
      };
      viewport.onpointerup = () => { suppressClick=Boolean(drag?.moved); drag=null; };
      viewport.onpointercancel = () => { drag=null; };
      viewport.addEventListener('click', e => { if(suppressClick){e.stopPropagation();e.preventDefault();suppressClick=false;} },true);
    });
    // Keep the confirmation reachable while the variable-length form scrolls locally.
    const confirm = dock.querySelector('[data-command="confirm"]');
    const body = document.createElement('div'); body.className = 'action-body'; body.dataset.scrollKey = 'action';
    [...dock.childNodes].forEach(node => { if(node!==confirm) body.append(node); });
    if(body.querySelector('.draft-tiles')) {
      dock.classList.add('pipe-action');
      const tray=document.createElement('div');tray.className='placement-tray';
      ['.draft-tiles','.rotation-preview','.placement-controls','.placement-mode'].forEach(selector=>{const node=body.querySelector(selector);if(node)tray.append(node);});
      body.append(tray);
    }
    dock.append(body);
    if(confirm){ const commit=document.createElement('div');commit.className='action-commit';const quote=body.querySelector('.draft-quote');if(quote)commit.append(quote);commit.append(confirm);dock.append(commit); }
    dock.classList.toggle('has-draft', Boolean(confirm));
    const tools = root.querySelector('.table-tools'); tools.classList.add('workspace-info');
    const info = document.createElement('div'); info.className='workspace-information'; info.hidden=!infoOpen;
    toolbar.querySelector('[data-table-info]').setAttribute('aria-expanded',String(infoOpen));
    info.append(tools); const log=document.querySelector('.table-bottom');
    if(log) { const preview=document.createElement('div');preview.className='workspace-log'; preview.innerHTML='<h3>Recent activity</h3>'+document.getElementById('log').outerHTML.replace('id="log"','class="recent-log"'); info.append(preview); }
    root.querySelector('.table-jumps').remove(); root.querySelector('.play-layout').remove(); refineries.remove();
    root.append(status,toolbar,info,stage,dock);
    const apply = () => {
      root.classList.toggle('table-overview', overview);
      stage.classList.toggle('comparing-refineries',view==='both'&&!overview);
      stage.querySelector('.public-workspace').dataset.scrollKey=`public-${overview?'overview':area}`;
      stage.querySelectorAll('[data-area]').forEach(panel => panel.hidden = overview || panel.dataset.area!==area);
      summaries.hidden=!overview;
      panels[1].querySelectorAll('.market').forEach((market,i)=>market.hidden=room.state.markets[i].id!==marketView);
      marketTabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.marketView===marketView)));
      toolbar.querySelectorAll('[data-area-view]').forEach(button=>button.setAttribute('aria-pressed',String(!overview && button.dataset.areaView===area)));
      toolbar.querySelector('[data-overview]').setAttribute('aria-pressed',String(overview));
      stage.querySelectorAll('[data-refinery-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.refineryView===view)));
      articles.forEach((article,i)=> article.hidden=!(overview || view==='both' || i===(view==='mine'?own:1-own)));
      stage.querySelector('.refinery-pages').classList.toggle('comparing',overview||view==='both');
      stage.querySelector('.workspace-divider').setAttribute('aria-valuenow',String(Math.round(split)));
    };
    apply();
    // These controls remain available during a partner's turn or disconnection.
    toolbar.onclick = event => {
      const button=event.target.closest('button');if(!button)return;
      if(button.dataset.areaView){area=button.dataset.areaView;overview=false;if(view==='both')view='mine';stage.querySelector('.public-workspace').scrollTop=0;}
      if(button.hasAttribute('data-overview')) overview=!overview;
      if(button.hasAttribute('data-table-info')) {infoOpen=!infoOpen;info.hidden=!infoOpen;button.setAttribute('aria-expanded',String(infoOpen));}
      apply();
    };
    stage.querySelector('.refinery-tabs').onclick = e => {const b=e.target.closest('[data-refinery-view]');if(b){view=b.dataset.refineryView;apply();}};
    stage.addEventListener('click',e=>{
      const marketButton=e.target.closest('[data-market-view]');
      if(marketButton){marketView=marketButton.dataset.marketView;apply();stage.querySelector('.public-workspace').scrollTop=0;return;}
      const summary=e.target.closest('[data-overview-area]');
      if(summary){area=summary.dataset.overviewArea;overview=false;apply();return;}
      const button=e.target.closest('[data-camera-action]');if(!button)return;
      const i=Number(button.dataset.cameraOwner),viewport=articles[i].querySelector('.network-scroll'),svg=viewport.querySelector('svg');
      const old=cameras.get(i)||1,w=svg.viewBox.baseVal.width,h=svg.viewBox.baseVal.height;
      const action=button.dataset.cameraAction;
      let next=action==='fit'?Math.min((viewport.clientWidth-4)/w,(viewport.clientHeight-4)/h):action==='reset'?1:old*(action==='in'?1.2:1/1.2);
      next=Math.max(action==='fit'?.01:.02,Math.min(2.5,next)); cameras.set(i,next);
      svg.style.width=`${w*next}px`;svg.style.height=`${h*next}px`;
      viewport.scrollLeft=(viewport.scrollLeft+viewport.clientWidth/2)*next/old-viewport.clientWidth/2;
      viewport.scrollTop=(viewport.scrollTop+viewport.clientHeight/2)*next/old-viewport.clientHeight/2;
      articles[i].querySelector('output').textContent=`${Math.round(next*100)}%`;
    });
    const divider=stage.querySelector('.workspace-divider');
    function resize(value){split=Math.max(36,Math.min(62,value));stage.style.setProperty('--public-width',`${split}%`);divider.setAttribute('aria-valuenow',String(Math.round(split)));try{localStorage.setItem('pipeline.split',String(split));}catch{}}
    divider.onpointerdown=e=>{divider.setPointerCapture(e.pointerId);};
    divider.onpointermove=e=>{if(divider.hasPointerCapture(e.pointerId)&&e.buttons){const r=stage.getBoundingClientRect();resize((e.clientX-r.left)/r.width*100);}};
    divider.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();resize(split+(e.key==='ArrowRight'?2:-2));}};
    root.querySelectorAll('[data-scroll-key]').forEach(el=>{
      const pos=positions.get(el.dataset.scrollKey);if(!pos)return;
      const svg=el.querySelector('svg.network'),scale=cameras.get(Number(el.dataset.camera))||1;
      const dx=svg&&Number.isFinite(pos[2])?(pos[2]-Number(svg.dataset.minX))*42*scale:0;
      const dy=svg&&Number.isFinite(pos[3])?(pos[3]-Number(svg.dataset.minY))*42*scale:0;
      el.scrollLeft=pos[0]+dx;el.scrollTop=pos[1]+dy;
    });
  }
  return {capture,mount,focus};
})();
