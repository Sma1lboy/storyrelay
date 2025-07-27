import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Globe, Sparkles } from "lucide-react";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StoryRelay - Global Collaborative Storytelling",
  description:
    "Create collaborative stories with writers around the world. Submit sentences, vote for favorites, and watch stories unfold in real-time.",
  keywords:
    "collaborative writing, storytelling, creative writing, community, stories",
  authors: [{ name: "StoryRelay Team" }],
  creator: "StoryRelay",
  openGraph: {
    title: "StoryRelay - Global Collaborative Storytelling",
    description: "Create collaborative stories with writers around the world",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StoryRelay - Global Collaborative Storytelling",
    description: "Create collaborative stories with writers around the world",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "hsl(var(--color-primary))",
          colorBackground: "hsl(var(--color-background))",
          colorInputBackground: "hsl(var(--color-card))",
          colorInputText: "hsl(var(--color-foreground))",
          colorText: "hsl(var(--color-foreground))",
          colorTextSecondary: "hsl(var(--color-muted-foreground))",
          colorTextOnPrimaryBackground: "hsl(var(--color-primary-foreground))",
          colorNeutral: "hsl(var(--color-muted))",
          colorDanger: "hsl(var(--color-destructive))",
          colorSuccess: "hsl(142, 76%, 36%)",
          colorWarning: "hsl(38, 92%, 50%)",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-sans)",
          fontSize: "0.875rem",
          fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
          },
        },
        elements: {
          card: "card-elevated",
          headerTitle: "text-title-4",
          headerSubtitle: "text-body-sm text-muted-foreground",
          socialButtonsBlockButton: "transition-smooth hover:scale-[0.98]",
          socialButtonsBlockButtonText: "text-body-sm",
          formButtonPrimary: "transition-smooth hover:scale-[0.98]",
          footerActionText: "text-caption",
          footerActionLink:
            "text-primary hover:text-primary/80 transition-smooth",
          identityPreviewText: "text-body-sm",
          identityPreviewEditButton: "text-caption",
          formFieldLabel: "text-body-sm font-medium",
          formFieldInput: "focus-ring transition-smooth",
          formFieldInputShowPasswordButton: "transition-smooth",
          dividerLine: "border-border/50",
          dividerText: "text-caption text-muted-foreground",
          alert: "card-elevated",
          alertText: "text-body-sm",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased ",
            inter.variable
          )}
        >
          <header className="sticky top-0 z-50 w-full border-b border-border/40  backdrop-blur-md supports-[backdrop-filter]:bg-background/60 ">
            <div className=" w-full flex h-16  items-center justify-between px-10">
              <Link
                href="/"
                className="flex items-center gap-2 transition-smooth hover:opacity-80"
              >
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <span className="text-title-5 font-semibold">StoryRelay</span>
              </Link>

              <nav className="flex items-center gap-3">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-caption font-medium text-primary tracking-wide uppercase">
                    Beta
                  </span>
                </div>
                <SignedOut>
                  <SignInButton>
                    <Button variant="ghost" className="transition-smooth">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignUpButton>
                    <Button className="transition-smooth">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Get Started
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8 transition-smooth hover:scale-105",
                      },
                    }}
                  />
                </SignedIn>
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-border/40 bg-secondary/30">
            <div className="container max-w-screen-2xl px-4 py-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/10">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-body-sm text-muted-foreground">
                    StoryRelay - Where stories come to life through
                    collaboration
                  </span>
                </div>
                <div className="text-caption text-muted-foreground">
                  Built with ❤️ for creative writers worldwide
                </div>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
