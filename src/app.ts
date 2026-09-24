import { LocalProjectRepository } from "./local-repository.js";
import { CloudProjectRepository, supabase } from "./cloud.js";
import { parseRoute } from "./routes.js";
import type { Project, SyncState } from "./domain.js";
import { DurableProjectSync } from "./durable-sync.js";
import { exportProject, previewBackup } from "./backup.js";
const localRepo = new LocalProjectRepository(); const cloudRepo = new CloudProjectRepository(); let repo: LocalProjectRepository | CloudProjectRepository = cloudRepo; let preview = false; let errorMessage = ""; let accountBadge = "Free"; const root = document.querySelector<HTMLElement>("#app")!; const base = location.pathname.startsWith("/PreFrame") ? "/PreFrame" : ""; const href = (path: string) => `${base}${path}`;
const tools = [["Write","Screenplay","screenplay"],["Write","Docs & Notes","notes"],["Visualize","Shot Lists","shots"],["Visualize","Storyboards","storyboards"],["Plan","Production Schedule","schedule"],["Plan","Calendar","calendar"],["Plan","Call Sheets","call-sheets"],["Plan","Locations","locations"]];
const esc=(v:string)=>v.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]!)); const link=(p:string,l:string,c="")=>`<a class="${c}" href="${href(p)}" data-route>${l}</a>`;
function logo(){return `<a class="logo" href="${href("/")}" data-route aria-label="Preframe home"><svg viewBox="0 0 52 36" aria-hidden="true"><path d="M5 6h42v24H5zM13 1v34M39 1v34"/></svg><span>Preframe</span></a>`;}
function shell(content:string,signed=false,badge=accountBadge){return `<header class="topbar">${logo()}<nav aria-label="Primary">${signed?`${link("/app","Home")} <button id="eye" type="button" aria-pressed="false">Eye-saver</button><span class="avatar">${preview?"Preview":accountBadge||badge}</span>${preview?"":"<button id='sign-out' type='button'>Sign out</button>"}`:`${link("/#features","Features")} ${link("/#pricing","Pricing")} ${link("/#about","About")} ${link("/auth","Log in","plain-link")} ${link("/auth","Get started","button")}`}</nav></header>${content}`;}
function landing(){return shell(`<main class="landing"><section class="hero"><p class="eyebrow">IDEAS&nbsp; → &nbsp;PLANS&nbsp; → &nbsp;REALITY</p><h1>Before the<br><em>camera</em> rolls.</h1><p class="lede">Preframe is the all-in-one workspace for filmmakers to write, visualize, plan and bring their stories to life.</p><div class="actions">${link("/auth","Start for free →","button")}<a class="plain-link" href="#features">Explore features ↓</a></div><div class="film-frames" aria-hidden="true"><i></i><i></i><i></i></div><span class="hero-count" aria-hidden="true">01 / 03</span></section><section id="features" class="public-section"><p class="eyebrow">BUILT FOR FILMMAKERS</p><h2>One story. Every step before the set.</h2><div class="three"><article><b>Write</b><p>Screenplay and notes stay connected to your production.</p></article><article><b>Visualize</b><p>Organize shot lists and storyboard frames around your scenes.</p></article><article><b>Plan</b><p>Shape schedules, calendar records, locations and call sheets.</p></article></div></section><section id="pricing" class="public-section quiet-section"><h2>Free to begin</h2><p>One active owned project and up to three accepted editors, including the owner. Premium is coming soon; no price or caps have been announced.</p></section><section id="about" class="public-section"><h2>Made for the work before production.</h2><p>Preframe is an early preproduction workspace. The tools shown in your project describe their current implementation status honestly.</p></section></main>`);}
function auth(){return shell(`<main class="auth-page"><section><p class="eyebrow">PREFRAME ACCOUNT</p><h1>Continue with Google</h1><p>Sign in to create and recover your projects.</p><button id="google-login" type="button">Continue with Google</button><p role="alert">${esc(errorMessage)}</p><p class="quiet">You can also inspect sample data stored only in this browser.</p><a class="plain-link" href="${href("/app")}?preview=1">Open local preview</a></section></main>`);}
function card(p:Project){return `<article class="project-card"><div class="project-thumb" aria-hidden="true"></div><div class="project-info"><span class="sample-label">${p.sample?"Sample data":preview?"Local preview":"Cloud project"}</span><h3>${esc(p.title)}</h3><p>Last updated ${new Date(p.updatedAt).toLocaleDateString()}</p>${link(`/app/projects/${p.id}`,"Open project","text-link")}</div></article>`;}
async function home(){
  const identity=await repo.getIdentity(),projects=await repo.listProjects(),name=identity?.profile.displayName||"there";
  const badge=preview?"Preview":identity?.isAdmin?"Admin":identity?.profile.tier==="premium"?"Premium":"Free";
  const first=projects[0];
  const tile=(title:string,subtitle:string,icon:string,route:string)=>`<article class="tool-tile"><span class="tool-icon" aria-hidden="true">${icon}</span><h3>${title}</h3><p>${subtitle}</p>${first?link(`/app/projects/${first.id}/${route}`,"Open →","text-link"):"<span class='quiet'>Create a project first</span>"}</article>`;
  return shell(`<main class="app-shell"><aside class="side-nav" aria-label="App navigation">${link("/app","⌂  Home")}${link("/app","▱  Projects")}${preview?"":`<a href="#invitations">♧  Shared with me</a>`}<span class="side-signoff">Plan better.<br> Shoot greater.</span></aside><section class="home"><div class="cinema-banner"><p>Good morning,</p><h1>${esc(name)}.</h1><p>Ideas look better in focus.</p></div><div class="section-heading"><h2>Your ${badge==="Premium"?"Projects":"Project"}</h2>${preview?"":`<form id="new-project"><input name="title" aria-label="Project name" placeholder="Project name" required maxlength="160"><button type="submit">＋ New Project</button></form>`}</div><p role="alert">${esc(errorMessage)}</p><div class="project-grid">${projects.length?projects.map(card).join(""):"<p class='empty-copy'>No projects yet. Create one above.</p>"}</div><p class="local-note">${preview?"This sample is local preview data.":"Successfully synced projects can be recovered on another device."}</p>${preview?"":`<section class="upcoming" id="invitations"><h2>Invitations</h2><div id="invitations-list">Loading…</div></section>`}<section class="tool-section"><h2>Tools</h2><div class="tool-grid">${tile("Write","Screenplays & Notes","▤","screenplay")}${tile("Visualize","Shot lists & Storyboards","◉","shots")}${tile("Plan","Schedules & Call sheets","▦","schedule")}${tile("Import Script","Bring in your script","⇥","import")}</div></section><section class="schedule-panel"><div><h2>Upcoming Schedule</h2><p>No schedule entries yet. Open a project to begin planning when this workspace is ready.</p></div><div class="schedule-visual" aria-label="Misty alpine lake"></div></section></section></main>`,true,badge);
}
function dashboard(p:Project){
  const group=(name:string)=>`<section class="dashboard-group"><h2>${name}</h2><div class="module-grid">${tools.filter(([c])=>c===name).map(([,label,t])=>`<article><h3>${label}</h3><p>Empty workspace: this module has not been implemented yet.</p>${link(`/app/projects/${p.id}/${t}`,"Open workspace","text-link")}</article>`).join("")}</div></section>`;
  return shell(`<main class="app-shell"><aside class="side-nav">${link("/app","Back to home")}<span>${esc(p.title)}</span></aside><section class="project-page"><p class="sample-label">${p.sample?"Sample data — local-only preview":preview?"Local preview":"Cloud project"}</p><h1>${esc(p.title)}</h1><label class="project-title">Project title <input id="project-title" value="${esc(p.title)}" maxlength="160"></label><div id="save-status" role="status">${preview?"Saved locally":"Synced"}</div><p role="alert">${esc(errorMessage)}</p>${preview?"":`<section class="backup-panel"><h2>Project backup</h2><p>Export synced project data and uploaded media. Unsynced local edits and original files not uploaded are excluded.</p><button id="export-project" type="button">Export project archive</button><p id="export-status" role="status"></p></section>`}${group("Write")}${group("Visualize")}${group("Plan")}${preview?"":`<section class="dashboard-group"><h2>Collaborators</h2><form id="invite-editor"><label>Invite editor by email <input name="email" type="email" required></label><button type="submit">Invite</button></form><div id="members">Loading…</div></section>`}</section></main>`,true);
}
function workspace(p:Project,t:string){const labels:Record<string,string>={screenplay:"Screenplay",notes:"Docs & Notes",shots:"Shot Lists",storyboards:"Storyboards",schedule:"Production Schedule",calendar:"Calendar","call-sheets":"Call Sheets",locations:"Locations",members:"Project collaborators",import:"Import Script"};const text=t==="import"?"Preview a Preframe project archive without creating or overwriting any project. Script formats are not supported yet.":"This full-page workspace is ready for navigation but has no production data or controls yet.";return shell(`<main class="workspace-page"><div class="workspace-head">${link(`/app/projects/${p.id}`,"← Back to project","plain-link")}<span class="project-chip">${esc(p.title)}</span></div><section class="empty-workspace"><p class="eyebrow">${t==="import"?"SAFE IMPORT GATE":"PROJECT WORKSPACE"}</p><h1>${labels[t]}</h1><p>${text}</p>${t==="import"?`<label class="import-label">Choose a Preframe archive (.json) <input id="backup-file" type="file" accept=".json,application/json"></label><div id="backup-preview" role="status"></div>`:"<p class='quiet'>No project data is created or changed from this page.</p>"}</section></main>`,true);}
function missing(){return shell(`<main class="empty-workspace"><p class="eyebrow">404</p><h1>That page is out of frame.</h1><p>The route does not exist in this preview.</p>${link("/","Return to Preframe","button")}</main>`);}
async function render(){
  const query=new URLSearchParams(location.search);
  preview=query.get("preview")==="1"||sessionStorage.getItem("preframe-preview")==="1";
  if(query.get("preview")==="1")sessionStorage.setItem("preframe-preview","1");
  repo=preview?localRepo:cloudRepo;
  const {data:{session}}=await supabase.auth.getSession();
  const r=parseRoute(query.get("r")||location.pathname);
  if(session&&!preview&&r.page!=="landing"&&r.page!=="auth"){
    try{const identity=await cloudRepo.getIdentity();accountBadge=identity?.isAdmin?"Admin":identity?.profile.tier==="premium"?"Premium":"Free";}
    catch{accountBadge="Free";}
  }else if(preview)accountBadge="Preview";
  try{
    if(r.page==="landing")root.innerHTML=landing();
    else if(r.page==="auth")root.innerHTML=auth();
    else if(!session&&!preview){history.replaceState({},"",href("/auth"));root.innerHTML=auth();}
    else if(r.page==="home"){root.innerHTML=await home();await renderTierPanel();}
    else if(r.page==="not-found")root.innerHTML=missing();
    else {
      const p=r.projectId&&await repo.getProject(r.projectId);
      root.innerHTML=p?(r.page==="project"?dashboard(p):workspace(p,r.tool!)):shell(`<main class="empty-workspace"><h1>Project unavailable</h1><p>This project is missing or you do not have permission to open it.</p>${link("/app","Back to projects","button")}</main>`,true);
      if(p&&r.page==="project")wire(p);
      if(p&&r.page==="workspace"&&r.tool==="import")wireImport();
    }
  }catch(e){root.innerHTML=shell(`<main class="empty-workspace"><h1>Could not load Preframe</h1><p>${esc(e instanceof Error?e.message:"Unknown error")}</p>${link("/app","Retry","button")}</main>`,!!session||preview);}
  document.querySelectorAll<HTMLAnchorElement>("[data-route]").forEach(a=>a.addEventListener("click",e=>{if(a.origin===location.origin){e.preventDefault();history.pushState({},"",a.href);errorMessage="";render();}}));
  document.querySelector("#google-login")?.addEventListener("click",async()=>{sessionStorage.removeItem("preframe-preview");sessionStorage.setItem("preframe-oauth-pending","1");const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}${href("/")}`}});if(error){sessionStorage.removeItem("preframe-oauth-pending");errorMessage=error.message;render();}});
  document.querySelector("#sign-out")?.addEventListener("click",async()=>{await supabase.auth.signOut();sessionStorage.removeItem("preframe-preview");history.pushState({},"",href("/"));render();});
  document.querySelector("#eye")?.addEventListener("click",()=>{const warm=document.body.classList.toggle("eye-saver");localStorage.setItem("preframe-eye-saver",String(warm));(document.querySelector("#eye") as HTMLButtonElement).setAttribute("aria-pressed",String(warm));});
  if(localStorage.getItem("preframe-eye-saver")==="true")document.body.classList.add("eye-saver");
  const form=document.querySelector<HTMLFormElement>("#new-project");form?.addEventListener("submit",async event=>{event.preventDefault();try{const title=String(new FormData(form).get("title")||"").trim();const id=await cloudRepo.createProject(title,Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC");history.pushState({},"",href(`/app/projects/${id}`));errorMessage="";render();}catch(e){errorMessage=e instanceof Error?e.message:"Could not create project";render();}});
  if(document.querySelector("#invitations-list"))loadInvitations();
}
async function loadInvitations(){const target=document.querySelector("#invitations-list");if(!target)return;try{const rows=await cloudRepo.invitations();target.innerHTML=rows.length?rows.map(row=>`<p>Project invitation <button type="button" data-accept="${esc(row.id)}">Accept</button></p>`).join(""):"<p>No pending invitations.</p>";target.querySelectorAll<HTMLButtonElement>("[data-accept]").forEach(button=>button.addEventListener("click",async()=>{try{const id=await cloudRepo.acceptInvitation(button.dataset.accept!);history.pushState({},"",href(`/app/projects/${id}`));render();}catch(e){errorMessage=e instanceof Error?e.message:"Could not accept invitation";render();}}));}catch(e){target.textContent=e instanceof Error?e.message:"Could not load invitations";}}
async function renderTierPanel(){
  if(preview)return;
  const grid=document.querySelector(".project-grid");if(!grid)return;
  const panel=document.createElement("div");panel.className="tier-panel";
  if(accountBadge==="Free")panel.innerHTML="<strong>Free plan</strong><p>One active owned project. Finish or archive it before creating another.</p>";
  else if(accountBadge==="Premium"){
    const project=(await cloudRepo.listProjects())[0];
    panel.innerHTML=project?`<strong>Collaborate</strong><p>Work with your crew and manage editor access.</p>${link(`/app/projects/${project.id}`,"Open collaborators →","text-link")}`:"<strong>Collaborate</strong><p>Create a project to invite your crew.</p>";
  }else return;
  grid.insertAdjacentElement("afterend",panel);
}
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
