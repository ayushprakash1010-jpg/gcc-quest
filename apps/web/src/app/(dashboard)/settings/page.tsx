"use client";

import { useSession, signIn } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);

  useEffect(() => {
    // If we have a session after clicking connect, show connected state
    if (session) {
      setIsLinkedInConnected(true);
    }
  }, [session]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Integrations & Settings
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>LinkedIn Company Page</CardTitle>
            <CardDescription>
              Connect your LinkedIn Organization to publish generated AI content
              directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLinkedInConnected ? (
              <div className="border rounded-md p-4 bg-muted/20">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-zinc-900 rounded-md flex items-center justify-center text-xl font-bold text-white">
                    {/* Simulated Company Logo */}
                    GCC
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">GCC Quest (Connected)</h3>
                    <p className="text-sm text-muted-foreground">
                      Technology, Information and Internet • 29.2K followers
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  No company page is currently connected. You must connect your
                  LinkedIn account to publish posts.
                </p>
                <Button
                  onClick={() =>
                    signIn("linkedin", { redirectTo: "/settings" })
                  }
                  className="w-full bg-[#0a66c2] hover:bg-[#004182] text-white"
                >
                  Connect LinkedIn
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
