import {mkdirSync} from 'node:fs';
mkdirSync('.sites-runtime',{recursive:true});
import {execFileSync} from 'node:child_process';
for(const test of ['test-image-studio.mjs','test-treatment.mjs','test-workspace-tools.mjs','test-uploaded-references.mjs','test-model-routing.mjs','test-research-assessment.mjs','test-discovery.mjs','test-generation-receipt.mjs','test-generation-flow.mjs','test-release-check.mjs','test-media-sharing.mjs','test-account.mjs','test-provider-media.mjs','test-media.mjs','test-vault.mjs','test-workspaces.mjs','test-product-auth.mjs','test-product-server.mjs','test-model-catalog.mjs','test-jev-vercel.mjs','test-studio-api.mjs'])execFileSync(process.execPath,['scripts/'+test],{stdio:'inherit'});
console.log('All studio core checks passed. No external emails or paid generations were used.');
