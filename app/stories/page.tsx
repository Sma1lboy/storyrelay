"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Story } from "@/lib/supabase";
import { DramaticGridSpotlight } from "@/components/GridBackground";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Users,
  Calendar,
  FileText,
  ArrowLeft,
  Library,
} from "lucide-react";
import { format } from "date-fns";

interface StoryWithMeta extends Story {
  contributorCount: number;
}

export default function StoriesArchivePage() {
  const [stories, setStories] = useState<StoryWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArchivedStories() {
      // Fetch all completed stories
      const { data: storiesData, error: storiesError } = await supabase
        .from("stories")
        .select("*")
        .eq("is_active", false)
        .order("created_at", { ascending: false });

      if (storiesError) {
        console.error("Error fetching stories:", storiesError);
        setLoading(false);
        return;
      }

      if (!storiesData || storiesData.length === 0) {
        setStories([]);
        setLoading(false);
        return;
      }

      // Fetch contributor counts for each story
      const storiesWithMeta: StoryWithMeta[] = await Promise.all(
        storiesData.map(async (story) => {
          const { data: submissions } = await supabase
            .from("submissions")
            .select("user_name")
            .eq("story_id", story.id)
            .eq("processed", true);

          const uniqueContributors = new Set(
            submissions?.map((s) => s.user_name) || []
          );

          return {
            ...story,
            contributorCount: uniqueContributors.size,
          } as StoryWithMeta;
        })
      );

      setStories(storiesWithMeta);
      setLoading(false);
    }

    fetchArchivedStories();
  }, []);

  const getSentenceCount = (content: string) => {
    return content.split("\u3002").filter((s) => s.trim()).length;
  };

  const getExcerpt = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + "...";
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/20">
      <DramaticGridSpotlight size="80" spotlightSize="50%" />

      <div className="container max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="space-y-8 mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-body-sm text-muted-foreground hover:text-foreground transition-smooth"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-3 mx-auto">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Library className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h1 className="text-title-2 font-serif tracking-tight">
              Story Archive
            </h1>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-border to-transparent mx-auto" />
            <p className="text-body text-muted-foreground max-w-lg mx-auto">
              A collection of completed collaborative stories, written by our
              community of storytellers.
            </p>
          </div>
        </div>

        {/* Story List */}
        {loading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="card-elevated">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-16 w-full" />
                    <div className="flex gap-3">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="relative bg-gradient-to-br from-card via-card/95 to-secondary/10 rounded-2xl border border-border/40 shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="p-4 rounded-2xl bg-secondary/50 mb-6">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-title-4 mb-2">No completed stories yet</h2>
              <p className="text-body text-muted-foreground max-w-md">
                Stories will appear here once they reach their full length and
                are completed. Head back to the home page to contribute to the
                current story!
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-body-sm font-medium hover:bg-primary/90 transition-smooth"
              >
                <FileText className="h-4 w-4" />
                Write the current story
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {stories.map((story) => (
              <Link key={story.id} href={`/stories/${story.id}`}>
                <div className="group relative bg-gradient-to-br from-card via-card/95 to-secondary/10 rounded-2xl border border-border/40 shadow-lg backdrop-blur-sm overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                  {/* Top gradient accent */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20 group-hover:from-primary/40 group-hover:via-primary/80 group-hover:to-primary/40 transition-all duration-300" />
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl" />

                  <div className="p-6 sm:p-8">
                    {/* Story header */}
                    <div className="flex items-start gap-4 mb-5">
                      <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-smooth">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-title-4 tracking-tight truncate">
                            Completed Story
                          </h3>
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase tracking-wider shrink-0"
                          >
                            Complete
                          </Badge>
                        </div>
                        <p className="text-caption text-muted-foreground">
                          {story.created_at
                            ? format(
                                new Date(story.created_at),
                                "MMMM d, yyyy"
                              )
                            : "Unknown date"}
                        </p>
                      </div>
                    </div>

                    {/* Excerpt */}
                    <div className="relative mb-5">
                      <div className="absolute -top-1 -left-1 text-4xl text-primary/10 font-serif leading-none select-none">
                        &ldquo;
                      </div>
                      <div className="bg-gradient-to-br from-secondary/30 to-transparent rounded-xl p-4 border border-border/30">
                        <p className="text-body text-foreground/80 leading-relaxed pl-4 italic">
                          {getExcerpt(story.content)}
                        </p>
                      </div>
                    </div>

                    {/* Metadata badges */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        <span>{story.content.length} chars</span>
                      </div>
                      <div className="w-px h-3.5 bg-border/50" />
                      <div className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>
                          {getSentenceCount(story.content)} sentence
                          {getSentenceCount(story.content) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="w-px h-3.5 bg-border/50" />
                      <div className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          {story.contributorCount} contributor
                          {story.contributorCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {story.created_at && (
                        <>
                          <div className="w-px h-3.5 bg-border/50" />
                          <div className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {format(
                                new Date(story.created_at),
                                "MMM d, yyyy"
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
