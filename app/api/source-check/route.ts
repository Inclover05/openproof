import {readBody,limit,failure} from '@/lib/server';
import {inspectPublicSource} from '@/lib/source-adapters';
export async function POST(request:Request){try{const body=await readBody(request);if(typeof body.url!=='string'||body.url.length>1500)throw new Error('Enter a supported HTTPS source URL.');await limit(request,'source');return Response.json({evidence:await inspectPublicSource(body.url)},{headers:{'cache-control':'no-store'}});}catch(e){return failure(e);}}
