"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminPanel, { useIsAdmin } from "@/components/AdminPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { LargeGridWithSpotlight } from "@/components/GridBackground";

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const isAdmin = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.push("/");
    }
  }, [isLoaded, isAdmin, router]);

  if (!isLoaded) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/20 flex items-center justify-center">
        <LargeGridWithSpotlight size="64" spotlightSize="40%" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/20">
      {/* Large Grid Background with Center Spotlight */}
      <LargeGridWithSpotlight size="64" spotlightSize="40%" />

      <div className="container max-w-2xl mx-auto px-6 py-12">
        <div className="text-center space-y-6 mb-12">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-title-2 font-bold">Admin Panel</h1>
          </div>
          <p className="text-body text-muted-foreground max-w-md mx-auto">
            Manage story generation, voting settlement, and system operations.
          </p>
        </div>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-title-4 flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Story Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdminPanel />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
