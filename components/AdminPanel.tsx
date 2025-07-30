"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Bot,
  Plus,
  RotateCcw,
  Trash2,
  Bug,
  Database,
  FastForward,
  Settings,
  TestTube,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// Admin email check
const ADMIN_EMAILS = ["541898146chen@gmail.com"];

export function useIsAdmin() {
  const { user } = useUser();
  return user?.emailAddresses?.[0]?.emailAddress
    ? ADMIN_EMAILS.includes(user.emailAddresses[0].emailAddress)
    : false;
}

export default function AdminPanel() {
  const [generating, setGenerating] = useState(false);
  const [settling, setSettling] = useState(false);
  const [generatingNew, setGeneratingNew] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [debugging, setDebugging] = useState(false);
  const [forceEnding, setForceEnding] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [softResetting, setSoftResetting] = useState(false);
  const [creatingFunction, setCreatingFunction] = useState(false);
  const [debuggingVote, setDebuggingVote] = useState(false);
  const [fixingRLS, setFixingRLS] = useState(false);
  const isAdmin = useIsAdmin();

  if (!isAdmin) {
    return null;
  }

  const handleGenerateStory = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/generate-story", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success("AI story generated successfully!");
        // Don't reload, let user navigate back manually
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Generate story error:", error);
      toast.error(
        "Failed to generate story: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateNewStory = async () => {
    setGeneratingNew(true);
    try {
      const response = await fetch("/api/generate-new-story", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success("New story generated successfully!");
        // Don't reload, let user navigate back manually
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Generate new story error:", error);
      toast.error(
        "Failed to generate new story: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setGeneratingNew(false);
    }
  };

  const handleEndRound = async () => {
    setSettling(true);
    try {
      const response = await fetch("/api/end-round", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Round ended! Winner: "${result.winner}" (${result.votes} votes)`
        );
        // Don't reload, let user navigate back manually
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("End round error:", error);
      toast.error(
        "Failed to end round: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setSettling(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "Are you sure you want to reset the entire database? This will delete all stories, submissions, and votes!"
      )
    ) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success("Database reset completed!");
        // Don't reload, let user navigate back manually
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Reset error:", error);
      toast.error(
        "Failed to reset: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setResetting(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const response = await fetch("/api/cleanup", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        // Don't reload, let user navigate back manually
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      toast.error(
        "Failed to cleanup: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setCleaning(false);
    }
  };

  const handleDebug = async () => {
    setDebugging(true);
    try {
      const response = await fetch("/api/debug", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("=== DEBUG INFO ===");
        console.log("Current Time:", result.data.currentTime);
        console.log("Active Submissions:", result.data.activeSubmissions);
        console.log("Expired Submissions:", result.data.expiredSubmissions);
        console.log("Stories:", result.data.stories);
        console.log("Submissions:", result.data.submissions);
        console.log("Votes:", result.data.votes);
        console.log("=== END DEBUG ===");

        toast.success(
          `Debug info logged to console. Active: ${result.data.activeSubmissions}, Expired: ${result.data.expiredSubmissions}`
        );
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Debug error:", error);
      toast.error(
        "Failed to debug: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setDebugging(false);
    }
  };

  const handleForceEndRound = async () => {
    if (
      !confirm(
        "Are you sure you want to force end the current round? This will immediately expire all active submissions and trigger settlement."
      )
    ) {
      return;
    }

    setForceEnding(true);
    try {
      const response = await fetch("/api/force-end-round", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        console.log("Force end round result:", result);
        // Don't reload, let user navigate back manually
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Force end round error:", error);
      toast.error(
        "Failed to force end round: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setForceEnding(false);
    }
  };

  const handleMigration = async () => {
    if (
      !confirm(
        'This will add a "processed" column and optimize the submissions table with indexes. Continue?'
      )
    ) {
      return;
    }

    setMigrating(true);
    try {
      const response = await fetch("/api/migrate-complete", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Migration results:", result.results);
        console.log("Statistics:", result.statistics);
        toast.success(
          `Migration completed! ${result.statistics.totalSubmissions} submissions, ${result.statistics.unprocessed} unprocessed`
        );
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Migration error:", error);
      toast.error(
        "Failed to migrate: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setMigrating(false);
    }
  };

  const handleTestSettlement = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/test-settlement", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Settlement test results:", result);
        toast.success(
          `Test completed! ${result.statistics.unprocessedExpired} unprocessed expired, ${result.statistics.activeSubmissions} active`
        );
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Test settlement error:", error);
      toast.error(
        "Failed to test: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSoftReset = async () => {
    if (
      !confirm(
        "⚠️ SOFT RESET: This will deactivate the current story, delete ALL submissions and votes, then generate a fresh new story. This action cannot be undone. Continue?"
      )
    ) {
      return;
    }

    setSoftResetting(true);
    try {
      const response = await fetch("/api/soft-reset", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Soft reset result:", result);
        toast.success(result.message);
        // Don't reload to let user see the result
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Soft reset error:", error);
      toast.error(
        "Failed to soft reset: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setSoftResetting(false);
    }
  };

  const handleCreateVoteFunction = async () => {
    setCreatingFunction(true);
    try {
      const response = await fetch("/api/create-vote-function", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Create function error:", error);
      toast.error(
        "Failed to create function: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setCreatingFunction(false);
    }
  };

  const handleDebugVoteUpdate = async () => {
    const submissionId = prompt("Enter submission ID to debug:");
    if (!submissionId) return;

    setDebuggingVote(true);
    try {
      const response = await fetch("/api/debug-vote-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submission_id: submissionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Vote debug results:", result.debug);
        toast.success("Debug completed! Check console for details.");
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Debug vote error:", error);
      toast.error(
        "Failed to debug vote: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setDebuggingVote(false);
    }
  };

  const handleFixRLS = async () => {
    if (
      !confirm(
        "This will recreate RLS policies for submissions and votes tables. Continue?"
      )
    ) {
      return;
    }

    setFixingRLS(true);
    try {
      const response = await fetch("/api/fix-rls-policies", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("RLS policies updated:", result);
        toast.success(result.message);
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Fix RLS error:", error);
      toast.error(
        "Failed to fix RLS: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setFixingRLS(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Admin Panel</span>
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleGenerateStory}
          disabled={generating}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          {generating ? (
            <>
              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3 mr-2" />
              Generate Story
            </>
          )}
        </Button>

        <Button
          onClick={handleGenerateNewStory}
          disabled={generatingNew}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          {generatingNew ? (
            <>
              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
              Creating New...
            </>
          ) : (
            <>
              <Plus className="h-3 w-3 mr-2" />
              Generate New Story
            </>
          )}
        </Button>

        <Button
          onClick={handleEndRound}
          disabled={settling}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          {settling ? (
            <>
              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
              Ending Round...
            </>
          ) : (
            <>End Round</>
          )}
        </Button>

        <Button
          onClick={handleForceEndRound}
          disabled={forceEnding}
          variant="secondary"
          size="sm"
          className="w-full justify-start"
        >
          {forceEnding ? (
            <>
              <div className="w-3 h-3 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin mr-2" />
              Force Ending...
            </>
          ) : (
            <>
              <FastForward className="h-3 w-3 mr-2" />
              Force End Round
            </>
          )}
        </Button>

        <div className="border-t pt-3">
          <div className="text-xs text-muted-foreground mb-2">
            Story Management
          </div>

          <Button
            onClick={handleSoftReset}
            disabled={softResetting}
            variant="destructive"
            size="sm"
            className="w-full justify-start mb-2"
          >
            {softResetting ? (
              <>
                <div className="w-3 h-3 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin mr-2" />
                Soft Resetting...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Soft Reset Story
              </>
            )}
          </Button>
        </div>

        <div className="border-t pt-3">
          <div className="text-xs text-muted-foreground mb-2">
            Debug & Cleanup
          </div>

          <Button
            onClick={handleDebug}
            disabled={debugging}
            variant="outline"
            size="sm"
            className="w-full justify-start mb-2"
          >
            {debugging ? (
              <>
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                Debugging...
              </>
            ) : (
              <>
                <Bug className="h-3 w-3 mr-2" />
                Debug Info
              </>
            )}
          </Button>

          <Button
            onClick={handleDebugVoteUpdate}
            disabled={debuggingVote}
            variant="outline"
            size="sm"
            className="w-full justify-start mb-2"
          >
            {debuggingVote ? (
              <>
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                Debugging Vote...
              </>
            ) : (
              <>
                <Bug className="h-3 w-3 mr-2" />
                Debug Vote Update
              </>
            )}
          </Button>

          <Button
            onClick={handleMigration}
            disabled={migrating}
            variant="outline"
            size="sm"
            className="w-full justify-start mb-2"
          >
            {migrating ? (
              <>
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                Migrating...
              </>
            ) : (
              <>
                <Settings className="h-3 w-3 mr-2" />
                Migrate Database
              </>
            )}
          </Button>

          <Button
            onClick={handleCreateVoteFunction}
            disabled={creatingFunction}
            variant="outline"
            size="sm"
            className="w-full justify-start mb-2"
          >
            {creatingFunction ? (
              <>
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Database className="h-3 w-3 mr-2" />
                Create Vote Function
              </>
            )}
          </Button>

          <Button
            onClick={handleFixRLS}
            disabled={fixingRLS}
            variant="outline"
            size="sm"
            className="w-full justify-start mb-2"
          >
            {fixingRLS ? (
              <>
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                Fixing RLS...
              </>
            ) : (
              <>
                <Settings className="h-3 w-3 mr-2" />
                Fix RLS Policies
              </>
            )}
          </Button>

          <Button
            onClick={handleTestSettlement}
            disabled={testing}
            variant="outline"
            size="sm"
            className="w-full justify-start mb-2"
          >
            {testing ? (
              <>
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="h-3 w-3 mr-2" />
                Test Settlement
              </>
            )}
          </Button>

          <Button
            onClick={handleCleanup}
            disabled={cleaning}
            variant="outline"
            size="sm"
            className="w-full justify-start mb-2"
          >
            {cleaning ? (
              <>
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 className="h-3 w-3 mr-2" />
                Cleanup Expired
              </>
            )}
          </Button>

          <Button
            onClick={handleReset}
            disabled={resetting}
            variant="destructive"
            size="sm"
            className="w-full justify-start"
          >
            {resetting ? (
              <>
                <div className="w-3 h-3 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin mr-2" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="h-3 w-3 mr-2" />
                Reset Database
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
