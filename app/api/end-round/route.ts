import { getServiceSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    console.log(
      "=== Settlement API called at:",
      new Date().toISOString(),
      "==="
    );

    // Get active story
    const { data: activeStory, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("is_active", true)
      .single();

    if (storyError || !activeStory) {
      console.log("No active story found");
      return NextResponse.json(
        { error: "No active story found" },
        { status: 404 }
      );
    }

    console.log("Active story ID:", activeStory.id);
    console.log("Current story content length:", activeStory.content.length);

    const currentRoundIds = activeStory.round_ids || [];
    if (currentRoundIds.length === 0) {
      return NextResponse.json({
        message: "No rounds to settle",
      });
    }

    const currentTime = new Date().toISOString();
    console.log("Current time:", currentTime);

    // Get unprocessed expired submissions for this story, grouped by round_id
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
      console.error(
        "Error fetching unprocessed submissions:",
        submissionsError
      );
      return NextResponse.json(
        { error: "Error fetching submissions" },
        { status: 500 }
      );
    }

    if (!unprocessedSubmissions || unprocessedSubmissions.length === 0) {
      console.log("No unprocessed expired submissions found");
      return NextResponse.json({
        message: "No unprocessed expired submissions found",
      });
    }

    console.log(
      `Found ${unprocessedSubmissions.length} unprocessed expired submissions`
    );

    // Group by round_id (not round_end) for correct round grouping
    const submissionsByRound = new Map<string, typeof unprocessedSubmissions>();
    unprocessedSubmissions.forEach((sub) => {
      const roundKey = sub.round_id || sub.round_end;
      if (!submissionsByRound.has(roundKey)) {
        submissionsByRound.set(roundKey, []);
      }
      submissionsByRound.get(roundKey)!.push(sub);
    });

    console.log(`Found ${submissionsByRound.size} unprocessed rounds`);

    // Find the most recent round that needs settlement
    // Use the order from round_ids array to determine which round is most recent
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

    console.log(`Processing round: ${targetRoundKey}`);
    console.log(`Round has ${roundSubmissions.length} submissions:`);
    roundSubmissions.forEach((sub) => {
      console.log(
        `  - "${sub.content}" (${sub.votes} votes, created: ${sub.created_at})`
      );
    });

    // Winner is first due to our ordering (highest votes, earliest created for ties)
    const winner = roundSubmissions[0];
    console.log(`Winner: "${winner.content}" with ${winner.votes} votes`);

    // Optimistic locking: atomically mark submissions as processed
    // Only update submissions that are still unprocessed (prevents concurrent settlement)
    const roundSubmissionIds = roundSubmissions.map((s) => s.id);
    const { data: updatedRows, error: markProcessedError } = await supabase
      .from("submissions")
      .update({ processed: true })
      .in("id", roundSubmissionIds)
      .eq("processed", false)
      .select("id");

    if (markProcessedError) {
      console.error(
        "Error marking submissions as processed:",
        markProcessedError
      );
      return NextResponse.json(
        { error: "Failed to mark submissions as processed" },
        { status: 500 }
      );
    }

    // If no rows were actually updated, another process already settled this round
    if (!updatedRows || updatedRows.length === 0) {
      console.log("Round already settled by another process, skipping");
      return NextResponse.json({
        message: "Round already settled",
        success: true,
      });
    }

    console.log(
      `Marked ${updatedRows.length} submissions as processed (concurrency safe)`
    );

    // Add winning sentence to story
    const newContent = `${activeStory.content} ${winner.content}`;
    console.log(`Adding "${winner.content}" to story`);
    console.log(`New story content will be ${newContent.length} characters`);

    // Check if story is getting too long (close to 1000 chars)
    if (newContent.length >= 1000) {
      console.log("Story is getting too long, creating new story");
      // Mark current story as inactive but save the final content
      await supabase
        .from("stories")
        .update({ is_active: false, content: newContent })
        .eq("id", activeStory.id);

      // Trigger AI judges to review the completed story (non-blocking)
      const baseUrl = req.nextUrl.origin;
      fetch(`${baseUrl}/api/judge-story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: activeStory.id }),
      }).catch((err) => console.error("Judge API call failed:", err));
      console.log("Triggered AI judge review for completed story");

      // Trigger AI to generate new story
      await fetch(`${baseUrl}/api/generate-story`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Triggered new story generation");
    } else {
      // Update current story and start a new round
      const newRoundId = randomUUID();
      const updatedRoundIds = [...(activeStory.round_ids || []), newRoundId];

      const { error: updateError } = await supabase
        .from("stories")
        .update({ content: newContent, round_ids: updatedRoundIds })
        .eq("id", activeStory.id);

      if (updateError) {
        console.error("Error updating story:", updateError);
        return NextResponse.json(
          { error: "Failed to update story" },
          { status: 500 }
        );
      }
      console.log(
        "Story updated successfully and new round started:",
        newRoundId
      );
    }

    return NextResponse.json({
      success: true,
      winner: winner.content,
      votes: winner.votes,
      message: `Round settled. Winner: "${winner.content}" (${winner.votes} votes)`,
    });
  } catch (error) {
    console.error("Settle API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
