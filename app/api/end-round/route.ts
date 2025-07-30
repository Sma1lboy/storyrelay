import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
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

    const currentTime = new Date().toISOString();
    console.log("Current time:", currentTime);

    // Get unprocessed expired submissions (simple query!)
    const { data: unprocessedSubmissions, error: submissionsError } =
      await supabase
        .from("submissions")
        .select("*")
        .eq("story_id", activeStory.id)
        .eq("processed", false)
        .lt("round_end", currentTime)
        .order("round_end", { ascending: false }) // Most recent round first
        .order("votes", { ascending: false }) // Highest votes first
        .order("created_at", { ascending: true }); // Earliest created for ties

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

    // Group by round_end to process one round at a time
    const submissionsByRound = new Map();
    unprocessedSubmissions.forEach((sub) => {
      const roundKey = sub.round_end;
      if (!submissionsByRound.has(roundKey)) {
        submissionsByRound.set(roundKey, []);
      }
      submissionsByRound.get(roundKey).push(sub);
    });

    console.log(`Found ${submissionsByRound.size} unprocessed rounds`);

    // Process the most recent expired round
    const sortedRounds = Array.from(submissionsByRound.keys()).sort().reverse();
    const mostRecentRoundKey = sortedRounds[0];
    const roundSubmissions = submissionsByRound.get(mostRecentRoundKey);

    console.log(`Processing round: ${mostRecentRoundKey}`);
    console.log(`Round has ${roundSubmissions.length} submissions:`);
    roundSubmissions.forEach((sub) => {
      console.log(
        `  - "${sub.content}" (${sub.votes} votes, created: ${sub.created_at})`
      );
    });

    // Winner is already first due to our ordering
    const winner = roundSubmissions[0];
    console.log(`Winner: "${winner.content}" with ${winner.votes} votes`);

    // Mark ALL submissions in this round as processed
    const roundSubmissionIds = roundSubmissions.map((s) => s.id);
    const { error: markProcessedError } = await supabase
      .from("submissions")
      .update({ processed: true })
      .in("id", roundSubmissionIds);

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

    console.log(`Marked ${roundSubmissionIds.length} submissions as processed`);

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

      // Trigger AI to generate new story
      const baseUrl = req.nextUrl.origin;
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
