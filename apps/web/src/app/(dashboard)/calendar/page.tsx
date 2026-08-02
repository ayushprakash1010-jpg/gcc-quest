"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Clock,
  Link as LinkIcon,
  Trash,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import apiClient from "@/lib/api/api-client";

export default function CalendarPage() {
  const [calendar, setCalendar] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<string>("");

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/schedule/calendar");
      setCalendar(res.data || res);
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCalendar();
  }, []);

  const handleCancel = async (id: string) => {
    try {
      await apiClient.delete(`/schedule/${id}`);
      toast.success("Post canceled", {
        description: "Draft reverted to APPROVED.",
      });
      fetchCalendar();
    } catch {
      toast.error("An error occurred");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startReschedule = (post: any) => {
    setReschedulingId(post.id);
    // Pre-fill with the current scheduled time in datetime-local format
    const d = new Date(post.scheduledFor);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setNewTime(localIso);
  };

  const handleReschedule = async (id: string) => {
    if (!newTime) return;
    try {
      await apiClient.put(`/schedule/${id}`, {
        scheduledFor: new Date(newTime).toISOString(),
      });
      toast.success("Post rescheduled successfully!");
      setReschedulingId(null);
      setNewTime("");
      fetchCalendar();
    } catch {
      toast.error("Failed to reschedule post.");
    }
  };

  const dates = Object.keys(calendar).sort();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Content Calendar
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage scheduled posts across all platforms. AI automatically spaces
            posts to optimize reach.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-8">Loading calendar...</div>
      ) : dates.length === 0 ? (
        <div className="text-muted-foreground py-8 border-2 border-dashed rounded-lg p-8 text-center flex flex-col items-center justify-center">
          <CalendarIcon className="h-10 w-10 mb-4 text-muted-foreground/50" />
          <p>No posts scheduled yet.</p>
          <p className="text-sm">
            Approve and schedule drafts from the Content section.
          </p>
        </div>
      ) : (
        <div className="space-y-8 mt-6">
          {dates.map((date) => (
            <div key={date}>
              <h3 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                {new Date(date).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {calendar[date].map((post: any) => (
                  <Card key={post.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <Badge
                          variant={
                            post.status === "PUBLISHED"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {post.status}
                        </Badge>
                        <Badge variant="outline">
                          {post.draft?.targetPlatform}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg leading-tight line-clamp-2 pr-16">
                        {post.draft?.versions?.[0]?.content?.substring(0, 100)}
                        ...
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        {new Date(post.scheduledFor).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>

                      {/* Inline Reschedule UI */}
                      {post.status === "QUEUED" &&
                        reschedulingId === post.id && (
                          <div className="space-y-2 p-3 bg-muted rounded-md border">
                            <p className="text-xs font-semibold text-primary">
                              Select new date &amp; time:
                            </p>
                            <input
                              type="datetime-local"
                              value={newTime}
                              onChange={(e) => setNewTime(e.target.value)}
                              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleReschedule(post.id)}
                                className="flex-1 gap-1"
                              >
                                <Check className="w-3 h-3" /> Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setReschedulingId(null)}
                                className="flex-1 gap-1"
                              >
                                <X className="w-3 h-3" /> Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                      {post.scheduleRationale && (
                        <div className="bg-muted p-3 rounded-md text-xs">
                          <span className="font-semibold text-primary block mb-1">
                            AI Recommendation
                          </span>
                          {post.scheduleRationale}
                        </div>
                      )}

                      {post.status === "PUBLISHED" && post.publishedUrl && (
                        <a
                          href={post.publishedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center text-sm text-blue-500 hover:underline"
                        >
                          <LinkIcon className="w-4 h-4 mr-2" /> View Post
                        </a>
                      )}
                      {post.status === "QUEUED" && post.draftId && (
                        <a
                          href={`/content/${post.draftId}`}
                          className="flex items-center text-sm text-blue-500 hover:underline"
                        >
                          <LinkIcon className="w-4 h-4 mr-2" /> Review Draft
                        </a>
                      )}
                    </CardContent>

                    {/* Action buttons — only for QUEUED posts */}
                    {post.status === "QUEUED" && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-blue-500"
                          onClick={() => startReschedule(post)}
                          title="Reschedule"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-red-500"
                          onClick={() => handleCancel(post.id)}
                          title="Cancel Schedule"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
