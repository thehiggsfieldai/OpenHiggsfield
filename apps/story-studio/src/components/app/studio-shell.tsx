import {ThemeToggle} from '@/components/motion/theme-toggle';
import {useEffect,useState,type ReactNode} from 'react';
import {Clapperboard,FolderOpen,KeyRound,LogOut,Menu,Plus,House,X} from 'lucide-react';
import {Link} from '@/lib/router';
import {useAccount} from '@/lib/account';
import './studio-shell.css';
export function StudioShell({active,path,children}:{active:boolean;path:string;children:ReactNode}){
 const account=useAccount(),[open,setOpen]=useState(false),[error,setError]=useState('');const films=new URLSearchParams(location.search).get('view')==='films';
 useEffect(()=>{setOpen(false);},[path,location.search]);useEffect(()=>{if(!open)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[open]);
 useEffect(()=>{if(active&&!account.loading&&!account.user){history.replaceState(null,'','/login?next='+encodeURIComponent(location.pathname+location.search));window.dispatchEvent(new PopStateEvent('popstate'));}},[active,account.loading,account.user]);
 if(active&&!account.user)return <div role="status" className="p-8 text-center text-sm text-muted-foreground">Checking your session...</div>;
 if(!active)return <>{children}</>;
 const title=path==='/create'?'Create a story':path==='/produce'?'Film production':path==='/connections'?'Connections':films?'Film productions':'Story projects';
 const links=[{to:'/create',label:'Create a story',icon:Plus,current:path==='/create'},{to:'/library',label:'Projects',icon:FolderOpen,current:path==='/library'&&!films},{to:'/library?view=films',label:'Productions',icon:Clapperboard,current:path==='/produce'||path==='/library'&&films},{to:'/connections',label:'Connections',icon:KeyRound,current:path==='/connections'}];
 return <div className={'studio-shell'+(open?' menu-open':'')}>{open&&<button className="studio-menu-backdrop" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}<aside id="studio-navigation" className="studio-navigation" aria-label="Studio navigation"><Link className="studio-brand" to="/"><img src="/logo.svg" alt=""/><span>TheHiggsField<small>STUDIO</small></span></Link><nav>{links.map(({to,label,icon:Icon,current})=><Link key={to} to={to} aria-current={current?'page':undefined}><Icon size={18}/>{label}</Link>)}</nav><div className="studio-navigation-bottom"><div className="studio-legal-links"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div><Link to="/"><House size={17}/>Back to home</Link>{account.user?<><p>{account.user.email}</p><button onClick={()=>void account.signOut().catch(e=>setError(e.message))}><LogOut size={16}/>Sign out</button></>:<Link to="/login">Sign in</Link>}{error&&<p role="alert">{error}</p>}</div></aside><div className="studio-stage"><header className="studio-topbar"><button className="studio-menu-button" aria-label={open?'Close menu':'Open menu'} aria-controls="studio-navigation" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={20}/>:<Menu size={20}/>}</button><h1>{title}</h1><ThemeToggle className="studio-theme-toggle"/></header>{children}</div></div>;
}
