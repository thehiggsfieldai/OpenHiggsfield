import {createHash,randomUUID} from 'node:crypto';
import {storySchema} from './domain.mjs';

// Plans are immutable snapshots. A changed draft requires a new plan and approval.
export function productionPlan(input){
 const story=storySchema.parse(input);
 if(!story.idea.trim())throw Error('Add a story topic.');
 const nodes=[{id:'script',kind:'script',depends:[]},{id:'continuity',kind:'continuity',depends:['script']},{id:'character',kind:'character',depends:['continuity']},{id:'portrait',kind:'portrait',depends:['character']}];
 for(const scene of story.scenes){const id=scene.id;nodes.push({id:'voice:'+id,kind:'voice',sceneId:id,depends:['continuity']},{id:'frame:'+id,kind:'frame',sceneId:id,depends:['portrait','voice:'+id]});}
 nodes.push({id:'review',kind:'review',depends:nodes.filter(n=>['frame','voice'].includes(n.kind)).map(n=>n.id)});
 for(const scene of story.scenes)nodes.push({id:'shot:'+scene.id,kind:'shot',sceneId:scene.id,depends:['review','frame:'+scene.id,'voice:'+scene.id]});
 nodes.push({id:'ending',kind:'ending',depends:['review']},{id:'mix',kind:'mix',depends:nodes.filter(n=>n.kind==='shot').map(n=>n.id)},{id:'export',kind:'export',depends:['mix','ending']},{id:'verify',kind:'verify',depends:['export']});
 const fingerprint=createHash('sha256').update(JSON.stringify(story)).digest('hex');return{story,fingerprint,nodes};
}
export function fitSpeech({duration,words=[]},scene){
 if(!Number.isFinite(duration)||duration<=0)throw Error('Speech must have a measured duration.');
 const available=scene.duration-.6;if(duration>available)throw Error('Speech exceeds this scene. Shorten the line and review the new recording before animation.');
 let previous=-1;for(const w of words){if(!w.text||!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<previous||w.end<=w.start||w.end>duration+.05)throw Error('Invalid speech word timing.');previous=w.end;}
 return{speechDuration:duration,leadIn:.3,tail:scene.duration-duration-.3,sceneDuration:scene.duration,words};
}
export function framePrompt(story,scene){return ['Create ONE film frame, not a contact sheet.',story.style,'Character identity: '+story.character.appearance,'Personality: '+story.character.personality,'Consistency: '+story.consistency,'Location: '+scene.location,'Action: '+scene.action,scene.visualPrompt,scene.delivery==='on-camera'?'Character faces the viewer; unobstructed expressive face and mouth, composed for spoken performance.':'Compose an expressive storytelling shot.', 'No captions, logos or title text.'].join('\n');}
export function createProductionStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS story_productions(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,story_id TEXT NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL,budget_micros INTEGER NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS story_steps(production_id TEXT NOT NULL,node_id TEXT NOT NULL,state TEXT NOT NULL,reserved_micros INTEGER NOT NULL DEFAULT 0,receipt TEXT,result TEXT,error TEXT,PRIMARY KEY(production_id,node_id));`);
 function get(workspace,id){const row=db.prepare('SELECT * FROM story_productions WHERE id=? AND workspace_id=?').get(id,workspace);if(!row)return null;const {document,...rest}=row;return{...rest,...JSON.parse(document),steps:db.prepare('SELECT * FROM story_steps WHERE production_id=?').all(id).map(s=>({...s,result:s.result?JSON.parse(s.result):null,receipt:s.receipt?JSON.parse(s.receipt):null}))};}
 function create(workspace,storyId,revision,input,budgetUsd){if(!Number.isFinite(budgetUsd)||budgetUsd<0||budgetUsd>10000)throw Error('Invalid production budget.');const plan=productionPlan(input),id=randomUUID();db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO story_productions VALUES(?,?,?,?,?,?,?)').run(id,workspace,storyId,revision,JSON.stringify(plan),Math.floor(budgetUsd*1e6),Date.now());for(const node of plan.nodes)db.prepare('INSERT INTO story_steps(production_id,node_id,state) VALUES(?,?,?)').run(id,node.id,'pending');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return get(workspace,id);}
 function begin(workspace,id,nodeId,costUsd){db.exec('BEGIN IMMEDIATE');try{const p=get(workspace,id);if(!p)throw Error('Production not found.');const node=p.nodes.find(n=>n.id===nodeId),step=p.steps.find(n=>n.node_id===nodeId);if(!node||step.state!=='pending')throw Error('Step cannot be submitted again.');if(node.depends.some(dep=>p.steps.find(s=>s.node_id===dep)?.state!=='complete'))throw Error('Complete the preceding stages first.');if(!Number.isFinite(costUsd)||costUsd<0)throw Error('Verified cost required.');const cost=Math.ceil(costUsd*1e6);if(p.steps.reduce((s,x)=>s+x.reserved_micros,0)+cost>p.budget_micros)throw Error('Production budget exceeded.');db.prepare("UPDATE story_steps SET state='submitting',reserved_micros=? WHERE production_id=? AND node_id=?").run(cost,id,nodeId);db.exec('COMMIT');return node;}catch(e){db.exec('ROLLBACK');throw e;}}
 function receipt(workspace,id,nodeId,value){if(!get(workspace,id))throw Error('Production not found.');if(!value?.requestId||typeof value.requestId!=='string')throw Error('Provider request ID required.');const saved={requestId:value.requestId,provider:String(value.provider||'unknown')};const r=db.prepare("UPDATE story_steps SET state='waiting',receipt=? WHERE production_id=? AND node_id=? AND state='submitting'").run(JSON.stringify(saved),id,nodeId);if(r.changes!==1)throw Error('Cannot attach this receipt.');}
 function complete(workspace,id,nodeId,result){if(!get(workspace,id))throw Error('Production not found.');const r=db.prepare("UPDATE story_steps SET state='complete',result=?,error=NULL WHERE production_id=? AND node_id=? AND state IN ('submitting','waiting')").run(JSON.stringify(result),id,nodeId);if(r.changes!==1)throw Error('Step is not active.');}
 function uncertain(workspace,id,nodeId){if(!get(workspace,id))throw Error('Production not found.');db.prepare("UPDATE story_steps SET state='needs-reconciliation',error='Provider outcome is uncertain. Check the saved receipt; do not resubmit automatically.' WHERE production_id=? AND node_id=? AND state IN ('submitting','waiting')").run(id,nodeId);}
 return{create,get,begin,receipt,complete,uncertain};
}

// Adapters are server-owned. The browser cannot supply endpoints or credentials.
export async function runProductionStep(store,{workspace,id,nodeId,adapter,estimateUsd}){
 if(!adapter||typeof adapter.execute!=='function')throw Error('This production capability is not configured.');
 const node=store.begin(workspace,id,nodeId,estimateUsd);const production=store.get(workspace,id);
 try{const result=await adapter.execute({node,production,saveReceipt:r=>store.receipt(workspace,id,nodeId,r)});if(result?.pending)return store.get(workspace,id);if(!result)throw Error('Production step returned no result.');store.complete(workspace,id,nodeId,result);return store.get(workspace,id);}catch(error){store.uncertain(workspace,id,nodeId);throw error;}
}
