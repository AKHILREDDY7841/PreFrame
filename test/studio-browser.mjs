import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page = await browser.newPage({viewport:{width:1672,height:941}});
const errors=[]; page.on('pageerror',error=>errors.push(error.message));
const root='http://127.0.0.1:4173';
const id='11111111-1111-4111-8111-111111111111';
const route=async tool=>{await page.goto(`${root}/app/projects/${id}/${tool}?preview=1`);await page.locator('#tool-status').filter({hasText:'Saved on this device'}).waitFor();};
await mkdir('work/studio-proof',{recursive:true});
try {
  await route('schedule');
  await page.evaluate(async id=>{
    const req=indexedDB.open('preframe-tools-v1',1);
    const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    const now=new Date().toISOString(); const date=now.slice(0,10);
    const data={
      screenplay:[['scene1','EXT. COASTLINE — DAWN',{kind:'Scene Heading',text:'EXT. COASTLINE — DAWN'}],['action','A restless sea',{kind:'Action',text:'A grey, restless sea. Waves break against black rocks. Elena looks towards the horizon.'}],['scene2','INT. CABIN — MORNING',{kind:'Scene Heading',text:'INT. CABIN — MORNING'}]],
      schedule:Array.from({length:8},(_,i)=>['day'+i,'Shoot Day '+(i+1),{day:String(i+1),date,location:i%2?'INT. Cabin':'EXT. Coastline',scenes:String(i*2+1)+', '+String(i*2+2),scriptPages:'2.5',time:'06:00 – 14:00',characters:'Elena, Marcus',props:'Map, camera, notebook',status:i<3?'Completed':'Scheduled',priority:i%2?'Medium':'High',postStatus:'Pending'}]),
      shots:Array.from({length:8},(_,i)=>['shot'+i,'Shot '+(i+1),{sceneId:i<4?'scene1':'scene2',description:'Establishing shot of the shoreline. Waves crash against the rocks.',size:'Wide (WS)',type:'Eye level',movement:'Static',estimate:'10 min'}]),
      storyboards:Array.from({length:8},(_,i)=>['frame'+i,'Frame '+(i+1),{sceneId:i<4?'scene1':'scene2',description:'A lone figure stands on the rocks, looking out to sea.',sound:'Waves, distant seagulls'}]),
      notes:[['note','Theme & Tone',{body:'Overview\n\nA character-driven drama about family and the things we leave unsaid.\n\nKey themes\n\nConnection and distance. Home and place. Unspoken truths.',folder:'Script Notes',tags:'Development, Tone, Mood'}]],
      locations:[['location','Library',{address:'Riverton University',contact:'Marina Chen',permit:'Confirmed',locationStatus:'Confirmed',access:'Crew must check in at security.',power:'Standard outlets available.',scenes:'1, 4, 7'}]],
      'call-sheets':[['call','Call sheet — Day 1',{date,call:'06:00',wrap:'18:00',director:'Elena Marks',producer:'Marcus Chen',location:'North Beach',schedule:'06:00 Crew call\n07:00 First shot\n12:00 Lunch',castCalls:'Elena · 06:30 AM',notes:'Bring weather protection.'}]]
    };
    const tx=db.transaction('records','readwrite');
    for(const [tool,rows] of Object.entries(data)) for(const [index,[recordId,title,fields]] of rows.entries()) {
      const scope=`local-demo-owner:${id}:${tool}`;
      tx.objectStore('records').put({id:recordId,title,fields:{...fields,order:String(index).padStart(6,'0')},createdAt:now,updatedAt:now,revision:1,scope,tool,key:`${scope}:${recordId}`});
    }
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  },id);
  await route('schedule');
  const first=page.locator('[data-schedule-cell=location]').nth(0),second=page.locator('[data-schedule-cell=location]').nth(1);
  await first.fill('Harbor');await second.fill('Cabin');await second.focus();await page.waitForTimeout(500);
  assert.equal(await second.evaluate(el=>el===document.activeElement),true,'autosave must not replace the active cell');
  await page.reload();await page.locator('[data-schedule-cell=location]').first().waitFor();
  assert.equal(await first.inputValue(),'Harbor');assert.equal(await second.inputValue(),'Cabin');
  await page.locator('[data-schedule-cell=status]').nth(3).selectOption('Completed');
  await page.waitForFunction(()=>document.querySelector('.schedule-summary')?.textContent.includes('50%'));
  for(const tool of ['schedule','screenplay','calendar','shots','storyboards','notes','locations','call-sheets']){
    await route(tool);await page.screenshot({path:`work/studio-proof/${tool}.png`,fullPage:false});
    assert.equal(await page.locator('.studio-sidebar').count(),1);
    assert.equal(await page.locator('.topbar').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${tool} should not overflow viewport`);
  }
  await route('shots');
  const preset=page.locator('.shot-table tbody tr').first().locator('td').nth(4).locator('select');
  await preset.selectOption('__custom');await page.locator('[data-visual-field=size]').first().fill('Macro insert');
  await page.locator('[data-visual-field=description]').nth(1).fill('Second row edit');await page.waitForTimeout(300);await page.reload();
  await page.locator('.shot-table').waitFor();assert.equal(await page.locator('[data-visual-field=size]').first().inputValue(),'Macro insert');
  assert.equal(await page.locator('[data-visual-field=description]').nth(1).inputValue(),'Second row edit');
  await route('storyboards');await page.locator('.studio-inspect').first().click();
  await page.locator('.studio-frame-inspector [data-visual-field=description]').fill('Inspector update');
  assert.equal(await page.locator('.storyboard-card [data-visual-field=description]').first().inputValue(),'Inspector update');
  await page.locator('[data-board-view=list]').click();assert.equal(await page.locator('.studio-board-list').count(),1);
  await route('notes');await page.locator('.ProseMirror').fill('Saved notes');await page.locator('[name=tags]').fill('Tone');await page.waitForTimeout(300);await page.reload();
  await page.locator('.ProseMirror').waitFor();assert.equal(await page.locator('[name=body]').inputValue(),'Saved notes');
  await route('locations');assert.match(await page.getByText('View on Maps').getAttribute('href'),/^https:\/\/www.google.com\/maps/);
  await route('call-sheets');await page.locator('#studio-duplicate').click();await page.locator('[name=title]').filter({visible:true}).waitFor();
  assert.match(await page.locator('[name=title]').inputValue(),/revision/);
  await page.setViewportSize({width:390,height:844});await route('storyboards');await page.screenshot({path:'work/studio-proof/mobile.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'mobile overflow');
  assert.deepEqual(errors,[]);console.log('Eight layouts, rapid row persistence, focus retention, custom shot options, frame inspector, notes and call-sheet duplication passed.');
}finally{await browser.close();}
