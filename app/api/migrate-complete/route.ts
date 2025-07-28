import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("Starting complete migration...");

    const migrationSteps = [
      {
        name: "Add processed column",
        sql: `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;`,
      },
      {
        name: "Set existing submissions as unprocessed",
        sql: `UPDATE submissions SET processed = FALSE WHERE processed IS NULL;`,
      },
      {
        name: "Create processed index",
        sql: `CREATE INDEX IF NOT EXISTS idx_submissions_processed ON submissions(processed);`,
      },
      {
        name: "Create processed + round_end index",
        sql: `CREATE INDEX IF NOT EXISTS idx_submissions_processed_round_end ON submissions(processed, round_end);`,
      },
      {
        name: "Create story + processed + round_end index",
        sql: `CREATE INDEX IF NOT EXISTS idx_submissions_story_processed_round ON submissions(story_id, processed, round_end);`,
      },
      {
        name: "Create settlement optimization index",
        sql: `CREATE INDEX IF NOT EXISTS idx_submissions_settlement ON submissions(story_id, processed, round_end DESC, votes DESC, created_at ASC);`,
      },
    ];

    const results = [];

    for (const step of migrationSteps) {
      console.log(`Executing: ${step.name}`);
      try {
        const { error } = await supabase.rpc("exec_sql", { sql: step.sql });
        if (error) {
          console.error(`Error in ${step.name}:`, error);
          results.push({
            step: step.name,
            status: "error",
            error: error.message,
          });
        } else {
          console.log(`✓ Completed: ${step.name}`);
          results.push({ step: step.name, status: "success" });
        }
      } catch (err) {
        console.error(`Exception in ${step.name}:`, err);
        results.push({ step: step.name, status: "error", error: err });
      }
    }

    // Get migration statistics
    const { data: stats } = await supabase
      .from("submissions")
      .select("processed, round_end");

    const totalSubmissions = stats?.length || 0;
    const unprocessed = stats?.filter((s) => s.processed === false).length || 0;
    const processed = stats?.filter((s) => s.processed === true).length || 0;
    const expired =
      stats?.filter((s) => new Date(s.round_end) < new Date()).length || 0;

    console.log("Migration completed");
    console.log("Statistics:", {
      totalSubmissions,
      unprocessed,
      processed,
      expired,
    });

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      results,
      statistics: {
        totalSubmissions,
        unprocessed,
        processed,
        expired,
      },
    });
  } catch (error) {
    console.error("Migration API error:", error);
    return NextResponse.json(
      { error: "Migration failed: " + error },
      { status: 500 }
    );
  }
}
