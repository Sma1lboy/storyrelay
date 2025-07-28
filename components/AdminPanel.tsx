"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Sparkles, Bot, Plus } from "lucide-react";
import { toast } from "sonner";

// Admin email check
const ADMIN_EMAILS = ["541898146chen@gmail.com"];

export function useIsAdmin() {
  const { user } = useUser();
  return user?.emailAddresses?.[0]?.emailAddress ? 
    ADMIN_EMAILS.includes(user.emailAddresses[0].emailAddress) : false;
}

export default function AdminPanel() {
  const [generating, setGenerating] = useState(false);
  const [settling, setSettling] = useState(false);
  const [generatingNew, setGeneratingNew] = useState(false);
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
        window.location.reload();
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
        window.location.reload();
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

  const handleSettle = async () => {
    setSettling(true);
    try {
      const response = await fetch("/api/settle", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success("Settlement completed!");
        window.location.reload();
      } else {
        toast.error("Error: " + result.error);
      }
    } catch (error) {
      console.error("Settle error:", error);
      toast.error(
        "Failed to settle: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setSettling(false);
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
          onClick={handleSettle}
          disabled={settling}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          {settling ? (
            <>
              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
              Settling...
            </>
          ) : (
            <>
              Settle Votes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}