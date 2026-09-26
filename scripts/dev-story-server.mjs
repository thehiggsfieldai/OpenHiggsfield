import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
const dataDir=path.resolve('.studio-data/story-preview');await mkdir(dataDir,{recursive:true});const secretFile=path.join(dataDir,'auth.key');let secret;try{secret=await readFile(secretFile,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;secret=randomBytes(48).toString('hex');await writeFile(secretFile,secret,{flag:'wx',mode:0o600});}
Object.assign(process.env,{PORT:'5194',HOST:'127.0.0.1',PUBLIC_ORIGIN:'http://127.0.0.1:5193',DATA_DIR:dataDir,BETTER_AUTH_SECRET:secret,AUTH_TEST_MODE:'true',ALLOW_SIGNUP:'true',APP_NAME:'TheHiggsField Story Studio'});
const bundledFfmpeg=path.resolve('output/launch-film/tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe');
if(!process.env.FFMPEG_PATH){try{await readFile(bundledFfmpeg);process.env.FFMPEG_PATH=bundledFfmpeg;}catch{}}
await import('../deploy/studio/server.mjs');
