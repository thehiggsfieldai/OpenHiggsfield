import {saveMedia} from './studio-media';
// Local sampling sends no data to a model. Derivatives remain workspace-private.
export async function sampleReferenceVideo(blob:Blob):Promise<string[]>{
 const url=URL.createObjectURL(blob);const video=document.createElement('video');video.muted=true;video.preload='auto';
 try{await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Video preview timed out.')),15000);video.onloadeddata=()=>{clearTimeout(timer);resolve();};video.onerror=()=>{clearTimeout(timer);reject(Error('This video cannot be decoded. Try MP4 or add your own notes.'));};video.src=url;});
 if(!Number.isFinite(video.duration)||video.duration<=0)throw Error('Could not read reference duration.');const ids:string[]=[];
 for(const fraction of [.1,.5,.9]){await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Could not sample this video.')),15000);video.onseeked=()=>{clearTimeout(timer);resolve();};video.currentTime=Math.min(video.duration*fraction,Math.max(.001,video.duration-.01));});const canvas=document.createElement('canvas');const scale=Math.min(1,1024/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));canvas.getContext('2d')!.drawImage(video,0,0,canvas.width,canvas.height);const frame=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare frame.')),'image/jpeg',.8));ids.push((await saveMedia(frame,'Reference frame '+Math.round(fraction*100)+'%.jpg')).id);}
 return ids;
 }finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
