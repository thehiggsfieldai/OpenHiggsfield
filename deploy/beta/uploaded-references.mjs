export const referencePurposes=['product','character','brand','style'];
export function validateUploadedReferences(value=[]){
 if(!Array.isArray(value)||value.length>12)throw Error('Use up to 12 uploaded references.');
 return value.map(r=>{if(!r||typeof r.assetId!=='string'||!/^[a-f0-9-]{36}$/.test(r.assetId)||!referencePurposes.includes(r.purpose)||typeof r.notes!=='string'||r.notes.length>1200)throw Error('Invalid uploaded reference.');return{assetId:r.assetId,purpose:r.purpose,notes:r.notes,analysisId:typeof r.analysisId==='string'?r.analysisId:null};});
}
export async function referenceContext(value,{wid,readAsset,analysis}){
 const refs=validateUploadedReferences(value);if(refs.length&&!readAsset)throw Error('Uploaded references are unavailable.');
 return Promise.all(refs.map(async r=>{const asset=await readAsset(wid,r.assetId,false);const stored=r.analysisId?analysis(r.analysisId):null;const verified=stored?.assetId===r.assetId?stored:null;return{assetId:r.assetId,name:asset.name,type:asset.type,purpose:r.purpose,userNotes:r.notes,observations:verified?.summary||null,coverage:verified?.coverage||'User notes only; content not analysed'};}));
}
export async function analysisInput(d,{wid,readAsset}){
 if(d.referenceSharingAccepted!==true)throw Error('Approve sending this reference to OpenRouter for analysis.');
 if(!readAsset)throw Error('Reference analysis is unavailable.');
 const source=await readAsset(wid,d.assetId,false);const isVideo=source.type.startsWith('video/');
 const ids=isVideo?d.frameIds:[d.assetId];if(!Array.isArray(ids)||ids.length<1||ids.length>3||new Set(ids).size!==ids.length)throw Error('Prepare one to three sampled frames for video analysis.');
 const images=await Promise.all(ids.map(id=>readAsset(wid,id,true)));if(images.reduce((n,a)=>n+a.size,0)>6*1048576)throw Error('Analysis images must total at most 6 MB.');
 return{assetId:d.assetId,coverage:isVideo?`${images.length} sampled video frames only; audio, dialogue, full motion and unsampled moments not analysed`:'Uploaded image inspected; no performance or identity guarantee',images};
}
export function analysisResult(raw,input){const summary=raw?.choices?.[0]?.message?.content;if(typeof summary!=='string'||!summary.trim()||summary.length>6000)throw Error('Reference analysis returned an invalid response.');return{assetId:input.assetId,summary,coverage:input.coverage,analysedAt:Date.now(),costUsd:typeof raw.usage?.cost==='number'&&Number.isFinite(raw.usage.cost)&&raw.usage.cost>=0?raw.usage.cost:null};}
