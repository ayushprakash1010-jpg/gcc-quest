"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api/api-client";
import { LinkedInPostPreview } from "@/components/linkedin-post-preview";
import { toast } from "sonner";

// LOW-05: Strict TypeScript interfaces
interface Article {
  title: string;
  analysis?: {
    impactScore?: number;
    summary?: string;
    entities?: unknown;
  };
}

interface Cluster {
  theme: string;
  synthesisText: string;
  articles: Array<{ analysis?: { entities?: unknown } }>;
}

interface Version {
  id: string;
  versionNumber: number;
  generatedBy: string;
  content: string;
}

interface Draft {
  article?: Article;
  cluster?: Cluster;
  targetPlatform: string;
  status: string;
  versions: Version[];
}

export default function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedText, setEditedText] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeVariant, setActiveVariant] = useState(0);
  const [scheduleState, setScheduleState] = useState<
    "idle" | "approving" | "recommending" | "ready"
  >("idle");
  const [recommendation, setRecommendation] = useState<{
    slot: string;
    rationale: string;
  } | null>(null);

  useEffect(() => {
    async function fetchDraft() {
      try {
        const res = await apiClient.get(`/content/drafts/${id}`);
        const data = res.data || res;
        setDraft(data);
        // Load the latest version into the editor
        if (data.versions && data.versions.length > 0) {
          setEditedText(data.versions[0].content);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDraft();
  }, [id]);

  const handleApprove = async () => {
    if (!draft) return;
    try {
      // 1. Capture feedback if it was edited
      if (draft.versions && draft.versions.length > 0) {
        const originalText = draft.versions[draft.versions.length - 1].content;
        if (originalText !== editedText) {
          await apiClient.post(`/content/drafts/${id}/feedback`, {
            originalText,
            editedText,
          });
          // Also save the new version
          await apiClient.post(`/content/drafts/${id}/versions`, {
            content: editedText,
          });
        }
      }

      // 2. Approve draft
      setScheduleState("approving");
      await apiClient.put(`/content/drafts/${id}/status`, {
        status: "APPROVED",
      });

      setScheduleState("recommending");
      // Get recommendation
      try {
        const recRes = await apiClient.get(`/schedule/recommendation/${id}`);
        setRecommendation(recRes.data || recRes);
        setScheduleState("ready");
      } catch (err) {
        console.error(err);
        toast.error(
          "Failed to load AI schedule recommendation. You can still schedule manually.",
        );
        setScheduleState("idle");
      }
    } catch (err) {
      console.error(err);
      setScheduleState("idle");
    }
  };

  const handleConfirmSchedule = async () => {
    try {
      await apiClient.post(`/schedule`, {
        draftId: id,
        scheduledFor: recommendation?.slot,
      });
      router.push("/dashboard/calendar");
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    if (!draft) return;
    try {
      await apiClient.put(`/content/drafts/${id}/status`, {
        status: "REJECTED",
      });
      router.push("/dashboard/content");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <div className="w-1/2 p-6 space-y-4 border-r border-border">
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="w-1/2 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-7 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-36" />
            </div>
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  if (!draft)
    return <div className="p-8 text-muted-foreground">Draft not found.</div>;

  const charCount = editedText.length;
  const isTooLong = charCount > 3000;
  const isWarning = charCount > 2700 && !isTooLong;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* LEFT PANEL: Source Article Info */}
      <div className="w-1/2 overflow-y-auto border-r border-border p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            {draft.article?.title || draft.cluster?.theme || "Unknown Article"}
          </h2>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0a66c2] text-white">
              {draft.targetPlatform}
            </span>
            {draft.article?.analysis?.impactScore && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ⚡ Impact: {draft.article.analysis.impactScore}
              </span>
            )}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                draft.status === "DRAFT"
                  ? "bg-zinc-700 text-zinc-200"
                  : draft.status === "APPROVED"
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-600/20 text-red-400 border border-red-500/30"
              }`}
            >
              {draft.status}
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Article Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              {draft.article?.analysis?.summary ||
                draft.cluster?.synthesisText ||
                "No summary available."}
            </p>
          </CardContent>
        </Card>

        {(draft.article?.analysis?.entities ||
          draft.cluster?.articles?.some((a) => a.analysis?.entities)) && (
          <Card>
            <CardHeader>
              <CardTitle>Extracted Entities</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(
                  draft.article?.analysis?.entities ||
                    draft.cluster?.articles
                      ?.map((a) => a.analysis?.entities)
                      .filter(Boolean),
                  null,
                  2,
                )}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      {/* RIGHT PANEL: Editor */}
      <div className="w-1/2 overflow-y-auto p-6 flex flex-col space-y-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Draft Editor</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={scheduleState !== "idle"}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isTooLong || scheduleState !== "idle"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {scheduleState === "approving"
                ? "Approving..."
                : scheduleState === "recommending"
                  ? "Getting AI Slot..."
                  : "✓ Approve & Schedule"}
            </Button>
          </div>
        </div>

        {scheduleState === "ready" && recommendation && (
          <Card className="bg-primary/5 border-primary/20 shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                AI Schedule Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">
                <strong>Recommended Time:</strong>{" "}
                {new Date(recommendation.slot).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Rationale:</strong> {recommendation.rationale}
              </p>
              <div className="flex gap-2">
                <Button onClick={handleConfirmSchedule}>
                  Accept & Schedule
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard/calendar")}
                >
                  Schedule Later
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs
          defaultValue="0"
          onValueChange={(v) => {
            setActiveVariant(Number(v));
            if (draft?.versions?.[Number(v)]) {
              setEditedText(draft.versions[Number(v)].content);
            }
          }}
          className="flex-1 flex flex-col"
        >
          <TabsList>
            {draft.versions.map((v, i) => (
              <TabsTrigger key={v.id} value={i.toString()}>
                Version {v.versionNumber} ({v.generatedBy})
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 mt-4 relative flex flex-col">
            <Label htmlFor="editor" className="mb-2">
              Edit Post Content
            </Label>
            <textarea
              id="editor"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="flex-1 min-h-[400px] w-full p-4 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none font-sans text-sm leading-relaxed dark:bg-zinc-950 dark:text-zinc-50 bg-white text-zinc-900"
              placeholder="Edit the post content here..."
            />
            <div
              className={`text-xs mt-2 text-right ${isTooLong ? "text-destructive font-bold" : isWarning ? "text-orange-500 font-bold" : "text-muted-foreground"}`}
            >
              {charCount} / 3000 characters
              {isTooLong && " (Too long!)"}
              {isWarning && " (Getting close to limit)"}
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                LinkedIn Live Preview
              </h3>
              <div className="bg-zinc-200/50 p-6 rounded-lg flex items-center justify-center">
                <LinkedInPostPreview content={editedText} />
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
