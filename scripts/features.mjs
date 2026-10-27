import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.GAME_URL||'http://localhost:5173/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[],errors=[];
const check=(name,value)=>{assert.ok(value,name);results.push(name);console.log('PASS',name);};
const seedContext=await browser.newContext();const builder=await seedContext.newPage();await builder.goto(base);await builder.waitForSelector('#loading.loaded');
const defaultSave=()=>({unlocked:1,records:{},inventory:{hammer:3,shuffle:3,wand:2,moves:2},sound:false,stats:{maxCombo:0,rescues:0,rides:0,dailyClears:0},daily:{}});
async function build(level,extras={}){
  return builder.evaluate(async({level,extras})=>{const {Game,LEVELS}=await import('/src/engine.ts');const g=new Game(LEVELS[level-1],undefined,extras.seed??985);for(const [k,v]of Object.entries(extras))if(k!=='seed')g[k]=v;return g.serialize();},{level,extras});
}
async function open(save=defaultSave(),url=base){
  const context=await browser.newContext({viewport:{width:390,height:780}});
  await context.addInitScript(s=>{if(location.protocol.startsWith('http')&&!sessionStorage.getItem('seeded')){localStorage.setItem('rail-pop-v1',JSON.stringify(s));sessionStorage.setItem('seeded','1');}},save);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForSelector('#loading.loaded');await page.waitForTimeout(350);
  return {context,page,state:()=>page.evaluate(()=>JSON.parse(localStorage.getItem('rail-pop-v1'))),click:async a=>{const inModal=page.locator(`.modal [data-action="${a}"]`);await ((await inModal.count())?inModal.first():page.locator(`[data-action="${a}"]`).first()).click();}};
}
const identity=g=>g.board.map(t=>t?{kind:t.kind,special:t.special}:null);
try{
  await mkdir('artifacts',{recursive:true});
  let t=await open();await t.click('album');check('24 collectible stickers start locked',await t.page.locator('.album-sticker').count()===24&&await t.page.locator('.album-sticker.earned').count()===0);await t.page.waitForTimeout(400);await t.page.screenshot({path:'artifacts/album-mobile.png',fullPage:true});await t.context.close();
  const rescue=await build(5),cages=rescue.cages.map(n=>n?1:0);rescue.cages=cages;
  t=await open({...defaultSave(),unlocked:5,current:rescue});check('rescue station renders two crates',await t.page.locator('.rescue-box').count()===2);
  await t.click('hammer');await t.page.locator('[data-cell="18"]').click();await t.page.waitForFunction(()=>JSON.parse(localStorage.getItem('rail-pop-v1')).stats.rescues>=1);
  check('clearing crate cell rescues partner and persists',!(await t.state()).current.cages[18]&&(await t.state()).current.rescued>=1);
  await t.page.reload();await t.page.waitForSelector('#loading.loaded');await t.page.waitForTimeout(450);check('rescued crate stays open after reload',await t.page.locator('[data-cell="18"] .rescue-box').count()===0);await t.page.screenshot({path:'artifacts/rescue-mobile.png',fullPage:true});await t.context.close();
  t=await open({...defaultSave(),unlocked:7,current:await build(7)});check('picnic has collectable food',await t.page.locator('.souvenir-token').count()===3&&await t.page.locator('body').getAttribute('data-theme')==='picnic');
  await t.click('hammer');await t.page.locator('[data-cell="17"]').click();await t.page.waitForFunction(()=>JSON.parse(localStorage.getItem('rail-pop-v1')).current?.souvenirsCollected>=1);check('food is collected by clearing its tile',(await t.state()).current.souvenirCells.length<=2);await t.context.close();
  t=await open({...defaultSave(),unlocked:8,current:await build(8,{trainEnergy:35})});check('train meter appears after station eight',await t.page.locator('#train-meter').isVisible());
  await t.click('hammer');await t.page.locator('[data-cell="0"]').click();await t.page.waitForSelector('.surprise-train');await t.page.screenshot({path:'artifacts/train-mobile.png',fullPage:true});check('train animation fits phone',await t.page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
  await t.page.waitForFunction(()=>JSON.parse(localStorage.getItem('rail-pop-v1')).current?.trainRides===1);check('train delivers a bomb without spending moves',(await t.state()).current.moves===30&&(await t.state()).stats.rides===1);await t.context.close();
  t=await open({...defaultSave(),unlocked:14,current:await build(14)});check('rain theme changes goal to puddles',(await t.page.locator('#goals').textContent()).includes('清除水洼'));await t.context.close();
  t=await open({...defaultSave(),unlocked:15,current:await build(15)});check('sleepover theme has collectible stars',await t.page.locator('body').getAttribute('data-theme')==='night'&&(await t.page.locator('.souvenir-token').first().textContent())==='★');await t.context.close();
  const chain=await builder.evaluate(async()=>{const {Game,LEVELS}=await import('/src/engine.ts');for(let seed=1;seed<1000;seed++){const g=new Game(LEVELS[2],undefined,seed),snapshot=structuredClone(g.serialize()),move=g.validMoves()[0];let wave=g.resolve(g.swap(...move).forced),n=0;while(wave&&n++<30){g.collapse();wave=g.resolve();}if(g.maxCombo>=8)return{snapshot,move};}throw Error('no eight combo seed');});
  t=await open({...defaultSave(),unlocked:3,current:chain.snapshot});await t.page.locator(`[data-cell="${chain.move[0]}"]`).click();await t.page.locator(`[data-cell="${chain.move[1]}"]`).click();
  for(const file of ['clap','victory','rare']){await t.page.waitForSelector(`.combo-bear-reaction img[src$="joke-bear-${file}.gif"]`);check(`${file} online sticker appears at combo milestone`,true);}
  await t.page.waitForSelector('.modal-win');await t.click('album');check('combo milestones unlock three album stories',await t.page.locator('.album-sticker.earned').count()>=4);await t.context.close();
  const campaign=await build(4,{score:360,moves:23});t=await open({...defaultSave(),unlocked:4,current:campaign});await t.click('challenges');await t.page.waitForTimeout(400);await t.page.screenshot({path:'artifacts/challenges-mobile.png',fullPage:true});await t.click('daily-start');
  let state=await t.state();const initial=state.current;check('daily challenge keeps campaign and disables all boosters',!!state.mode&&state.campaign.moves===23&&await t.page.locator('.booster:disabled').count()===4);
  await t.page.reload();await t.page.waitForSelector('#loading.loaded');assert.deepEqual(identity((await t.state()).current),identity(initial));check('daily challenge survives reload',true);
  await t.click('return-campaign');state=await t.state();assert.deepEqual(state.current.board,campaign.board);check('returning restores exact campaign state',state.current.moves===23&&state.current.score===360&&!state.mode);
  await t.click('challenges');await t.page.locator('#challenge-code').fill('RP2-broken');await t.click('join-challenge');check('invalid challenge code shows useful error',(await t.page.locator('#challenge-error').textContent()).includes('无效'));await t.context.close();
  const fixture=await builder.evaluate(async()=>{const a=await import('/src/activities.ts');const {Game}=await import('/src/engine.ts');const mode=a.dailyChallenge(),g=new Game(a.challengeLevel(mode),undefined,mode.seed);g.score=8000;g.maxCombo=5;g.bombsUsed=1;g.moves=10;return{mode,current:g.serialize()};});
  t=await open({...defaultSave(),unlocked:4,campaign,...fixture});await t.page.waitForSelector('.modal-win');state=await t.state();check('daily clear saves result once without campaign rewards',state.stats.dailyClears===1&&Object.keys(state.daily).length===1&&state.unlocked===4&&state.inventory.hammer===3&&!state.records[9]);
  await t.click('share-result');const shareLink=await t.page.locator('#share-link').inputValue();check('shared result link contains versioned challenge',shareLink.includes('?challenge=RP2-'));await t.context.close();
  t=await open(defaultSave(),shareLink);check('incoming link opens join dialog',await t.page.locator('#challenge-code').inputValue()!=='');await t.click('join-challenge');state=await t.state();assert.deepEqual(identity(state.current),identity(initial));check('friend starts identical daily board and sees benchmark',!!state.mode.benchmark&&(await t.page.locator('#activity-banner').textContent()).includes('好友'));
  await t.page.emulateMedia({reducedMotion:'reduce'});check('all layouts fit small phone',await t.page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));await t.context.close();
  check('no uncaught errors in seven-feature flows',errors.length===0);
  await writeFile('artifacts/features-report.json',JSON.stringify({results,errors},null,2));console.log(`Completed ${results.length} feature checks.`);
}finally{await browser.close();}
