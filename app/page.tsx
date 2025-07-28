"use client";

import { useState } from "react";
import Story from "@/components/Story";
import VoteList from "@/components/VoteList";

export default function Home() {
  const [voteListRefresh, setVoteListRefresh] = useState(0);

  const handleSubmissionAdded = () => {
    setVoteListRefresh(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/20">
      {/* Book/Lyrical Style Layout */}
      <div className="container max-w-4xl mx-auto px-6 py-12">
        {/* Opening Verse */}
        <div className="text-center space-y-8 mb-16">
          {/* Poetic Description */}
          <div className="max-w-2xl mx-auto space-y-6 text-center">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-border to-transparent mx-auto"></div>
            <p className="text-body text-muted-foreground max-w-lg mx-auto">
              Create collaborative stories with writers around the world. Submit
              sentences, vote for favorites, and watch stories unfold in
              real-time.
            </p>
          </div>
        </div>

        {/* Story Content - Book Style */}
        <div className="space-y-12">
          <Story onSubmissionAdded={handleSubmissionAdded} />

          {/* Voting Section - Always Show */}
          <VoteList refreshTrigger={voteListRefresh} />
        </div>
      </div>
    </div>
  );
}
