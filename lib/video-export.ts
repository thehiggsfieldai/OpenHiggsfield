import {Output,WebMOutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality,Input,ALL_FORMATS,BlobSource,AudioBufferSink} from "mediabunny";
import type {LaunchProject,Scene} from "./launch-project";
import {getAsset} from "./local-assets";
export const dimensions={"16:9":[1280,720],"9:16":[720,1280],"1:1":[960,960]} as const;
export function outputDimensions(p:Pick<LaunchProject,'format'|'exportResolution'>):[number,number]{const side=p.exportResolution==='480p'?480:p.exportResolution==='1080p'?1080:720;const [rw,rh]=p.format.split(':').map(Number);return rw>=rh?[Math.round(side*rw/rh/2)*2,side]:[side,Math.round(side*rh/rw/2)*2];}
function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,size:number,lines=3,fontFamily="Manrope"){let output:string[]=[];let font=size;do{ctx.font=`800 ${font}px ${fontFamily}, Arial`;output=[];let line='';for(const word of text.split(/\s+/)){if(ctx.measureText((line?line+' ':'')+word).width>max&&line){output.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)output.push(line);if(output.length<=lines)break;font-=2;}while(font>14);output.slice(0,lines).forEach((line,i)=>ctx.fillText(i===lines-1&&output.length>lines?line+'…':line,x,y+i*font*1.25,max));}
export function drawFrame(canvas:HTMLCanvasElement,p:LaunchProject,scene:Scene,media:CanvasImageSource|null,_progress=0,logo:CanvasImageSource|null=null){
 const ctx=canvas.getContext('2d')!;const [w,h]=outputDimensions(p);if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;ctx.clearRect(0,0,w,h);ctx.fillStyle=p.background;ctx.fillRect(0,0,w,h);const margin=w*.07;
 if(media){const iw='videoWidth'in media?Number(media.videoWidth):'naturalWidth'in media?Number(media.naturalWidth):Number((media as HTMLCanvasElement).width),ih='videoHeight'in media?Number(media.videoHeight):'naturalHeight'in media?Number(media.naturalHeight):Number((media as HTMLCanvasElement).height);if(iw>0&&ih>0){const scale=(scene.mediaFit==='contain'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih))*scene.zoom;ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.drawImage(media,(w-iw*scale)*scene.focusX,(h-ih*scale)*scene.focusY,iw*scale,ih*scale);ctx.restore();}}
 else{const wash=ctx.createLinearGradient(0,0,w,h);wash.addColorStop(0,p.background);wash.addColorStop(1,p.accent);ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);ctx.fillStyle='#ffffff18';ctx.beginPath();ctx.arc(w*.9,h*.18,w*.55,0,Math.PI*2);ctx.fill();if(scene.showCaption===false){ctx.fillStyle='#fff';wrap(ctx,scene.title,margin,h*.5,w-margin*2,w*.065,3,p.font);}}
 if(scene.showCaption!==false&&scene.caption.trim()){if(media){const shade=ctx.createLinearGradient(0,h*.58,0,h);shade.addColorStop(0,'#00000000');shade.addColorStop(1,'#000000b3');ctx.fillStyle=shade;ctx.fillRect(0,h*.58,w,h*.42);}ctx.fillStyle='#fff';ctx.shadowColor='#00000080';ctx.shadowBlur=8;ctx.shadowOffsetY=2;wrap(ctx,scene.caption,margin,media?h*.78:h*.45,w-margin*2,w*(p.format==='9:16'?.064:.045),3,p.font);ctx.shadowBlur=0;ctx.shadowOffsetY=0;}
 if(logo){const lw='naturalWidth'in logo?Number(logo.naturalWidth):48,lh='naturalHeight'in logo?Number(logo.naturalHeight):48;const scale=Math.min(w*.18/lw,h*.07/lh);ctx.drawImage(logo,w-margin-lw*scale,h*.05,lw*scale,lh*scale);}
}
async function imageFrom(blob:Blob){const url=URL.createObjectURL(blob);const img=new Image();img.src=url;try{await img.decode();return img;}finally{URL.revokeObjectURL(url);}}
// Export uses media timestamps, never wall-clock capture time. Encoder startup,
// source seeking and CPU stalls cannot add frames or extend the finished edit.
export async function renderVideo(p:LaunchProject,onProgress:(n:number)=>void,signal:AbortSignal){
 const total=p.scenes.reduce((n,s)=>n+s.seconds,0);
 if(!p.scenes.length)throw Error('Add scenes before exporting.');
 if(!Number.isFinite(total)||total<=0||total>180)throw Error('Export supports up to 180 seconds.');
 if(!('VideoEncoder'in window))throw Error('Video export needs a recent Chrome or Edge over HTTPS or localhost.');
 const check=()=>{if(signal.aborted)throw new DOMException('Export canceled','AbortError');};
 const canvas=document.createElement('canvas');const [width,height]=outputDimensions(p);canvas.width=width;canvas.height=height;
 const target=new BufferTarget();const output=new Output({format:new WebMOutputFormat(),target});
 const videoSource=new CanvasSource(canvas,{codec:'vp8',quality:new Quality({bitrate:5_000_000}),keyFrameInterval:1});
 output.addVideoTrack(videoSource,{frameRate:30});
 const urls:string[]=[];const videos:HTMLVideoElement[]=[];let audioContext:AudioContext|undefined;let finished=false;
 try{
  check();await document.fonts.ready;
  const media=new Map<string,HTMLVideoElement|HTMLImageElement>();
  for(const id of new Set(p.scenes.map(s=>s.mediaId).filter(Boolean) as string[])){
   check();const asset=await getAsset(id);if(!asset)throw Error('A scene asset is missing. Reattach it before exporting.');
   if(asset.type.startsWith('image/'))media.set(id,await imageFrom(asset.blob));
   else{
    const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';videos.push(v);
    const url=URL.createObjectURL(asset.blob);urls.push(url);
    await new Promise<void>((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Video could not load.')),15000);v.onloadeddata=()=>{clearTimeout(t);resolve();};v.onerror=()=>{clearTimeout(t);reject(Error('Unsupported video file.'));};v.src=url;});
    if(!Number.isFinite(v.duration)||v.duration<=0)throw Error('Source video has no valid duration.');media.set(id,v);
   }
  }
  const logo=p.logoId?await getAsset(p.logoId):undefined;const logoImage=logo?await imageFrom(logo.blob):null;
  let audioSource:AudioBufferSource|undefined;let voice:AudioBuffer|undefined;
  if(p.voiceoverId||p.musicId||p.includeClipAudio){
   const mixer=new OfflineAudioContext(2,Math.ceil(total*48000),48000);let scheduled=false;
   const add=(buffer:AudioBuffer,when:number,offset:number,duration:number,volume:number)=>{if(duration<=0||volume<=0)return;const node=mixer.createBufferSource(),gain=mixer.createGain();node.buffer=buffer;gain.gain.value=volume;node.connect(gain);gain.connect(mixer.destination);node.start(when,offset,duration);scheduled=true;};
   for(const [id,volume] of [[p.voiceoverId,p.voiceoverVolume??1],[p.musicId,p.musicVolume??.25]] as const){if(!id)continue;check();const asset=await getAsset(id);if(!asset)throw Error('An audio track is missing. Reattach it before exporting.');const decoded=await mixer.decodeAudioData(await asset.blob.arrayBuffer());add(decoded,0,0,Math.min(total,decoded.duration),volume);}
   if(p.includeClipAudio){let position=0;for(const scene of p.scenes){check();if(scene.mediaId){const asset=await getAsset(scene.mediaId);if(asset?.type.startsWith('video/')){const input=new Input({formats:ALL_FORMATS,source:new BlobSource(asset.blob)});try{const track=await input.getPrimaryAudioTrack();if(track){if(!await track.canDecode())throw Error('Clip audio cannot be decoded. Use another source or turn off original clip audio.');const sink=new AudioBufferSink(track);for await(const part of sink.buffers(Math.max(0,scene.trim-.1),scene.trim+scene.seconds)){check();const start=Math.max(scene.trim,part.timestamp),end=Math.min(scene.trim+scene.seconds,part.timestamp+part.buffer.duration);add(part.buffer,position+start-scene.trim,start-part.timestamp,end-start,p.clipVolume??.6);}}}finally{input.dispose();}}}position+=scene.seconds;}}
   if(scheduled){voice=await mixer.startRendering();audioSource=new AudioBufferSource({codec:'opus',quality:new Quality({bitrate:128_000})});output.addAudioTrack(audioSource);}
  }

  check();await output.start();if(audioSource&&voice){await audioSource.add(voice);audioSource.close();}
  let elapsed=0;let frameCount=0;
  for(const scene of p.scenes){
   const source=scene.mediaId?media.get(scene.mediaId)??null:null;
   const frames=Math.ceil(scene.seconds*30);
   for(let frame=0;frame<frames;frame++){
    check();const local=frame/30;const duration=Math.min(1/30,scene.seconds-local);
    if(source instanceof HTMLVideoElement){
     // A short source holds its final frame; it never adds recording time.
     const time=Math.min(scene.trim+local,Math.max(0,source.duration-1/1000));
     if(Math.abs(source.currentTime-time)>.0001||source.seeking)await new Promise<void>((resolve,reject)=>{
      const clean=()=>{clearTimeout(timer);source.removeEventListener('seeked',done);source.removeEventListener('error',fail);signal.removeEventListener('abort',abort);};
      const done=()=>{clean();resolve();};const fail=()=>{clean();reject(Error('Could not decode a scene frame.'));};const abort=()=>{clean();reject(new DOMException('Export canceled','AbortError'));};
      const timer=setTimeout(fail,15000);source.addEventListener('seeked',done,{once:true});source.addEventListener('error',fail,{once:true});signal.addEventListener('abort',abort,{once:true});source.currentTime=time;
     });
    }
    drawFrame(canvas,p,scene,source,(elapsed+local)/total,logoImage);
    await videoSource.add(elapsed+local,duration);onProgress(Math.min(.99,(elapsed+local+duration)/total));
    if(++frameCount%15===0)await new Promise(resolve=>setTimeout(resolve,0));
   }
   elapsed+=scene.seconds;
  }
  check();videoSource.close();await output.finalize();check();finished=true;
  if(!target.buffer?.byteLength)throw Error('The encoder produced an empty video.');
  onProgress(1);return{blob:new Blob([target.buffer],{type:'video/webm'}),extension:'webm'};
 }finally{
  if(!finished)await output.cancel().catch(()=>{});
  await audioContext?.close();videos.forEach(v=>{v.pause();v.removeAttribute('src');v.load();});urls.forEach(URL.revokeObjectURL);
 }
}

export async function thumbnail(p:LaunchProject,index=0){const scene=p.scenes[index];if(!scene)throw Error('Create a script first.');const asset=scene.mediaId?await getAsset(scene.mediaId):undefined;let media:CanvasImageSource|null=asset?.type.startsWith('image/')?await imageFrom(asset.blob):null;if(asset?.type.startsWith('video/')){const url=URL.createObjectURL(asset.blob);try{const video=document.createElement('video');video.muted=true;await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Could not load thumbnail frame.')),15000);video.onloadeddata=()=>{video.currentTime=Math.min(scene.trim,Math.max(0,video.duration-.1));if(!scene.trim){clearTimeout(timer);resolve();}};video.onseeked=()=>{clearTimeout(timer);resolve();};video.onerror=()=>{clearTimeout(timer);reject(Error('Could not load video.'));};video.src=url;});const still=document.createElement('canvas');still.width=video.videoWidth;still.height=video.videoHeight;still.getContext('2d')!.drawImage(video,0,0);media=still;video.removeAttribute('src');video.load();}finally{URL.revokeObjectURL(url);}}const logo=p.logoId?await getAsset(p.logoId):undefined;const canvas=document.createElement('canvas');drawFrame(canvas,p,scene,media,0,logo?await imageFrom(logo.blob):null);return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Thumbnail failed.')),'image/png'));}
