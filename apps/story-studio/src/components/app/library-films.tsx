import {useEffect,useState} from 'react';
import {request} from '@/lib/account';
import {Link} from '@/lib/router';
import './film-production.css';
export function LibraryFilms(){const[films,setFilms]=useState<{id:string;title:string;state:string}[]>([]),[error,setError]=useState('');useEffect(()=>{void request<{films:typeof films}>('/api/story-films').then(d=>setFilms(d.films)).catch(e=>setError(e.message));},[]);if(error)return <p role="alert">Films could not be loaded: {error}</p>;if(!films.length)return null;return <section className="library-film-list"><h2>Your films</h2>{films.map(f=><div key={f.id}><div><strong>{f.title}</strong><p>{f.state==='complete'?'Ready to watch':f.state==='stopped'?'Stopped · receipts retained':f.state==='attention'?'Needs attention':f.state==='assembling'?'Assembling your film':'Rendering scenes'}</p></div><Link to={'/produce?film='+f.id}>{f.state==='complete'?'Watch and download':'View progress'}</Link></div>)}</section>;}
