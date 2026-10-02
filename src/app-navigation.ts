import { parseRoute, type Route } from "./routes.js";
export function internalApplicationUrl(value:string,origin:string):boolean {
 try {const url=new URL(value,origin);const route=parseRoute(url.searchParams.get("r")||url.pathname);return url.origin===origin&&!["landing","auth","not-found"].includes(route.page);}catch{return false;}
}
export function backFallback(route:Route):string {return route.page==="workspace"&&route.projectId?`/app/projects/${route.projectId}`:route.page==="project"?"/app/projects":"/app";}
export function backControl(fallback:string):string {const target=fallback.replace(/[&"<>]/g,c=>({"&":"&amp;",'"':"&quot;","<":"&lt;",">":"&gt;"}[c]!));return `<a class="app-back" data-app-back href="${target}" aria-label="Back to previous application page"><span aria-hidden="true">←</span> Back</a>`;}
export function pushRoute(url:string):void {const previousInternal=internalApplicationUrl(location.href,location.origin)?location.href:undefined;history.pushState({preframeEntry:true,previousInternal},"",url);}
