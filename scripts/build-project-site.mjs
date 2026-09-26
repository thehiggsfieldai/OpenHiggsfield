import fs from 'node:fs/promises';
await fs.mkdir('.sites-runtime/project-site',{recursive:true});
await fs.cp('docs/site','.sites-runtime/project-site',{recursive:true});
await fs.writeFile('.sites-runtime/project-site/.nojekyll','');
