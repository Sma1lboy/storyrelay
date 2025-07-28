import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log('=== Vote Fix API called ===')
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { submission_id } = await req.json();

    if (!submission_id) {
      return NextResponse.json(
        { error: "Missing submission_id" },
        { status: 400 }
      );
    }

    console.log(`User ${userId} voting for submission ${submission_id}`)

    // Get the submission to find the story and check round
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id, story_id, round_end")
      .eq("id", submission_id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: "Sentence not found" },
        { status: 404 }
      );
    }

    // Check if round is still active
    if (new Date(submission.round_end) <= new Date()) {
      return NextResponse.json({ error: "Voting has ended" }, { status: 400 });
    }

    // Get all current active submissions for this story
    const { data: activeSubmissions } = await supabase
      .from("submissions")
      .select("id")
      .eq("story_id", submission.story_id)
      .gt("round_end", new Date().toISOString());

    if (!activeSubmissions || activeSubmissions.length === 0) {
      return NextResponse.json(
        { error: "No active voting round" },
        { status: 400 }
      );
    }

    const activeSubmissionIds = activeSubmissions.map((s) => s.id);

    // Check if user already voted in this active round
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("user_id", userId)
      .in("submission_id", activeSubmissionIds)
      .single();

    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted in this round" },
        { status: 400 }
      );
    }

    // Insert vote
    console.log('Inserting vote record...')
    const { error: voteError } = await supabase.from("votes").insert({
      submission_id,
      user_id: userId,
    });

    if (voteError) {
      console.error("Vote insert error:", voteError);
      return NextResponse.json({ 
        error: "Voting failed: " + voteError.message 
      }, { status: 500 });
    }

    console.log("Vote inserted successfully");

    // Count total votes for this submission instead of updating votes column
    const { data: voteCount, error: countError } = await supabase
      .from("votes")
      .select("id", { count: 'exact' })
      .eq("submission_id", submission_id);

    if (countError) {
      console.error("Vote count error:", countError);
      return NextResponse.json({
        error: "Failed to count votes"
      }, { status: 500 });
    }

    const totalVotes = voteCount?.length || 0;
    console.log(`Total votes for submission ${submission_id}: ${totalVotes}`);

    // Also update the votes column for display purposes (but don't rely on it)
    await supabase
      .from("submissions")
      .update({ votes: totalVotes })
      .eq("id", submission_id);

    return NextResponse.json({ 
      success: true,
      newVoteCount: totalVotes,
      message: "Vote recorded successfully"
    });
  } catch (error) {
    console.error("Vote Fix API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}