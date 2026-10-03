import { withTimeout } from "./request-state.js";
import { backControl, backFallback, internalApplicationUrl, pushRoute } from "./app-navigation.js";
import { collaborationPage, wireCollaboration } from "./collaboration-page.js";
import { LocalProjectRepository } from "./local-repository.js";
import { CloudProjectRepository, supabase } from "./cloud.js";
import { parseRoute } from "./routes.js";
import type { Project, SyncState } from "./domain.js";
import { DurableProjectSync } from "./durable-sync.js";
import { exportProject, previewBackup } from "./backup.js";
import { landingDetails } from "./landing-content.js";
import { renderHomePage } from "./home-content.js";
import { mountToolWorkspace, toolWorkspace } from "./tool-ui.js";
import { clearToolData, exportToolData, newToolRecord, restoreToolData, saveToolRecord, toolRecords, type ToolName } from "./tool-data.js";
import { classifyScreenplayLines } from "./script-import.js";
const localRepo = new LocalProjectRepository(); const cloudRepo = new CloudProjectRepository(); let repo: LocalProjectRepository | CloudProjectRepository = cloudRepo; let preview = false; let errorMessage = ""; let accountBadge = "Free"; let currentUserId = ""; let adminMetricsTimer: ReturnType<typeof setInterval> | undefined; const root = document.querySelector<HTMLElement>("#app")!; const base = location.pathname.startsWith("/PreFrame") ? "/PreFrame" : ""; const href = (path: string) => `${base}${path}`;
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
function logo(target="/"){return `<a class="logo" href="${href(target)}" data-route aria-label="${target==="/app"?"Preframe dashboard":"Preframe landing page"}"><svg viewBox="0 0 52 36" aria-hidden="true"><path d="M5 6h42v24H5zM13 1v34M39 1v34"/></svg><span>Preframe</span></a>`;}
function shell(content:string,signed=false,badge=accountBadge,bare=false){if(bare)return content;return `<header class="topbar">${logo(signed?"/app":"/")}<nav aria-label="Primary">${signed?`${link("/app","Home")}<span class="avatar">${preview?"Preview":accountBadge||badge}</span>${preview?"":"<button id='sign-out' type='button'>Sign out</button>"}`:`<span class="public-nav-center">${link("/#features","Features")} ${link("/#pricing","Pricing")} ${link("/#about","About")}</span><span class="public-nav-actions">${link("/auth","Log in","plain-link")} ${link("/auth","Get started →","button")}</span>`}</nav></header>${content}`;}
function landing(){return shell(`<main class="landing"><section class="landing-stage" aria-labelledby="landing-title"><div class="landing-art" aria-hidden="true"></div><div class="landing-center-rule" aria-hidden="true"></div><div class="landing-copy"><p class="eyebrow">IDEAS <span>→</span> PLANS <span>→</span> REALITY</p><h1 id="landing-title">Before the<br><em>camera</em> rolls.</h1><p class="lede">Preframe is the all-in-one workspace for filmmakers<br class="desktop-break"> to write, visualize, plan and bring their stories to life.</p><div class="actions">${link("/auth","Start for free <span aria-hidden='true'>→</span>","button")}<button class="watch-video" type="button" disabled title="Video coming soon"><span class="play-ring" aria-hidden="true">▶</span>Watch video</button></div></div><div class="landing-frame-index" aria-hidden="true"><span></span>01 / 03</div><p class="landing-quote">“Ideas are easy.<br>Pre-production makes them real.”</p><div class="landing-feature-strip" aria-label="Preframe tools"><div class="landing-feature"><span class="feature-icon" aria-hidden="true">▤</span><span><strong>WRITE</strong><small>Screenplays &amp; Notes</small></span></div><div class="landing-feature"><span class="feature-icon" aria-hidden="true">◎</span><span><strong>VISUALIZE</strong><small>Shot lists &amp; Storyboards</small></span></div><div class="landing-feature"><span class="feature-icon" aria-hidden="true">▦</span><span><strong>PLAN</strong><small>Schedules &amp; Call sheets</small></span></div><div class="landing-feature"><span class="feature-icon" aria-hidden="true">♧</span><span><strong>COLLABORATE</strong><small>Work with your crew</small></span></div><span class="feature-aside" aria-hidden="true">SAME<br>STORY<br>HIGHER<br>POSSIBILITIES</span></div><div class="landing-bottom-mark" aria-hidden="true"><span>P R E F R A M E</span><span>BUILT FOR FILMMAKERS</span><a href="#features" aria-label="Scroll to features">SCROLL <span>✦</span></a></div></section>${landingDetails(href("/auth"))}</main>`);}
function auth(){return shell(`<main class="auth-page"><section><p class="eyebrow">PREFRAME ACCOUNT</p><h1>Continue with Google</h1><p>Sign in to create and recover your projects.</p><button id="google-login" type="button">Continue with Google</button><p role="alert">${esc(errorMessage)}</p><p class="quiet">You can also inspect sample data stored only in this browser.</p><a class="plain-link" href="${href("/app")}?preview=1">Open local preview</a></section></main>`);}
async function home(view: "home" | "projects" | "shared" | "settings" | "recycle" = "home"){
  const version=renderVersion;
  const identity=await repo.getIdentity();
  const storedProjects=await repo.listProjects();
  const projects=preview?storedProjects:await Promise.all(storedProjects.map(project=>cloudRepo.withCoverUrl(project).catch(()=>project)));
  const name=identity?.profile.displayName||"there";
  const visualMode=new URLSearchParams(location.search).get("home")||sessionStorage.getItem("preframe-preview-plan");
  const visualPreview=preview&&visualMode==="premium";
  const visualAdmin=preview&&visualMode==="admin";
  const premium=visualPreview||visualAdmin||Boolean(identity?.isAdmin||identity?.profile.tier==="premium");
  const badge=visualAdmin?"Admin":visualPreview?"Premium":preview?"Preview":identity?.isAdmin?"Admin":premium?"Premium":"Free";
  const context={logo:logo("/app"),href,view,projects: view === "projects" ? projects.filter(p=>p.ownerId===identity?.profile.id) : view === "shared" ? projects.filter(p=>p.ownerId!==identity?.profile.id) : projects,name,badge,premium,preview,error:errorMessage};
  const html=renderHomePage({...context,upcoming:[],recentActivity:[]});
  if(view!=="home")return html;
  const owner=preview?"local-demo-owner":currentUserId;
  if(version!==renderVersion)return html;
  pendingHomeSections=()=>{
    const schedule=root.querySelector<HTMLElement>(".home-schedule-list");
    const activity=root.querySelector<HTMLElement>(".home-activity");
    const today=new Date();const date=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
    const update=(target:HTMLElement,selector:string,upcoming:Awaited<ReturnType<typeof toolRecords>>,recentActivity:Parameters<typeof renderHomePage>[0]["recentActivity"])=>{
      if(version!==renderVersion||!target.isConnected)return;
      const template=document.createElement("template");template.innerHTML=renderHomePage({...context,upcoming,recentActivity});
      target.innerHTML=template.content.querySelector(selector)!.innerHTML;
      wireRouteLinks(target);
    };
    const fail=(target:HTMLElement,label:string,retry:()=>void)=>{
      if(version!==renderVersion||!target.isConnected)return;
      target.innerHTML=`<h2>${label}</h2><p role="alert">Could not load this section.</p><button data-retry>Retry</button>`;
      target.querySelector("button")?.addEventListener("click",retry);
    };
    const loadSchedule=async()=>{
      if(!schedule)return;schedule.innerHTML='<h2>Upcoming Schedule</h2><p role="status">Loading schedule…</p>';
      try{
        const rows=projects[0]?await toolRecords(owner,projects[0].id,"schedule"):[];
        const upcoming=rows.filter(item=>/^\d{4}-\d{2}-\d{2}$/.test(item.fields.date||"")&&item.fields.date>=date).sort((a,b)=>`${a.fields.date} ${a.fields.start||""}`.localeCompare(`${b.fields.date} ${b.fields.start||""}`)).slice(0,3);
        update(schedule,".home-schedule-list",upcoming,[]);
      }catch{fail(schedule,"Upcoming Schedule",()=>void loadSchedule());}
    };
    const loadActivity=async()=>{
      if(!activity)return;activity.innerHTML='<h2>Recent Activity</h2><p role="status">Loading activity…</p>';
      try{
        const batches=await Promise.all(projects.flatMap(project=>tools.filter(([, , tool])=>tool!=="calendar").map(async([,label,tool])=>{
          const rows=await toolRecords(owner,project.id,tool as ToolName);
          return rows.filter(row=>!row.fields.kind?.startsWith("__")).map(row=>({title:row.title||label,detail:`${label} · ${project.title}`,href:href(`/app/projects/${project.id}/${tool}`),occurredAt:row.updatedAt}));
        })));
        const rows=[...projects.map(project=>({title:project.title,detail:"Project updated",href:href(`/app/projects/${project.id}`),occurredAt:project.updatedAt})),...batches.flat()].sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)).slice(0,5);
        update(activity,".home-activity",[],rows);
      }catch{fail(activity,"Recent Activity",()=>void loadActivity());}
    };
    void loadSchedule();void loadActivity();
  };
  return html;
}
function dashboard(p:Project){
  const icons:Record<string,string>={screenplay:"✎",notes:"▤",shots:"◎",storyboards:"▦",schedule:"▥",calendar:"▦","call-sheets":"▣",locations:"⌖"};
  const group=(name:string)=>`<section class="project-tool-band" data-group="${name.toLowerCase()}"><div class="project-tool-band-label"><span>${name}</span><small>${name==="Write"?"Develop the story":name==="Visualize"?"See the film":"Prepare the shoot"}</small></div><div class="project-tool-links">${tools.filter(([c])=>c===name).map(([,label,t])=>`<a href="${href(`/app/projects/${p.id}/${t}`)}" data-route class="project-tool-link"><span class="project-tool-icon" aria-hidden="true">${icons[t]}</span><strong>${label}</strong><small>${toolDescriptions[t]}</small><span class="project-tool-arrow" aria-hidden="true">→</span></a>`).join("")}</div></section>`;
  const coverStyle=p.coverUrl&&/^(https:|data:image\/)/.test(p.coverUrl)?` style="background-image:url('${esc(p.coverUrl)}')"`:"";
  return shell(`<main class="app-shell project-hub-shell"><aside class="side-nav"><span>PROJECT WORKSPACE</span></aside><section class="project-page project-hub"><div class="project-hub-heading"${coverStyle}><p class="eyebrow">PREFRAME / PROJECT</p><div class="project-heading-row"><h1>${esc(p.title)}</h1><button id="project-settings-toggle" type="button">Edit project</button></div><p>From first draft to shooting day.</p></div><div class="project-bands">${group("Write")}${group("Visualize")}${group("Plan")}</div><details id="project-management" class="project-management"><summary>Edit project</summary><div class="project-management-body"><label class="project-title">Project title <input id="project-title" value="${esc(p.title)}" maxlength="160"></label><section class="project-cover-settings"><h2>Project cover</h2><p>Choose a landscape image. PreFrame optimizes it before saving.</p><label class="cover-upload">Choose cover image <input id="project-cover-file" type="file" accept="image/jpeg,image/png,image/webp"></label><p id="cover-status" role="status"></p></section><div id="save-status" role="status">${preview?"Saved locally":"Synced"}</div><p role="alert">${esc(errorMessage)}</p>${!preview&&p.ownerId===currentUserId?`<section class="project-danger-zone"><h2>Delete project</h2><p>Moves this project to Recycle bin for 15 days. You can restore it until then.</p><button id="delete-project" type="button">Move to Recycle bin</button></section>`:""}</div></details></section></main>`,true);
}
function workspace(p:Project,t:string){if(t!=="import"&&t!=="members")return shell(toolWorkspace(p,t,href),true,accountBadge,true);const label=t==="import"?"Import Script":"Project collaborators";return shell(`<main class="workspace-page"><div class="workspace-head"><span class="project-chip">${esc(p.title)}</span></div><section class="empty-workspace"><p class="eyebrow">PROJECT WORKSPACE</p><h1>${label}</h1>${t==="import"?`<p>Bring in a screenplay PDF as editable screenplay elements, or preview a PreFrame JSON archive.</p><label id="script-drop-zone" class="script-drop-zone" for="backup-file"><strong>Drop a screenplay PDF or PreFrame archive here</strong><span>Choose a PDF screenplay or a JSON backup from your device</span><input id="backup-file" type="file" accept=".pdf,application/pdf,.json,application/json"></label><div id="backup-preview" role="status"></div>`:"<p>Manage collaboration from the Collaboration page.</p>"}</section></main>`,true,accountBadge,true);}
function importProjectPicker(projects:Project[]){return shell(`<main class="workspace-page"><div class="workspace-head"><span class="project-chip">SCRIPT IMPORT</span></div><section class="empty-workspace import-project-picker"><p class="eyebrow">PROJECT WORKSPACE</p><h1>Where should this script go?</h1><p>Choose the project whose screenplay should receive the PDF or PreFrame archive.</p>${projects.length?`<form id="import-project-form"><label for="import-project-select">Project<select id="import-project-select" name="projectId">${projects.map(project=>`<option value="${esc(project.id)}">${esc(project.title)}</option>`).join("")}</select></label><button type="submit">Continue to import</button></form>`:`<p>Create a project before importing a script.</p>${link("/app","Back to dashboard","button")}`}</section></main>`,true,accountBadge,true);}
function premiumBlocked(feature:string){return `<main class="empty-workspace premium-blocked"><p class="eyebrow">PREMIUM FEATURE</p><h1>${esc(feature)}</h1><p>${esc(feature)} is available on Premium for ₹49/month or ₹499/year. Checkout is coming soon.</p><button type="button" data-premium-feature="${esc(feature)}">View Premium access</button>${link("/app","Back to dashboard","plain-link")}</main>`;}
function premiumDialog(){return `<dialog id="premium-dialog" class="premium-dialog" aria-labelledby="premium-dialog-title"><button class="premium-dialog-close" type="button" aria-label="Close">×</button><p class="eyebrow">PREFRAME PREMIUM</p><h2 id="premium-dialog-title">Available on Premium</h2><p id="premium-dialog-copy">This feature is available on Premium.</p><button type="button" class="premium-dialog-confirm">Got it</button></dialog>`;}
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
function formatStorage(bytes: unknown) {
  const value = typeof bytes === "number" ? bytes : Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "Unavailable";
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}
async function refreshAdminMetrics(){
 const panel=document.querySelector<HTMLElement>(".admin-live-metrics");if(!panel||accountBadge!=="Admin")return;
 const update=(selector:string,value:string)=>{const element=panel.querySelector(selector);if(element&&panel.isConnected)element.textContent=value;};
 if(!currentUserId||preview){panel.dataset.state="unavailable";panel.querySelectorAll("b").forEach(element=>element.textContent="Unavailable");const note=document.querySelector(".admin-metric-note");if(note)note.textContent="Local preview. Sign in as an admin to see database metrics. Remaining storage quota is unavailable.";return;}
 let result;try{result=await withTimeout(supabase.rpc("admin_workspace_metrics"));}catch{result={data:null,error:true};}
 if(!panel.isConnected)return;
 const {data,error}=result;const metric=Array.isArray(data)?data[0]:data;
 if(error||!metric){panel.dataset.state="unavailable";panel.querySelectorAll("b").forEach(element=>element.textContent="Unavailable");return;}
 panel.dataset.state="success";
 update("[data-admin-storage]",formatStorage(metric.storage_bytes));update("[data-admin-active]",String(metric.active_users??0));update("[data-admin-registered]",String(metric.registered_users??0));
}
function wireAdminMetrics() {
  if (adminMetricsTimer) clearInterval(adminMetricsTimer);
  adminMetricsTimer = undefined;
  if (!document.querySelector("[data-admin-storage]") || accountBadge !== "Admin") return;
  document.querySelector("[data-retry-metrics]")?.addEventListener("click",()=>void refreshAdminMetrics());
  void refreshAdminMetrics();
  adminMetricsTimer = setInterval(() => void refreshAdminMetrics(), 60_000);
}
let pendingHomeSections:(()=>void)|undefined;
function wireRouteLinks(container:Element){
 container.querySelectorAll<HTMLAnchorElement>("[data-route]").forEach(anchor=>anchor.addEventListener("click",event=>{
  if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
  if(anchor.origin===location.origin){event.preventDefault();pushRoute(anchor.href);errorMessage="";void render();}
 }));
}
let renderVersion=0;
let presenceTimer: ReturnType<typeof setInterval> | undefined;
let presenceUser="";
function wirePresence(){
 if(presenceUser===currentUserId)return;clearInterval(presenceTimer);presenceUser=currentUserId;
 if(!currentUserId||preview)return;
 const beat=()=>{if(document.visibilityState==="visible")void withTimeout(supabase.rpc("record_workspace_presence")).catch(()=>{});};
 beat();presenceTimer=setInterval(beat,60_000);
}
async function render(){
 const version=++renderVersion;pendingHomeSections=undefined;
 const setPage=(html:string)=>{if(version===renderVersion)root.innerHTML=html;};
  const query=new URLSearchParams(location.search);
  preview=query.get("preview")==="1"||sessionStorage.getItem("preframe-preview")==="1";
  if(query.get("preview")==="1")sessionStorage.setItem("preframe-preview","1");
  repo=preview?localRepo:cloudRepo;
  let session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]=null;
 try {if(!preview)session=(await withTimeout(supabase.auth.getSession())).data.session;}
 catch {if(version!==renderVersion)return;root.innerHTML=shell(`<main class="empty-workspace"><h1>Could not check your session</h1><p>Check your connection and try again.</p><button data-retry-page>Retry</button></main>`);root.querySelector("button[data-retry-page]")?.addEventListener("click",()=>void render());return;}
 if(version!==renderVersion)return;
  currentUserId=session?.user.id||"";
 const requestedPlan=query.get("home");
 if(preview&&requestedPlan&&["free","premium","admin"].includes(requestedPlan))sessionStorage.setItem("preframe-preview-plan",requestedPlan);
 const previewPlan=sessionStorage.getItem("preframe-preview-plan");wirePresence();
  let r=parseRoute(query.get("r")||location.pathname);
  if(session&&!preview&&r.page==="auth"){
    history.replaceState({},"",href("/app"));
    r=parseRoute("/app");
  }
  document.body.classList.toggle("is-landing",r.page==="landing");
  document.body.classList.toggle("is-home",["home","projects","shared","settings","recycle","collaborate"].includes(r.page)&&Boolean(session||preview));
  if(session&&!preview&&r.page!=="landing"&&r.page!=="auth"){
    try{const identity=await withTimeout(cloudRepo.getIdentity());accountBadge=identity?.isAdmin?"Admin":identity?.profile.tier==="premium"?"Premium":"Free";}
    catch{if(version!==renderVersion)return;root.innerHTML=shell(`<main class="empty-workspace"><h1>Could not load your account</h1><p>Check your connection and try again.</p>${backControl(href("/app"))}<button data-retry-page>Retry</button></main>`,true);root.querySelector("[data-retry-page]")?.addEventListener("click",()=>void render());root.querySelector("[data-app-back]")?.addEventListener("click",event=>{event.preventDefault();history.replaceState({},"",href("/app"));void render();});return;}
  }else if(preview)accountBadge=previewPlan==="admin"?"Admin":previewPlan==="premium"?"Premium":"Preview";
 if(version!==renderVersion)return;
  try{
    if(r.page==="landing")setPage(landing());
    else if(r.page==="auth")setPage(auth());
    else if(!session&&!preview){history.replaceState({},"",href("/auth"));setPage(auth());}
    else if(r.page==="home"||r.page==="projects"||r.page==="shared"||r.page==="settings"||r.page==="recycle")setPage(await withTimeout(home(r.page)));
    else if(r.page==="import")setPage(importProjectPicker(await withTimeout(repo.listProjects())));
    else if(r.page==="collaborate"){
      const identity=await withTimeout(repo.getIdentity());
      const premium=preview ? ["Premium","Admin"].includes(accountBadge) : Boolean(identity?.isAdmin||identity?.profile.tier==="premium");
      if(!premium)setPage(premiumBlocked("Collaboration"));
      else {setPage(collaborationPage((await withTimeout(repo.listProjects())).filter(p=>p.ownerId===identity?.profile.id),href,preview));wireCollaboration(href,url=>{pushRoute(url);render();});}
    }
    else if(r.page==="not-found")setPage(missing());
    else {
      const p=r.projectId&&await withTimeout(repo.getProject(r.projectId));
      const premiumTools=new Set(["storyboards","calendar","call-sheets","locations"]);
      const premium=accountBadge==="Premium"||accountBadge==="Admin";
      setPage(p?(r.page==="project"?dashboard(p):r.page==="workspace"&&premiumTools.has(r.tool||"")&&!premium?premiumBlocked(tools.find(([, , key])=>key===r.tool)?.[1]||"This tool"):workspace(p,r.tool!)):shell(`<main class="empty-workspace"><h1>Project unavailable</h1><p>This project is missing or you do not have permission to open it.</p>${link("/app","Back to projects","button")}</main>`,true));
      if(version!==renderVersion)return;
      if(p&&r.page==="project")wire(p);
      if(p&&r.page==="workspace"&&r.tool==="import")wireImport(p);
      if(p&&r.page==="workspace"&&r.tool!=="import"&&r.tool!=="members"&&(!premiumTools.has(r.tool||"")||premium)){
        if(version!==renderVersion)return;
        const workspaceNode=root.querySelector(".tool-page");
        void withTimeout(mountToolWorkspace(p,r.tool!,preview?"local-demo-owner":currentUserId,premium)).catch(error=>{
          if(version!==renderVersion||!workspaceNode?.isConnected)return;
          const editor=workspaceNode.querySelector("#tool-editor");
          if(editor){editor.innerHTML=`<section class="data-error" role="alert"><h2>Could not load this tool</h2><p>${esc(error instanceof Error ? error.message : "Check your connection and project access, then try again.")}</p><p>Your saved documents have not been deleted.</p><button data-retry-page>Retry</button></section>`;editor.querySelector("button")?.addEventListener("click",()=>void render());}
          const status=workspaceNode.querySelector("#tool-status");if(status)status.textContent="Not loaded";
        });
      }
    }
  }catch(e){setPage(shell(`<main class="empty-workspace"><h1>Could not load Preframe</h1><p>Check your connection and try again.</p><button data-retry-page>Retry</button></main>`,!!session||preview));}
  if(version!==renderVersion)return;
  if(session||preview){
    const fallback=href(backFallback(r));
    if(!["landing","auth","home"].includes(r.page)&&!root.querySelector("[data-app-back]"))root.querySelector(".collection-heading,.workspace-head,.project-hub-heading,.collaboration-page,.empty-workspace")?.insertAdjacentHTML("afterbegin",backControl(fallback));
    root.querySelectorAll<HTMLAnchorElement>("[data-app-back]").forEach(button=>button.addEventListener("click",event=>{
      event.preventDefault();const previous=history.state?.previousInternal;
      if(typeof previous==="string"&&internalApplicationUrl(previous,location.origin))history.back();
      else {history.replaceState({preframeEntry:true},"",button.href);void render();}
    }));
  }
  root.querySelectorAll("[data-retry-page]").forEach(button=>button.addEventListener("click",()=>void render()));
  if((session||preview)&&accountBadge!=="Premium"&&accountBadge!=="Admin")root.insertAdjacentHTML("beforeend",premiumDialog());
  if(location.hash === "#project-management"){const management=document.querySelector<HTMLDetailsElement>("#project-management");if(management){management.open=true;management.scrollIntoView();}}
  wireRouteLinks(root);
  document.querySelector<HTMLFormElement>("#import-project-form")?.addEventListener("submit",event=>{event.preventDefault();const form=event.currentTarget as HTMLFormElement;const projectId=String(new FormData(form).get("projectId")||"");if(!projectId)return;pushRoute(href(`/app/projects/${projectId}/import`));render();});
  document.querySelectorAll<HTMLAnchorElement>("[data-home-anchor]").forEach(anchor=>anchor.addEventListener("click",event=>{
    const id=anchor.dataset.homeAnchor;
    const target=id&&document.getElementById(id);
    if(!target)return;
    event.preventDefault();
    history.replaceState({},"",`${location.pathname}#${id}`);
    target.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});
  }));
  document.querySelector("#google-login")?.addEventListener("click",async()=>{sessionStorage.removeItem("preframe-preview");sessionStorage.setItem("preframe-oauth-pending","1");const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}${href("/")}`,queryParams:{prompt:"select_account"}}});if(error){sessionStorage.removeItem("preframe-oauth-pending");errorMessage=error.message;render();}});
  document.querySelector("#sign-out")?.addEventListener("click",async()=>{await supabase.auth.signOut();sessionStorage.removeItem("preframe-preview");pushRoute(href("/"));render();});
  const premiumModal=document.querySelector<HTMLDialogElement>("#premium-dialog");
  document.querySelectorAll<HTMLButtonElement>("[data-premium-feature]").forEach(button=>button.addEventListener("click",()=>{if(!premiumModal)return;const feature=button.dataset.premiumFeature||"This feature";const copy=premiumModal.querySelector("#premium-dialog-copy");if(copy)copy.textContent=`${feature} is available on Premium for ₹49/month or ₹499/year. Checkout is coming soon.`;premiumModal.showModal();}));
  premiumModal?.querySelectorAll<HTMLButtonElement>(".premium-dialog-close,.premium-dialog-confirm").forEach(button=>button.addEventListener("click",()=>premiumModal.close()));
  document.body.classList.toggle("eye-saver",Boolean(document.querySelector("#eye"))&&localStorage.getItem("preframe-eye-saver")==="true");
  document.querySelector("#eye")?.addEventListener("click",()=>{const warm=document.body.classList.toggle("eye-saver");localStorage.setItem("preframe-eye-saver",String(warm));(document.querySelector("#eye") as HTMLButtonElement).setAttribute("aria-pressed",String(warm));});
  document.querySelector("#eye")?.setAttribute("aria-pressed",String(document.body.classList.contains("eye-saver")));
  const newProjectToggle=document.querySelector<HTMLButtonElement>("#new-project-toggle");
  const newProjectForm=document.querySelector<HTMLFormElement>("#new-project");
  newProjectToggle?.addEventListener("click",()=>{if(!newProjectForm)return;newProjectForm.hidden=false;newProjectToggle.hidden=true;newProjectForm.querySelector<HTMLInputElement>("input")?.focus();});
  document.querySelector("#cancel-project")?.addEventListener("click",()=>{if(!newProjectForm)return;newProjectForm.hidden=true;if(newProjectToggle)newProjectToggle.hidden=false;});
  const search=document.querySelector<HTMLInputElement>("#project-search");
  search?.addEventListener("input",()=>{const term=search.value.trim().toLocaleLowerCase();let visible=0;document.querySelectorAll<HTMLElement>(".home-project-card").forEach(card=>{const matches=(card.dataset.projectTitle||"").includes(term);card.hidden=!matches;if(matches)visible++;});const empty=document.querySelector<HTMLElement>("#project-search-empty");if(empty)empty.hidden=visible>0||!term;});
  const form=document.querySelector<HTMLFormElement>("#new-project");form?.addEventListener("submit",async event=>{event.preventDefault();try{const title=String(new FormData(form).get("title")||"").trim();const id=await cloudRepo.createProject(title,Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC");pushRoute(href(`/app/projects/${id}`));errorMessage="";render();}catch(e){errorMessage=e instanceof Error?e.message:"Could not create project";render();}});
  if(document.querySelector("#invitations-list"))loadInvitations();
  if(document.querySelector("#recycle-list"))loadRecycleBin();
  if(r.page==="landing")wireLandingMotion();
  wireAdminMetrics();
  (pendingHomeSections as (()=>void)|undefined)?.();
  if(r.page==="landing"&&["#features","#pricing","#about"].includes(location.hash)){
    document.querySelector(location.hash)?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }
}
async function loadInvitations(){const target=document.querySelector("#invitations-list");if(!target)return;try{const rows=await withTimeout(cloudRepo.invitations());if(!target.isConnected)return;target.innerHTML=rows.length?rows.map(row=>`<p>Project invitation <button type="button" data-accept="${esc(row.id)}">Accept</button></p>`).join(""):"<p>No pending invitations.</p>";target.querySelectorAll<HTMLButtonElement>("[data-accept]").forEach(button=>button.addEventListener("click",async()=>{try{const id=await cloudRepo.acceptInvitation(button.dataset.accept!);pushRoute(href(`/app/projects/${id}`));render();}catch(e){errorMessage=e instanceof Error?e.message:"Could not accept invitation";render();}}));}catch(e){if(target.isConnected){target.innerHTML='<p role="alert">Could not load invitations.</p><button data-retry>Retry</button>';target.querySelector("button")?.addEventListener("click",()=>void loadInvitations());}}}
async function loadRecycleBin(){
  const target=document.querySelector<HTMLElement>("#recycle-list");if(!target)return;
  try{
    if(preview){target.innerHTML="<p>Recycle bin is empty in local preview. Sign in to manage deleted cloud projects.</p>";return;}
    const projects=await withTimeout(cloudRepo.recycleBin());if(!target.isConnected)return;
    target.innerHTML=projects.length?`<div class="recycle-list">${projects.map(project=>{const days=Math.max(0,Math.ceil((new Date(project.purgeAfter).getTime()-Date.now())/86_400_000));return `<article class="recycle-item"><div><h2>${esc(project.title)}</h2><p>Automatically deleted in ${days} day${days===1?"":"s"}.</p></div><div><button type="button" data-restore-project="${esc(project.id)}">Restore</button><button type="button" class="danger-button" data-purge-project="${esc(project.id)}">Delete forever</button></div></article>`;}).join("")}</div>`:"<p class=\"home-empty-projects\">Recycle bin is empty.</p>";
    target.querySelectorAll<HTMLButtonElement>("[data-restore-project]").forEach(button=>button.addEventListener("click",async()=>{button.disabled=true;try{await cloudRepo.restoreProject(button.dataset.restoreProject!);errorMessage="Project restored.";render();}catch(e){button.disabled=false;target.insertAdjacentHTML("afterbegin",`<p role=\"alert\">${esc(e instanceof Error?e.message:"Could not restore project")}</p>`);}}));
    target.querySelectorAll<HTMLButtonElement>("[data-purge-project]").forEach(button=>button.addEventListener("click",async()=>{if(!confirm("Permanently delete this project and its data? This cannot be undone."))return;button.disabled=true;try{await cloudRepo.permanentlyDeleteProject(button.dataset.purgeProject!);errorMessage="Project permanently deleted.";render();}catch(e){button.disabled=false;target.insertAdjacentHTML("afterbegin",`<p role=\"alert\">${esc(e instanceof Error?e.message:"Could not delete project")}</p>`);}}));
  }catch(e){if(target.isConnected){target.innerHTML='<p role="alert">Could not load Recycle bin.</p><button data-retry>Retry</button>';target.querySelector("button")?.addEventListener("click",()=>void loadRecycleBin());}}
}
type PdfTextItem = { str?: string; transform?: number[] };
async function extractPdfLines(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("./pdf.worker.mjs", import.meta.url).toString();
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map<number, PdfTextItem[]>();
    let leftMargin = Number.POSITIVE_INFINITY;
    for (const item of content.items as PdfTextItem[]) {
      if (!item.str?.trim() || !item.transform) continue;
      leftMargin = Math.min(leftMargin,item.transform[4]);
      const row = Math.round(item.transform[5] / 3) * 3;
      rows.set(row, [...(rows.get(row) || []), item]);
    }
    [...rows.entries()].sort(([a], [b]) => b - a).forEach(([, row]) => {
      const ordered=row.sort((a, b) => (a.transform?.[4] || 0) - (b.transform?.[4] || 0));
      const indent=Math.max(0,Math.round(((ordered[0]?.transform?.[4] || leftMargin)-leftMargin)/8));
      lines.push(" ".repeat(indent)+ordered.map(item => item.str).join(" "));
    });
  }
  return lines;
}
function wireImport(project: Project){
  const input=document.querySelector<HTMLInputElement>("#backup-file"),target=document.querySelector<HTMLElement>("#backup-preview"),zone=document.querySelector<HTMLElement>("#script-drop-zone");
  const inspect=async(file:File)=>{
    if(!target)return;
    const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    target.textContent=pdf ? "Reading screenplay PDF…" : "Validating archive…";
    try{
      if(file.size>50_000_000)throw new Error(pdf ? "PDF is too large to import safely" : "Archive is too large to preview safely");
      if(pdf){
        const elements=classifyScreenplayLines(await extractPdfLines(file));
        if(!elements.length)throw new Error("No readable screenplay text was found in this PDF");
        const summary=elements.reduce((counts,item)=>{counts[item.kind]=(counts[item.kind]||0)+1;return counts;},{} as Record<string,number>);
        target.innerHTML=`<h2>${esc(file.name)}</h2><p>Ready to import ${elements.length} editable screenplay elements.</p><p>${Object.entries(summary).map(([kind,count])=>`${esc(kind)}: ${count}`).join(" · ")}</p><button id="import-screenplay-pdf" type="button">Import into screenplay</button><p class="quiet">This adds to the current screenplay; it does not replace existing work.</p>`;
        target.querySelector<HTMLButtonElement>("#import-screenplay-pdf")?.addEventListener("click",async()=>{
          const button=target.querySelector<HTMLButtonElement>("#import-screenplay-pdf")!;
          button.disabled=true;button.textContent="Importing…";
          try{
            const ownerId=preview?"local-demo-owner":currentUserId;
            const existing=await toolRecords(ownerId,project.id,"screenplay");
            for(const [index,element] of elements.entries()){
              const record=newToolRecord(`${element.kind} ${existing.length+index+1}`,{kind:element.kind,text:element.text,order:String(existing.length+index).padStart(6,"0")});
              await saveToolRecord(ownerId,project.id,"screenplay",record,0);
            }
            target.innerHTML=`<div class="script-import-success" role="status"><strong>Imported successfully</strong><p>${elements.length} screenplay elements were added to <b>${esc(project.title)}</b>.</p><button id="open-imported-screenplay" type="button">Open screenplay</button><button id="import-another-script" type="button">Import another file</button></div>`;
            target.querySelector<HTMLButtonElement>("#open-imported-screenplay")?.addEventListener("click",()=>{pushRoute(href(`/app/projects/${project.id}/screenplay`));render();});
            target.querySelector<HTMLButtonElement>("#import-another-script")?.addEventListener("click",()=>{input!.value="";target.textContent="Choose another screenplay PDF or PreFrame archive.";input!.focus();});
          }catch(error){button.disabled=false;button.textContent="Import into screenplay";target.insertAdjacentHTML("beforeend",`<p role="alert">${esc(error instanceof Error?error.message:"Could not import screenplay")}</p>`);}
        });
        return;
      }
      const result=await previewBackup(await file.text());
      target.innerHTML=`<h2>${esc(result.title)}</h2><p>${Object.entries(result.records).map(([name,count])=>`${esc(name)}: ${count}`).join(" · ")}</p><p>Media files: ${result.files}</p><p>${result.warnings.map(esc).join(" ")}</p><p>Preview only. Restore into a separate project will be enabled after the import policy and quota checks are approved.</p>`;
    }catch(e){target.textContent=e instanceof Error?e.message:"Archive validation failed";}
  };
  input?.addEventListener("change",()=>{const file=input.files?.[0];if(file)inspect(file);});
  zone?.addEventListener("dragover",event=>{event.preventDefault();zone.classList.add("is-dragging");});
  zone?.addEventListener("dragleave",()=>zone.classList.remove("is-dragging"));
  zone?.addEventListener("drop",event=>{event.preventDefault();zone.classList.remove("is-dragging");const file=event.dataTransfer?.files?.[0];if(file)inspect(file);});
}
async function optimizedCover(file:File):Promise<Blob>{
  if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error("Choose a JPEG, PNG, or WebP image");
  if(file.size>20_000_000)throw new Error("Choose an image smaller than 20 MB");
  const source=await createImageBitmap(file);const scale=Math.min(1,1920/Math.max(source.width,source.height));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));
  canvas.getContext("2d")?.drawImage(source,0,0,canvas.width,canvas.height);source.close();
  const blob=await new Promise<Blob | null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.84));
  if(!blob)throw new Error("Could not prepare this image");if(blob.size>2_000_000)throw new Error("Choose a simpler image under 2 MB after compression");return blob;
}
const blobDataUrl=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Could not read the cover image"));reader.readAsDataURL(blob);});
async function wire(p:Project){
  const input=document.querySelector<HTMLInputElement>("#project-title")!,status=document.querySelector("#save-status")!;let current=p;let timer:ReturnType<typeof setTimeout>;
  const localScope=preview?"local-demo-owner":currentUserId;
  const backupStatus=document.querySelector<HTMLElement>("#local-backup-status");
  document.querySelector<HTMLButtonElement>("#project-settings-toggle")?.addEventListener("click",()=>{const settings=document.querySelector<HTMLDetailsElement>("#project-management");if(!settings)return;settings.open=true;settings.scrollIntoView({behavior:"smooth",block:"start"});document.querySelector<HTMLInputElement>("#project-title")?.focus();});
  document.querySelector<HTMLInputElement>("#project-cover-file")?.addEventListener("change",async event=>{
    const file=(event.currentTarget as HTMLInputElement).files?.[0],coverStatus=document.querySelector<HTMLElement>("#cover-status");if(!file||!coverStatus)return;
    coverStatus.textContent="Optimizing cover…";
    try{const cover=await optimizedCover(file);if(preview){const coverUrl=await blobDataUrl(cover);const result=await localRepo.saveProject({...current,coverUrl},current.revision);if(result.kind!=="ok")throw new Error("Could not save cover");current=result.value.value;coverStatus.textContent="Cover saved locally.";}else{coverStatus.textContent="Uploading cover…";const previous=current.coverPath;current=await cloudRepo.updateProjectCover(current,cover);if(previous&&previous!==current.coverPath)await supabase.storage.from("project-media").remove([previous]);coverStatus.textContent="Cover saved.";}render();}
    catch(e){coverStatus.textContent=e instanceof Error?e.message:"Could not save cover";}
  });
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
    const typed=prompt(`Move “${current.title}” to Recycle bin? It can be restored for 15 days. Type the project name to confirm.`);
    if(typed!==current.title)return;
    const button=document.querySelector<HTMLButtonElement>("#delete-project")!;
    button.disabled=true;button.textContent="Moving…";
    try{await cloudRepo.deleteProject(p.id);errorMessage="Project moved to Recycle bin. It can be restored for 15 days.";pushRoute(href("/app/recycle"));render();}
    catch(e){button.disabled=false;button.textContent="Move to Recycle bin";status.textContent=e instanceof Error?e.message:"Could not move project";}
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
supabase.auth.onAuthStateChange((event,session)=>{queueMicrotask(()=>{if(event==="SIGNED_IN"&&session){const pending=sessionStorage.getItem("preframe-oauth-pending");sessionStorage.removeItem("preframe-oauth-pending");if(pending||parseRoute(location.pathname).page==="auth"){history.replaceState({},"",href("/app"));render();}}else if(event==="SIGNED_OUT"&&!preview){history.replaceState({},"",href("/"));render();}});});
addEventListener("storage",event=>{if(!preview&&event.key?.startsWith("sb-"))render();});
render();
