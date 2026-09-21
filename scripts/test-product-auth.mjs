import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {createProductAuth} from '../deploy/studio/auth.mjs';
const db=new DatabaseSync(':memory:');const messages=[];const origin='http://localhost:5198';
try{
const product=await createProductAuth({db,origin,secret:randomBytes(32).toString('hex'),email:true,allowSignup:true,sendEmail:async message=>messages.push(message)});
assert.equal(await product.identity(new Headers()),null);
const response=await product.auth.handler(new Request(origin+'/api/auth/sign-in/magic-link',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:'studio-test@example.invalid',callbackURL:'/studio'})}));
assert.equal(response.status,200,await response.text());assert.equal(messages.length,1);
const link=new URL(messages[0].url);const rawToken=link.searchParams.get('token');assert.ok(rawToken);
const verification=db.prepare('SELECT * FROM verification').all();assert.ok(!JSON.stringify(verification).includes(rawToken),'Magic token must be hashed at rest');
const verified=await product.auth.handler(new Request(link,{headers:{Origin:origin}}));assert.equal(verified.status,302);
const cookies=verified.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert.ok(cookies);
const identity=await product.identity(new Headers({Cookie:cookies}));assert.equal(identity.email,'studio-test@example.invalid');assert.equal(identity.emailVerified,true);
const repeated=await product.auth.handler(new Request(link,{headers:{Origin:origin}}));assert.ok(!repeated.headers.getSetCookie().some(c=>c.includes('session_token=')&&!c.includes('session_token=;')),'Used link must not create a second session');
const closedDb=new DatabaseSync(':memory:');let closedMessage;try{const closed=await createProductAuth({db:closedDb,origin,secret:randomBytes(32).toString('hex'),email:true,allowSignup:false,sendEmail:async m=>{closedMessage=m;}});await closed.auth.handler(new Request(origin+'/api/auth/sign-in/magic-link',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:'not-invited@example.invalid',callbackURL:'/studio'})}));if(closedMessage)await closed.auth.handler(new Request(closedMessage.url));assert.equal(closedDb.prepare('SELECT COUNT(*) AS count FROM user').get().count,0,'Closed signup must not create an account');}finally{closedDb.close();}
console.log('PASS: standalone auth schema, signed-out isolation, mocked magic-link delivery, hashed token, verified identity and single-use link.');
}finally{db.close();}
