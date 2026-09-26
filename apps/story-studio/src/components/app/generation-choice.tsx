import {useState} from 'react';
import './generation-choice.css';
export type GenerationOption={id:string;label:string;modelName:string;resolution:string;description:string;estimate:{usd:number;perScene:number;source:string;basis:string}};
export function useGenerationChoice(){
 const [value,setValue]=useState(()=>{try{return sessionStorage.getItem('film-generation-choice')||'recommended';}catch{return 'recommended';}});
 return [value,(id:string)=>{setValue(id);try{sessionStorage.setItem('film-generation-choice',id);}catch{}}] as const;
}
export function GenerationChoice({options,value,onChange,disabled=false}:{options:GenerationOption[];value:string;onChange:(id:string)=>void;disabled?:boolean}){
 return <div className="generation-choice"><fieldset disabled={disabled}><legend>How would you like to make it?</legend>{options.filter(o=>['budget','recommended'].includes(o.id)).map(o=><label key={o.id} className="generation-choice-row"><input type="radio" name="generation-choice" value={o.id} checked={value===o.id} onChange={()=>onChange(o.id)}/><span><span className="generation-choice-title"><strong>{o.label}</strong><b>${o.estimate.usd.toFixed(2)}</b></span><span>{o.description} {o.resolution.toLowerCase()}.</span></span></label>)}</fieldset><details open={value==='seedance'?true:undefined}><summary>Advanced · choose a model</summary><label>Generation model<select disabled={disabled} value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.id} value={o.id}>{o.modelName} · {o.resolution.toLowerCase()} · ${o.estimate.usd.toFixed(2)}</option>)}</select></label></details><p className="generation-choice-note">Estimates for one minute with audio. Character and voice consistency still need review in your finished film.</p></div>;
}
