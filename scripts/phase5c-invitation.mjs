import { createClient } from "@supabase/supabase-js";
import { generateInvitationToken, hashInvitationToken } from "./invitation-token.mjs";

const [action, value] = process.argv.slice(2);
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const email = process.env.ORGANISER_TEST_EMAIL;
const password = process.env.ORGANISER_TEST_PASSWORD;
for (const [name,v] of Object.entries({SUPABASE_TEST_URL:url,SUPABASE_TEST_PUBLISHABLE_KEY:key,ORGANISER_TEST_EMAIL:email,ORGANISER_TEST_PASSWORD:password})) if(!v) throw new Error(`Missing ${name}`);
const s=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {error:loginError}=await s.auth.signInWithPassword({email,password}); if(loginError) throw loginError;

if(action==="create"){
  if(!value) throw new Error("Usage: create <tour-player-uuid>");
  const {rawToken,tokenHash}=generateInvitationToken();
  const {data,error}=await s.rpc("create_invitation",{p_tour_player_id:value,p_token_hash:tokenHash,p_expires_at:null}); if(error) throw error;
  console.log(JSON.stringify({invitation_id:data,raw_token:rawToken}));
}else if(action==="revoke"){
  if(!value) throw new Error("Usage: revoke <invitation-uuid>");
  const {error}=await s.rpc("revoke_invitation",{p_invitation_id:value}); if(error) throw error;
  console.log(JSON.stringify({invitation_id:value,status:"revoked"}));
}else if(action==="claim"){
  if(!value) throw new Error("Usage: claim <raw-token>");
  const {data,error}=await s.rpc("claim_invitation",{p_token_hash:hashInvitationToken(value)}); if(error) throw error;
  console.log(JSON.stringify({tour_player_id:data,status:"claimed"}));
}else{
  throw new Error("Usage: node scripts/phase5c-invitation.mjs create|revoke|claim <value>");
}
