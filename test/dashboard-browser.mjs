import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:4173';const id='11111111-1111-4111-8111-111111111111';
try{
 await mkdir('work/dashboard-proof',{recursive:true});
 await page.goto(base+'/app?preview=1');await page.locator('.home-banner').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),true,'Home must fit at 100% zoom');
 await page.screenshot({path:'work/dashboard-proof/home.png'});
 await page.locator('.home-sidebar').getByText('Projects',{exact:true}).click();await page.waitForURL('**/app/projects');await page.getByRole('heading',{name:'Owned projects'}).waitFor();
 await page.locator('.home-sidebar').getByText('Shared with me',{exact:true}).click();await page.waitForURL('**/app/shared');await page.getByRole('heading',{name:'Shared projects'}).waitFor();
 assert.equal(await page.locator('.home-project-card').count(),0,'Owned sample must not appear as shared');
 await page.locator('.home-sidebar').getByText('Settings',{exact:true}).click();await page.waitForURL('**/app/settings');
 await page.locator('.home-sidebar').getByText('Collaborate',{exact:true}).click();await page.waitForURL('**/app/collaborate');
 await page.locator('#choose-invite').click();assert.equal(await page.locator('#invite-code-panel').isVisible(),true);
 await page.locator('#choose-join').click();assert.equal(await page.locator('#join-code-panel').isVisible(),true);assert.equal(await page.locator('#invite-code-panel').isVisible(),false);
 await page.clock.install();
 let issued=0;
 await page.route('**/rest/v1/rpc/generate_project_code',route=>route.fulfill({json:{code:++issued===1?'A7K2M9':'B8L3N2',expiresAt:new Date(Date.now()+60000).toISOString()}}));
 await page.locator('#choose-invite').click();
 await page.locator('#generate-code button').evaluate(button=>button.disabled=false);
 await page.locator('#generate-code button').click();await page.locator('#generated-code').waitFor();
 assert.equal(await page.locator('#generated-code output').textContent(),'A7K2M9');
 await page.clock.fastForward(61000);assert.equal(await page.locator('#resend-code').isVisible(),true);assert.equal(await page.locator('#copy-code').isDisabled(),true);
 await page.locator('#resend-code').click();await page.waitForFunction(()=>document.querySelector('#generated-code output')?.textContent==='B8L3N2');
 await page.clock.resume();
 await page.goto(`${base}/app/projects/${id}/schedule?preview=1`);await page.locator('.schedule-field-chooser').waitFor();
 assert.equal(await page.locator('.schedule-field-chooser').getAttribute('open')!==null,true,'New schedules present column choices');
 await page.locator('[data-schedule-visible=date]').uncheck();await page.locator('[data-schedule-visible=script]').check();await page.locator('#tool-add').click();
 await page.locator('[data-schedule-cell=script]').fill('Shooting draft');assert.equal(await page.locator('[data-schedule-cell=date]').count(),0);
 await page.locator('[data-schedule-visible=script]').uncheck();await page.locator('[data-schedule-visible=script]').check();assert.equal(await page.locator('[data-schedule-cell=script]').inputValue(),'Shooting draft');
 await page.reload();await page.locator('[data-schedule-cell=script]').waitFor();assert.equal(await page.locator('[data-schedule-cell=script]').inputValue(),'Shooting draft');
 await page.goto(`${base}/app/projects/${id}/screenplay?preview=1`);await page.locator('#tool-add').click();await page.locator('textarea[name=text]').waitFor();
 const area=page.locator('textarea[name=text]');await area.focus();await page.keyboard.press('Tab');assert.equal(await page.locator('select[name=kind]').inputValue(),'Action');
 for(const [i,kind] of ['Act','Scene Heading','Action','Character','Dialogue','Parenthetical','Transition','Shot','Text'].entries()){
   await area.focus();await page.keyboard.press(`Alt+Shift+${i}`);assert.equal(await page.locator('select[name=kind]').inputValue(),kind);
 }
 await page.setViewportSize({width:1280,height:720});await page.goto(base+'/app?preview=1');await page.locator('.home-banner').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),true,'Home must fit a 720px-high viewport');
 await page.screenshot({path:'work/dashboard-proof/home-720.png'});assert.deepEqual(errors,[]);console.log('Dashboard fit, dedicated navigation, column choices and all nine screenplay shortcuts passed.');
}finally{await browser.close();}
