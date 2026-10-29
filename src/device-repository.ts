import type {Project,Identity} from './domain.js';
import type {ProjectRepository,WriteResult} from './repository.js';
import {clearToolData} from './tool-data.js';
type LocalProject=Project & {archivedAt?:string};
export function deviceProjectLimit(projects:LocalProject[]){return projects.length<1;}
export class DeviceRepository implements ProjectRepository {
 constructor(readonly owner:string,readonly name:string){}
 async getIdentity():Promise<Identity>{return {profile:{id:this.owner,displayName:this.name,tier:'free'},isAdmin:false};}
 private async db(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('preframe-device-projects-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 private async transact<T>(mode:IDBTransactionMode,operation:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const db=await this.db();return new Promise((resolve,reject)=>{const tx=db.transaction('projects',mode),r=operation(tx.objectStore('projects'));let value:T;r.addEventListener('success',()=>{value=r.result;});tx.oncomplete=()=>{db.close();resolve(value);};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||new Error('Device storage failed'));};});}
 async all(){return (await this.transact('readonly',s=>s.getAll()) as LocalProject[]).filter(p=>p.ownerId===this.owner);}
 async listProjects(){return (await this.all()).filter(p=>!p.archivedAt);}
 async getProject(id:string){return (await this.listProjects()).find(p=>p.id===id)||null;}
 async createProject(title:string){if(!deviceProjectLimit(await this.all()))throw Error('This version supports one project, including Recycle bin. Export and remove an old project to start another.');title=title.trim();if(!title)throw Error('Enter a project name.');const p:Project={id:crypto.randomUUID(),ownerId:this.owner,title,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,revision:1,updatedAt:new Date().toISOString()};await this.transact('readwrite',s=>{const r=s.getAll();r.onsuccess=()=>{if(!deviceProjectLimit((r.result as Project[]).filter(p=>p.ownerId===this.owner))){s.transaction.abort();return;}s.put(p);};return r;});return p.id;}
 async saveProject(project:Project,expectedRevision:number):Promise<WriteResult<Project>>{if(project.ownerId!==this.owner)throw Error('Account mismatch');let result:WriteResult<Project>;await this.transact('readwrite',s=>{const r=s.get(project.id);r.onsuccess=()=>{const current=r.result as Project|undefined;if(!current||current.ownerId!==this.owner){s.transaction.abort();return;}if(current.revision!==expectedRevision){result={kind:'conflict',latest:{value:current,revision:current.revision}};return;}const value={...project,revision:current.revision+1,updatedAt:new Date().toISOString()};s.put(value);result={kind:'ok',value:{value,revision:value.revision}};};return r;});return result!;}
 async archive(id:string,restore=false){const p=(await this.all()).find(p=>p.id===id);if(!p)throw Error('Project unavailable');await this.transact('readwrite',s=>s.put({...p,archivedAt:restore?undefined:new Date().toISOString()}));}
 async purge(id:string){if(!(await this.all()).some(p=>p.id===id))throw Error('Project unavailable');await clearToolData(this.owner,id);await this.transact('readwrite',s=>s.delete(id));}
}

