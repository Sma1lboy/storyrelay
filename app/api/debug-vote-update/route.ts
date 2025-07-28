import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const { submission_id } = await req.json();

    console.log('=== Debug Vote Update ===');
    console.log('User:', userId);
    console.log('Submission:', submission_id);

    // 1. Check current submission state
    const { data: beforeSubmission, error: beforeError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    console.log('Before submission:', beforeSubmission);
    console.log('Before error:', beforeError);

    if (!beforeSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // 2. Try direct update with detailed logging
    console.log(`Attempting to update votes from ${beforeSubmission.votes} to ${beforeSubmission.votes + 1}`);
    
    const { data: updateResult, error: updateError } = await supabase
      .from("submissions")
      .update({ votes: beforeSubmission.votes + 1 })
      .eq("id", submission_id)
      .select("*");

    console.log('Update result:', updateResult);
    console.log('Update error:', updateError);

    // 3. Check submission state after update
    const { data: afterSubmission, error: afterError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    console.log('After submission:', afterSubmission);
    console.log('After error:', afterError);

    // 4. Try using RPC approach
    console.log('Trying RPC approach...');
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('increment_votes', { submission_id });

    console.log('RPC result:', rpcResult);
    console.log('RPC error:', rpcError);

    // 5. Final state check
    const { data: finalSubmission } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    console.log('Final submission:', finalSubmission);

    // 6. Check RLS policies
    console.log('Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
          FROM pg_policies 
          WHERE tablename = 'submissions';
        `
      });

    console.log('RLS Policies:', policies);
    console.log('Policies error:', policiesError);

    return NextResponse.json({
      success: true,
      debug: {
        userId,
        submission_id,
        before: beforeSubmission,
        updateResult,
        updateError: updateError?.message,
        after: afterSubmission,
        rpcResult,
        rpcError: rpcError?.message,
        final: finalSubmission,
        policies,
        policiesError: policiesError?.message
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}