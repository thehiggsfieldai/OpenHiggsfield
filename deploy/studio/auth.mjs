import {APIError} from 'better-auth/api';
import {betterAuth} from 'better-auth';
import {magicLink} from 'better-auth/plugins';
import {getMigrations} from 'better-auth/db/migration';

export async function createProductAuth({db,origin,secret,google,email,sendEmail,allowSignup=false,invitedEmails=[],appName='Creative Studio'}){
 if(typeof secret!=='string'||secret.length<32)throw Error('Configure an authentication secret of at least 32 characters.');
 const base=new URL(origin);if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Authentication requires an HTTPS origin.');
 db.exec('CREATE TABLE IF NOT EXISTS studio_account_state(user_id TEXT PRIMARY KEY,deactivated_at INTEGER NOT NULL)');
 const invited=new Set(invitedEmails.map(v=>v.trim().toLowerCase()).filter(Boolean));const signupEnabled=allowSignup||invited.size>0;
 const plugins=[];
 if(email&&sendEmail)plugins.push(magicLink({disableSignUp:!signupEnabled,expiresIn:600,storeToken:'hashed',sendMagicLink:async({email:to,url})=>sendEmail({to,url,appName})}));
 const options={user:{deleteUser:{enabled:false}},databaseHooks:{session:{create:{before:async session=>{if(db.prepare('SELECT user_id FROM studio_account_state WHERE user_id=?').get(session.userId))throw new APIError('FORBIDDEN',{message:'This account is deactivated. Contact the installation operator.'});return {data:session};}}},user:{create:{before:async user=>{if(!allowSignup&&!invited.has(user.email.toLowerCase()))throw new APIError('FORBIDDEN',{message:'This installation is invitation only.'});return {data:user};}}}},appName,baseURL:base.origin,secret,database:db,trustedOrigins:[base.origin],logger:{disabled:true},rateLimit:{enabled:true,storage:'database',window:60,max:30,customRules:{'/sign-in/magic-link':{window:60,max:3}}},session:{expiresIn:604800,updateAge:86400},account:{accountLinking:{enabled:false}},socialProviders:google?.clientId&&google?.clientSecret?{google:{...google,disableSignUp:!signupEnabled}}:{},plugins};
 const migration=await getMigrations(options);await migration.runMigrations();
 const auth=betterAuth(options);
 return {auth,capabilities:{google:Boolean(google?.clientId&&google?.clientSecret),email:Boolean(email&&sendEmail),signup:allowSignup},async identity(headers){const session=await auth.api.getSession({headers});return session?.user?.emailVerified&&!db.prepare('SELECT user_id FROM studio_account_state WHERE user_id=?').get(session.user.id)?session.user:null;}};
}

