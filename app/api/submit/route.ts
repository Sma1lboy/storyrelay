import { auth } from "@clerk/nextjs/server";
import { getServiceSupabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content cannot be empty" },
        { status: 400 }
      );
    }

    if (content.length > 50) {
      return NextResponse.json(
        { error: "Content cannot exceed 50 characters" },
        { status: 400 }
      );
    }

    // Get active story
    const { data: activeStory, error: storyError } = await supabase
      .from("stories")
      .select("id, round_ids")
      .eq("is_active", true)
      .single();

    if (storyError || !activeStory) {
      return NextResponse.json(
        { error: "No active story found" },
        { status: 404 }
      );
    }

    let currentRoundId: string;

    // If no rounds exist, create the first one
    if (!activeStory.round_ids || activeStory.round_ids.length === 0) {
      currentRoundId = randomUUID();
      const { error: updateError } = await supabase
        .from("stories")
        .update({ round_ids: [currentRoundId] })
        .eq("id", activeStory.id);

      if (updateError) {
        console.error("Error starting first round:", updateError);
        return NextResponse.json(
          { error: "Failed to start first round" },
          { status: 500 }
        );
      }
    } else {
      currentRoundId = activeStory.round_ids[activeStory.round_ids.length - 1];
    }

    // Check if user already submitted for current round
    const { data: existingSubmission } = await supabase
      .from("submissions")
      .select("id")
      .eq("user_id", userId)
      .eq("round_id", currentRoundId)
      .single();

    if (existingSubmission) {
      return NextResponse.json(
        { error: "You have already submitted for this round" },
        { status: 400 }
      );
    }

    // Check if there are existing submissions in this round to reuse their round_end
    const { data: existingRoundSubmissions } = await supabase
      .from("submissions")
      .select("round_end")
      .eq("round_id", currentRoundId)
      .limit(1);

    // Get user info from Clerk
    const response = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    let userName = "Anonymous";
    if (response.ok) {
      const userData = await response.json();
      userName =
        userData.username ||
        userData.first_name ||
        userData.email_addresses?.[0]?.email_address?.split("@")[0] ||
        "Anonymous";
    }

    // Build submission data - reuse round_end from existing submissions in same round
    const submissionData: Record<string, unknown> = {
      story_id: activeStory.id,
      round_id: currentRoundId,
      content: content.trim(),
      user_id: userId,
      user_name: userName,
    };

    if (existingRoundSubmissions && existingRoundSubmissions.length > 0) {
      // Use the same round_end as other submissions in this round
      submissionData.round_end = existingRoundSubmissions[0].round_end;
    }
    // Otherwise, let the database default (now() + 1 hour) apply for the first submission

    // Insert submission
    const { error: insertError } = await supabase
      .from("submissions")
      .insert(submissionData);

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Submission failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
