export async function withTimeout<T>(work: PromiseLike<T>, milliseconds = 25_000): Promise<T> {
 let timer: ReturnType<typeof setTimeout> | undefined;
 try { return await Promise.race([Promise.resolve(work), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("The request timed out. Please try again.")), milliseconds); })]); }
 finally { clearTimeout(timer); }
}
export async function boundedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
 const controller = new AbortController(); const upstream=init?.signal || (input instanceof Request ? input.signal : undefined);
 const abort=()=>controller.abort(upstream?.reason); if(upstream?.aborted)abort(); upstream?.addEventListener("abort",abort,{once:true});
 const timer=setTimeout(()=>controller.abort(new Error("The connection timed out. Please try again.")),25_000);
 try {return await fetch(input,{...init,signal:controller.signal});} finally {clearTimeout(timer);upstream?.removeEventListener("abort",abort);}
}

export async function retryTransient<T>(work: () => Promise<T>, delays = [200, 800]): Promise<T> {
 for (let attempt = 0; ; attempt++) {
  try { return await work(); }
  catch (error) {
   const message = error instanceof Error ? error.message : String(error);
   if (attempt >= delays.length || !/abort|network|fetch|timeout|timed out|connection|502|503|504/i.test(message)) throw error;
   await new Promise(resolve => setTimeout(resolve, delays[attempt]));
  }
 }
}
