"use client";

import { UserButton } from "@clerk/nextjs";
import { useIsAdmin } from "./AdminPanel";
import { Bot } from "lucide-react";

export default function UserButtonWithAdmin() {
  const isAdmin = useIsAdmin();

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "w-8 h-8 transition-smooth hover:scale-105",
        },
      }}
      userProfileProps={{
        appearance: {
          elements: {
            card: "card-elevated",
          },
        },
      }}
    >
      {isAdmin && (
        <UserButton.MenuItems>
          <UserButton.Link
            label="Admin Panel"
            labelIcon={<Bot className="h-4 w-4" />}
            href="/admin"
          />
        </UserButton.MenuItems>
      )}
    </UserButton>
  );
}