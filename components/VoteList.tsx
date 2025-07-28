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

export default function VoteList() {
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

      // Use the correct select query and get typed data
      const { data, error } = await supabase
        .from("submissions")
        .select("*") // Select all columns from submissions table
        .eq("story_id", activeStory.id)
        .gt("round_end", new Date().toISOString())
        .order("votes", { ascending: false })
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

      const { data, error } = await supabase
        .from("votes")
        .select("submission_id")
        .eq("user_id", user.id);

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
        { event: "*", schema: "public", table: "submissions" },
        () => {
          fetchSubmissions();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => {
          fetchSubmissions();
          checkUserVote();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Separate useEffect for countdown timer
  useEffect(() => {
    if (submissions.length > 0) {
      const roundEnd = new Date(submissions[0].round_end).getTime();
      const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = roundEnd - now;
        setCountdown(Math.max(0, Math.floor(distance / 1000)));
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
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
      } else {
        const error = await response.text();
        alert(`Voting failed: ${error}`);
      }
    } catch (error) {
      console.error("Vote error:", error);
      alert("Voting failed, please try again");
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
                  ? `Round ends in ${formatTime(countdown)}`
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
