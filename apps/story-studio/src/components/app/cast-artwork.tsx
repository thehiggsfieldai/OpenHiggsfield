import portraits from '@/lib/cast-portraits.json';
import './original-world.css';

type Portrait = {src:string;width:number;height:number};
const castPortraits:Record<string,Portrait> = portraits;

export function CastArtwork({id,name,eager=false}:{id:string;name:string;eager?:boolean}) {
  if(/^upload-[a-f0-9-]{36}$/.test(id))return <div className="original-cast-art"><img src={'/api/stories/characters/'+id+'/image'} alt={name} loading={eager?'eager':'lazy'} decoding="async"/></div>;
  const portrait=castPortraits[id];
  if(!portrait) return <div className="original-cast-art" role="img" aria-label={`${name}: portrait unavailable`} />;
  return <div className="original-cast-art"><img src={eager?`/artwork/picker/${id}.webp`:portrait.src} width={portrait.width} height={portrait.height} alt={name} loading={eager?"eager":"lazy"} decoding={eager?"sync":"async"} /></div>;
}
