import { LocalProjectRepository } from "./local-repository.js";
import { CloudProjectRepository, supabase } from "./cloud.js";
import { parseRoute } from "./routes.js";
import type { Project, SyncState } from "./domain.js";
import { DurableProjectSync } from "./durable-sync.js";
import { exportProject, previewBackup } from "./backup.js";
import { landingDetails } from "./landing-content.js";
import { renderHomePage } from "./home-content.js";
import { mountToolWorkspace, toolWorkspace } from "./tool-ui.js";
import { clearToolData, exportToolData, restoreToolData, toolRecords } from "./tool-data.js";
const localRepo = new LocalProjectRepository(); const cloudRepo = new CloudProjectRepository(); let repo: LocalProjectRepository | CloudProjectRepository = cloudRepo; let preview = false; let errorMessage = ""; let accountBadge = "Free"; let currentUserId = ""; const root = document.querySelector<HTMLElement>("#app")!; const base = location.pathname.startsWith("/PreFrame") ? "/PreFrame" : ""; const href = (path: string) => `${base}${path}`;
const tools = [["Write","Screenplay","screenplay"],["Write","Docs & Notes","notes"],["Visualize","Shot Lists","shots"],["Visualize","Storyboards","storyboards"],["Plan","Production Schedule","schedule"],["Plan","Calendar","calendar"],["Plan","Call Sheets","call-sheets"],["Plan","Locations","locations"]];
const toolDescriptions: Record<string,string> = {
  screenplay:"Shape scenes and dialogue, and leave comments on selected text.",
  notes:"Keep production ideas and reference notes together.",
  shots:"Plan framing, movement, timing and visual references.",
  storyboards:"Arrange frames with images, sound and shot notes.",
  schedule:"Organize shoot days, locations, cast and equipment.",
  calendar:"See scheduled shoot days at a glance.",
  "call-sheets":"Prepare and publish a fixed daily call sheet.",
  locations:"Keep location contacts, permits and access details."
};
const esc=(v:string)=>v.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]!)); const link=(p:string,l:string,c="")=>`<a class="${c}" href="${href(p)}" data-route>${l}</a>`;
function logo(){return `<a class="logo" href="${href("/")}" data-route aria-label="Preframe home"><svg viewBox="0 0 52 36" aria-hidden="true"><path d="M5 6h42v24H5zM13 1v34M39 1v34"/></svg><span>Preframe</span></a>`;}
function shell(content:string,signed=false,badge=accountBadge){return `<header class="topbar">${logo()}<nav aria-label="Primary">${signed?`${link("/app","Home")}<span class="avatar">${preview?"Preview":accountBadge||badge}</span>${preview?"":"<button id='sign-out' type='button'>Sign out</button>"}`:`<span class="public-nav-center">${link("/#features","Features")} ${link("/#pricing","Pricing")} ${link("/#about","About")}</span><span class="public-nav-actions">${link("/auth","Log in","plain-link")} ${link("/auth","Get started →","button")}</span>`}</nav></header>${content}`;}
function landing(){return shell(`<main class="landing"><section class="landing-stage" aria-labelledby="landing-title"><div class="landing-art" aria-hidden="true"></div><div class="landing-center-rule" aria-hidden="true"></div><div class="landing-copy"><p class="eyebrow">IDEAS <span>→</span> PLANS <span>→</span> REALITY</p><h1 id="landing-title">Before the<br><em>camera</em> rolls.</h1><p class="lede">Preframe is the all-in-one workspace for filmmakers<br class="desktop-break"> to write, visualize, plan and bring their stories to life.</p><div class="actions">${link("/auth","Start for free <span aria-hidden='true'>→</span>","button")}<button class="watch-video" type="button" disabled title="Video coming soon"><span class="play-ring" aria-hidden="true">▶</span>Watch video</button></div></div><div class="landing-frame-index" aria-hidden="true"><span></span>01 / 03</div><p class="landing-quote">“Ideas are easy.<br>Pre-production makes them real.”</p><div class="landing-feature-strip" aria-label="Preframe tools"><div class="landing-feature"><span class="feature-icon" aria-hidden="true">▤</span><span><strong>WRITE</strong><small>Screenplays &amp; Notes</small></span></div><div class="landing-feature"><span class="feature-icon" aria-hidden="true">◎</span><span><strong>VISUALIZE</strong><small>Shot lists &amp; Storyboards</small></span></div><div class="landing-feature"><span class="feature-icon" aria-hidden="true">▦</span><span><strong>PLAN</strong><small>Schedules &amp; Call sheets</small></span></div><div class="landing-feature"><span class="feature-icon" aria-hidden="true">♧</span><span><strong>COLLABORATE</strong><small>Work with your crew</small></span></div><span class="feature-aside" aria-hidden="true">SAME<br>STORY<br>HIGHER<br>POSSIBILITIES</span></div><div class="landing-bottom-mark" aria-hidden="true"><span>P R E F R A M E</span><span>BUILT FOR FILMMAKERS</span><a href="#features" aria-label="Scroll to features">SCROLL <span>✦</span></a></div></section>${landingDetails(href("/auth"))}</main>`);}
function auth(){return shell(`<main class="auth-page"><section><p class="eyebrow">PREFRAME ACCOUNT</p><h1>Continue with Google</h1><p>Sign in to create and recover your projects.</p><button id="google-login" type="button">Continue with Google</button><p role="alert">${esc(errorMessage)}</p><p class="quiet">You can also inspect sample data stored only in this browser.</p><a class="plain-link" href="${href("/app")}?preview=1">Open local preview</a></section></main>`);}
async function home(){
  const identity=await repo.getIdentity();
  const projects=await repo.listProjects();
  const name=identity?.profile.displayName||"there";
  const visualPreview=preview&&new URLSearchParams(location.search).get("home")==="premium";
  const premium=visualPreview||Boolean(identity?.isAdmin||identity?.profile.tier==="premium");
  const badge=visualPreview?"Premium preview":preview?"Preview":identity?.isAdmin?"Admin":premium?"Premium":"Free";
  accountBadge=badge;
  const now=new Date();const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const upcoming=projects[0]?(await toolRecords(preview?"local-demo-owner":currentUserId,projects[0].id,"schedule"))
    .filter(item=>/^\d{4}-\d{2}-\d{2}$/.test(item.fields.date||"")&&Number.isFinite(Date.parse(`${item.fields.date}T12:00:00`))&&item.fields.date>=today)
    .sort((a,b)=>`${a.fields.date} ${a.fields.start||""}`.localeCompare(`${b.fields.date} ${b.fields.start||""}`)).slice(0,3):[];
  return renderHomePage({logo:logo(),href,projects,name,badge,premium,preview,error:errorMessage,upcoming});
}
function dashboard(p:Project){
  const icons:Record<string,string>={screenplay:"✎",notes:"▤",shots:"◎",storyboards:"▦",schedule:"▥",calendar:"▦","call-sheets":"▣",locations:"⌖"};
  const group=(name:string)=>`<section class="project-tool-band" data-group="${name.toLowerCase()}"><div class="project-tool-band-label"><span>${name}</span><small>${name==="Write"?"Develop the story":name==="Visualize"?"See the film":"Prepare the shoot"}</small></div><div class="project-tool-links">${tools.filter(([c])=>c===name).map(([,label,t])=>`<a href="${href(`/app/projects/${p.id}/${t}`)}" data-route class="project-tool-link"><span class="project-tool-icon" aria-hidden="true">${icons[t]}</span><strong>${label}</strong><small>${toolDescriptions[t]}</small><span class="project-tool-arrow" aria-hidden="true">→</span></a>`).join("")}</div></section>`;
  return shell(`<main class="app-shell project-hub-shell"><aside class="side-nav">${link("/app","← Back to home")}<span>PROJECT WORKSPACE</span></aside><section class="project-page project-hub"><div class="project-hub-heading"><p class="eyebrow">PREFRAME / PROJECT</p><div class="project-heading-row"><h1>${esc(p.title)}</h1><span>${preview?"Local preview":"Your production workspace"}</span></div><p>From first draft to shooting day.</p></div><div class="project-bands">${group("Write")}${group("Visualize")}${group("Plan")}</div><details class="project-management"><summary>Project settings, backups and collaborators</summary><div class="project-management-body"><label class="project-title">Project title <input id="project-title" value="${esc(p.title)}" maxlength="160"></label><div id="save-status" role="status">${preview?"Saved locally":"Synced"}</div><p role="alert">${esc(errorMessage)}</p>${!preview&&p.ownerId===currentUserId?`<button id="delete-project" type="button">Delete project…</button>`:""}${preview?"":`<section class="backup-panel"><h2>Project backup</h2><p>Export synced project data and uploaded media. Unsynced local edits and original files not uploaded are excluded.</p><button id="export-project" type="button">Export project archive</button><p id="export-status" role="status"></p></section>`}<section class="backup-panel local-backup-panel"><h2>Tool data on this device</h2><p>Screenplay, notes, shots, storyboards, schedule, locations and call-sheet drafts currently save in this browser. Download a backup regularly; the cloud project archive does not include these local edits.</p><div class="local-backup-actions"><button id="export-local-tools" type="button">Download local backup</button><label>Restore local backup <input id="import-local-tools" type="file" accept=".json,application/json"></label></div><p id="local-backup-status" role="status"></p></section>${preview?"":`<section class="dashboard-group"><h2>Collaborators</h2><form id="invite-editor"><label>Invite editor by email <input name="email" type="email" required></label><button type="submit">Invite</button></form><div id="members">Loading…</div></section>`}</div></details></section></main>`,true);
}
function workspace(p:Project,t:string){if(t!=="import"&&t!=="members")return shell(toolWorkspace(p,t,href),true);const label=t==="import"?"Import Script":"Project collaborators";return shell(`<main class="workspace-page"><div class="workspace-head">${link(`/app/projects/${p.id}`,"← Back to project","plain-link")}<span class="project-chip">${esc(p.title)}</span></div><section class="empty-workspace"><p class="eyebrow">PROJECT WORKSPACE</p><h1>${label}</h1>${t==="import"?`<p>Preview a Preframe archive without changing this project.</p><label class="import-label">Choose a Preframe archive (.json) <input id="backup-file" type="file" accept=".json,application/json"></label><div id="backup-preview" role="status"></div>`:"<p>Manage collaborators from the project overview.</p>"}</section></main>`,true);}
function missing(){return shell(`<main class="empty-workspace"><p class="eyebrow">404</p><h1>That page is out of frame.</h1><p>The route does not exist in this preview.</p>${link("/","Return to Preframe","button")}</main>`);}
let landingObserver: IntersectionObserver | null = null;
function wireLandingMotion(){
  landingObserver?.disconnect();
  document.body.classList.remove("motion-ready");
  if(matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window))return;
  const reveals=root.querySelectorAll<HTMLElement>(".landing [data-reveal]");
  landingObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      entry.target.classList.add("in-view");
      landingObserver?.unobserve(entry.target);
    }
  },{threshold:.12,rootMargin:"0px 0px -35px 0px"});
  reveals.forEach(element=>landingObserver?.observe(element));
  document.body.classList.add("motion-ready");
}
async function render(){
  const query=new URLSearchParams(location.search);
  preview=query.get("preview")==="1"||sessionStorage.getItem("preframe-preview")==="1";
  if(query.get("preview")==="1")sessionStorage.setItem("preframe-preview","1");
  repo=preview?localRepo:cloudRepo;
  const {data:{session}}=await supabase.auth.getSession();
  currentUserId=session?.user.id||"";
  const r=parseRoute(query.get("r")||location.pathname);
  document.body.classList.toggle("is-landing",r.page==="landing");
  document.body.classList.toggle("is-home",r.page==="home"&&Boolean(session||preview));
  if(session&&!preview&&r.page!=="landing"&&r.page!=="auth"){
    try{const identity=await cloudRepo.getIdentity();accountBadge=identity?.isAdmin?"Admin":identity?.profile.tier==="premium"?"Premium":"Free";}
    catch{accountBadge="Free";}
  }else if(preview)accountBadge="Preview";
  try{
    if(r.page==="landing")root.innerHTML=landing();
    else if(r.page==="auth")root.innerHTML=auth();
    else if(!session&&!preview){history.replaceState({},"",href("/auth"));root.innerHTML=auth();}
    else if(r.page==="home")root.innerHTML=await home();
    else if(r.page==="not-found")root.innerHTML=missing();
    else {
      const p=r.projectId&&await repo.getProject(r.projectId);
      root.innerHTML=p?(r.page==="project"?dashboard(p):workspace(p,r.tool!)):shell(`<main class="empty-workspace"><h1>Project unavailable</h1><p>This project is missing or you do not have permission to open it.</p>${link("/app","Back to projects","button")}</main>`,true);
      if(p&&r.page==="project")wire(p);
      if(p&&r.page==="workspace"&&r.tool==="import")wireImport();
      if(p&&r.page==="workspace"&&r.tool!=="import"&&r.tool!=="members"){
        const {data:{user}}=await supabase.auth.getUser();
        mountToolWorkspace(p,r.tool!,preview?"local-demo-owner":user?.id||"anonymous",accountBadge==="Premium"||accountBadge==="Admin").catch(e=>{const status=document.querySelector("#tool-status");if(status)status.textContent=e instanceof Error?e.message:"Could not load tool";});
      }
    }
  }catch(e){root.innerHTML=shell(`<main class="empty-workspace"><h1>Could not load Preframe</h1><p>${esc(e instanceof Error?e.message:"Unknown error")}</p>${link("/app","Retry","button")}</main>`,!!session||preview);}
  document.querySelectorAll<HTMLAnchorElement>("[data-route]").forEach(a=>a.addEventListener("click",e=>{if(a.origin===location.origin){e.preventDefault();history.pushState({},"",a.href);errorMessage="";render();}}));
  document.querySelector("#google-login")?.addEventListener("click",async()=>{sessionStorage.removeItem("preframe-preview");sessionStorage.setItem("preframe-oauth-pending","1");const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}${href("/")}`,queryParams:{prompt:"select_account"}}});if(error){sessionStorage.removeItem("preframe-oauth-pending");errorMessage=error.message;render();}});
  document.querySelector("#sign-out")?.addEventListener("click",async()=>{await supabase.auth.signOut();sessionStorage.removeItem("preframe-preview");history.pushState({},"",href("/"));render();});
  document.body.classList.toggle("eye-saver",Boolean(document.querySelector("#eye"))&&localStorage.getItem("preframe-eye-saver")==="true");
  document.querySelector("#eye")?.addEventListener("click",()=>{const warm=document.body.classList.toggle("eye-saver");localStorage.setItem("preframe-eye-saver",String(warm));(document.querySelector("#eye") as HTMLButtonElement).setAttribute("aria-pressed",String(warm));});
  document.querySelector("#eye")?.setAttribute("aria-pressed",String(document.body.classList.contains("eye-saver")));
  const newProjectToggle=document.querySelector<HTMLButtonElement>("#new-project-toggle");
  const newProjectForm=document.querySelector<HTMLFormElement>("#new-project");
  newProjectToggle?.addEventListener("click",()=>{if(!newProjectForm)return;newProjectForm.hidden=false;newProjectToggle.hidden=true;newProjectForm.querySelector<HTMLInputElement>("input")?.focus();});
  document.querySelector("#cancel-project")?.addEventListener("click",()=>{if(!newProjectForm)return;newProjectForm.hidden=true;if(newProjectToggle)newProjectToggle.hidden=false;});
  const search=document.querySelector<HTMLInputElement>("#project-search");
  search?.addEventListener("input",()=>{const term=search.value.trim().toLocaleLowerCase();let visible=0;document.querySelectorAll<HTMLElement>(".home-project-card").forEach(card=>{const matches=(card.dataset.projectTitle||"").includes(term);card.hidden=!matches;if(matches)visible++;});const empty=document.querySelector<HTMLElement>("#project-search-empty");if(empty)empty.hidden=visible>0||!term;});
  const form=document.querySelector<HTMLFormElement>("#new-project");form?.addEventListener("submit",async event=>{event.preventDefault();try{const title=String(new FormData(form).get("title")||"").trim();const id=await cloudRepo.createProject(title,Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC");history.pushState({},"",href(`/app/projects/${id}`));errorMessage="";render();}catch(e){errorMessage=e instanceof Error?e.message:"Could not create project";render();}});
  if(document.querySelector("#invitations-list"))loadInvitations();
  if(r.page==="landing")wireLandingMotion();
  if(r.page==="landing"&&["#features","#pricing","#about"].includes(location.hash)){
    document.querySelector(location.hash)?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }
}
async function loadInvitations(){const target=document.querySelector("#invitations-list");if(!target)return;try{const rows=await cloudRepo.invitations();target.innerHTML=rows.length?rows.map(row=>`<p>Project invitation <button type="button" data-accept="${esc(row.id)}">Accept</button></p>`).join(""):"<p>No pending invitations.</p>";target.querySelectorAll<HTMLButtonElement>("[data-accept]").forEach(button=>button.addEventListener("click",async()=>{try{const id=await cloudRepo.acceptInvitation(button.dataset.accept!);history.pushState({},"",href(`/app/projects/${id}`));render();}catch(e){errorMessage=e instanceof Error?e.message:"Could not accept invitation";render();}}));}catch(e){target.textContent=e instanceof Error?e.message:"Could not load invitations";}}
function wireImport(){
  const input=document.querySelector<HTMLInputElement>("#backup-file"),target=document.querySelector<HTMLElement>("#backup-preview");
  input?.addEventListener("change",async()=>{
    if(!target||!input.files?.[0])return;
    target.textContent="Validating archive…";
    try{
      if(input.files[0].size>50_000_000)throw new Error("Archive is too large to preview safely");
      const result=await previewBackup(await input.files[0].text());
      target.innerHTML=`<h2>${esc(result.title)}</h2><p>${Object.entries(result.records).map(([name,count])=>`${esc(name)}: ${count}`).join(" · ")}</p><p>Media files: ${result.files}</p><p>${result.warnings.map(esc).join(" ")}</p><p>Preview only. Restore into a separate project will be enabled after the import policy and quota checks are approved.</p>`;
    }catch(e){target.textContent=e instanceof Error?e.message:"Archive validation failed";}
  });
}
async function wire(p:Project){
  const input=document.querySelector<HTMLInputElement>("#project-title")!,status=document.querySelector("#save-status")!;let current=p;let timer:ReturnType<typeof setTimeout>;
  const localScope=preview?"local-demo-owner":currentUserId;
  const backupStatus=document.querySelector<HTMLElement>("#local-backup-status");
  document.querySelector("#export-local-tools")?.addEventListener("click",async()=>{
    if(!backupStatus)return;
    try{const content=await exportToolData(localScope,p.id);const url=URL.createObjectURL(new Blob([content],{type:"application/json"}));const anchor=document.createElement("a");anchor.href=url;anchor.download=`preframe-local-tools-${p.id}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);backupStatus.textContent="Local tool backup downloaded.";}
    catch(e){backupStatus.textContent=e instanceof Error?e.message:"Backup failed";}
  });
  document.querySelector<HTMLInputElement>("#import-local-tools")?.addEventListener("change",async event=>{
    const file=(event.currentTarget as HTMLInputElement).files?.[0];if(!file||!backupStatus)return;
    if(!confirm("Restore tool data from this file? Matching items will be replaced on this device."))return;
    backupStatus.textContent="Validating backup…";
    try{if(file.size>320_000_000)throw new Error("Backup exceeds 320 MB");const count=await restoreToolData(localScope,p.id,await file.text());backupStatus.textContent=`Restored ${count} items on this device. Reload a tool to see them.`;}
    catch(e){backupStatus.textContent=e instanceof Error?e.message:"Restore failed";}
  });
  document.querySelector("#delete-project")?.addEventListener("click",async()=>{
    const typed=prompt(`Permanently delete “${current.title}” and its project data? Type the project name to confirm.`);
    if(typed!==current.title)return;
    const button=document.querySelector<HTMLButtonElement>("#delete-project")!;
    button.disabled=true;button.textContent="Deleting…";
    try{await cloudRepo.deleteProject(p.id);try{await clearToolData(localScope,p.id);errorMessage="Project deleted.";}catch{errorMessage="Project deleted from the cloud, but local browser records could not be cleared.";}history.pushState({},"",href("/app"));render();}
    catch(e){button.disabled=false;button.textContent="Delete project…";status.textContent=e instanceof Error?e.message:"Deletion failed";}
  });
  let sync:DurableProjectSync|undefined;
  if(!preview){const {data:{user}}=await supabase.auth.getUser();if(user){sync=new DurableProjectSync(user.id,p.id,cloudRepo,(state:SyncState,detail,remote)=>{status.textContent={"saved-locally":"Saved locally",syncing:"Syncing",synced:"Synced","sync-failed":"Sync failed",conflict:"Conflict"}[state]+(detail?` — ${detail}`:"");if(remote&&state==="synced")current=remote;});const pending=await sync.restore();if(pending){input.value=pending.title;status.textContent="Saved locally";}addEventListener("online",()=>sync?.flush());}}
  input.addEventListener("input",()=>{const title=input.value.trim();if(!title){status.textContent="Title cannot be empty";return;}if(preview){status.textContent="Saving locally";clearTimeout(timer);timer=setTimeout(async()=>{const result=await localRepo.saveProject({...current,title},current.revision);if(result.kind==="ok"){current=result.value.value;status.textContent="Saved locally";}else status.textContent="Conflict";},650);}else sync?.stage({...current,title},current.revision).catch(e=>status.textContent=`Local save failed — ${e.message}`);});
  const invite=document.querySelector<HTMLFormElement>("#invite-editor");invite?.addEventListener("submit",async event=>{event.preventDefault();try{await cloudRepo.inviteEditor(p.id,String(new FormData(invite).get("email")));errorMessage="Invitation created. The editor can accept it after signing in with that email.";render();}catch(e){errorMessage=e instanceof Error?e.message:"Could not invite editor";render();}});
  const members=document.querySelector("#members");if(members)cloudRepo.members(p.id).then(rows=>{members.innerHTML=rows.map(row=>`<p>${esc(row.user_id)} · ${esc(row.role)} ${row.role==="editor"?`<button type="button" data-remove="${esc(row.user_id)}">Remove</button>`:""}</p>`).join("");members.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach(button=>button.addEventListener("click",async()=>{try{await cloudRepo.removeEditor(p.id,button.dataset.remove!);errorMessage="Editor removed.";render();}catch(e){errorMessage=e instanceof Error?e.message:"Could not remove editor";render();}}));}).catch(e=>members.textContent=e.message);
  document.querySelector("#export-project")?.addEventListener("click",async()=>{
    const status=document.querySelector<HTMLElement>("#export-status");if(!status)return;
    status.textContent="Collecting synced project data and media…";
    try{const archive=await exportProject(p.id);const blob=new Blob([JSON.stringify(archive)],{type:"application/json"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`preframe-${p.id}-${new Date().toISOString().slice(0,10)}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);status.textContent="Archive downloaded. Unsynced local edits and unuploaded originals are excluded.";}
    catch(e){status.textContent=e instanceof Error?e.message:"Export failed";}
  });
}
addEventListener("popstate",render);
supabase.auth.onAuthStateChange((event)=>{if(event==="SIGNED_IN"&&sessionStorage.getItem("preframe-oauth-pending")==="1"){sessionStorage.removeItem("preframe-oauth-pending");history.replaceState({},"",href("/app"));render();}else if(location.pathname.endsWith("/auth")||location.pathname.endsWith("/app"))render();});
render();
