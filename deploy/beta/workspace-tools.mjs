import {randomUUID} from 'node:crypto';
const tones=['Clear & confident','Playful','Minimal','Bold'];
export function brandDocument(value){
 const v=value||{};const text=(k,max,required=false)=>{if(typeof v[k]!=='string'||v[k].length>max||required&&!v[k].trim())throw Error('Invalid brand '+k+'.');return v[k].trim();};
 const name=text('name',100,true),description=text('description',2000),guidelines=text('guidelines',3000);
 if(!/^#[a-f0-9]{6}$/i.test(v.accent)||!/^#[a-f0-9]{6}$/i.test(v.background)||!tones.includes(v.tone)||!['Manrope','Arial','Georgia'].includes(v.font))throw Error('Choose valid brand colours, tone and font.');
 if(v.logoId&& !/^[a-f0-9-]{36}$/.test(v.logoId))throw Error('Choose a workspace logo.');
 return{name,description,guidelines,accent:v.accent,background:v.background,tone:v.tone,font:v.font,logoId:v.logoId||null,archived:v.archived===true};
}
export function workspaceUsage(db,wid,days=30,now=Date.now()){
 if(![7,30,90].includes(days))throw Error('Choose a 7, 30 or 90 day range.');
 const start=new Date(now);start.setUTCHours(0,0,0,0);start.setUTCDate(start.getUTCDate()-(days-1));const since=start.getTime();
 const rows=db.prepare('SELECT id,type,status,result,created_at FROM studio_actions WHERE workspace_id=? AND created_at>=? AND created_at<=? ORDER BY created_at DESC').all(wid,since,now);
 const daily=Array.from({length:days},(_,i)=>({date:new Date(since+i*86400000).toISOString().slice(0,10),requests:0,reportedCostUsd:0,unreported:0}));const byType={};let reportedCostUsd=0,reportedCostCount=0;const outcomes={};
 const activities=rows.map(row=>{let result={};try{result=JSON.parse(row.result||'{}');}catch{}const cost=typeof result.costUsd==='number'&&Number.isFinite(result.costUsd)&&result.costUsd>=0?result.costUsd:null;const status=row.type==='video'&&row.status==='completed'?(result.status==='completed'?'ready':['failed','nsfw','canceled'].includes(result.status)?'failed':'processing'):row.status;outcomes[status]=(outcomes[status]||0)+1;byType[row.type]=(byType[row.type]||0)+1;const day=daily.find(d=>d.date===new Date(row.created_at).toISOString().slice(0,10));if(day){day.requests++;if(cost===null)day.unreported++;else day.reportedCostUsd+=cost;}if(cost!==null){reportedCostUsd+=cost;reportedCostCount++;}return{id:row.id,type:row.type,status,createdAt:row.created_at,costUsd:cost,provider:typeof result.provider==='string'?result.provider:null};});
 const exists=name=>Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name));const storage=exists('studio_media')?db.prepare("SELECT COUNT(*) AS files,COALESCE(SUM(size),0) AS bytes FROM studio_media WHERE workspace_id=?").get(wid):{files:0,bytes:0};
 const mediaTypes=exists('studio_media')?db.prepare("SELECT CASE WHEN type LIKE 'video/%' THEN 'video' WHEN type LIKE 'image/%' THEN 'image' ELSE 'audio' END AS type,COUNT(*) AS files,SUM(size) AS bytes FROM studio_media WHERE workspace_id=? AND state='ready' GROUP BY 1").all(wid):[];
 return{days,since,until:now,requests:rows.length,reportedCostUsd,reportedCostCount,unreportedCostCount:rows.length-reportedCostCount,outcomes,byType,daily,activities,storage:{...storage,quotaBytes:500*1048576,types:mediaTypes},costNote:'Provider-reported amounts only, not your full invoice or a spending cap. Unreported requests may still have been billed. Activity dates are UTC; storage is current.'};
}
export function createWorkspaceTools(db,{readAsset}){
 db.exec('CREATE TABLE IF NOT EXISTS studio_brands(id TEXT NOT NULL,workspace_id TEXT NOT NULL,document TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(workspace_id,id))');
 return async(route,req,res,wid,body,reply,url)=>{
  if(route==='usage'){if(req.method!=='GET'){reply(res,405,{error:'Method not allowed.'});return true;}reply(res,200,workspaceUsage(db,wid,Number(url.searchParams.get('days')||30)));return true;}
  if(route!=='brands')return false;
  if(req.method==='GET'){reply(res,200,{brands:db.prepare('SELECT id,document,updated_at FROM studio_brands WHERE workspace_id=? ORDER BY updated_at DESC').all(wid).map(r=>({id:r.id,...JSON.parse(r.document),updatedAt:r.updated_at}))});return true;}
  if(req.method!=='PUT'){reply(res,405,{error:'Method not allowed.'});return true;}
  const data=await body(req),document=brandDocument(data);const id=data.id||randomUUID();if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid brand ID.');if(document.logoId){const asset=await readAsset?.(wid,document.logoId,false);if(!asset?.type.startsWith('image/'))throw Error('Choose a logo image from this workspace.');}
  const existing=db.prepare('SELECT id FROM studio_brands WHERE id=? AND workspace_id=?').get(id,wid);if(!existing&&db.prepare('SELECT COUNT(*) AS n FROM studio_brands WHERE workspace_id=?').get(wid).n>=30)throw Error('Keep up to 30 brand kits in a workspace.');
  db.prepare('INSERT INTO studio_brands VALUES (?,?,?,?) ON CONFLICT(workspace_id,id) DO UPDATE SET document=excluded.document,updated_at=excluded.updated_at').run(id,wid,JSON.stringify(document),Date.now());reply(res,200,{brand:{id,...document,updatedAt:Date.now()}});return true;
 };
}
