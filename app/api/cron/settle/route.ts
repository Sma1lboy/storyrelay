import { getServiceSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const runId = randomUUID().slice(0, 8);
  const log = (msg: string) => console.log(`[cron:${runId}] ${msg}`);

  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    log("Settlement cron started");

    // Get active story
    const { data: activeStory, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("is_active", true)
      .single();

    if (storyError || !activeStory) {
      log("No active story found, triggering story generation");
      const baseUrl = req.nextUrl.origin;
      await fetch(`${baseUrl}/api/generate-story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      return NextResponse.json({
        success: true,
        action: "generated_new_story",
      });
    }

    const currentRoundIds = activeStory.round_ids || [];
    const currentTime = new Date().toISOString();

    // Find unprocessed expired submissions
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
      log(`Error fetching submissions: ${submissionsError.message}`);
      return NextResponse.json(
        { error: "Error fetching submissions" },
        { status: 500 }
      );
    }

    if (!unprocessedSubmissions || unprocessedSubmissions.length === 0) {
      // Check if there's been no activity for over an hour — generate AI content
      const { data: recentSubmissions } = await supabase
        .from("submissions")
        .select("id")
        .eq("story_id", activeStory.id)
        .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .limit(1);

      if (!recentSubmissions || recentSubmissions.length === 0) {
        log("No activity for 1 hour, triggering AI continuation");
        const baseUrl = req.nextUrl.origin;
        await fetch(`${baseUrl}/api/generate-story`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        return NextResponse.json({
          success: true,
          action: "ai_continuation",
        });
      }

      log("No expired submissions to settle");
      return NextResponse.json({ success: true, action: "no_action" });
    }

    log(`Found ${unprocessedSubmissions.length} expired submissions`);

    // Group by round_id
    const submissionsByRound = new Map<
      string,
      typeof unprocessedSubmissions
    >();
    unprocessedSubmissions.forEach((sub) => {
      const roundKey = sub.round_id || sub.round_end;
      if (!submissionsByRound.has(roundKey)) {
        submissionsByRound.set(roundKey, []);
      }
      submissionsByRound.get(roundKey)!.push(sub);
    });

    // Find the most recent round to settle
    let targetRoundKey: string | null = null;
    for (let i = currentRoundIds.length - 1; i >= 0; i--) {
      if (submissionsByRound.has(currentRoundIds[i])) {
        targetRoundKey = currentRoundIds[i];
        break;
      }
    }
    if (!targetRoundKey) {
      targetRoundKey = submissionsByRound.keys().next().value!;
    }

    const roundSubmissions = submissionsByRound.get(targetRoundKey)!;
    const winner = roundSubmissions[0];
    log(
      `Round ${targetRoundKey}: winner "${winner.content}" (${winner.votes} votes)`
    );

    // Optimistic locking: mark as processed atomically
    const roundSubmissionIds = roundSubmissions.map((s) => s.id);
    const { data: updatedRows, error: markError } = await supabase
      .from("submissions")
      .update({ processed: true })
      .in("id", roundSubmissionIds)
      .eq("processed", false)
      .select("id");

    if (markError) {
      log(`Error marking processed: ${markError.message}`);
      return NextResponse.json(
        { error: "Failed to mark processed" },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      log("Already settled by another process");
      return NextResponse.json({ success: true, action: "already_settled" });
    }

    // Append winner to story
    const newContent = `${activeStory.content} ${winner.content}`;
    log(`Story now ${newContent.length} chars`);

    if (newContent.length >= 1000) {
      log("Story complete (>= 1000 chars), archiving");
      await supabase
        .from("stories")
        .update({ is_active: false, content: newContent })
        .eq("id", activeStory.id);

      // Trigger new story generation
      const baseUrl = req.nextUrl.origin;
      await fetch(`${baseUrl}/api/generate-story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      return NextResponse.json({
        success: true,
        action: "story_completed",
        winner: winner.content,
      });
    } else {
      // Start new round
      const newRoundId = randomUUID();
      const updatedRoundIds = [...currentRoundIds, newRoundId];

      const { error: updateError } = await supabase
        .from("stories")
        .update({ content: newContent, round_ids: updatedRoundIds })
        .eq("id", activeStory.id);

      if (updateError) {
        log(`Error updating story: ${updateError.message}`);
        return NextResponse.json(
          { error: "Failed to update story" },
          { status: 500 }
        );
      }

      log(`New round started: ${newRoundId}`);
      return NextResponse.json({
        success: true,
        action: "round_settled",
        winner: winner.content,
        newRoundId,
      });
    }
  } catch (error) {
    log(`Cron error: ${error}`);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
