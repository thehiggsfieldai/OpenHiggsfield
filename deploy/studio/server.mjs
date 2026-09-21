import {createAccount} from './account.mjs';
import {createMedia} from './media.mjs';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import {createProductAuth} from './auth.mjs';
import {createStudio} from '../beta/studio-api.mjs';
import {createWorkspaces} from '../beta/workspaces.mjs';
process.umask(0o077);
const origin=process.env.PUBLIC_ORIGIN||'http://localhost:3000';
const dataDir=path.resolve(process.env.DATA_DIR||'.studio-data');await mkdir(dataDir,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,'platform.sqlite'));db.exec('PRAGMA journal_mode=WAL');
const email=Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM);
const product=await createProductAuth({db,origin,secret:process.env.BETTER_AUTH_SECRET,appName:process.env.APP_NAME||'Creative Studio',allowSignup:process.env.ALLOW_SIGNUP==='true',invitedEmails:(process.env.SIGNUP_EMAILS||'').split(','),google:{clientId:process.env.GOOGLE_CLIENT_ID,clientSecret:process.env.GOOGLE_CLIENT_SECRET},email,sendEmail:async({to,url,appName})=>{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[to],subject:appName+' sign-in',text:'Sign in using this link within 10 minutes:\n'+url}),redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Email delivery failed.');}});
// Workspace member directory contains product identities only, never marketing leads.
db.exec('CREATE TABLE IF NOT EXISTS platform_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE)');
const workspaces=createWorkspaces(db);
const media=createMedia(db,{dataDir,origin,workspaces,authorized:req=>req.studioUser?.id});
const studio=createStudio(db,{origin,dataDir,workspaces,authorized:req=>req.studioUser?.id,shareAsset:media.shareAsset,readReferenceAsset:media.readReferenceAsset});
const account=createAccount(db,{dataDir,origin,workspaces});
const authHandler=toNodeHandler(product.auth);const root=path.resolve(process.env.STUDIO_ASSETS||'.sites-runtime/studio-release/site');
const assets=new Map([['/studio','studio.html'],['/studio/','studio.html'],['/studio.js','studio.js'],['/studio.css','studio.css'],['/fonts/manrope-400.ttf','fonts/manrope-400.ttf'],['/fonts/manrope-800.ttf','fonts/manrope-800.ttf']]);
function legalUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');try{const url=new URL(req.url,origin);
 if(['/signin','/signin.js','/signin.css'].includes(url.pathname)){if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed.'});const file=url.pathname==='/signin'?'signin.html':url.pathname.slice(1);const data=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'text/javascript','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});return res.end(req.method==='HEAD'?undefined:data);}
 if(url.pathname==='/health')return json(res,200,{ok:true});
 if(url.pathname==='/api/config')return json(res,200,{name:process.env.APP_NAME||'Creative Studio',auth:product.capabilities,termsUrl:legalUrl(process.env.TERMS_URL),privacyUrl:legalUrl(process.env.PRIVACY_URL)});
 if(url.pathname.startsWith('/api/auth/'))return await authHandler(req,res);
 if(url.pathname==='/'){res.writeHead(302,{Location:'/studio'});return res.end();}
 if(url.pathname.startsWith('/api/media/shared/'))return await media.shared(req,res,url);
 req.studioUser=await product.identity(fromNodeHeaders(req.headers));
 if(!req.studioUser&&['/studio','/studio/'].includes(url.pathname)){res.writeHead(302,{Location:'/signin'});return res.end();}
 if(!req.studioUser)return json(res,401,{error:'Sign in to Creative Studio.',code:'SIGN_IN_REQUIRED'});
 db.prepare('INSERT INTO platform_users VALUES (?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email').run(req.studioUser.id,req.studioUser.email.toLowerCase());
 if(url.pathname.startsWith('/api/account/'))return await account(req,res,url,req.studioUser);
 if(url.pathname==='/api/session')return json(res,200,{user:{id:req.studioUser.id,email:req.studioUser.email}});
 if(url.pathname==='/api/workspaces'||url.pathname.startsWith('/api/workspaces/'))return await workspaces.handle(req,res,url,req.studioUser.id,origin);
 if(url.pathname==='/api/media'||url.pathname.startsWith('/api/media/'))return await media.handle(req,res,url);
 if(url.pathname.startsWith('/api/studio/'))return await studio(req,res,url);
 if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed.'});
 const asset=assets.get(url.pathname);if(!asset)return json(res,404,{error:'Not found.'});
 const data=await readFile(path.join(root,asset));res.writeHead(200,{'Content-Type':asset.endsWith('.html')?'text/html; charset=utf-8':asset.endsWith('.css')?'text/css':asset.endsWith('.ttf')?'font/ttf':'text/javascript','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});res.end(req.method==='HEAD'?undefined:data);
 }catch{if(!res.headersSent)json(res,500,{error:'Request could not be completed.'});else res.destroy();}}).listen(Number(process.env.PORT)||3000,process.env.HOST||'127.0.0.1',()=>console.log('Standalone Creative Studio server ready.'));
