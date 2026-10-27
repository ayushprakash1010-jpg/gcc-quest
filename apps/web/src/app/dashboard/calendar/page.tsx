"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Clock,
  Trash,
  Pencil,
  Check,
  X,
  RotateCw,
  ExternalLink,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import apiClient from "@/lib/api/api-client";

export default function CalendarPage() {
  const [calendar, setCalendar] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<string>("");
  const [republishingId, setRepublishingId] = useState<string | null>(null);

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
      toast.success("Post rescheduled and queued successfully!");
      setReschedulingId(null);
      setNewTime("");
      fetchCalendar();
    } catch (_err: unknown) {
      const error = _err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to reschedule post.";
      toast.error(msg);
    }
  };

  const handleRepublish = async (id: string) => {
    setRepublishingId(id);
    try {
      await apiClient.post(`/schedule/${id}/republish`);
      toast.success("Post published successfully!");
      fetchCalendar();
    } catch (_err: unknown) {
      const error = _err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to publish post.";
      toast.error("Publishing failed", { description: msg });
      fetchCalendar();
    } finally {
      setRepublishingId(null);
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
        <div className="py-8 text-muted-foreground">Loading calendar...</div>
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
                  <Card key={post.id} className="flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant={
                              post.status === "PUBLISHED"
                                ? "default"
                                : post.status === "FAILED"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className={
                              post.status === "PUBLISHED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : post.status === "FAILED"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            }
                          >
                            {post.status}
                          </Badge>
                          <Badge variant="outline">
                            {post.draft?.targetPlatform}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Quick Republish / Publish Now Icon Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-emerald-400"
                            disabled={republishingId === post.id}
                            onClick={() => handleRepublish(post.id)}
                            title={
                              post.status === "PUBLISHED"
                                ? "Republish Now"
                                : post.status === "FAILED"
                                  ? "Retry Publishing"
                                  : "Publish Now"
                            }
                          >
                            <RotateCw
                              className={`w-3.5 h-3.5 ${
                                republishingId === post.id
                                  ? "animate-spin text-emerald-400"
                                  : ""
                              }`}
                            />
                          </Button>

                          {/* Quick Change Timing / Reschedule Icon Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-blue-400"
                            onClick={() => startReschedule(post)}
                            title="Change Timing / Reschedule"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>

                          {/* Cancel Button */}
                          {post.status !== "PUBLISHED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-muted-foreground hover:text-rose-400"
                              onClick={() => handleCancel(post.id)}
                              title="Cancel Schedule"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-base leading-tight line-clamp-3">
                        {post.draft?.versions?.[0]?.content?.substring(0, 120)}
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

                      {/* Inline Reschedule UI (available for both QUEUED and PUBLISHED) */}
                      {reschedulingId === post.id && (
                        <div className="space-y-2.5 p-3.5 bg-zinc-900/90 rounded-lg border border-blue-500/40 shadow-sm">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-zinc-200">
                              Change Date &amp; Time:
                            </p>
                            {post.status === "PUBLISHED" && (
                              <span className="text-[10px] text-amber-400 font-medium">
                                Re-queues post
                              </span>
                            )}
                          </div>
                          <input
                            type="datetime-local"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className="w-full text-sm rounded-md border border-zinc-700 bg-zinc-950 text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                          />
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() => handleReschedule(post.id)}
                              className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700 text-white font-medium h-8"
                            >
                              <Check className="w-3.5 h-3.5" /> Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReschedulingId(null)}
                              className="flex-1 gap-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-8"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Failure reason if post failed */}
                      {post.status === "FAILED" && post.errorMessage && (
                        <div className="bg-rose-950/40 border border-rose-800/50 p-3 rounded-lg text-xs text-rose-300 leading-relaxed flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-rose-200 block mb-0.5">
                              Publishing Error
                            </span>
                            {post.errorMessage}
                          </div>
                        </div>
                      )}

                      {post.scheduleRationale && (
                        <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-lg text-xs text-blue-200 leading-relaxed">
                          <span className="font-bold text-blue-100 block mb-1">
                            AI Recommendation
                          </span>
                          {post.scheduleRationale}
                        </div>
                      )}

                      {/* Actions Footer */}
                      <div className="pt-2 border-t border-zinc-800/70 flex flex-wrap items-center justify-between gap-2">
                        {post.status === "PUBLISHED" && post.publishedUrl ? (
                          <a
                            href={post.publishedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center text-xs text-blue-400 hover:underline gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View Post
                          </a>
                        ) : post.draftId ? (
                          <a
                            href={`/dashboard/content/${post.draftId}`}
                            className="flex items-center text-xs text-blue-400 hover:underline gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" /> Review Draft
                          </a>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-1.5 ml-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1 px-2.5"
                            onClick={() => startReschedule(post)}
                            title="Change Scheduled Timing"
                          >
                            <Clock className="w-3 h-3 text-blue-400" />
                            Change Time
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5"
                            disabled={republishingId === post.id}
                            onClick={() => handleRepublish(post.id)}
                            title={
                              post.status === "PUBLISHED"
                                ? "Republish post to LinkedIn"
                                : "Publish post immediately"
                            }
                          >
                            <RotateCw
                              className={`w-3 h-3 ${
                                republishingId === post.id ? "animate-spin" : ""
                              }`}
                            />
                            {republishingId === post.id
                              ? "Publishing..."
                              : post.status === "PUBLISHED"
                                ? "Republish"
                                : "Publish Now"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
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
