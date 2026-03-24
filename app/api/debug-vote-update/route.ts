import { auth } from "@clerk/nextjs/server";
import { getServiceSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const { userId } = await auth();
    const { submission_id } = await req.json();

    console.log('=== Debug Vote Update ===');
    console.log('User:', userId);
    console.log('Submission:', submission_id);

    // 1. Check current submission state
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    console.log('Submission:', submission);
    console.log('Submission error:', submissionError);

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // 2. Count votes from votes table (single source of truth)
    const { count: voteCount, error: countError } = await supabase
      .from("votes")
      .select("*", { count: 'exact', head: true })
      .eq("submission_id", submission_id);

    console.log('Vote count from votes table:', voteCount);
    console.log('Count error:', countError);

    // 3. Get individual vote records
    const { data: voteRecords, error: votesError } = await supabase
      .from("votes")
      .select("*")
      .eq("submission_id", submission_id);

    console.log('Vote records:', voteRecords);
    console.log('Votes error:', votesError);

    return NextResponse.json({
      success: true,
      debug: {
        userId,
        submission_id,
        submission,
        voteCount: voteCount ?? 0,
        voteRecords: voteRecords || [],
        countError: countError?.message,
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
