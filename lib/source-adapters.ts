import {eligibleSource,type Evidence} from './domain';
export function sourcePlan(raw:string){
 if(!eligibleSource(raw))return null;
 const url=new URL(raw);
 if(['x.com','www.x.com','twitter.com','www.twitter.com'].includes(url.hostname)){
  const match=url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d{1,20})\/?$/);
  if(!match)return null;
  const canonical=`https://twitter.com/${match[1]}/status/${match[2]}`;
  return {provider:'X public post',contentFormat:'x-oembed-v1' as const,retrievalUrl:'https://publish.x.com/oembed?url='+encodeURIComponent(canonical)+'&omit_script=true&dnt=true',postId:match[2]};
 }
 return {provider:url.hostname==='medium.com'||url.hostname.endsWith('.medium.com')?'Medium article':'Public web source',contentFormat:url.hostname==='medium.com'||url.hostname.endsWith('.medium.com')?'medium-article-v1' as const:'raw-v1' as const,retrievalUrl:raw,postId:undefined};
}
export function plainText(html:string){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
export function extractSource(raw:string,plan:NonNullable<ReturnType<typeof sourcePlan>>):{canonical:string;excerpt:string;publishedAt?:string}{
 if(plan.contentFormat==='x-oembed-v1'){
  const data=JSON.parse(raw);if(typeof data.html!=='string'||typeof data.author_url!=='string'||!data.url?.endsWith('/status/'+plan.postId))throw new Error('The public post identity could not be confirmed.');
  const paragraph=data.html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];if(!paragraph)throw new Error('The endpoint did not expose public post text.');
  const text=plainText(paragraph);return {canonical:'x-oembed-v1\n'+data.author_url+'\n'+text,excerpt:text,publishedAt:new Date(Number((BigInt(plan.postId!)>>BigInt(22))+BigInt(1288834974657))).toISOString()};
 }
 if(plan.contentFormat==='medium-article-v1'){
  if(/"isAccessibleForFree"\s*:\s*false|"isLocked"\s*:\s*true/.test(raw))throw new Error('This article is restricted. Use an accessible original or a corroborating source.');
  const article=raw.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];if(!article)throw new Error('The response did not expose an article body.');
  const text=plainText(article);const date=raw.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1]||'';
  return {canonical:'medium-article-v1\n'+date+'\n'+text,excerpt:text,publishedAt:date||undefined};
 }
 return {canonical:raw,excerpt:plainText(raw)};
}
export async function inspectPublicSource(url:string,id='source-1'):Promise<Evidence>{
 const base:Evidence={id,kind:'source',title:id==='source-1'?'Original public source':'Corroborating source',url,retrievedAt:new Date().toISOString(),status:'unavailable',detail:''};
 const plan=sourcePlan(url);
 if(!plan)return {...base,status:'blocked',detail:/^https:\/\/(www\.)?(x|twitter)\.com\//.test(url)?'Use a direct public post URL: https://x.com/username/status/post-id. Profiles, searches and private posts are not supported.':'This source host is not supported. Use Medium, a public X post, GitHub, supported official documentation or a verified explorer.'};
 const provenance={provider:plan.provider,retrievalUrl:plan.retrievalUrl,contentFormat:plan.contentFormat};
 try{
  const response=await fetch(plan.retrievalUrl,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{Accept:'text/plain,text/html,application/json'}});
  if(response.status>=300&&response.status<400)return {...base,...provenance,status:'blocked',detail:'This source redirects. Open it and explicitly enter its final supported URL; no replacement was fetched.'};
  if(!response.ok)return {...base,...provenance,status:[401,403,429].includes(response.status)?'blocked':'unavailable',detail:`${plan.provider} returned HTTP ${response.status}. No conclusion was inferred. Add a corroborating public source if available.`};
  if(!/text\/|application\/json/.test(response.headers.get('content-type')||''))throw new Error('This source did not return readable text or JSON.');
  if(!response.body)throw new Error('The source returned no content.');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>500000){await reader.cancel();throw new Error('The source exceeds the 500 KB limit.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const extracted=extractSource(new TextDecoder('utf-8',{fatal:true}).decode(bytes),plan);if(extracted.excerpt.length<30)throw new Error('Not enough public text was available.');
  const digest=await crypto.subtle.digest('SHA-256',plan.contentFormat==='raw-v1'?bytes:new TextEncoder().encode(extracted.canonical));const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  return {...base,...provenance,status:'readable',hash,excerpt:extracted.excerpt.slice(0,1800),publishedAt:extracted.publishedAt,detail:plan.contentFormat==='x-oembed-v1'?'Public text retrieved through X’s official embed endpoint. Images, video, threads and author identity are not verified. Validators must retrieve it independently.':plan.contentFormat==='medium-article-v1'?'Public article body retrieved. The displayed publication date is supplied by the page; it is not independent proof of publication.':'Readable at collection time. The content hash preserves this observation; relevance and publication history still need independent checks.'};
 }catch(e){return {...base,...provenance,detail:e instanceof Error&&e.name!=='TimeoutError'?e.message:'Retrieval timed out. Try again or add a corroborating source.'};}
}
