"use client";

import { useEffect, useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { supabase, type Story } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, FileText, PenTool, Send } from "lucide-react";

export default function StoryComponent() {
  const { user } = useUser();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  useEffect(() => {
    async function fetchActiveStory() {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) {
        console.error("Error fetching story:", error);
      } else {
        setStory(data);
      }
      setLoading(false);
    }

    fetchActiveStory();

    const channel = supabase
      .channel("story-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stories" },
        (payload) => {
          if (payload.new.is_active) {
            setStory(payload.new as Story);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
        }),
      });

      if (response.ok) {
        setContent("");
        setShowSubmitForm(false);
      } else {
        const error = await response.text();
        alert(`Submission failed: ${error}`);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Submission failed, please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const charactersRemaining = 50 - content.length;
  const isNearLimit = charactersRemaining <= 10;
  const isValid = content.trim().length > 0 && content.length <= 50;

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardHeader className="space-element">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <BookOpen className="h-5 w-5 text-secondary-foreground" />
            </div>
            <Skeleton className="h-7 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-element">
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-5 w-32" />
        </CardFooter>
      </Card>
    );
  }

  if (!story) {
    return (
      <Card className="card-elevated">
        <CardHeader className="space-element">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <BookOpen className="h-5 w-5 text-secondary-foreground" />
            </div>
            <CardTitle className="text-title-4">Current Story</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-body text-muted-foreground">
              No active story available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sentences = story.content.split("。").filter((s) => s.trim());
  const lastSentence = sentences.pop() || "";
  const progressPercentage = Math.round((story.content.length / 1000) * 100);

  return (
    <div className="relative">
      {/* Book-style Story Container */}
      <div className="relative bg-gradient-to-br from-card via-card/95 to-secondary/10 rounded-2xl border border-border/40 shadow-lg backdrop-blur-sm overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl"></div>

        {/* Header - Book Title Style */}
        <div className="relative px-8 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-title-3 tracking-tight leading-tight">
                    Our Living Story
                  </h2>
                  <p className="text-body-sm text-muted-foreground">
                    Chapter {Math.ceil(story.content.length / 100)} • Verse in
                    Progress
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Story Content - Poetry/Book Style */}
        <div className="px-8 pb-8">
          <div className="relative">
            {/* Decorative Quote Mark */}
            <div className="absolute -top-2 -left-2 text-6xl text-primary/10 font-serif leading-none select-none">
              &ldquo;
            </div>

            {/* Story Text */}
            <div className="relative bg-gradient-to-br from-secondary/30 to-transparent rounded-xl p-6 border border-border/30">
              <div className="prose prose-lg max-w-none">
                <div className="text-body leading-relaxed text-foreground font-medium tracking-wide">
                  {sentences.length > 0 && (
                    <div className="space-y-4">
                      {sentences.map((sentence, index) => (
                        <p key={index} className="mb-3 last:mb-0">
                          {sentence}。
                        </p>
                      ))}
                    </div>
                  )}

                  {lastSentence && (
                    <div className="mt-6 pt-4 border-t border-border/30">
                      <div className="relative">
                        <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-primary/60 to-primary/20 rounded-full"></div>
                        <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-4 border-l-4 border-primary/30">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 w-2 h-2 bg-primary/60 rounded-full flex-shrink-0 animate-pulse"></div>
                            <p className="text-body text-primary/90 font-medium italic leading-relaxed">
                              {lastSentence}。
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Decorative Closing Quote */}
            <div className="absolute -bottom-4 -right-2 text-6xl text-primary/10 font-serif leading-none select-none rotate-180">
              &rdquo;
            </div>
          </div>
        </div>

        {/* Submit Form - Collapsible */}
        {showSubmitForm && user && (
          <div className="px-8 pb-6 border-t border-border/30">
            <form onSubmit={handleSubmit} className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <PenTool className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-body-sm font-medium">
                      Continue the Story
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      Add your sentence to the narrative
                    </p>
                  </div>
                </div>

                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the next sentence..."
                  maxLength={50}
                  rows={2}
                  disabled={submitting}
                  className={`resize-none focus-ring transition-smooth ${
                    isNearLimit
                      ? "border-destructive/50 focus:border-destructive"
                      : ""
                  }`}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-caption">
                    <span
                      className={`font-medium transition-smooth ${
                        isNearLimit
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {content.length}/50
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSubmitForm(false)}
                      className="transition-smooth"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!isValid || submitting}
                      size="sm"
                      className="transition-smooth"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3 mr-2" />
                          Submit
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Progress Footer - Book Style */}
        <div className="px-8 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-caption text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{story.content.length} of 1000 words</span>
              </div>
              <div className="w-px h-4 bg-border/50"></div>
              <div className="flex items-center gap-2">
                <span>
                  {sentences.length + (lastSentence ? 1 : 0)} sentences
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-caption font-medium text-foreground">
                    {progressPercentage}% Complete
                  </div>
                </div>
                <div className="w-32 h-3 bg-secondary/60 rounded-full overflow-hidden border border-border/30">
                  <div
                    className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
              {user ? (
                !showSubmitForm && (
                  <Button
                    onClick={() => setShowSubmitForm(true)}
                    size="sm"
                    className="transition-smooth"
                  >
                    <PenTool className="h-3 w-3 mr-2" />
                    Add Next Sentence
                  </Button>
                )
              ) : (
                <SignInButton mode="modal">
                  <Button
                    size="sm"
                    className="transition-smooth"
                    variant="outline"
                  >
                    <PenTool className="h-3 w-3 mr-2" />
                    Add Next Sentence
                  </Button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Decorative Elements */}
      <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary/20 rounded-full blur-sm"></div>
      <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-primary/10 rounded-full blur-sm"></div>
    </div>
  );
}
