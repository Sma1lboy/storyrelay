import { getServiceSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * Vercel Cron handler — runs every 5 minutes.
 *
 * 1. Settles any expired, unprocessed rounds (pick highest-voted winner).
 * 2. If there are no active submissions and no recent activity, triggers
 *    the generate-story logic to keep the experience moving.
 */
export async function GET(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("[cron/settle] Unauthorized request rejected");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runId = randomUUID().slice(0, 8);
  const log = (msg: string) =>
    console.log(`[cron/settle][${runId}] ${msg}`);

  log("Started at " + new Date().toISOString());

  try {
    const supabase = getServiceSupabase();

    // ── 1. Get active story ──────────────────────────────────────────
    const { data: activeStory, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("is_active", true)
      .single();

    if (storyError || !activeStory) {
      log("No active story found — triggering story generation");
      await triggerGenerateStory(req);
      return NextResponse.json({
        ok: true,
        action: "generated_new_story",
      });
    }

    log(`Active story ${activeStory.id} (${activeStory.content.length} chars)`);

    const currentRoundIds: string[] = activeStory.round_ids || [];
    if (currentRoundIds.length === 0) {
      log("Story has no rounds — nothing to settle");
      return NextResponse.json({ ok: true, action: "no_rounds" });
    }

    // ── 2. Fetch unprocessed expired submissions ─────────────────────
    const currentTime = new Date().toISOString();

    const { data: unprocessedSubmissions, error: submissionsError } =
      await supabase
        .from("submissions")
        .select("*")
        .eq("story_id", activeStory.id)
        .eq("processed", false)
        .lt("round_end", currentTime)
        .order("votes", { ascending: false })
        .order("created_at", { ascending: true });

    if (submissionsError) {
      log("Error fetching submissions: " + submissionsError.message);
      return NextResponse.json(
        { error: "Error fetching submissions" },
        { status: 500 }
      );
    }

    // ── 3. If nothing to settle, check for inactivity ────────────────
    if (!unprocessedSubmissions || unprocessedSubmissions.length === 0) {
      log("No expired unprocessed submissions");

      // Check whether there are any pending (non-expired) submissions
      const { data: pendingSubmissions } = await supabase
        .from("submissions")
        .select("id")
        .eq("story_id", activeStory.id)
        .eq("processed", false)
        .gte("round_end", currentTime)
        .limit(1);

      if (pendingSubmissions && pendingSubmissions.length > 0) {
        log("Active submissions still pending — no action needed");
        return NextResponse.json({ ok: true, action: "waiting_for_round" });
      }

      // No pending submissions at all — check for recent activity
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentSubmissions } = await supabase
        .from("submissions")
        .select("id")
        .eq("story_id", activeStory.id)
        .gt("created_at", oneHourAgo)
        .limit(1);

      if (!recentSubmissions || recentSubmissions.length === 0) {
        log("No recent activity — triggering AI story continuation");
        await triggerGenerateStory(req);
        return NextResponse.json({
          ok: true,
          action: "triggered_ai_continuation",
        });
      }

      log("Recent activity exists — no action needed");
      return NextResponse.json({ ok: true, action: "idle" });
    }

    // ── 4. Group by round_id and settle ──────────────────────────────
    log(
      `Found ${unprocessedSubmissions.length} unprocessed expired submissions`
    );

    const submissionsByRound = new Map<
      string,
      typeof unprocessedSubmissions
    >();
    for (const sub of unprocessedSubmissions) {
      const roundKey = sub.round_id || sub.round_end;
      if (!submissionsByRound.has(roundKey)) {
        submissionsByRound.set(roundKey, []);
      }
      submissionsByRound.get(roundKey)!.push(sub);
    }

    log(`Grouped into ${submissionsByRound.size} round(s)`);

    // Find the most recent round that needs settlement based on round_ids order
    let targetRoundKey: string | null = null;
    for (let i = currentRoundIds.length - 1; i >= 0; i--) {
      if (submissionsByRound.has(currentRoundIds[i])) {
        targetRoundKey = currentRoundIds[i];
        break;
      }
    }
    // Fallback: pick the first available round
    if (!targetRoundKey) {
      targetRoundKey = submissionsByRound.keys().next().value!;
    }

    const roundSubmissions = submissionsByRound.get(targetRoundKey)!;
    log(
      `Settling round ${targetRoundKey} with ${roundSubmissions.length} submission(s)`
    );

    // Winner = first element (highest votes, earliest created for ties)
    const winner = roundSubmissions[0];
    log(`Winner: "${winner.content}" (${winner.votes} votes)`);

    // ── 5. Optimistic lock: mark submissions as processed ────────────
    const roundSubmissionIds = roundSubmissions.map((s) => s.id);
    const { data: updatedRows, error: markError } = await supabase
      .from("submissions")
      .update({ processed: true })
      .in("id", roundSubmissionIds)
      .eq("processed", false)
      .select("id");

    if (markError) {
      log("Error marking processed: " + markError.message);
      return NextResponse.json(
        { error: "Failed to mark submissions as processed" },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      log("Round already settled by another process — skipping");
      return NextResponse.json({ ok: true, action: "already_settled" });
    }

    log(`Marked ${updatedRows.length} submission(s) as processed`);

    // ── 6. Append winner content to story ────────────────────────────
    const newContent = `${activeStory.content} ${winner.content}`;

    if (newContent.length >= 1000) {
      log(
        `Story reached ${newContent.length} chars — completing and generating new story`
      );
      await supabase
        .from("stories")
        .update({ is_active: false, content: newContent })
        .eq("id", activeStory.id);

      await triggerGenerateStory(req);
    } else {
      const newRoundId = randomUUID();
      const updatedRoundIds = [...currentRoundIds, newRoundId];

      const { error: updateError } = await supabase
        .from("stories")
        .update({ content: newContent, round_ids: updatedRoundIds })
        .eq("id", activeStory.id);

      if (updateError) {
        log("Error updating story: " + updateError.message);
        return NextResponse.json(
          { error: "Failed to update story" },
          { status: 500 }
        );
      }

      log(`Story updated — new round ${newRoundId} started`);
    }

    log("Settlement complete");
    return NextResponse.json({
      ok: true,
      action: "settled",
      winner: winner.content,
      votes: winner.votes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Unexpected error: " + message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── Helper ─────────────────────────────────────────────────────────────
async function triggerGenerateStory(req: NextRequest) {
  const baseUrl = new URL(req.url).origin;
  try {
    await fetch(`${baseUrl}/api/generate-story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[cron/settle] Failed to trigger generate-story:", err);
  }
}
