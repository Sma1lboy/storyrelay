"use client";

import { useEffect, useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { Vote, Clock, Trophy, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Define a strict type for our submission data based on database.sql
interface Submission {
  id: string;
  story_id: string;
  content: string;
  user_id: string;
  user_name: string;
  votes: number;
  created_at: string;
  round_end: string;
}

interface VoteListProps {
  refreshTrigger?: number;
}

export default function VoteList({ refreshTrigger }: VoteListProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    async function fetchSubmissions() {
      const { data: activeStory } = await supabase
        .from("stories")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!activeStory) {
        setLoading(false);
        return;
      }

      // Get current round submissions (not yet expired)
      const { data, error } = await supabase
        .from("submissions")
        .select("*") // Select all columns from submissions table
        .eq("story_id", activeStory.id)
        .gt("round_end", new Date().toISOString())
        .order("votes", { ascending: false })
        .order("created_at", { ascending: true }) // Tie-breaking by earliest created
        .limit(10);

      if (error) {
        console.error("Error fetching submissions:", error);
      } else {
        setSubmissions(data || []);
      }
      setLoading(false);
    }

    async function checkUserVote() {
      if (!user) return;

      const { data: activeStory } = await supabase
        .from("stories")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!activeStory) return;

      // Get current round submissions
      const { data: currentSubmissions } = await supabase
        .from("submissions")
        .select("id")
        .eq("story_id", activeStory.id)
        .gt("round_end", new Date().toISOString());

      if (!currentSubmissions || currentSubmissions.length === 0) return;

      const submissionIds = currentSubmissions.map((s) => s.id);

      // Check if user voted for any current submissions
      const { data, error } = await supabase
        .from("votes")
        .select("submission_id")
        .eq("user_id", user.id)
        .in("submission_id", submissionIds);

      if (!error && data && data.length > 0) {
        setUserVote(data[0].submission_id);
      }
    }

    fetchSubmissions();
    checkUserVote();

    const channel = supabase
      .channel("submission-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        () => {
          fetchSubmissions();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "submissions" },
        (payload) => {
          // Update specific submission in local state
          if (payload.new) {
            setSubmissions((prev) =>
              prev
                .map((submission) =>
                  submission.id === payload.new.id
                    ? { ...submission, votes: payload.new.votes }
                    : submission
                )
                .sort((a, b) => b.votes - a.votes)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes" },
        () => {
          // Re-fetch to get updated vote counts and check user vote
          fetchSubmissions();
          checkUserVote();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      async function refreshSubmissions() {
        const { data: activeStory } = await supabase
          .from("stories")
          .select("id")
          .eq("is_active", true)
          .single();

        if (!activeStory) return;

        const { data, error } = await supabase
          .from("submissions")
          .select("*")
          .eq("story_id", activeStory.id)
          .gt("round_end", new Date().toISOString())
          .order("votes", { ascending: false })
          .order("created_at", { ascending: true }) // Tie-breaking by earliest created
          .limit(10);

        if (!error) {
          setSubmissions(data || []);
        }
      }

      async function refreshUserVote() {
        if (!user) return;

        const { data: activeStory } = await supabase
          .from("stories")
          .select("id")
          .eq("is_active", true)
          .single();

        if (!activeStory) return;

        // Get current round submissions
        const { data: currentSubmissions } = await supabase
          .from("submissions")
          .select("id")
          .eq("story_id", activeStory.id)
          .gt("round_end", new Date().toISOString());

        if (!currentSubmissions || currentSubmissions.length === 0) {
          setUserVote(null);
          return;
        }

        const submissionIds = currentSubmissions.map((s) => s.id);

        // Check if user voted for any current submissions
        const { data, error } = await supabase
          .from("votes")
          .select("submission_id")
          .eq("user_id", user.id)
          .in("submission_id", submissionIds);

        if (!error && data && data.length > 0) {
          setUserVote(data[0].submission_id);
        } else {
          setUserVote(null);
        }
      }

      refreshSubmissions();
      refreshUserVote();
    }
  }, [refreshTrigger, user]);

  // Separate useEffect for countdown timer
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function setupCountdown() {
      // Always try to get the round end time from any current submissions first
      const { data: activeStory } = await supabase
        .from("stories")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!activeStory) {
        setCountdown(null);
        return;
      }

      // Get any submission from the current round to get the unified round_end time
      const { data: currentSubmissions, error } = await supabase
        .from("submissions")
        .select("round_end")
        .eq("story_id", activeStory.id)
        .gt("round_end", new Date().toISOString())
        .limit(1);

      if (error || !currentSubmissions || currentSubmissions.length === 0) {
        // Check if there are expired submissions that need to be settled
        const { data: expiredSubmissions } = await supabase
          .from("submissions")
          .select("round_end")
          .eq("story_id", activeStory.id)
          .lt("round_end", new Date().toISOString())
          .limit(1);

        if (expiredSubmissions && expiredSubmissions.length > 0) {
          // Round has ended, show countdown as 0 and trigger settlement
          setCountdown(0);
          // Auto-trigger settlement
          fetch("/api/settle", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }).catch((error) => {
            console.error("Auto-settlement failed:", error);
          });
          return;
        }

        // No active or expired rounds - keep showing "Loading round timer..."
        setCountdown(null);
        return;
      }

      const anyCurrentSubmission = currentSubmissions[0];

      const roundEndTime = new Date(anyCurrentSubmission.round_end).getTime();

      const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = roundEndTime - now;
        setCountdown(Math.max(0, Math.floor(distance / 1000)));
      };

      updateCountdown();
      intervalId = setInterval(updateCountdown, 1000);
    }

    setupCountdown();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [submissions]);

  const handleVote = async (submissionId: string) => {
    if (!user || userVote || voting) return;

    setVoting(submissionId);
    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submission_id: submissionId,
        }),
      });

      if (response.ok) {
        setUserVote(submissionId);
        // Update vote count in local state immediately
        setSubmissions(
          (prev) =>
            prev
              .map((submission) =>
                submission.id === submissionId
                  ? { ...submission, votes: submission.votes + 1 }
                  : submission
              )
              .sort((a, b) => b.votes - a.votes) // Re-sort by votes
        );
        toast.success("Vote submitted successfully!");
      } else {
        const error = await response.text();
        toast.error(`Voting failed: ${error}`);
      }
    } catch (error) {
      console.error("Vote error:", error);
      toast.error("Voting failed, please try again");
    } finally {
      setVoting(null);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardHeader className="space-element">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <Vote className="h-5 w-5 text-secondary-foreground" />
            </div>
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-element">
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="space-element">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <Vote className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle className="text-title-4">
                Vote for Next Sentence
              </CardTitle>
              <CardDescription className="text-body-sm mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {countdown !== null
                  ? countdown > 0
                    ? `Round ends in ${formatTime(countdown)}`
                    : "Round ended - waiting for settlement"
                  : "Loading round timer..."}
              </CardDescription>
            </div>
          </div>
          {userVote && (
            <Badge variant="secondary" className="text-caption">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Voted
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-element">
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Vote className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-body text-muted-foreground mb-2">
              No submissions yet
            </p>
            <p className="text-body-sm text-muted-foreground">
              Be the first to submit a sentence!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission, index) => {
              console.log("Rendering submission:", submission);
              const isUserVote = userVote === submission.id;
              const isLeading = index === 0 && submission.votes > 0;
              return (
                <Card
                  key={submission.id}
                  className={`card-interactive transition-smooth ${
                    isUserVote ? "ring-2 ring-primary/20 border-primary/30" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start gap-2">
                          {isLeading && (
                            <Trophy className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          )}
                          <p className="text-body font-medium leading-relaxed">
                            &ldquo;{submission.content}&rdquo;
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-caption text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>@{submission.user_name}</span>
                          <span>•</span>
                          <span>
                            {new Date(submission.created_at).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-body-sm font-semibold text-foreground">
                            {submission.votes}
                          </div>
                          <div className="text-caption text-muted-foreground">
                            {submission.votes === 1 ? "vote" : "votes"}
                          </div>
                        </div>

                        {user ? (
                          <Button
                            onClick={() => handleVote(submission.id)}
                            disabled={!!userVote || !!voting}
                            size="sm"
                            variant={isUserVote ? "secondary" : "default"}
                            className="transition-smooth min-w-[80px]"
                          >
                            {voting === submission.id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                                Voting
                              </>
                            ) : isUserVote ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-2" />
                                Voted
                              </>
                            ) : (
                              <>
                                <Vote className="h-3 w-3 mr-2" />
                                Vote
                              </>
                            )}
                          </Button>
                        ) : (
                          <SignInButton mode="modal">
                            <Button
                              size="sm"
                              className="transition-smooth min-w-[80px]"
                            >
                              <Vote className="h-3 w-3 mr-2" />
                              Vote
                            </Button>
                          </SignInButton>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
