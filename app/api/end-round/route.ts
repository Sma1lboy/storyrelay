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

    // Get unprocessed expired submissions for this story
    // No longer ordering by votes column (it no longer exists)
    const { data: unprocessedSubmissions, error: submissionsError } =
      await supabase
        .from("submissions")
        .select("*")
        .eq("story_id", activeStory.id)
        .eq("processed", false)
        .lt("round_end", currentTime)
        .order("round_end", { ascending: false })
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

    // Fetch vote counts for all unprocessed submissions from the votes table
    const submissionIds = unprocessedSubmissions.map((s) => s.id);
    const { data: voteCounts, error: voteCountError } = await supabase
      .from("votes")
      .select("submission_id")
      .in("submission_id", submissionIds);

    if (voteCountError) {
      console.error("Error fetching vote counts:", voteCountError);
      return NextResponse.json(
        { error: "Error fetching vote counts" },
        { status: 500 }
      );
    }

    // Build a map of submission_id -> vote count
    const voteCountMap = new Map<string, number>();
    (voteCounts || []).forEach((v) => {
      const count = voteCountMap.get(v.submission_id) || 0;
      voteCountMap.set(v.submission_id, count + 1);
    });

    // Attach vote counts to submissions
    const submissionsWithVotes = unprocessedSubmissions.map((sub) => ({
      ...sub,
      vote_count: voteCountMap.get(sub.id) || 0,
    }));

    // Group by round_end to process one round at a time
    const submissionsByRound = new Map<string, typeof submissionsWithVotes>();
    submissionsWithVotes.forEach((sub) => {
      const roundKey = sub.round_end;
      if (!submissionsByRound.has(roundKey)) {
        submissionsByRound.set(roundKey, []);
      }
      submissionsByRound.get(roundKey)!.push(sub);
    });

    console.log(`Found ${submissionsByRound.size} unprocessed rounds`);

    // Process the most recent expired round
    const sortedRounds = Array.from(submissionsByRound.keys()).sort().reverse();
    const mostRecentRoundKey = sortedRounds[0];
    const roundSubmissions = submissionsByRound.get(mostRecentRoundKey)!;

    // Sort round submissions by vote count (desc), then created_at (asc) for ties
    roundSubmissions.sort((a, b) => {
      if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    console.log(`Processing round: ${mostRecentRoundKey}`);
    console.log(`Round has ${roundSubmissions.length} submissions:`);
    roundSubmissions.forEach((sub) => {
      console.log(
        `  - "${sub.content}" (${sub.vote_count} votes, created: ${sub.created_at})`
      );
    });

    // Winner is first due to our sorting (highest votes, earliest created for ties)
    const winner = roundSubmissions[0];
    console.log(
      `Winner: "${winner.content}" with ${winner.vote_count} votes`
    );

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

    console.log(
      `Marked ${roundSubmissionIds.length} submissions as processed`
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
      votes: winner.vote_count,
      message: `Round settled. Winner: "${winner.content}" (${winner.vote_count} votes)`,
    });
  } catch (error) {
    console.error("Settle API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
