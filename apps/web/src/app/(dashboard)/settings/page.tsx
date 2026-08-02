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
import { toast } from "sonner";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api/api-client";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiClient.get("/auth/me");
        setIsLinkedInConnected(res.data.hasLinkedInConnection === true);
      } catch (e) {
        console.error("Failed to check LinkedIn status", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [session]);

  const handleDisconnect = async () => {
    try {
      await apiClient.post("/auth/oauth-disconnect/linkedin");
      setIsLinkedInConnected(false);
      toast.success("LinkedIn disconnected successfully.");
    } catch (e) {
      console.error("Failed to disconnect", e);
      toast.error("Failed to disconnect LinkedIn.");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setPasswordLoading(true);
    try {
      await apiClient.post("/auth/password", { newPassword });
      toast.success("Password updated successfully.");
      setNewPassword("");
    } catch (e) {
      console.error("Failed to update password", e);
      toast.error("Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

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
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Checking status...
              </p>
            ) : isLinkedInConnected ? (
              <div className="border rounded-md p-4 bg-muted/20">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-zinc-900 rounded-md flex items-center justify-center text-xl font-bold text-white">
                    GCC
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">GCC Quest (Connected)</h3>
                    <p className="text-sm text-muted-foreground">
                      Company Profile
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={handleDisconnect}
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

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <input
                type="password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword}
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
