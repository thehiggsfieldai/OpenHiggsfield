import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import http from 'node:http';
import {mkdtemp,writeFile,mkdir,readFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import {randomBytes,randomUUID} from 'node:crypto';
import {createStoryFilms,starterPlan,filmEstimate} from '../deploy/story/films.mjs';
import {createStoryStore} from '../deploy/story/api.mjs';import {newStory} from '../deploy/story/domain.mjs';import {seal} from '../deploy/beta/vault.mjs';
const isFal=process.argv.includes('--fal');const optionId=process.argv.includes('--recommended')?'recommended':process.argv.includes('--budget')?'budget':'seedance';const h3=optionId!=='seedance';
const db=new DatabaseSync(':memory:'),dir=await mkdtemp(path.join(os.tmpdir(),'story-film-test-')),master=randomBytes(32);await writeFile(path.join(dir,'studio-master.key'),master);
db.exec('CREATE TABLE studio_credentials(workspace_id TEXT,provider TEXT,cipher TEXT,updated_at INTEGER,PRIMARY KEY(workspace_id,provider))');db.prepare('INSERT INTO studio_credentials VALUES(?,?,?,?)').run('alpha','higgsfield',seal({key:'test-key-id',secret:'test-secret'},master,'alpha','higgsfield'),Date.now());
db.prepare('INSERT INTO studio_credentials VALUES(?,?,?,?)').run('alpha','fal',seal({key:'fake-fal-key'},master,'alpha','fal'),Date.now());
const store=createStoryStore(db),story=store.create('alpha',{...newStory({title:'Pip and the Lost Star'}),idea:'Pip helps a lost star return home.',planner:{characterId:'pip',characterName:'Pip',minutes:1,kind:'cast'}});
let submits=0,downloads=0,assemblies=0,uncertain=false;const receipts=new Set();
const fetcher=async(url,options)=>{assert.ok(options.headers.Authorization.startsWith('Key '));if(isFal)assert.ok(url.startsWith('https://queue.fal.run/'+(h3?'minimax/h3-max/':'bytedance/seedance-2.0/')));if(options.method==='POST'){const input=JSON.parse(options.body);if(h3){assert.equal(input.duration,10);assert.equal(input.resolution,optionId==='budget'?'480P':'768P');assert.equal(input.prompt_expansion_mode,'disabled');assert.ok(input.reference_image_urls[0].startsWith('data:image/webp;base64,'));assert.ok(input.prompt.includes('Image 1'));assert.equal(input.image_urls,undefined);}else assert.ok(input.image_urls.length===1);submits++;if(uncertain)throw Error('Connection lost');const id=randomUUID();receipts.add(id);return Response.json({request_id:id,status:'queued'});}if(isFal){const id=url.split('/').at(url.endsWith('/status')?-2:-1);assert.ok(receipts.has(id));return url.endsWith('/status')?Response.json({status:'COMPLETED'}):Response.json({video:{url:'https://media.example.com/clip.mp4'}});}
const id=url.split('/').at(-2);assert.ok(receipts.has(id));return Response.json({request_id:id,status:'completed',video:{url:'https://media.example.com/clip.mp4'}});};
const handler=createStoryFilms(db,{origin:'http://studio.test',dataDir:dir,workspaces:{scope:req=>({id:req.headers['x-workspace']||'alpha',role:req.headers['x-role']||'owner'})},fetcher,autoWork:false,checkConverter:async()=>true,uploader:async()=> 'https://media.example.com/pip.webp',downloader:async(_url,file)=>{downloads++;const bytes=Buffer.from('0000ftyp-test-mp4');await writeFile(file,bytes);return{type:'video/mp4',head:bytes,size:bytes.length};},assembler:async(directory)=>{assemblies++;await writeFile(path.join(directory,'film.mp4'),Buffer.from('0000ftyp-final-film'));return {seconds:60,size:19};}});
const server=http.createServer((req,res)=>{if(req.headers['x-user'])req.studioUser={id:'test'};void handler.handle(req,res,new URL(req.url,'http://studio.test'));});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/api/story-films';
async function call(route='',method='GET',body,headers={}){const r=await fetch(base+route,{method,headers:{'x-user':'test',origin:'http://studio.test','Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});const text=await r.text();return{status:r.status,body:JSON.parse(text)};}
try{
 assert.equal((await fetch(base)).status,401);
 assert.equal((await call('/plan','POST',{storyId:story.id},{origin:'https://evil.test'})).status,403);
 assert.equal((await call('/plan','POST',{storyId:story.id},{'x-role':'viewer'})).status,403);
 assert.equal((await call('/plan','POST',{storyId:story.id},{'x-workspace':'beta'})).status,404);
 const plan=starterPlan(story);plan.scenes.forEach((scene,index)=>{scene.narration=['Pip found a star beside the path.','It had forgotten the way home.','He folded a leaf into a tiny boat.','A friendly breeze lifted them above the trees.','The moon welcomed the little star.','Pip smiled as the sky shone brighter.'][index];});const input={optionId,provider:isFal?'fal':'higgsfield',storyId:story.id,revision:1,plan,approve:true,approveReference:true,estimateUsd:filmEstimate(Date.now(),isFal?'fal':'higgsfield',optionId).usd};
 assert.equal((await call('','POST',{...input,approve:false})).status,400);
 assert.equal((await call('','POST',{...input,optionId:'invented'})).status,400);
 assert.equal((await call('','POST',{...input,estimateUsd:.01})).status,400);
 if(h3)assert.equal((await call('','POST',{...input,provider:'higgsfield'})).status,400);
 assert.equal((await call('/config')).body.options.find(o=>o.id==='recommended').estimate.usd,4.8);
 assert.equal((await call('','POST',{...input,revision:99})).status,409);
 assert.equal((await call('/plans/'+story.id,'PUT',{plan,revision:1})).status,200);
 assert.equal((await call('/plans/'+story.id)).body.plan.title,plan.title);
 const started=await call('','POST',input);assert.equal(started.status,202,JSON.stringify(started));const id=started.body.film.id;
 const duplicate=await call('','POST',input);assert.equal(duplicate.body.film.id,id);
 assert.equal((await call('/'+id,'GET',null,{'x-workspace':'beta'})).status,404);
 for(let i=0;i<14;i++)await handler.work();
 const done=(await call('/'+id)).body.film;assert.equal(done.state,'complete',JSON.stringify(done));assert.equal(submits,6);assert.equal(downloads,6);assert.equal(assemblies,1);assert.equal(done.scenes.length,6);assert.equal(done.optionId,optionId);assert.equal(done.estimate.usd,input.estimateUsd);assert.ok(!JSON.stringify(done).includes('test-secret'));assert.ok(!JSON.stringify(done).includes('media.example.com'));
 const range=await fetch(base+'/'+id+'/video',{headers:{'x-user':'test',Range:'bytes=0-7'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,8);
 const badRange=await fetch(base+'/'+id+'/video',{headers:{'x-user':'test',Range:'bytes=999-'}});assert.equal(badRange.status,416);
 uncertain=true;const next=await call('','POST',{...input,plan:{...plan,title:'Second story'}});const nextId=next.body.film.id;await handler.work();assert.equal((await call('/'+nextId)).body.film.state,'attention');await handler.work();assert.equal(submits,7);assert.equal((await call('/'+nextId+'/resume','POST',{})).status,400);
 const stopped=await call('/'+nextId+'/stop','POST',{});assert.equal(stopped.body.film.state,'stopped');const another=await call('','POST',{...input,plan:{...plan,title:'Another story'}});assert.equal(another.status,202);await handler.work();assert.equal((await call('/'+nextId)).body.film.state,'stopped');
 console.log('PASS: workspace isolation, CSRF, viewer restrictions, approval, stale drafts, script persistence, idempotent submission, six receipts, private media, byte ranges, assembly and uncertain-charge protection. No live paid requests.');
}finally{handler.close();await new Promise(r=>server.close(r));db.close();}
