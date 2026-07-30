"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api/api-client";

export default function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  }
  const [draft, setDraft] = useState<any>(null);
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
      } catch {
        router.push("/content");
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
      router.push("/calendar");
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    try {
      await apiClient.put(`/content/drafts/${id}/status`, {
        status: "REJECTED",
      });
      router.push("/content");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Loading draft...</div>;
  if (!draft) return <div className="p-8">Draft not found.</div>;

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
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">{draft.targetPlatform}</Badge>
            {draft.article?.analysis?.impactScore && (
              <Badge variant="secondary">
                Impact: {draft.article.analysis.impactScore}
              </Badge>
            )}
            <Badge variant={draft.status === "DRAFT" ? "default" : "secondary"}>
              {draft.status}
            </Badge>
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
          draft.cluster?.articles?.some((a: any) => a.analysis?.entities)) && (
          <Card>
            <CardHeader>
              <CardTitle>Extracted Entities</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                {JSON.stringify(
                  draft.article?.analysis?.entities ||
                    draft.cluster?.articles
                      ?.map((a: any) => a.analysis?.entities)
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
              variant="outline"
              onClick={handleReject}
              disabled={scheduleState !== "idle"}
            >
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isTooLong || scheduleState !== "idle"}
            >
              {scheduleState === "approving"
                ? "Approving..."
                : scheduleState === "recommending"
                  ? "Getting AI Slot..."
                  : "Approve & Schedule"}
            </Button>
          </div>
        </div>

        {scheduleState === "ready" && recommendation && (
          <Card className="bg-primary/5 border-primary/20">
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
                  onClick={() => router.push("/calendar")}
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {draft.versions.map((v: any, i: number) => (
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
          </div>
        </Tabs>
      </div>
    </div>
  );
}
