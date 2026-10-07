export type AdminMetrics={storageBytes:number;activeUsers:number;registeredUsers:number};
export function parseAdminMetrics(value:unknown):AdminMetrics|null{
 const row=Array.isArray(value)?value[0]:value;if(!row||typeof row!=='object')return null;
 const metric=row as Record<string,unknown>;
 const keys=['storage_bytes','active_users','registered_users'];
 const values=keys.map(key=>typeof metric[key]==='number'?metric[key]:typeof metric[key]==='string'&&/^\d+$/.test(metric[key] as string)?Number(metric[key]):NaN);
 if(values.some(value=>!Number.isSafeInteger(value)||value<0))return null;
 return {storageBytes:values[0],activeUsers:values[1],registeredUsers:values[2]};
}
