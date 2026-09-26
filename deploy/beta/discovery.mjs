import {randomUUID} from 'node:crypto';
export function discoveryTarget(platform,query){
 if(!['youtube','tiktok'].includes(platform))throw Error('Choose YouTube or TikTok.');
 if(typeof query!=='string'||query.trim().length<2||query.length>160)throw Error('Enter a topic between 2 and 160 characters.');
 return {sku:platform==='youtube'?'youtube.search_shorts':'tiktok.search_keyword',input:platform==='youtube'?{query:query.trim(),sortBy:'popular'}:{query:query.trim(),sortBy:0,datePosted:0}};
}
export function normalizeDiscovery(raw,target){
 if(!raw.output||typeof raw.output.found!=='boolean')throw Error('Search did not return a completed result. Do not repeat a potentially billed request.');
 const rows=raw.output.data?.shorts??raw.output.data?.videos??[];
 if(!Array.isArray(rows))throw Error('Unsupported search response.');
 const results=rows.slice(0,30).flatMap(row=>{
  const youtube=target.sku==='youtube.search_shorts';let url;
  if(youtube&&/^[\w-]{11}$/.test(row.id||''))url='https://www.youtube.com/watch?v='+row.id;
  if(!youtube&&/^\d{5,30}$/.test(row.id||'')&&/^[\w.]{1,64}$/.test(row.author||''))url='https://www.tiktok.com/@'+row.author+'/video/'+row.id;
  if(!url)return [];
  const metrics={};for(const key of ['views','likes','comments','shares','saves'])if(!(key==='views'&&row.viewsAvailable===false)&&typeof row[key]==='number'&&Number.isFinite(row[key])&&row[key]>=0)metrics[key]=row[key];
  return [{id:randomUUID(),url,sku:target.sku,found:true,text:String(row.title??row.caption??'').slice(0,16000),metrics,coverage:'Search metadata only; video frames and spoken content not inspected',autoCaptions:null,retrievedAt:Date.now(),costUsd:null}];
 });
 return {results,costUsd:typeof raw.costUsd==='number'?raw.costUsd:null,found:raw.output.found,query:target.input.query,sku:target.sku};
}
