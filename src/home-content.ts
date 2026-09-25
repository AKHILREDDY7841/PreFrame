import type { Project } from "./domain.js";
import type { ToolRecord } from "./tool-data.js";

type HomeOptions = {
  logo: string;
  href: (path: string) => string;
  projects: Project[];
  name: string;
  badge: string;
  premium: boolean;
  preview: boolean;
  error: string;
  upcoming: ToolRecord[];
  recentActivity: { title: string; detail: string; href: string; occurredAt: string }[];
};

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);
const route = (url: string, label: string, className = "") => `<a class="${className}" href="${url}" data-route>${label}</a>`;
export function daypartGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

function icon(name: string) {
  const paths: Record<string, string> = {
    home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
    projects: '<path d="M3 6h6l2 2h10v12H3z"/>',
    shared: '<circle cx="9" cy="8" r="3"/><path d="M2.5 20v-2a6.5 6.5 0 0 1 13 0v2zM17 6a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3.5 5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M10 2h4l.7 2.4 2.3 1 2.3-1.2 2.8 2.8-1.2 2.3 1 2.3L24 12l-2.1.4-1 2.3 1.2 2.3-2.8 2.8-2.3-1.2-2.3 1L14 22h-4l-.7-2.4-2.3-1-2.3 1.2-2.8-2.8 1.2-2.3-1-2.3L0 12l2.1-.4 1-2.3-1.2-2.3 2.8-2.8L7 5.4l2.3-1z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    eye: '<path d="M2 12c2.6-3.8 5.9-5.7 10-5.7s7.4 1.9 10 5.7c-2.6 3.8-5.9 5.7-10 5.7S4.6 15.8 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    write: '<path d="M5 4h12v13H5zM8 8h6M8 11h5M17 13l4-4 2 2-7 7-4 1 1-4z"/>',
    visualize: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
    plan: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M7 2v6M17 2v6M3 10h18M7 14h2M12 14h2M17 14h2M7 18h2M12 18h2"/>',
    import: '<path d="M5 2h10l4 4v16H5zM15 2v5h4M8 12h8M8 16h8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function projectCard(project: Project, href: HomeOptions["href"], index: number) {
  const date = new Date(project.updatedAt);
  const updated = Number.isNaN(date.getTime()) ? "Recently updated" : `Updated ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  const cover = project.coverUrl && /^(https:|data:image\/)/.test(project.coverUrl) ? ` style="background-image:url('${escapeHtml(project.coverUrl)}')"` : "";
  return `<a class="home-project-card" href="${href(`/app/projects/${project.id}`)}" data-route data-project-title="${escapeHtml(project.title.toLocaleLowerCase())}"><span class="home-project-image home-project-image-${index % 4}"${cover} aria-hidden="true"></span><span class="home-project-copy"><strong>${escapeHtml(project.title)}</strong><small>${updated}</small></span><span class="home-project-arrow" aria-hidden="true">↗</span></a>`;
}

export function renderHomePage({ logo, href, projects, name, badge, premium, preview, error, upcoming, recentActivity }: HomeOptions): string {
  const firstName = name.trim().split(/\s+/)[0] || "there";
  const initial = firstName.slice(0, 1).toLocaleUpperCase();
  const firstProject = projects[0];
  const search = `<label class="home-search">${icon("search")}<span class="sr-only">Search projects</span><input id="project-search" type="search" placeholder="Search projects…" autocomplete="off"></label>`;
  const account = `<details class="home-account"><summary aria-label="Account menu"><span class="home-avatar">${escapeHtml(initial)}</span><span class="home-badge">${escapeHtml(badge)}</span><span class="home-chevron" aria-hidden="true">⌄</span></summary><div class="home-account-popover"><strong>${escapeHtml(name)}</strong><small>${preview ? "Local preview" : `${escapeHtml(badge)} plan`}</small>${preview ? "" : '<button id="sign-out" type="button">Sign out</button>'}</div></details>`;
  const nav = `<aside class="home-sidebar" aria-label="App navigation"><nav>${route(href("/app"), `${icon("home")}<span>Home</span>`, "active")}<a href="#projects" data-home-anchor="projects">${icon("projects")}<span>Projects</span></a><a href="#invitations" data-home-anchor="invitations">${icon("shared")}<span>Shared with me</span></a><span class="home-nav-divider"></span><a href="#account-settings" data-home-anchor="account-settings">${icon("settings")}<span>Settings</span></a></nav><p>Plan better.<br>Shoot greater.</p></aside>`;
  const projectForm = preview ? "" : `<button id="new-project-toggle" class="home-new-button" type="button">＋ New Project</button><form id="new-project" class="home-new-form" hidden><label class="sr-only" for="new-project-title">Project name</label><input id="new-project-title" name="title" placeholder="Project name" required maxlength="160"><button type="submit">Create</button><button id="cancel-project" type="button" aria-label="Cancel new project">×</button></form>`;
  const cards = projects.length ? projects.map((project, index) => projectCard(project, href, index)).join("") : '<p class="home-empty-projects">No projects yet. Create your first project to begin.</p>';
  const planNotice = !premium ? `<div class="home-plan-notice">${icon("info")}<p><strong>You're on the Free plan.</strong> One active owned project is included.${projects.length ? " Premium checkout is coming soon." : " Create a project to get started."}</p></div>` : firstProject ? `<div class="home-collaborate">${icon("shared")}<div><strong>Collaborate</strong><p>Work with your crew. Invite editors and manage access in your project.</p></div>${route(href(`/app/projects/${firstProject.id}`), "Open project →", "home-collaborate-link")}</div>` : "";
  const quickActions = firstProject ? `<div class="home-quick-actions"><a href="${href(`/app/projects/${firstProject.id}`)}" data-route>${icon("shared")}<span><strong>Collaborate</strong><small>Invite your crew from project settings.</small></span><b>→</b></a><a href="${href(`/app/projects/${firstProject.id}/import`)}" data-route>${icon("import")}<span><strong>Import script</strong><small>Bring an existing PreFrame backup into view.</small></span><b>→</b></a></div>` : "";
  const scheduleItems = upcoming.length ? `<ol class="home-upcoming-list">${upcoming.map(item => `<li><time datetime="${escapeHtml(item.fields.date)}">${escapeHtml(new Date(`${item.fields.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }))}</time><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.fields.time || item.fields.start || "")}</small></li>`).join("")}</ol>` : `<div class="home-schedule-empty"><span class="home-schedule-date" aria-hidden="true">—</span><div><strong>No shoot days scheduled yet.</strong><p>Open a project when you're ready to plan your production.</p></div></div>`;
  const schedule = `<section class="home-schedule" aria-labelledby="schedule-title"><div class="home-schedule-list"><div class="home-schedule-heading"><h2 id="schedule-title">Upcoming Schedule</h2>${firstProject ? route(href(`/app/projects/${firstProject.id}/schedule`), "Open schedule →") : ""}</div>${scheduleItems}</div><div class="home-schedule-image" role="img" aria-label="${premium ? "Director's chair and cinema camera overlooking mountains" : "Quiet alpine lake at sunrise"}"></div></section>`;
  const activityItems = recentActivity.length ? `<ol class="home-activity-list">${recentActivity.map(item => `<li><a href="${item.href}" data-route><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)} · ${escapeHtml(new Date(item.occurredAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }))}</small></a></li>`).join("")}</ol>` : `<p class="home-activity-empty">Your recent project changes will appear here.</p>`;
  const activity = `<section class="home-activity" aria-labelledby="activity-title"><div class="home-schedule-heading"><h2 id="activity-title">Recent Activity</h2></div>${activityItems}</section>`;
  return `<header class="home-topbar">${logo}<div class="home-topbar-controls">${search}${account}</div></header><main class="home-shell ${premium ? "home-premium" : "home-free"}">${nav}<div class="home-main"><section class="home-banner" aria-label="Welcome"><div class="home-banner-copy"><p>${daypartGreeting(new Date().getHours())},</p><h1>${escapeHtml(firstName)}.</h1><p>Ideas look better in focus.</p></div><p class="home-banner-quote">From ideas<br>to reality.</p></section><div class="home-main-inner"><div class="home-dashboard-grid"><section class="home-projects" id="projects" aria-labelledby="home-projects-title"><div class="home-section-heading"><h2 id="home-projects-title">Your ${premium ? "Projects" : "Project"}</h2><div class="home-project-actions">${premium && projects.length > 4 ? `<a href="#projects">View all →</a>` : ""}${projectForm}</div></div><p class="home-error" role="alert">${escapeHtml(error)}</p><div class="home-project-grid">${cards}</div><p id="project-search-empty" class="home-search-empty" hidden>No projects match your search.</p>${planNotice}${quickActions}</section><aside class="home-dashboard-aside">${schedule}${activity}</aside></div><section class="home-lower" id="invitations"><h2>Shared with me</h2>${preview ? "<p>Sign in to see invitations to shared projects.</p>" : '<div id="invitations-list">Loading invitations…</div>'}</section><section class="home-lower home-account-settings" id="account-settings"><h2>Account settings</h2><p>${escapeHtml(name)} · ${escapeHtml(badge)}${preview ? " · Local preview" : ""}</p></section></div></div></main>`;
}
