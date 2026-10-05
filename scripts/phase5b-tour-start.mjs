import { createClient } from "@supabase/supabase-js";
import { calculateCourseHandicap } from "../src/domain/handicap/index.ts";

const tourId = process.argv[2];

if (!tourId) {
  throw new Error(
    "Usage: node scripts/phase5b-tour-start.mjs <tour-uuid>"
  );
}

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const email = process.env.ORGANISER_TEST_EMAIL;
const password = process.env.ORGANISER_TEST_PASSWORD;

for (const [name, value] of Object.entries({
  SUPABASE_TEST_URL: url,
  SUPABASE_TEST_PUBLISHABLE_KEY: key,
  ORGANISER_TEST_EMAIL: email,
  ORGANISER_TEST_PASSWORD: password,
})) {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { error: loginError } =
  await supabase.auth.signInWithPassword({
    email,
    password,
  });

if (loginError) {
  throw loginError;
}

/*
 * Load active Round players and their Tour-player handicap state.
 *
 * round_players has an FK relationship to:
 *   - tour_players
 *   - rounds
 *
 * It does NOT have a direct FK relationship to
 * round_course_snapshot, so snapshots are loaded separately
 * using round_id.
 */
const { data: roundPlayers, error: roundPlayersError } =
  await supabase
    .from("round_players")
    .select(`
      id,
      tour_player_id,
      round_id,
      active,
      tour_players!inner(
        handicap_index,
        frozen_handicap_index
      ),
      rounds!inner(
        tour_id
      )
    `)
    .eq("rounds.tour_id", tourId)
    .eq("active", true);

if (roundPlayersError) {
  throw roundPlayersError;
}

if (!roundPlayers?.length) {
  throw new Error("Tour has no active Round players");
}

/*
 * Load immutable Round course snapshots explicitly.
 */
const roundIds = [
  ...new Set(roundPlayers.map((player) => player.round_id)),
];

const { data: snapshots, error: snapshotError } =
  await supabase
    .from("round_course_snapshot")
    .select(`
      round_id,
      course_rating,
      slope_rating,
      par
    `)
    .in("round_id", roundIds);

if (snapshotError) {
  throw snapshotError;
}

const snapshotByRound = new Map(
  (snapshots ?? []).map((snapshot) => [
    snapshot.round_id,
    snapshot,
  ])
);

/*
 * Authoritative Course Handicap calculation remains in the
 * TypeScript golf-domain engine.
 */
const payload = roundPlayers.map((roundPlayer) => {
  const tourPlayer = Array.isArray(roundPlayer.tour_players)
    ? roundPlayer.tour_players[0]
    : roundPlayer.tour_players;

  if (!tourPlayer) {
    throw new Error(
      `Missing Tour player for Round player ${roundPlayer.id}`
    );
  }

  const handicapIndex =
    tourPlayer.frozen_handicap_index ??
    tourPlayer.handicap_index;

  if (handicapIndex == null) {
    throw new Error(
      `Missing Handicap Index for Tour player ${roundPlayer.tour_player_id}`
    );
  }

  const snapshot = snapshotByRound.get(
    roundPlayer.round_id
  );

  if (!snapshot) {
    throw new Error(
      `Missing course snapshot for Round ${roundPlayer.round_id}`
    );
  }

  const courseHandicap = calculateCourseHandicap(
    Number(handicapIndex),
    Number(snapshot.slope_rating),
    Number(snapshot.course_rating),
    Number(snapshot.par)
  );

  return {
    round_player_id: roundPlayer.id,
    frozen_tour_handicap_index: Number(handicapIndex),
    course_handicap: courseHandicap,
  };
});

const { error: finaliseError } =
  await supabase.rpc("finalise_tour_start", {
    p_tour_id: tourId,
    p_round_handicaps: payload,
  });

if (finaliseError) {
  throw finaliseError;
}

console.log(
  JSON.stringify({
    tour_id: tourId,
    active_round_players: payload.length,
    status: "live",
  })
);