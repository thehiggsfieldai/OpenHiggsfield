import {CastArtwork} from './cast-artwork';
import './living-story.css';
const LEFT=[['aurora','Aurora'],['zora','Zora'],['bop','Bop'],['pip','Pip']];
const RIGHT=[['fern','Fern'],['tansy','Tansy'],['selene','Selene'],['yuki','Yuki']];
export function LivingStory(){return <section className="living-story" aria-label="Two groups of storytellers gathered around a sunlit meadow path"><div className="living-stage assembled-stage"><img className="woodland-background" src="/artwork/story-meadow.webp" alt="A winding path through a sunlit meadow toward distant hills" fetchPriority="high"/>{[LEFT,RIGHT].map((team,side)=><div key={side} className={'cast-wing '+(side?'cast-wing-right':'cast-wing-left')}>{team.map(([id,name],i)=><div key={id} className={'scene-character wing-position-'+i}><CastArtwork id={id} name={name}/></div>)}</div>)}</div></section>;}
