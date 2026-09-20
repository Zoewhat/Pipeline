'use strict';
// Optional browser regression check. Requires Playwright and a local Chrome binary.
// PLAYWRIGHT_MODULE can point to an existing Playwright installation.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');

(async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pipeline-workspace-'));
  const app = createApp({ storageDir: dir });
  let browser;
  const errors = [];
  try {
    await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${app.server.address().port}`;
    browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
    const contexts = await Promise.all([browser.newContext({viewport:{width:1366,height:768}}), browser.newContext({viewport:{width:1366,height:768}})]);
    const pages = await Promise.all(contexts.map(c=>c.newPage()));
    for(const page of pages){page.on('pageerror',e=>errors.push(e.message));await page.goto(url);}
    await pages[0].locator('#name').fill('Refinery A');
    await pages[0].locator('#submit-room').click();
    await pages[0].locator('#table-code').filter({hasText:/[A-F0-9]{8}/}).waitFor();
    const code=await pages[0].locator('#table-code').innerText();
    await pages[1].locator('[data-mode="join"]').click();
    await pages[1].locator('#name').fill('Refinery B');await pages[1].locator('#code').fill(code);
    await pages[1].locator('#submit-room').click();
    for(let i=0;i<2;i++)await pages[i].locator(`[data-ready="${i}"]`).click();
    await pages[0].locator('#start-game').click();
    for(const page of pages)await page.locator('.workspace-stage').waitFor();
    const state=page=>page.evaluate(()=>room.state);
    const current=async()=>pages[(await state(pages[0])).turn.actor];
    const commit=async page=>{const revision=await page.evaluate(()=>room.revision);await page.locator('[data-command="confirm"]').click();await page.waitForFunction(r=>room.revision>r,revision);};
    const end=async page=>{if((await state(page)).turn.stage==='secondary'){await page.locator('[data-command="skip"]').click();await page.waitForFunction(()=>room.state.turn.stage==='machine');}const before=await page.evaluate(()=>room.revision);await page.locator('[data-command="end"]').click();await pages[0].waitForFunction(r=>room.revision>r,before);await pages[1].waitForFunction(r=>room.revision>r,before);};
    const checkViewport=async page=>{assert.deepEqual(await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight]),[1366,768]);};
    const active=await current(),seat=(await state(active)).turn.actor,observer=pages[1-seat];
    await observer.locator('[data-area-view="markets"]').click();
    await observer.locator('[data-camera-action="in"]').filter({visible:true}).first().click();
    // An inactive seat can browse but cannot interact with another player's game pieces.
    assert.equal(await observer.locator('[data-government]:not([disabled])').count(),0);
    await active.locator('[data-government]:not([disabled])').first().click();
    const quadrant=(await active.locator('[data-government].chosen').getAttribute('data-government')).split(',')[0];
    await active.locator(`[data-government="${quadrant},1"]`).click();
    await active.locator('[data-command="rotate"]').click();
    await active.locator('[data-area-view="markets"]').click();
    await active.locator('[data-area-view="government"]').click();
    assert.equal(await active.locator('[data-government].chosen').count(),2);
    assert.equal((await state(active)).players[seat].cash,40);
    const network=active.locator('.refinery:not([hidden]) .network-scroll');
    assert.ok((await network.boundingBox()).height>220,'Pipe placement needs useful vertical room');
    await active.locator('.refinery:not([hidden]) [data-cell="0,0"]').click();
    await active.locator('.refinery:not([hidden]) [data-cell="1,0"]').click();
    await checkViewport(active);
    if(process.env.SCREENSHOT_DIR)await active.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'pipeline-placement.png')});
    await commit(active);
    await observer.waitForFunction(i=>room.state.players[i].pipes.length===2,seat);
    assert.equal((await state(active)).players[seat].cash,30);
    assert.equal(await observer.locator('[data-area-view="markets"]').getAttribute('aria-pressed'),'true');
    assert.equal(await observer.locator('.refinery:not([hidden]) [data-zoom-label]').innerText(),'120%');
    assert.equal(await observer.locator('.refinery:not([hidden])').getAttribute('data-player'),String(1-seat));
    console.log('PASS: atomic two-pipe purchase, rotation, persistent draft, fixed viewport, independent remote view');
    await end(active);
    const shopper=await current(),shopSeat=(await state(shopper)).turn.actor;
    await shopper.locator('[data-area-view="shops"]').click();
    await shopper.locator('[data-shopitem^="tank,"]:not([disabled])').first().click();
    await shopper.locator('[data-tankgrade="0"]').selectOption('2');
    await shopper.locator('#next-order').selectOption('0');
    await shopper.locator('[data-shopitem^="tank,"]:not([disabled])').nth(1).click();
    assert.equal(await shopper.locator('[data-tankgrade="0"]').inputValue(),'2');
    assert.equal(await shopper.locator('#next-order').inputValue(),'0');
    await shopper.locator('[data-tankgrade="1"]').selectOption('3');
    await shopper.locator('[data-area-view="upgrades"]').click();await shopper.locator('[data-area-view="shops"]').click();
    assert.equal(await shopper.locator('[data-tankgrade="1"]').inputValue(),'3');
    await commit(shopper);
    assert.deepEqual((await state(shopper)).players[shopSeat].tanks,[2,1,2,2]);
    console.log('PASS: tank grades and next-round order survive draft rerenders and area switching');
    await end(shopper);
    const trader=await current(),tradeSeat=(await state(trader)).turn.actor;
    await trader.locator('[data-area-view="markets"]').click();
    const cash=(await state(trader)).players[tradeSeat].cash;
    const oilSlot=trader.locator('[data-market^="crude,"]:not([disabled])').filter({has:trader.locator('.oil-chip')}).first();
    const price=Number((await oilSlot.locator('small').innerText()).replace('$',''));
    await oilSlot.click();
    await checkViewport(trader);
    assert.match(await trader.locator('.draft-quote').innerText(),new RegExp(`Selected cost \\$${price}`));
    if(process.env.SCREENSHOT_DIR)await trader.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'pipeline-market.png')});
    await commit(trader);
    assert.equal((await state(trader)).players[tradeSeat].oil.length,1);
    assert.equal((await state(trader)).players[tradeSeat].cash,cash-price);
    console.log('PASS: buy oil with market, inventory, total price and confirmation on one screen');
    await trader.locator('[data-overview]').click();
    assert.equal(await trader.locator('[data-overview-area]:visible').count(),6);
    assert.equal(await trader.locator('.refinery:visible').count(),2);
    await checkViewport(trader);
    if(process.env.SCREENSHOT_DIR)await trader.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'pipeline-overview.png')});
    await trader.locator('[data-overview-area="upgrades"]').click();
    assert.equal(await trader.locator('[data-area-view="upgrades"]').getAttribute('aria-pressed'),'true');
    await trader.locator('[data-refinery-view="both"]').click();
    const boards=await trader.locator('.refinery:visible').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().toJSON()));
    assert.equal(boards[0].y,boards[1].y);assert.ok(boards[1].x>=boards[0].right);
    await trader.locator('[data-area-view="upgrades"]').click();
    const separator=trader.locator('[role="separator"]');
    await separator.focus();await separator.press('ArrowRight');
    assert.equal(await separator.getAttribute('aria-valuenow'),'50');
    await trader.locator('[data-table-info]').click();assert.equal(await trader.locator('.workspace-information').isVisible(),true);
    await trader.locator('[data-table-info]').click();
    await trader.setViewportSize({width:390,height:844});
    assert.equal(await trader.evaluate(()=>document.documentElement.scrollWidth),390);
    await trader.setViewportSize({width:1366,height:768});
    await end(trader);
    while((await state(pages[0])).turn.actor!==tradeSeat){
      const page=await current();await page.locator('[data-command="skip"]').click();
      await page.waitForFunction(()=>room.state.turn.stage==='machine');await end(page);
    }
    await trader.locator('[data-area-view="markets"]').click();
    await trader.locator('[data-market-view="crude"]').click();
    const beforeSale=(await state(trader)).players[tradeSeat].cash;
    const empty=trader.locator('[data-market^="crude,"]:not([disabled])').filter({has:trader.locator('.empty-oil')}).first();
    const salePrice=Number((await empty.locator('small').innerText()).replace('$',''));
    await empty.click();
    await trader.locator('#sale-0').selectOption((await state(trader)).players[tradeSeat].oil[0].id);
    await trader.locator('[data-market-view="market-1"]').click();await trader.locator('[data-market-view="crude"]').click();
    assert.notEqual(await trader.locator('#sale-0').inputValue(),'');
    await commit(trader);
    assert.equal((await state(trader)).players[tradeSeat].cash,beforeSale+salePrice);
    assert.equal((await state(trader)).players[tradeSeat].oil.length,0);
    console.log('PASS: oil sale and selected barrel survive market subview switching');
    await end(trader);
    // Finish the game through UI buttons to cover round updates and the final score view.
    let turns=0;
    while((await state(pages[0])).phase!=='finished'){
      if(turns++>40)throw Error('Game did not finish');
      const page=await current();
      if((await state(page)).turn.stage==='work'){await page.locator('[data-command="skip"]').click();await page.waitForFunction(()=>room.state.turn.stage==='machine');}
      await end(page);
    }
    assert.equal(await pages[0].locator('.score-board').isVisible(),true);
    await pages[0].locator('[data-area-view="government"]').click();
    await checkViewport(pages[0]);
    assert.deepEqual(errors,[]);
    console.log('PASS: overview navigation, keyboard resizing, mobile overflow, all 18 rounds, final scoring, no browser errors');
    // Synthetic, local-only rendering fixture: a very wide late-game refinery.
    const stress=pages[0];
    await stress.evaluate(async()=>{
      const catalog=await (await fetch('/catalog.json')).json();
      const fixture=structuredClone(room);fixture.code='UI-STRESS';fixture.local=true;
      fixture.state.phase='playing';fixture.state.turn={actor:0,stage:'work',mainCount:0};fixture.state.bonuses=[];
      fixture.state.players[0].pipes=catalog.pipeTiles.slice(0,60).map((tile,i)=>({id:tile.id,x:i*2,y:0,rotation:0}));
      fixture.state.players[0].machines=[];fixture.state.players[0].pipelines=[];
      window.workspaceFixture=fixture;
      PipelineTable.render(fixture,{seat:0},async()=>{throw Error('Rendering fixture must not send actions');},message=>{throw Error(message);},false);
    });
    await stress.locator('.refinery:not([hidden]) [data-camera-action="fit"]').click();
    assert.ok(await stress.locator('.refinery:not([hidden]) .network-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1));
    await stress.locator('.refinery:not([hidden]) [data-camera-action="reset"]').click();
    const wide=stress.locator('.refinery:not([hidden]) .network-scroll');
    const box=await wide.boundingBox();
    await stress.mouse.move(box.x+150,box.y+70);await stress.mouse.down();await stress.mouse.move(box.x+60,box.y+70,{steps:8});await stress.mouse.up();
    assert.ok(await wide.evaluate(el=>el.scrollLeft)>70);
    assert.equal(await stress.locator('[data-command="confirm"]').count(),0,'Panning must not place a worker');
    const offset=await wide.evaluate(el=>el.scrollLeft);
    await stress.evaluate(()=>PipelineTable.render(window.workspaceFixture,{seat:0},async()=>{},console.error,false));
    assert.equal(await wide.evaluate(el=>el.scrollLeft),offset);
    for(const [width,height] of [[1280,720],[1440,900],[1920,1080]]){
      await stress.setViewportSize({width,height});
      assert.deepEqual(await stress.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight]),[width,height]);
    }
    await stress.locator('#leave').click();await stress.locator('#lobby').waitFor();
    assert.notEqual(await stress.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
    assert.deepEqual(errors,[]);
    console.log('PASS: 60-tile refinery fit, drag without accidental action, camera restoration, desktop sizes, return to lobby');
  } finally {
    if(browser)await browser.close();
    await app.close();rmSync(dir,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
