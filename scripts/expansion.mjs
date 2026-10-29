import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.GAME_URL||'http://localhost:5173/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[],errors=[],bad=[];
const check=(name,ok)=>{assert.ok(ok,name);results.push(name);console.log('PASS',name);};
const builder=await browser.newPage();await builder.goto(base);await builder.waitForSelector('#loading.loaded');
const fixtures=await builder.evaluate(async()=>{
  const {Game,LEVELS,levelRoster,findMatches}=await import('/src/engine.ts');const {CHARACTERS}=await import('/src/catalog.ts');
  return CHARACTERS.slice(9).map((friend,offset)=>{
    const kind=offset+9,level=LEVELS[friend.unlockLevel-1],g=new Game(level,undefined,kind*123),roster=levelRoster(level);
    g.board=g.board.map((t,i)=>t?{...t,kind:roster[(Math.floor(i/8)*2+i%8)%6],special:undefined}:null);
    g.board[0].kind=kind;g.board[1].kind=kind;g.board[2].kind=0;g.board[10].kind=kind;
    if(findMatches(g.board).length)throw Error('fixture must be stable');
    return{friend,kind,current:g.serialize()};
  });
});
const defaults=()=>({unlocked:38,records:{},sound:false,inventory:{hammer:3,shuffle:3,wand:2,moves:2}});
async function pageFor(save){const c=await browser.newContext({viewport:{width:390,height:820}});await c.addInitScript(s=>{if(location.protocol.startsWith('http')&&!sessionStorage.getItem('fixture')){localStorage.setItem('rail-pop-v1',JSON.stringify(s));sessionStorage.setItem('fixture','yes');}},save);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url());});await p.goto(base);await p.waitForSelector('#loading.loaded');await p.waitForTimeout(400);return{c,p};}
try{
  await mkdir('artifacts',{recursive:true});
  for(const fixture of fixtures){
    const {c,p}=await pageFor({...defaults(),current:fixture.current});
    check(`${fixture.friend.name} visible at station ${fixture.friend.unlockLevel}`,await p.locator(`.tile.kind-${fixture.kind}`).count()>0&&await p.locator('.tile img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
    await p.locator('[data-cell="2"]').click();await p.locator('[data-cell="10"]').click();
    await p.waitForFunction(kind=>JSON.parse(localStorage.getItem('rail-pop-v1')).current?.collected[kind]>=3,fixture.kind);
    check(`${fixture.friend.name} matches as an independent identity`,await p.evaluate(kind=>JSON.parse(localStorage.getItem('rail-pop-v1')).current.collected[kind]>=3,fixture.kind));
    check(`${fixture.friend.name} fits mobile board`,await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    if(fixture.kind===18)await p.screenshot({path:'artifacts/new-pirate-board-mobile.png',fullPage:true});await c.close();
  }
  let {c,p}=await pageFor(defaults());await p.locator('[data-action="friends"]').first().click();await p.locator('.friend-card img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));check('all nineteen portraits load in the collection',await p.locator('.friend-card').count()===19);await p.waitForTimeout(400);await p.screenshot({path:'artifacts/nineteen-collection-mobile.png',fullPage:true});
  await p.keyboard.press('Escape');await p.locator('[data-action="map"]').first().click();check('all thirty-eight stations have names',await p.locator('.station').count()===38&&!(await p.locator('.journey-map').textContent()).includes('undefined'));
  await p.keyboard.press('Escape');await p.locator('[data-action="album"]').first().click();check('forty-four album cards have complete labels',await p.locator('.album-sticker').count()===44&&!(await p.locator('.album-grid').textContent()).includes('undefined'));await c.close();
  const old=await builder.evaluate(async()=>{const{Game,LEVELS}=await import('/src/engine.ts');const g=new Game(LEVELS[17],undefined,185);g.score=1234;g.moves=12;const s=g.serialize();s.collected=Array(9).fill(1);return s;});
  ({c,p}=await pageFor({...defaults(),unlocked:18,current:old}));const restored=await p.evaluate(()=>JSON.parse(localStorage.getItem('rail-pop-v1')).current);assert.deepEqual(restored.board,old.board);check('old nine-character save keeps board and pads to nineteen',restored.collected.length===19&&restored.score===1234&&restored.moves===12);await p.locator('[data-action="friends"]').first().click();check('ten new identities stay locked before station nineteen',await p.locator('.friend-locked').count()===10);await c.close();
  check('no missing resources or browser exceptions',!errors.length&&!bad.length);await writeFile('artifacts/expansion-report.json',JSON.stringify({results,errors,bad},null,2));console.log(`Completed ${results.length} expansion checks.`);
}finally{await browser.close();}
