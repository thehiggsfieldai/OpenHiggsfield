import {z} from 'zod';

export const languages = [
  {code:'en',name:'English'}, {code:'hi',name:'Hindi'}, {code:'ta',name:'Tamil'},
  {code:'te',name:'Telugu'}, {code:'fr',name:'French'},
];
export const modes = [
  {id:'economy',name:'Illustrated',description:'Original scene illustrations, narration and camera motion. The lowest-cost approach.'},
  {id:'hybrid',name:'Hybrid',description:'Illustrations throughout, with generated video for selected moments.'},
  {id:'cinematic',name:'Cinematic',description:'Generated video for every scene. Higher provider cost.'},
];
const text=(max)=>z.string().trim().max(max);
const sceneSchema=z.object({
  id:z.string().uuid(), duration:z.number().min(2).max(20),
  narration:text(2000),visualPrompt:text(4000),kind:z.enum(['image','video']),
  delivery:z.enum(['voice-over','on-camera']).default('voice-over'),
  characterVisible:z.boolean().default(true),location:text(500).default(''),action:text(1500).default(''),ambience:text(500).default(''),
  camera:z.enum(['push-in','pull-out','pan-left','pan-right','static']),
  assetId:z.string().uuid().nullable().default(null),
});
export const storySchema=z.object({
  planner:z.object({characterId:text(100),minutes:z.number().int().min(1).max(10),kind:z.enum(['cast','new','upload']),characterUrl:text(2000).default(''),characterName:text(80).default(''),styleUrl:text(2000).default(''),voiceName:text(180).default('')}).optional(),
  title:text(120).min(1),idea:text(6000),language:z.enum(['en','hi','ta','te','fr']),
  mode:z.enum(['economy','hybrid','cinematic']),aspectRatio:z.enum(['9:16','16:9','1:1']),
  resolution:z.enum(['720p','1080p']),style:text(2000).min(1),
  character:z.object({name:text(80),appearance:text(2000),personality:text(1000),referenceAssetId:z.string().uuid().nullable()}).default({name:'',appearance:'',personality:'',referenceAssetId:null}),
  styleReferenceAssetId:z.string().uuid().nullable().default(null),
  music:z.object({enabled:z.boolean(),direction:text(1000),assetId:z.string().uuid().nullable()}).default({enabled:false,direction:'',assetId:null}),
  ending:z.object({title:text(120),message:text(250)}).default({title:'',message:''}),
  consistency:text(4000),voiceId:text(180),captions:z.boolean(),
  scenes:z.array(sceneSchema).min(3).max(20),
}).strict().superRefine((story,ctx)=>{
  if(Math.abs(story.scenes.reduce((sum,s)=>sum+s.duration,0)-60)>0.01)
    ctx.addIssue({code:'custom',path:['scenes'],message:'Scene durations must total exactly 60 seconds.'});
  if(new Set(story.scenes.map(s=>s.id)).size!==story.scenes.length)
    ctx.addIssue({code:'custom',path:['scenes'],message:'Each scene needs a unique ID.'});
  if(story.scenes.some(s=>s.delivery==='on-camera'&&(!s.characterVisible||s.kind!=='video')))
    ctx.addIssue({code:'custom',path:['scenes'],message:'On-camera speech requires a visible character and a video scene.'});
  if(story.mode==='economy'&&story.scenes.some(s=>s.kind!=='image'))
    ctx.addIssue({code:'custom',path:['mode'],message:'Illustrated stories use image scenes. Choose Hybrid to add video.'});
  if(story.mode==='cinematic'&&story.scenes.some(s=>s.kind!=='video'))
    ctx.addIssue({code:'custom',path:['mode'],message:'Cinematic stories use video in every scene.'});
});
export function newStory({title='Untitled story',idea='',language='en',mode='economy'}={}){
  return storySchema.parse({title,idea,language,mode,aspectRatio:'9:16',resolution:'720p',
    style:'Editorial illustration',consistency:'',voiceId:'',captions:true,
    scenes:Array.from({length:8},()=>({id:crypto.randomUUID(),duration:7.5,narration:'',visualPrompt:'',kind:mode==='cinematic'?'video':'image',camera:'push-in',assetId:null})),
  });
}
export function estimateStory(story,rates={}){
  const parsed=storySchema.parse(story);
  const images=parsed.scenes.filter(s=>s.kind==='image').length;
  const videoSeconds=parsed.scenes.filter(s=>s.kind==='video').reduce((n,s)=>n+s.duration,0);
  const narrationCharacters=parsed.scenes.reduce((n,s)=>n+[...s.narration].length,0);
  const line=(stage,quantity,rate)=>({stage,quantity,unitRate:Number.isFinite(rate)&&rate>=0?rate:null,usd:Number.isFinite(rate)&&rate>=0?Math.ceil(quantity*rate*1e6-1e-8)/1e6:null});
  const lines=[line('Images',images,rates.image),line('Video seconds',videoSeconds,videoSeconds===0?0:rates.videoSecond),line('Narration characters',narrationCharacters,rates.narrationCharacter),line('Script',1,rates.script)];
  const unknown=lines.filter(l=>l.usd===null).map(l=>l.stage);
  return {currency:'USD',lines,unknown,totalUsd:unknown.length?null:lines.reduce((n,l)=>n+Math.round(l.usd*1e6),0)/1e6,estimateOnly:true};
}
export function preflightStory(story,{voices=[],rates={}}={}){
  const parsed=storySchema.parse(story),issues=[];
  if(!parsed.scenes.every(s=>s.narration&&s.visualPrompt))issues.push('Complete narration and visual direction for every scene.');
  if(!voices.some(v=>v.id===parsed.voiceId&&v.language===parsed.language&&v.available===true))issues.push('Select an installed, verified voice for this language.');
  const estimate=estimateStory(parsed,rates);
  if(estimate.unknown.length)issues.push('Configure verified rates for: '+estimate.unknown.join(', ')+'.');
  return {ready:issues.length===0,issues,estimate};
}

