import test from "node:test";
import assert from "node:assert/strict";
import {internalApplicationUrl,backFallback} from "../dist/app-navigation.js";
import {parseRoute} from "../dist/routes.js";
import {withTimeout,boundedFetch} from "../dist/request-state.js";
test("Back accepts only meaningful same-origin application pages",()=>{
 const origin="https://example.com";
 assert.equal(internalApplicationUrl("/PreFrame/?r=%2Fapp%2Fprojects",origin),true);
 for(const url of ["https://other.test/app","/","/auth","/unknown","javascript:alert(1)"])assert.equal(internalApplicationUrl(url,origin),false);
});
test("direct-entry Back falls back through project, projects, then home",()=>{
 assert.equal(backFallback(parseRoute("/app/projects/project-id/notes")),"/app/projects/project-id");
 assert.equal(backFallback(parseRoute("/app/projects/project-id")),"/app/projects");
 for(const page of ["settings","shared","recycle","import","collaborate"])assert.equal(backFallback(parseRoute(`/app/${page}`)),"/app");
});
test("requests settle successfully or preserve rejection before deadline",async()=>{
 assert.equal(await withTimeout(Promise.resolve(42),100),42);
 await assert.rejects(withTimeout(Promise.reject(new Error("denied")),100),/denied/);
});
test("hung requests become a retryable error within the deadline",async()=>{
 await assert.rejects(withTimeout(new Promise(()=>{}),10),/timed out/);
});
test("cloud fetch respects caller cancellation",async()=>{
 const original=globalThis.fetch;
 const controller=new AbortController();controller.abort();
 globalThis.fetch=async(_input,options)=>{assert.equal(options.signal.aborted,true);throw new DOMException("Aborted","AbortError");};
 try{await assert.rejects(boundedFetch("https://example.com",{signal:controller.signal}),{name:"AbortError"});}finally{globalThis.fetch=original;}
});
