export type WorkspaceEvent={id:string;kind:string;message:string;createdAt:string;projectId?:string};
export type PrivateWorkspaceState={ownerId:string;resetEpoch:number;sampledAt:string;storageBytes:number;databaseBytes:number;records:number;objects:number;activeUsers:number;registeredUsers:number;projects:number;archivedProjects:number;events:WorkspaceEvent[]};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parsePrivateWorkspaceState(value:unknown):PrivateWorkspaceState|null{
 if(!value||typeof value!=='object')return null;const row=value as Record<string,unknown>;
 const keys=['reset_epoch','storage_bytes','database_bytes','records','objects','active_users','registered_users','projects','archived_projects'];
 const values=keys.map(key=>typeof row[key]==='number'?row[key] as number:typeof row[key]==='string'&&/^\d+$/.test(row[key] as string)?Number(row[key]):NaN);if(keys.some(key=>row[key]===null||row[key]===undefined)||values.some(v=>!Number.isSafeInteger(v)||v<0)||!uuid.test(String(row.owner_id))||!Number.isFinite(Date.parse(String(row.sampled_at)))||!Array.isArray(row.events))return null;
 const events:WorkspaceEvent[]=[];
 for(const raw of row.events.slice(0,30)){if(!raw||typeof raw!=='object')return null;const event=raw as Record<string,unknown>;if(typeof event.kind!=='string'||typeof event.message!=='string'||!Number.isFinite(Date.parse(String(event.created_at)))||event.project_id&&!uuid.test(String(event.project_id)))return null;events.push({id:String(event.id),kind:event.kind,message:event.message,createdAt:String(event.created_at),...(event.project_id?{projectId:String(event.project_id)}:{})});}
 return {ownerId:String(row.owner_id),sampledAt:String(row.sampled_at),resetEpoch:values[0],storageBytes:values[1],databaseBytes:values[2],records:values[3],objects:values[4],activeUsers:values[5],registeredUsers:values[6],projects:values[7],archivedProjects:values[8],events};
}
export function shouldPurgeRecovery(stored:string|null,epoch:number):boolean{
 if(!Number.isSafeInteger(epoch)||epoch<0)throw new Error('Invalid cloud reset generation');const local=stored===null?0:Number(stored);if(!Number.isSafeInteger(local)||local<0)throw new Error('Invalid local reset generation');if(local>epoch)throw new Error('Cloud reset generation moved backwards; local recovery is preserved');return local<epoch;
}
export async function enforceResetEpoch(owner:string,epoch:number){
 if(!uuid.test(owner))throw new Error('Invalid workspace owner');const key='preframe-reset-epoch:'+owner;const stored=localStorage.getItem(key);if(!shouldPurgeRecovery(stored,epoch)){localStorage.setItem(key,String(epoch));return;}
 const names=new Set(['preframe-tools-v1','preframe-pending-v1','preframe-local-v1','preframe-media-v1','preframe-local-projects-v1']);
 const available=await indexedDB.databases();for(const info of available){if(!info.name||!names.has(info.name))continue;const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(info.name!);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Close other PREFRAME tabs to clear pre-reset recovery data'));});try{const stores=Array.from(db.objectStoreNames);if(!stores.length)continue;await new Promise<void>((resolve,reject)=>{const tx=db.transaction(stores,'readwrite');for(const store of stores){const cursor=tx.objectStore(store).openCursor();cursor.onsuccess=()=>{const item=cursor.result;if(!item)return;const value=item.value;if(value?.ownerId===owner||String(value?.scope||'').startsWith(owner+':')||String(value?.key||'').startsWith(owner+':'))item.delete();item.continue();};}tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Recovery reset interrupted'));});}finally{db.close();}}
 localStorage.setItem(key,String(epoch));
}
export function privateTelemetryMessage(message:string){return message.replace(/https?:[^\s]+/g,'[URL]').replace(/(?:Bearer\s+|sb_secret_|eyJ)[A-Za-z0-9_.-]+/g,'[redacted]').slice(0,240);}

export function syncTelemetryTransition(wasFailed:boolean,isFailed:boolean):"sync_error"|"sync_restored"|undefined{return wasFailed===isFailed?undefined:isFailed?"sync_error":"sync_restored";}
