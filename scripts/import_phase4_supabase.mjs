import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const BATCH_SIZE = Number(process.env.PHASE4_BATCH_SIZE || 250);
const DRY_RUN = process.argv.includes('--dry-run');
const EXPECTED = { courses: 460, course_tees: 2273, course_holes: 3888, routing_groups: 216 };

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseCsv(file) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i=0; i<text.length; i++) {
    const c=text[i];
    if (quoted) {
      if (c==='"' && text[i+1]==='"') { cell+='"'; i++; }
      else if (c==='"') quoted=false;
      else cell+=c;
    } else {
      if (c==='"') quoted=true;
      else if (c===',') { row.push(cell); cell=''; }
      else if (c==='\n') { row.push(cell.replace(/\r$/,'')); rows.push(row); row=[]; cell=''; }
      else cell+=c;
    }
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/,'')); rows.push(row); }
  const headers=rows.shift();
  return rows.filter(r=>r.some(v=>v!=='')).map((r,idx)=>{
    if (r.length!==headers.length) throw new Error(`${file} row ${idx+2}: expected ${headers.length} columns, got ${r.length}`);
    return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));
  });
}

function prepare() {
  const courses=parseCsv('data/courses.csv').map(r=>({
    id:r.id, source_course_id:r.source_course_id, name:r.name, golf_union:r.golf_union,
    source_name:r.source_name, verification_status:r.verification_status
  }));
  const course_tees=parseCsv('data/course_tees.csv').map(r=>({
    id:r.id, course_id:r.course_id, tee_name:r.tee_name, gender_rating:r.gender_rating,
    course_rating:Number(r.course_rating), slope_rating:Number(r.slope_rating), par:Number(r.par),
    source_url:r.source_url || null
  }));
  const course_holes=parseCsv('data/course_holes.csv').map(r=>({
    id:r.id, course_tee_id:r.course_tee_id, hole_number:Number(r.hole_number), par:Number(r.par),
    stroke_index:Number(r.stroke_index), metres:r.metres===''?null:Number(r.metres),
    source_url:r.source_url || null, source_type:r.source_type || null, confidence:r.confidence || null
  }));
  return {courses,course_tees,course_holes};
}

function assertData(d) {
  for (const k of ['courses','course_tees','course_holes']) if (d[k].length!==EXPECTED[k]) throw new Error(`${k}: expected ${EXPECTED[k]}, got ${d[k].length}`);
  for (const k of ['courses','course_tees','course_holes']) {
    const ids=d[k].map(r=>r.id); if (new Set(ids).size!==ids.length) throw new Error(`${k}: duplicate IDs`);
  }
  const courseIds=new Set(d.courses.map(r=>r.id));
  const teeIds=new Set(d.course_tees.map(r=>r.id));
  if (d.course_tees.some(r=>!courseIds.has(r.course_id))) throw new Error('orphan course_tees.course_id');
  if (d.course_holes.some(r=>!teeIds.has(r.course_tee_id))) throw new Error('orphan course_holes.course_tee_id');
  const groups=new Map();
  for (const h of d.course_holes) { const g=groups.get(h.course_tee_id)||[]; g.push(h); groups.set(h.course_tee_id,g); }
  if (groups.size!==EXPECTED.routing_groups) throw new Error(`expected ${EXPECTED.routing_groups} routings, got ${groups.size}`);
  for (const [tee,rs] of groups) {
    if (rs.length!==18) throw new Error(`${tee}: ${rs.length} holes`);
    if (new Set(rs.map(x=>x.hole_number)).size!==18 || Math.min(...rs.map(x=>x.hole_number))!==1 || Math.max(...rs.map(x=>x.hole_number))!==18) throw new Error(`${tee}: invalid hole numbers`);
    if (new Set(rs.map(x=>x.stroke_index)).size!==18 || Math.min(...rs.map(x=>x.stroke_index))!==1 || Math.max(...rs.map(x=>x.stroke_index))!==18) throw new Error(`${tee}: invalid stroke indexes`);
  }
}

async function upsertBatches(supabase, table, rows) {
  let processed=0;
  for (let i=0;i<rows.length;i+=BATCH_SIZE) {
    const batch=rows.slice(i,i+BATCH_SIZE);
    const { error }=await supabase.from(table).upsert(batch,{onConflict:'id'});
    if (error) throw new Error(`${table} batch ${i/BATCH_SIZE+1}: ${error.code||''} ${error.message}`);
    processed+=batch.length;
    console.log(`${table}: ${processed}/${rows.length}`);
  }
}

async function exactCount(supabase,table) {
  const {count,error}=await supabase.from(table).select('id',{count:'exact',head:true});
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count;
}

async function main() {
  const data=prepare(); assertData(data);
  console.log('Local validation:', JSON.stringify({courses:data.courses.length,tees:data.course_tees.length,holes:data.course_holes.length,routings:EXPECTED.routing_groups}));
  if (DRY_RUN) { console.log('DRY RUN OK: no database writes performed.'); return; }
  const supabase=createClient(requireEnv('SUPABASE_TEST_URL'),requireEnv('SUPABASE_TEST_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const before={courses:await exactCount(supabase,'courses'),course_tees:await exactCount(supabase,'course_tees'),course_holes:await exactCount(supabase,'course_holes')};
  console.log('Before:', JSON.stringify(before));
  await upsertBatches(supabase,'courses',data.courses);
  await upsertBatches(supabase,'course_tees',data.course_tees);
  await upsertBatches(supabase,'course_holes',data.course_holes);
  const after={courses:await exactCount(supabase,'courses'),course_tees:await exactCount(supabase,'course_tees'),course_holes:await exactCount(supabase,'course_holes')};
  console.log('After:', JSON.stringify(after));
  console.log('Delta:', JSON.stringify(Object.fromEntries(Object.keys(after).map(k=>[k,after[k]-before[k]]))));
}
main().catch(e=>{console.error(e.message);process.exit(1)});
