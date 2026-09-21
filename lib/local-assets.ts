let activeScope:string|undefined;
let remoteLoader:((id:string)=>Promise<LocalAsset|undefined>)|undefined;
export function setRemoteAssetLoader(loader:(id:string)=>Promise<LocalAsset|undefined>){remoteLoader=loader;}
export function setAssetScope(scope:string){activeScope=scope;}
export type LocalAsset={id:string;name:string;type:string;blob:Blob;cloud?:boolean;scope?:string};
function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('thehiggsfield-builder',1);r.onupgradeneeded=()=>r.result.createObjectStore('assets',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function putAsset(asset:LocalAsset){const scope=activeScope;const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({...asset,...(scope?{scope}:{})});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
async function cachedAsset(id:string){const scope=activeScope;const db=await database();try{return await new Promise<LocalAsset|undefined>((resolve,reject)=>{const r=db.transaction('assets').objectStore('assets').get(id);r.onsuccess=()=>resolve(r.result?.scope!==scope?undefined:r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}
export async function allAssets(){const scope=activeScope;const db=await database();try{return await new Promise<LocalAsset[]>((resolve,reject)=>{const r=db.transaction('assets').objectStore('assets').getAll();r.onsuccess=()=>resolve(r.result.filter((a:LocalAsset)=>a.scope===scope));r.onerror=()=>reject(r.error);});}finally{db.close();}}
export async function removeAsset(id:string){const scope=activeScope;const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('assets','readwrite');const store=tx.objectStore('assets');const request=store.get(id);request.onsuccess=()=>{if(request.result?.scope===scope)store.delete(id);};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
export function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}

export async function getAsset(id:string){const scope=activeScope,loader=remoteLoader;const cached=await cachedAsset(id);if(cached)return cached;const remote=await loader?.(id);if(activeScope!==scope)return undefined;if(remote)await putAsset(remote);return remote;}
