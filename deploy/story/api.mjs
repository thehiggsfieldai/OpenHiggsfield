import sharp from 'sharp';
import {styles,characters,workflowStages} from './catalogue.mjs';
import {randomUUID} from 'node:crypto';
import {storySchema,newStory,estimateStory,languages,modes} from './domain.mjs';

export function createStoryStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS story_drafts(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,batch_id TEXT,revision INTEGER NOT NULL,document TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS story_workspace ON story_drafts(workspace_id,updated_at);
 CREATE TABLE IF NOT EXISTS story_batches(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,name TEXT NOT NULL,created_at INTEGER NOT NULL);`);
 const decode=row=>row?{id:row.id,batchId:row.batch_id,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,...JSON.parse(row.document)}:null;
 function get(wid,id){return decode(db.prepare('SELECT * FROM story_drafts WHERE workspace_id=? AND id=?').get(wid,id));}
 function create(wid,input,batchId=null){const doc=storySchema.parse(input),id=randomUUID(),now=Date.now();db.prepare('INSERT INTO story_drafts VALUES(?,?,?,?,?,?,?)').run(id,wid,batchId,1,JSON.stringify(doc),now,now);return get(wid,id);}
 function save(wid,id,revision,input){const doc=storySchema.parse(input),previous=get(wid,id);const result=db.prepare('UPDATE story_drafts SET document=?,revision=revision+1,updated_at=? WHERE workspace_id=? AND id=? AND revision=?').run(JSON.stringify(doc),Date.now(),wid,id,revision);if(result.changes!==1){const error=Error(get(wid,id)?'This story changed in another tab. Reload before saving.':'Story not found.');error.status=get(wid,id)?409:404;throw error;}if(previous&&previous.idea===doc.idea&&previous.language===doc.language&&previous.style===doc.style&&previous.planner?.characterId===doc.planner?.characterId&&previous.planner?.minutes===doc.planner?.minutes&&db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='story_film_plans'").get()){db.prepare('UPDATE story_film_plans SET revision=? WHERE workspace_id=? AND story_id=? AND revision=?').run(revision+1,wid,id,revision);}return get(wid,id);}
 function batch(wid,{name,titles,language='en',mode='economy'}){
  if(typeof name!=='string'||!name.trim()||name.length>120||!Array.isArray(titles)||titles.length<1||titles.length>100||titles.some(t=>typeof t!=='string'||!t.trim()||t.length>120))throw Error('Name your collection and supply between 1 and 100 story titles.');
  const normalized=titles.map(t=>t.trim());if(new Set(normalized.map(t=>t.toLowerCase())).size!==normalized.length)throw Error('Use a different title for each story.');
  const docs=normalized.map(title=>newStory({title,language,mode}));const id=randomUUID();
  db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO story_batches VALUES(?,?,?,?)').run(id,wid,name.trim(),Date.now());const stories=docs.map(doc=>create(wid,doc,id));db.exec('COMMIT');return{id,name:name.trim(),stories};}catch(error){db.exec('ROLLBACK');throw error;}
 }
 return {get,create,save,batch,list:wid=>db.prepare('SELECT * FROM story_drafts WHERE workspace_id=? ORDER BY updated_at DESC LIMIT 1000').all(wid).map(decode)};
}
export function createCharacterStore(db){
 db.exec('CREATE TABLE IF NOT EXISTS story_characters(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,name TEXT NOT NULL,image BLOB NOT NULL,created_at INTEGER NOT NULL)');
 const get=(wid,id)=>db.prepare('SELECT * FROM story_characters WHERE workspace_id=? AND id=?').get(wid,id);
 const list=wid=>db.prepare('SELECT id,name FROM story_characters WHERE workspace_id=? ORDER BY created_at DESC').all(wid);
 return {get,list,async add(wid,name,bytes){if(list(wid).length>=50)throw Error('You can upload up to 50 characters.');const image=sharp(bytes,{limitInputPixels:25000000,animated:false});const meta=await image.metadata();if(!['png','jpeg','webp'].includes(meta.format)||meta.pages>1)throw Error('Choose a PNG, JPG or WebP image.');const out=await image.rotate().resize({width:1400,height:1400,fit:'inside',withoutEnlargement:true}).webp({quality:92}).toBuffer();const id='upload-'+randomUUID();db.prepare('INSERT INTO story_characters VALUES(?,?,?,?,?)').run(id,wid,name,out,Date.now());return{id,name};}};
}
export function createStories(db,{origin,workspaces,voices=[],rates={}}){
 const store=createStoryStore(db),uploads=createCharacterStore(db);
 const reply=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 return async(req,res,url)=>{
  const user=req.studioUser?.id;if(!user)return reply(res,401,{error:'Sign in first.'});
  const workspace=workspaces.scope(req,user);if(!workspace)return reply(res,403,{error:'Workspace access denied.'});
  if(req.method!=='GET'&&(req.headers.origin!==origin||workspace.role==='viewer'))return reply(res,403,{error:'You cannot change stories in this workspace.'});
  try{
   const route=url.pathname.slice('/api/stories'.length);
   if(route==='/characters'&&req.method==='GET')return reply(res,200,{characters:uploads.list(workspace.id)});
   const imageMatch=/^\/characters\/(upload-[a-f0-9-]{36})\/image$/.exec(route);if(imageMatch&&req.method==='GET'){const row=uploads.get(workspace.id,imageMatch[1]);if(!row)return reply(res,404,{error:'Character not found.'});res.writeHead(200,{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});return res.end(Buffer.from(row.image));}
   if(route==='/characters'&&req.method==='POST'){let text='';for await(const part of req){text+=part;if(Buffer.byteLength(text)>12000000)return reply(res,413,{error:'Choose an image smaller than 8 MB.'});}const data=JSON.parse(text);if(typeof data.name!=='string'||!data.name.trim()||data.name.length>80||typeof data.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data.image))throw Error('Add a name and a PNG, JPG or WebP image.');const bytes=Buffer.from(data.image.split(',')[1],'base64');if(bytes.length>8*1024*1024)return reply(res,413,{error:'Choose an image smaller than 8 MB.'});return reply(res,201,{character:await uploads.add(workspace.id,data.name.trim(),bytes)});}
   if(/^\/[0-9a-f-]{36}$/.test(route)&&req.method==='DELETE'){const id=route.slice(1);if(!store.get(workspace.id,id))return reply(res,404,{error:'Story not found.'});db.prepare('DELETE FROM story_drafts WHERE workspace_id=? AND id=?').run(workspace.id,id);if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='story_film_plans'").get())db.prepare('DELETE FROM story_film_plans WHERE workspace_id=? AND story_id=?').run(workspace.id,id);return reply(res,200,{deleted:true});}
   if(route==='/config'&&req.method==='GET')return reply(res,200,{languages,modes,styles,characters,workflowStages,voices,rates,generationAvailable:false});
   if(route===''&&req.method==='GET')return reply(res,200,{stories:store.list(workspace.id)});
   if(route.startsWith('/')&&req.method==='GET'){const story=store.get(workspace.id,route.slice(1));return reply(res,story?200:404,story?{story}:{error:'Story not found.'});}
   let body='';for await(const part of req){body+=part;if(Buffer.byteLength(body)>200000)return reply(res,413,{error:'Story is too large.'});}const data=body?JSON.parse(body):{};
   if(route===''&&req.method==='POST')return reply(res,201,{story:store.create(workspace.id,data)});
   if(route==='/batch'&&req.method==='POST')return reply(res,201,{batch:store.batch(workspace.id,data)});
   if(route==='/estimate'&&req.method==='POST')return reply(res,200,{estimate:estimateStory(data,rates)});
   if(/^\/[0-9a-f-]{36}$/.test(route)&&req.method==='PUT')return reply(res,200,{story:store.save(workspace.id,route.slice(1),data.revision,data.document)});
   return reply(res,404,{error:'Not found.'});
  }catch(error){return reply(res,error.status||400,{error:error.issues?.[0]?.message||error.message||'Unable to save story.'});}
 };
}
