import {readFile,writeFile,stat,unlink} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
const execute=promisify(execFile);
export const ffmpegPath=()=>process.env.FFMPEG_PATH||'ffmpeg';
export async function converterReady(){try{await execute(ffmpegPath(),['-version'],{windowsHide:true,timeout:10000});return true;}catch{return false;}}
export async function assembleFilm(directory,scenes){
 const normalized=[];
 for(let i=0;i<scenes.length;i++){
  const output=path.join(directory,'normalized-'+i+'.mp4');
  // Every input is a locally persisted provider clip, never a URL or user-supplied path.
  try{await execute(ffmpegPath(),['-y','-nostdin','-v','error','-protocol_whitelist','file,pipe','-f','mov','-i',path.join(directory,'clip-'+i+'.mp4'),'-map','0:v:0','-map','0:a:0','-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=24,tpad=stop_mode=clone:stop_duration=10','-af','apad','-t',String(scenes[i].duration),'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-threads','2','-c:a','aac','-ar','48000','-ac','2','-movflags','+faststart',output],{windowsHide:true,timeout:180000,maxBuffer:1048576});}catch{throw Error('A scene could not be assembled with audio. The saved clips are retained; check the source clip before retrying export.');}
  normalized.push('file normalized-'+i+'.mp4');
 }
 await writeFile(path.join(directory,'concat.txt'),normalized.join('\n'));
 const final=path.join(directory,'film.mp4');
 await execute(ffmpegPath(),['-y','-nostdin','-v','error','-protocol_whitelist','file,pipe','-f','concat','-safe','1','-i',path.join(directory,'concat.txt'),'-c','copy','-movflags','+faststart',final],{windowsHide:true,timeout:180000,maxBuffer:1048576});
 const info=await execute(ffmpegPath(),['-hide_banner','-i',final,'-f','null','-'],{windowsHide:true,timeout:60000,maxBuffer:1048576});
 const m=info.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);const seconds=m?Number(m[1])*3600+Number(m[2])*60+Number(m[3]):0;
 if(Math.abs(seconds-60)>.3)throw Error('Export duration verification failed. The six source clips are retained.');
 const size=(await stat(final)).size;if(size>200*1048576)throw Error('Export exceeds the 200 MB limit.');
 for(let i=0;i<scenes.length;i++)await unlink(path.join(directory,'normalized-'+i+'.mp4')).catch(()=>{});
 return {seconds,size};
}

export async function sceneThumbnail(directory,index){const file=path.join(directory,'thumb-'+index+'.jpg');try{await stat(file);return file;}catch{}await execute(ffmpegPath(),['-y','-nostdin','-v','error','-protocol_whitelist','file,pipe','-ss','1','-i',path.join(directory,'clip-'+index+'.mp4'),'-frames:v','1','-vf','scale=480:-2','-q:v','3',file],{windowsHide:true,timeout:30000,maxBuffer:1048576});return file;}
