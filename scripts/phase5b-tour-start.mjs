import { createClient } from '@supabase/supabase-js';
import { calculateCourseHandicap } from '../src/domain/handicap/index.ts';

const tourId=process.argv[2];
if(!tourId) throw new Error('Usage: node scripts/phase5b-tour-start.mjs <tour-uuid>');
const url=process.env.SUPABASE_TEST_URL;
const key=process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const email=process.env.ORGANISER_TEST_EMAIL;
const password=process.env.ORGANISER_TEST_PASSWORD;
for(const [n,v] of Object.entries({SUPABASE_TEST_URL:url,SUPABASE_TEST_PUBLISHABLE_KEY:key,ORGANISER_TEST_EMAIL:email,ORGANISER_TEST_PASSWORD:password})) if(!v) throw new Error(`Missing ${n}`);
const s=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {error:loginError}=await s.auth.signInWithPassword({email,password}); if(loginError) throw loginError;
const {data:roundPlayers,error:rpError}=await s.from('round_players').select('id,tour_player_id,round_id,active,tour_players!inner(frozen_handicap_index,handicap_index),rounds!inner(tour_id),round_course_snapshot!inner(course_rating,slope_rating,par)').eq('rounds.tour_id',tourId).eq('active',true); if(rpError) throw rpError;
const payload=roundPlayers.map(r=>{const hi=r.tour_players.frozen_handicap_index ?? r.tour_players.handicap_index;if(hi==null) throw new Error(`Missing HI for ${r.tour_player_id}`);const snap=Array.isArray(r.round_course_snapshot)?r.round_course_snapshot[0]:r.round_course_snapshot;if(!snap) throw new Error(`Missing course snapshot for ${r.round_id}`);return {round_player_id:r.id,frozen_tour_handicap_index:Number(hi),course_handicap:calculateCourseHandicap(Number(hi),Number(snap.slope_rating),Number(snap.course_rating),Number(snap.par))};});
const {error}=await s.rpc('finalise_tour_start',{p_tour_id:tourId,p_round_handicaps:payload}); if(error) throw error;
console.log(JSON.stringify({tour_id:tourId,active_round_players:payload.length,status:'live'}));
