const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const studioIcon = (kind: string) => {
  const paths: Record<string, string> = {
    projects: '<path d="M3 6h7l2 3h9v11H3z"/>',
    screenplay: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
    notes: '<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',
    shots: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
    storyboards: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
    schedule: '<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 3 5v3"/>',
    locations: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2"/>',
    settings: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.screenplay}</svg>`;
};
export function studioShell(id: string, title: string, name: string, label: string, content: string, href: (path: string) => string): string {
  const root = `/app/projects/${id}`;
  const nav = (path: string, text: string, icon: string, active = false) => `<a href="${href(path)}" data-route ${active ? 'aria-current="page"' : ''}>${studioIcon(icon)}<span>${text}</span></a>`;
  return `<main class="tool-page studio-workspace" data-tool="${esc(name)}" data-project="${esc(id)}">
    <aside class="studio-sidebar" id="studio-sidebar-panel"><div class="studio-sidebar-head"><a class="studio-brand" href="${href('/app')}" data-route><span class="preframe-mark" aria-hidden="true"><i></i><i></i><i></i></span>PREFRAME</a><button type="button" id="studio-sidebar-close" aria-label="Close tools menu">× <span>Close</span></button></div><div class="studio-sidebar-content"><nav aria-label="Workspace navigation">${nav('/app/projects', 'Projects', 'projects')}${nav(root, 'Project overview', 'projects')}<span class="studio-nav-caption">PROJECT TOOLS</span>${(['screenplay', 'notes', 'shots', 'storyboards', 'schedule', 'calendar', 'call-sheets', 'locations'] as const).map(tool => nav(`${root}/${tool}`, ({screenplay:'Screenplay',notes:'Docs & Notes',shots:'Shot Lists',storyboards:'Storyboards',schedule:'Production Schedule',calendar:'Calendar','call-sheets':'Call Sheets',locations:'Locations'})[tool], tool, tool === name)).join('')}<span class="studio-nav-divider"></span>${nav(root + '#project-management', 'People & settings', 'people')}</nav></div></aside>
    <div class="studio-main"><header class="studio-banner"><div class="studio-breadcrumb"><a href="${href('/app')}" data-route>Projects</a><span>/</span><a href="${href(root)}" data-route>${esc(title)}</a></div><h1>${esc(title)}</h1><div class="studio-current-tool">${studioIcon(name)}<span>${label}</span></div><a class="studio-project-button" href="${href(root)}" data-route>Project overview ↗</a></header><button type="button" class="studio-sidebar-toggle" id="studio-sidebar-toggle" aria-expanded="false" aria-controls="studio-sidebar-panel">☰ <span>Tools</span></button>${content}</div></main>`;
}
