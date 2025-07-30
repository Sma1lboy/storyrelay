import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
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

    // Insert submission
    const { error: insertError } = await supabase.from("submissions").insert({
      story_id: activeStory.id,
      round_id: currentRoundId,
      content: content.trim(),
      user_id: userId,
      user_name: userName,
    });

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
