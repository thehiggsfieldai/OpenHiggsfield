export async function evaluateVercelJev({key,state,questions,fetcher=fetch}){
 const [{experimental_evaluate:evaluate},{createGateway}]=await Promise.all([import('ai'),import('@ai-sdk/gateway')]);
 const gateway=createGateway({apiKey:key,fetch:fetcher});
 try{const result=await evaluate({model:gateway.evaluationModel('typesafe-ai/jev'),state,questions,maxRetries:0,abortSignal:AbortSignal.timeout(60000)});return{answers:Object.fromEntries(Object.entries(result.answers).map(([name,answer])=>[name,{...answer,confidence:answer.type==='choice'?answer.probabilities?.[answer.choice]??null:null}])),model:'typesafe-ai/jev'};}catch{throw Error('Vercel Jev request failed. Check Gateway access and usage before retrying.');}
}
