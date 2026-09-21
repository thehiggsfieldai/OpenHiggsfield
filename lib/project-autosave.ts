import {useEffect,useRef,useState} from 'react';
import type {UGC} from './ugc-project';
type SaveState='idle'|'pending'|'saving'|'saved'|'error';
type Snapshot={workspace:string;document:UGC;fingerprint:string};
export function useProjectAutosave(workspace:string,document:UGC,enabled:boolean){
 const [state,setState]=useState<SaveState>('idle');const [error,setError]=useState('');
 const latest=useRef<Snapshot|null>(null),pending=useRef<Snapshot|null>(null),running=useRef<Promise<void>|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),saved=useRef(new Map<string,string>()),active=useRef('');
 active.current=workspace+':'+document.project.id;
 const snapshot={workspace,document,fingerprint:JSON.stringify(document)};latest.current=enabled?snapshot:null;
 function isActive(s:Snapshot){return active.current===s.workspace+':'+s.document.project.id&&latest.current?.fingerprint===s.fingerprint;}
 async function drain(){
  if(running.current)return running.current;
  const work=(async()=>{while(pending.current){const item=pending.current;pending.current=null;if(isActive(item)){setState('saving');setError('');}
   try{const r=await fetch('/api/studio/projects',{method:'PUT',headers:{'Content-Type':'application/json','X-Workspace-Id':item.workspace},body:JSON.stringify({id:item.document.project.id,document:item.document}),signal:AbortSignal.timeout(20000)});if(!r.ok){const data=await r.json().catch(()=>({}));throw Error(data.error||'Workspace save failed.');}saved.current.set(item.workspace+':'+item.document.project.id,item.fingerprint);if(isActive(item))setState('saved');}
   catch(e){if(isActive(item)){setState('error');setError(e instanceof Error?e.message:'Could not save.');}throw e;}
  }})();running.current=work;try{await work;}finally{running.current=null;}
 }
 async function flush(){if(timer.current)clearTimeout(timer.current);const item=latest.current;if(!item)return;if(saved.current.get(item.workspace+':'+item.document.project.id)!==item.fingerprint)pending.current=item;if(running.current){await running.current;}if(pending.current)await drain();}
 useEffect(()=>{if(timer.current)clearTimeout(timer.current);if(!enabled){setState('idle');return;}const item=latest.current!;if(saved.current.get(active.current)===item.fingerprint){setState('saved');return;}setState('pending');timer.current=setTimeout(()=>{pending.current=item;void drain().catch(()=>{});},900);return()=>{if(timer.current)clearTimeout(timer.current);};},[workspace,document,enabled]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(state==='pending'||state==='saving'||state==='error'){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[state]);
 return {state,error,flush,label:state==='saved'?'Saved to workspace':state==='saving'?'Saving…':state==='pending'?'Unsaved changes':state==='error'?'Not saved · retry':'Draft'};
}
