import {neon} from '@neondatabase/serverless';
import {readFileSync,existsSync} from 'node:fs';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; pull the linked Vercel environment first.');
const sql=neon(process.env.DATABASE_URL);
await sql.query('CREATE TABLE IF NOT EXISTS cases (id text PRIMARY KEY, record text NOT NULL, created_at text NOT NULL)');
await sql.query('CREATE TABLE IF NOT EXISTS evidence_snapshots (id text PRIMARY KEY, input text NOT NULL, evidence text NOT NULL, created_at bigint NOT NULL)');
await sql.query('CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires bigint NOT NULL)');
await sql.query('CREATE INDEX IF NOT EXISTS evidence_snapshots_expiry ON evidence_snapshots(created_at)');
// Only the explicitly published test fixture is seeded. Private Sites user cases stay on their original deployment.
const saved=JSON.parse(readFileSync('reports/live-case.json','utf8'));
const record=saved.record || saved;
await sql.query('INSERT INTO cases (id,record,created_at) VALUES ($1,$2,$3) ON CONFLICT(id) DO NOTHING',[record.id,JSON.stringify(record),record.createdAt]);
console.log('Schema ready; public legacy test case preserved.');
if(existsSync('reports/live-suite-v2.json')){
 for(const item of JSON.parse(readFileSync('reports/live-suite-v2.json','utf8'))){
  if(item.execution!=='FINISHED_WITH_RETURN')continue;
  const record=item.record;
  await sql.query('INSERT INTO cases (id,record,created_at) VALUES ($1,$2,$3) ON CONFLICT(id) DO UPDATE SET record=EXCLUDED.record',[record.id,JSON.stringify(record),record.createdAt]);
 }
 console.log('Verified public v2 test records synchronized.');
}
