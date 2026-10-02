export async function withTimeout<T>(work: PromiseLike<T>, milliseconds = 25_000): Promise<T> {
 let timer: ReturnType<typeof setTimeout> | undefined;
 try { return await Promise.race([Promise.resolve(work), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("The request timed out. Please try again.")), milliseconds); })]); }
 finally { clearTimeout(timer); }
}
export async function boundedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
 const controller = new AbortController(); const upstream=init?.signal || (input instanceof Request ? input.signal : undefined);
 const abort=()=>controller.abort(upstream?.reason); if(upstream?.aborted)abort(); upstream?.addEventListener("abort",abort,{once:true});
 const timer=setTimeout(()=>controller.abort(),25_000);
 try {return await fetch(input,{...init,signal:controller.signal});} finally {clearTimeout(timer);upstream?.removeEventListener("abort",abort);}
}
