import {putAsset,removeAsset,getAsset,setRemoteAssetLoader,type LocalAsset} from './local-assets';
export type SavedMedia={id:string;name:string;type:string;size:number;created_at?:number;tags?:string[];archived?:boolean;origin?:'generated'|'export'|'upload'};
export type ExportJob={id:string;state:string;asset_id:string|null;error:string|null};
let workspace='';
export function useMediaWorkspace(id:string){workspace=id;const target=id;setRemoteAssetLoader(async assetId=>{const r=await fetch('/api/media/'+encodeURIComponent(assetId),{headers:{'X-Workspace-Id':target}});if(!r.ok)return undefined;const blob=await r.blob();return{id:assetId,name:'Workspace media',type:blob.type,blob,cloud:true};});}
async function response(r:Response){const d=await r.json() as {error?:string;asset:SavedMedia;assets:SavedMedia[];job:ExportJob;jobs:ExportJob[]};if(!r.ok)throw Error(d.error||'Media request failed.');return d;}
export async function listMedia():Promise<SavedMedia[]>{return (await response(await fetch('/api/media',{headers:{'X-Workspace-Id':workspace}}))).assets;}
export async function saveMedia(blob:Blob,name:string):Promise<LocalAsset>{const d=await response(await fetch('/api/media',{method:'POST',headers:{'X-Workspace-Id':workspace,'Content-Type':blob.type,'X-File-Name':name.replace(/[^\x20-\x7e]/g,'_')},body:blob}));const asset={...d.asset,blob,cloud:true};await putAsset(asset);return asset;}
export async function convertMedia(sourceId:string):Promise<ExportJob>{return (await response(await fetch('/api/media/exports',{method:'POST',headers:{'X-Workspace-Id':workspace,'Content-Type':'application/json'},body:JSON.stringify({sourceId})}))).job;}
export async function exportJobs():Promise<ExportJob[]>{return (await response(await fetch('/api/media/exports',{headers:{'X-Workspace-Id':workspace}}))).jobs;}
export async function deleteMedia(id:string){await response(await fetch('/api/media/'+encodeURIComponent(id),{method:'DELETE',headers:{'X-Workspace-Id':workspace}}));await removeAsset(id);}

export async function importGeneration(jobId:string):Promise<SavedMedia>{return (await response(await fetch('/api/media/import',{method:'POST',headers:{'X-Workspace-Id':workspace,'Content-Type':'application/json'},body:JSON.stringify({jobId})}))).asset;}

export async function retryExport(id:string):Promise<ExportJob>{return (await response(await fetch('/api/media/exports/retry',{method:'POST',headers:{'X-Workspace-Id':workspace,'Content-Type':'application/json'},body:JSON.stringify({id})}))).job;}

export async function updateMedia(id:string,metadata:{name:string;tags:string[];archived:boolean}){const result=(await response(await fetch('/api/media/'+encodeURIComponent(id),{method:'PATCH',headers:{'X-Workspace-Id':workspace,'Content-Type':'application/json'},body:JSON.stringify(metadata)}))).asset;const cached=await getAsset(id);if(cached)await putAsset({...cached,name:result.name});return result;}
