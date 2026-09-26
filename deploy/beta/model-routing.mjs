import {videoModels} from './models.mjs';
export const priceCheckedAt='2026-09-19';
export function estimateVideo(model,{duration=5,resolution='720p',format='9:16'}={},now=Date.now()){
 if(now-Date.parse(priceCheckedAt+'T00:00:00Z')>30*86400000)return null;
 if(model==='wan-2.7'&&resolution==='720p')return {usd:duration*.1,source:'https://open.higgsfield.ai/models/wan/v2.7/text-to-video/playground',basis:'Published per-second rate before discounts',checkedAt:priceCheckedAt};
 if(model==='seedance-2.5'&&['16:9','9:16'].includes(format)&&['480p','720p'].includes(resolution)){const pixels=resolution==='480p'?854*480:1280*720;return {usd:Math.ceil(Math.ceil(duration*pixels*24/1024)*.0214/1000*10000)/10000,source:'https://console.higgsfield.ai/models/bytedance%2Fseedance-2.5%2Ftext-to-video/playground',basis:'Published token formula; assumed 854×480 or 1280×720 frame area, 24 fps; before discounts',checkedAt:priceCheckedAt};}
 return null;
}
export function routeCandidates(d,now=Date.now()){
 const settings={duration:d.duration??5,resolution:d.resolution??'720p',format:d.format??'9:16',audio:d.audio??false};
 if(typeof settings.audio!=='boolean'||!Number.isInteger(settings.duration))throw Error('Invalid routing settings.');
 if(d.maxEstimatedUsd!==undefined&&(typeof d.maxEstimatedUsd!=='number'||!Number.isFinite(d.maxEstimatedUsd)||d.maxEstimatedUsd<=0||d.maxEstimatedUsd>100))throw Error('Enter an estimated clip budget between $0.01 and $100.');
 const candidates=videoModels.filter(m=>!m.requiresImages&&m.ratios.includes(settings.format)&&m.durations.includes(settings.duration)&&m.resolutions.includes(settings.resolution)&&(!settings.audio||m.audio)).map(m=>({id:m.id,name:m.name,capability:m.capability,audio:m.audio,verification:m.verification,estimate:estimateVideo(m.id,settings,now)})).filter(m=>m.estimate&& (d.maxEstimatedUsd===undefined||m.estimate.usd<=d.maxEstimatedUsd)).sort((a,b)=>a.estimate.usd-b.estimate.usd);
 return {settings,candidates,preference:d.preference==='economy'?'economy':'balanced'};
}
export function routeChoice(answer,candidates,preference){
 if(![...candidates.map(m=>m.id),'need_context'].includes(answer?.choice))throw Error('Jev returned a model outside the priced eligible catalog.');
 if(preference==='economy'&&answer.choice!=='need_context'&&candidates.find(m=>m.id===answer.choice).estimate.usd>candidates[0].estimate.usd)throw Error('Jev did not select the lowest estimated cost. No video was submitted.');
 return answer.choice;
}
