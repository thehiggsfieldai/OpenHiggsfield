import {useAccount} from '@/lib/account';
import {LivingStory} from './living-story';
import {useMemo,useState,type FormEvent} from 'react';
import {ArrowRight,Search,ArrowUpRight,Check} from 'lucide-react';
import {Link,navigate} from '@/lib/router';
import type {CastMember,Film} from '@/lib/api';
import {CastArtwork} from './cast-artwork';
import './original-world.css';
import './homepage-studio.css';
const STARTERS=[{id:'fern',title:'The dragon who couldn’t roar',idea:'A gentle dragon discovers that a whisper can be just as brave as a roar.',tag:'A little courage',color:'peach'},{id:'selene',title:'Where lost dreams go',idea:'The moon keeper follows a missing dream all the way to a sleepy seaside town.',tag:'A bedtime adventure',color:'plum'},{id:'tansy',title:'A storm in a teacup',idea:'A talking teapot hosts a tea party for two friends who have forgotten how to say sorry.',tag:'An unlikely friendship',color:'orange'},{id:'bop',title:'A robot learns to wonder',idea:'A curious little robot discovers a flower that does not appear in any of its instruction manuals.',color:'sage'},{id:'nimbus',title:'The cloud that lost its rain',idea:'A small cloud searches for its missing raindrops and finds an unexpected friend along the way.',color:'blue'},{id:'ravi',title:'A song for the stars',idea:'A travelling musician plays a melody that brings a fallen star safely home.',color:'rose'}];
export function Hero({cast}:{cast:CastMember[];films:Film[]}) {
 const account=useAccount();
 const [group,setGroup]=useState('All'),[query,setQuery]=useState(''),[limit,setLimit]=useState(12),[idea,setIdea]=useState(''),[lead,setLead]=useState('pip');
 const groups=useMemo(()=>['All',...new Set(cast.map(c=>c.group))],[cast]);
 const shown=cast.filter(c=>(group==='All'||c.group===group)&&`${c.name} ${c.group} ${c.style_label} ${c.personality}`.toLowerCase().includes(query.trim().toLowerCase()));
 function begin(e:FormEvent){e.preventDefault();navigate('/create?character='+lead+'&idea='+encodeURIComponent(idea.trim()));}
 return <div className="original-home studio-home">
 <section className="imagination-opening"><LivingStory/>
  <div className="story-hero-head"><div className="story-hero-copy"><h1>Little characters.<br/><span>Limitless stories.</span></h1><p>An extraordinary cast. A world of possibilities.<br/>The next great adventure starts with you.</p></div>   <form className="idea-composer" onSubmit={begin}><label htmlFor="opening-idea">What’s your story?</label><textarea id="opening-idea" maxLength={6000} value={idea} onChange={e=>setIdea(e.target.value)} placeholder="A little fox finds a letter addressed to the moon…"/><div className="composer-bottom"><span>Start with an idea.<br/>Make it your own.</span><button type="submit" className="original-cta">Create your story <ArrowRight size={18}/></button></div></form></div>
  <fieldset className="opening-cast-choice"><legend>Choose your main character</legend><div className="lead-options">{['pip','zora','bop','fern','tansy','selene'].map(id=><button type="button" key={id} onClick={()=>setLead(id)} aria-label={'Choose '+(cast.find(c=>c.id===id)?.name||id)} aria-pressed={lead===id}><CastArtwork id={id} name=""/><span>{cast.find(c=>c.id===id)?.name||id}</span>{lead===id&&<Check size={13}/>}</button>)}</div><a href="#meet-the-cast">Explore all 50 characters <ArrowRight size={14}/></a></fieldset>
  <p className="opening-honesty">Choose your cast. Shape your story. Review the cost before rendering.</p>
 </section>
 <section className="story-starters"><div className="starter-heading"><h2>A spark is all it takes.</h2><p>Borrow a beginning. <br/>Take it somewhere only you could.</p></div><div className="starter-grid">{STARTERS.map(s=><Link key={s.id} className={'story-starter '+s.color} to={'/create?character='+s.id+'&idea='+encodeURIComponent(s.idea)}><div className="starter-art"><CastArtwork id={s.id} name={cast.find(c=>c.id===s.id)?.name||s.id}/></div><div className="starter-copy"><h3>{s.title}</h3><p>{s.idea}</p><strong>Start this story <ArrowUpRight size={18}/></strong></div></Link>)}</div></section>
 <section className="story-studio-promise"><div className="promise-art"><CastArtwork id="fable" name="Fable"/></div><div><h2>Your imagination.<br/>A place to grow.</h2><p>Keep the idea that arrived on your morning walk. Find the character who belongs in it. Come back tomorrow and write its next chapter.</p><Link to={account.user?"/library":"/login"} className="original-cta">{account.user?"Open your story library":"Sign in to your studio"} <ArrowRight size={18}/></Link><span>Private drafts · Email sign-in · Your original cast</span></div></section>
  <section id="meet-the-cast" className="cast-ensemble">
   <div className="cast-ensemble-heading"><div><h2>Who’s in your next story?</h2><p>Pick the personality that sparks an idea. Every character can tell a story in your chosen language.</p></div><label className="ensemble-search"><Search size={18}/><input aria-label="Search the cast" value={query} onChange={e=>{setQuery(e.target.value);setLimit(12);}} placeholder="Find your storyteller"/></label></div>
   <div className="cast-filters" aria-label="Character categories">{groups.map(g=><button type="button" key={g} aria-pressed={group===g} onClick={()=>{setGroup(g);setLimit(12);}}>{g}<span>{g==='All'?cast.length:cast.filter(c=>c.group===g).length}</span></button>)}</div>
   <p className="cast-result-count" role="status">{shown.length} {shown.length===1?'storyteller':'storytellers'}{query.trim()?` matching “${query.trim()}”`:group==='All'?' waiting for a beginning':` in ${group.toLowerCase()}`}</p>
   <div className="ensemble-grid">{shown.slice(0,limit).map(c=><Link key={c.id} to={`/create?character=${c.id}`} className="ensemble-character"><CastArtwork id={c.id} name={c.name}/><div className="ensemble-name"><h3>{c.name}</h3><ArrowUpRight size={17}/></div><span>{c.style_label}</span><p>{c.personality}</p></Link>)}</div>
   {!shown.length&&<div className="cast-empty"><h3>No storyteller found just yet.</h3><p>Try a name, an animal or a personality like “curious”.</p><button onClick={()=>{setQuery('');setGroup('All');}}>Show the whole cast</button></div>}
   {shown.length>limit&&<div className="cast-more"><button onClick={()=>setLimit(shown.length)}>Meet all {shown.length} storytellers <ArrowRight size={17}/></button><span>Showing {Math.min(limit,shown.length)} of {shown.length}</span></div>}
  </section>
<section className="story-next-chapter"><h2>Every story starts<br/>with someone like you.</h2><Link to="/create" className="original-cta">Start your first story <ArrowRight size={18}/></Link><p>Choose your cast. Tell it in English, French, Telugu, Tamil or Hindi.</p></section></div>;
}
