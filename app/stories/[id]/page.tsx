"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase, type Story, type Submission } from "@/lib/supabase";
import { DramaticGridSpotlight } from "@/components/GridBackground";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Users,
  Calendar,
  FileText,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

interface SentenceAttribution {
  sentence: string;
  contributor: string | null;
}

export default function StoryDetailPage() {
  const params = useParams();
  const storyId = params.id as string;

  const [story, setStory] = useState<Story | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchStoryDetail() {
      // Fetch the story
      const { data: storyData, error: storyError } = await supabase
        .from("stories")
        .select("*")
        .eq("id", storyId)
        .single();

      if (storyError || !storyData) {
        console.error("Error fetching story:", storyError);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setStory(storyData as Story);

      // Fetch all processed submissions for this story
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select("*")
        .eq("story_id", storyId)
        .eq("processed", true)
        .order("created_at", { ascending: true });

      if (submissionsError) {
        console.error("Error fetching submissions:", submissionsError);
      } else {
        setSubmissions((submissionsData as Submission[]) || []);
      }

      setLoading(false);
    }

    if (storyId) {
      fetchStoryDetail();
    }
  }, [storyId]);

  const getAttributedSentences = (): SentenceAttribution[] => {
    if (!story) return [];

    const sentences = story.content
      .split("\u3002")
      .filter((s) => s.trim())
      .map((s) => s.trim() + "\u3002");

    return sentences.map((sentence) => {
      // Try to find a submission that matches this sentence
      const cleanSentence = sentence.replace(/\u3002$/, "").trim();
      const matchingSubmission = submissions.find((sub) => {
        const cleanSubmission = sub.content.replace(/\u3002$/, "").trim();
        return (
          cleanSentence === cleanSubmission ||
          cleanSentence.includes(cleanSubmission) ||
          cleanSubmission.includes(cleanSentence)
        );
      });

      return {
        sentence,
        contributor: matchingSubmission ? matchingSubmission.user_name : null,
      };
    });
  };

  const getUniqueContributors = () => {
    return new Set(submissions.map((s) => s.user_name));
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/20">
        <DramaticGridSpotlight size="80" spotlightSize="50%" />
        <div className="container max-w-3xl mx-auto px-6 py-12">
          <Skeleton className="h-5 w-32 mb-8" />
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-10 w-10 rounded-xl mx-auto" />
              <Skeleton className="h-8 w-64 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
            <div className="flex justify-center gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="space-y-6 mt-12">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !story) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/20">
        <DramaticGridSpotlight size="80" spotlightSize="50%" />
        <div className="container max-w-3xl mx-auto px-6 py-12">
          <Link
            href="/stories"
            className="inline-flex items-center gap-2 text-body-sm text-muted-foreground hover:text-foreground transition-smooth mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Archive
          </Link>

          <div className="relative bg-gradient-to-br from-card via-card/95 to-secondary/10 rounded-2xl border border-border/40 shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="p-4 rounded-2xl bg-secondary/50 mb-6">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-title-4 mb-2">Story not found</h2>
              <p className="text-body text-muted-foreground max-w-md">
                This story may have been removed, or the link might be
                incorrect.
              </p>
              <Link
                href="/stories"
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-body-sm font-medium hover:bg-primary/90 transition-smooth"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Archive
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const attributedSentences = getAttributedSentences();
  const uniqueContributors = getUniqueContributors();
  const sentenceCount = attributedSentences.length;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/20">
      <DramaticGridSpotlight size="80" spotlightSize="50%" />

      <div className="container max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/stories"
          className="inline-flex items-center gap-2 text-body-sm text-muted-foreground hover:text-foreground transition-smooth mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Archive
        </Link>

        {/* Story container */}
        <div className="relative bg-gradient-to-br from-card via-card/95 to-secondary/10 rounded-2xl border border-border/40 shadow-lg backdrop-blur-sm overflow-hidden">
          {/* Decorative top bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl" />

          {/* Header */}
          <div className="relative px-8 pt-8 pb-6 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-title-2 font-serif tracking-tight mb-2">
              A Completed Tale
            </h1>
            <p className="text-body-sm text-muted-foreground">
              {story.created_at
                ? format(new Date(story.created_at), "MMMM d, yyyy")
                : "Unknown date"}
            </p>

            {/* Metadata badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <Badge
                variant="secondary"
                className="inline-flex items-center gap-1.5 px-3 py-1"
              >
                <FileText className="h-3 w-3" />
                {story.content.length} characters
              </Badge>
              <Badge
                variant="secondary"
                className="inline-flex items-center gap-1.5 px-3 py-1"
              >
                <BookOpen className="h-3 w-3" />
                {sentenceCount} sentence{sentenceCount !== 1 ? "s" : ""}
              </Badge>
              <Badge
                variant="secondary"
                className="inline-flex items-center gap-1.5 px-3 py-1"
              >
                <Users className="h-3 w-3" />
                {uniqueContributors.size} contributor
                {uniqueContributors.size !== 1 ? "s" : ""}
              </Badge>
              {story.updated_at && (
                <Badge
                  variant="secondary"
                  className="inline-flex items-center gap-1.5 px-3 py-1"
                >
                  <Calendar className="h-3 w-3" />
                  Completed{" "}
                  {format(new Date(story.updated_at), "MMM d, yyyy")}
                </Badge>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="px-8">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          {/* Story content with attribution */}
          <div className="px-8 py-8">
            <div className="relative">
              {/* Decorative opening quote */}
              <div className="absolute -top-2 -left-2 text-6xl text-primary/10 font-serif leading-none select-none">
                &ldquo;
              </div>

              <div className="relative bg-gradient-to-br from-secondary/30 to-transparent rounded-xl p-6 sm:p-8 border border-border/30">
                <div className="space-y-6">
                  {attributedSentences.map((item, index) => (
                    <div key={index} className="group/sentence">
                      <p className="text-body leading-relaxed text-foreground font-medium tracking-wide mb-1.5">
                        {item.sentence}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {item.contributor ? (
                          <>
                            <span className="text-caption text-muted-foreground/70">
                              &mdash;
                            </span>
                            <span className="text-caption text-primary/60 font-medium">
                              @{item.contributor}
                            </span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 text-muted-foreground/50" />
                            <span className="text-caption text-muted-foreground/50 italic">
                              Story Opening
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative closing quote */}
              <div className="absolute -bottom-4 -right-2 text-6xl text-primary/10 font-serif leading-none select-none rotate-180">
                &rdquo;
              </div>
            </div>
          </div>

          {/* Contributors section */}
          {uniqueContributors.size > 0 && (
            <>
              <div className="px-8">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
              <div className="px-8 py-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-body-sm font-medium text-muted-foreground">
                    Contributors
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(uniqueContributors).map((name) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className="px-3 py-1 text-caption"
                    >
                      @{name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Floating decorative elements */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary/20 rounded-full blur-sm" />
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-primary/10 rounded-full blur-sm" />
      </div>
    </div>
  );
}
