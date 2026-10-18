"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api/api-client";
import { LinkedInPostPreview } from "@/components/linkedin-post-preview";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Building2,
  MapPin,
  Cpu,
  Tag,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Clock,
  User,
  FileText,
  Zap,
  CheckCircle2,
  ImageIcon,
} from "lucide-react";

// LOW-05: Strict TypeScript interfaces
interface Entities {
  companies?: string[];
  locations?: string[];
  technologies?: string[];
  topics?: string[];
  [key: string]: string[] | undefined;
}

interface Article {
  title: string;
  url?: string;
  imageUrl?: string;
  analysis?: {
    impactScore?: number;
    summary?: string;
    entities?: Entities;
  };
}

interface Cluster {
  theme: string;
  synthesisText: string;
  articles: Array<{ analysis?: { entities?: Entities } }>;
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

// Maps entity category keys to display labels and icons
const ENTITY_CATEGORIES: Record<
  string,
  { label: string; color: string; iconKey: string }
> = {
  companies: {
    label: "Companies",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    iconKey: "building",
  },
  locations: {
    label: "Locations",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconKey: "map",
  },
  technologies: {
    label: "Technologies",
    color: "bg-violet-50 text-violet-700 border-violet-200",
    iconKey: "cpu",
  },
  topics: {
    label: "Topics",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    iconKey: "tag",
  },
};

function EntityChips({ entities }: { entities: Entities }) {
  const categoryOrder = ["companies", "locations", "technologies", "topics"];
  const allKeys = [
    ...categoryOrder.filter((k) => entities[k]?.length),
    ...Object.keys(entities).filter(
      (k) => !categoryOrder.includes(k) && entities[k]?.length,
    ),
  ];

  if (!allKeys.length)
    return (
      <p className="text-sm text-zinc-500 italic">No entities extracted.</p>
    );

  return (
    <div className="space-y-4">
      {allKeys.map((key) => {
        const items = entities[key];
        if (!items?.length) return null;
        const config = ENTITY_CATEGORIES[key] ?? {
          label: key.charAt(0).toUpperCase() + key.slice(1),
          color: "bg-zinc-100 text-zinc-700 border-zinc-200",
          iconKey: "tag",
        };
        const Icon =
          config.iconKey === "building"
            ? Building2
            : config.iconKey === "map"
              ? MapPin
              : config.iconKey === "cpu"
                ? Cpu
                : Tag;

        return (
          <div key={key}>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                {config.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => (
                <span
                  key={item}
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${config.color}`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-8 gap-1.5 text-xs border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied" : "Copy Content"}
    </Button>
  );
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
  const [activeVariant, setActiveVariant] = useState(0);
  const [scheduleState, setScheduleState] = useState<
    "idle" | "approving" | "recommending" | "ready"
  >("idle");
  const [recommendation, setRecommendation] = useState<{
    slot: string;
    rationale: string;
  } | null>(null);
  const [publishingChannel, setPublishingChannel] = useState<
    "personal" | "buffer"
  >("personal");
  const [isBufferConfigured, setIsBufferConfigured] = useState(false);

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
    async function fetchSettings() {
      try {
        const res = await apiClient.get("/auth/me");
        setIsBufferConfigured(res.data.isBufferConfigured === true);
      } catch {}
    }
    fetchDraft();
    fetchSettings();
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
        publishingChannel,
      });
      toast.success("Post scheduled successfully!");
      router.push("/dashboard/calendar");
    } catch (err) {
      console.error(err);
      toast.error("Failed to schedule post.");
    }
  };

  const handleReject = async () => {
    if (!draft) return;
    try {
      await apiClient.put(`/content/drafts/${id}/status`, {
        status: "REJECTED",
      });
      toast.info("Draft rejected");
      router.push("/dashboard/content");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject draft.");
    }
  };

  if (loading)
    return (
      <div className="-m-8 flex min-h-[calc(100vh-4rem)]">
        <div className="w-1/2 p-8 space-y-6 border-r border-zinc-800">
          <Skeleton className="h-6 w-32 bg-zinc-800" />
          <Skeleton className="h-10 w-3/4 bg-zinc-800" />
          <Skeleton className="h-48 w-full bg-zinc-800 rounded-xl" />
          <Skeleton className="h-36 w-full bg-zinc-800 rounded-xl" />
        </div>
        <div className="w-1/2 p-8 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-40 bg-zinc-800" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24 bg-zinc-800" />
              <Skeleton className="h-10 w-44 bg-zinc-800" />
            </div>
          </div>
          <Skeleton className="h-96 w-full bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );

  if (!draft)
    return (
      <div className="p-12 text-center">
        <p className="text-zinc-400 text-lg">Draft not found.</p>
        <Link
          href="/dashboard/content"
          className="inline-flex items-center gap-2 mt-4 text-blue-400 hover:underline text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Review Queue
        </Link>
      </div>
    );

  const charCount = editedText.length;
  const isTooLong = charCount > 3000;
  const isWarning = charCount > 2700 && !isTooLong;

  const entities =
    draft.article?.analysis?.entities ||
    draft.cluster?.articles?.reduce((merged, a) => {
      const e = a.analysis?.entities;
      if (!e) return merged;
      Object.keys(e).forEach((k) => {
        const key = k as keyof Entities;
        merged[key] = [...new Set([...(merged[key] ?? []), ...(e[key] ?? [])])];
      });
      return merged;
    }, {} as Entities) ||
    {};

  return (
    <div className="-m-8 flex flex-col min-h-[calc(100vh-4rem)]">
      {/* TOP HEADER / ACTION BAR */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/content"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Review Queue</span>
          </Link>
          <span className="text-zinc-700">|</span>
          <span className="text-sm font-medium text-zinc-200 truncate max-w-[400px]">
            {draft.article?.title || draft.cluster?.theme || "Draft Review"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={scheduleState !== "idle"}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            Reject Draft
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isTooLong || scheduleState !== "idle"}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm gap-2"
          >
            {scheduleState === "approving" ? (
              "Approving..."
            ) : scheduleState === "recommending" ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Optimizing Schedule...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Schedule</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2-COLUMN SPLIT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Source Article & Intelligence */}
        <div className="w-1/2 overflow-y-auto p-8 space-y-6 border-r border-zinc-800">
          {/* Article Title & Metadata Card */}
          <Card className="bg-white text-zinc-900 border border-zinc-200/80 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0a66c2] text-white">
                  {draft.targetPlatform}
                </span>
                {draft.article?.analysis?.impactScore && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Zap className="w-3 h-3 mr-1 text-amber-500" /> Impact:{" "}
                    {draft.article.analysis.impactScore}
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    draft.status === "DRAFT"
                      ? "bg-zinc-100 text-zinc-700 border border-zinc-200"
                      : draft.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {draft.status}
                </span>
              </div>
              <CardTitle className="text-xl font-bold leading-snug text-zinc-900">
                {draft.article?.title ||
                  draft.cluster?.theme ||
                  "Untitled Article"}
              </CardTitle>
            </CardHeader>
            {draft.article?.url && (
              <CardContent className="pt-3 pb-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
                <span className="truncate max-w-[320px] text-zinc-500">
                  {draft.article.url}
                </span>
                <a
                  href={draft.article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
              </CardContent>
            )}
          </Card>

          {/* Featured Image (if available) */}
          {draft.article?.imageUrl && (
            <Card className="bg-white text-zinc-900 border border-zinc-200/80 shadow-sm rounded-xl overflow-hidden">
              <div className="relative h-56 w-full bg-zinc-100 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.article.imageUrl}
                  alt="Article featured preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-3 bg-zinc-50 border-t border-zinc-100 text-xs text-zinc-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  Featured Article Image
                </span>
                <span className="text-[11px] text-zinc-400">
                  Included in LinkedIn post
                </span>
              </CardContent>
            </Card>
          )}

          {/* Article Summary Card */}
          <Card className="bg-white text-zinc-900 border border-zinc-200/80 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-zinc-900">
                <FileText className="w-4 h-4 text-blue-600" />
                Article Summary & Key Takeaways
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-line">
                {draft.article?.analysis?.summary ||
                  draft.cluster?.synthesisText ||
                  "No summary available."}
              </p>
            </CardContent>
          </Card>

          {/* Extracted Entities Card */}
          <Card className="bg-white text-zinc-900 border border-zinc-200/80 shadow-sm rounded-xl">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-zinc-900">
                <Tag className="w-4 h-4 text-violet-600" />
                Extracted Intelligence & Entities
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <EntityChips entities={entities} />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Editor & LinkedIn Preview */}
        <div className="w-1/2 overflow-y-auto p-8 space-y-6">
          {/* AI Schedule Recommendation Modal/Card */}
          {scheduleState === "ready" && recommendation && (
            <Card className="bg-white text-zinc-900 border-2 border-blue-500/40 shadow-lg rounded-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-zinc-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-zinc-900">
                        AI Schedule Recommendation
                      </CardTitle>
                      <p className="text-xs text-zinc-500">
                        Optimized for GCC executive engagement
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-medium">
                    AI Slot
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3.5">
                  <div className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Recommended Publishing Slot
                  </div>
                  <div className="text-base font-bold text-blue-950">
                    {new Date(recommendation.slot).toLocaleString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <p className="text-xs text-blue-900/80 mt-1.5 leading-relaxed">
                    <strong>Rationale:</strong> {recommendation.rationale}
                  </p>
                </div>

                {/* Channel selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                    Publishing Destination
                  </Label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      id="channel-personal-btn"
                      onClick={() => setPublishingChannel("personal")}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        publishingChannel === "personal"
                          ? "bg-[#0a66c2] text-white border-[#0a66c2] shadow-sm"
                          : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <User className="w-4 h-4" /> Personal Profile
                    </button>
                    <button
                      type="button"
                      id="channel-buffer-btn"
                      onClick={() =>
                        isBufferConfigured && setPublishingChannel("buffer")
                      }
                      disabled={!isBufferConfigured}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        publishingChannel === "buffer"
                          ? "bg-[#168ee1] text-white border-[#168ee1] shadow-sm"
                          : isBufferConfigured
                            ? "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                            : "bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed opacity-60"
                      }`}
                    >
                      <Building2 className="w-4 h-4" /> Company Page
                    </button>
                  </div>
                  {!isBufferConfigured && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                      <span>⚠️</span> Configure Company Page in Settings to
                      enable company publishing
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
                  <Button
                    id="confirm-schedule-btn"
                    onClick={handleConfirmSchedule}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                  >
                    Accept & Schedule Post
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/calendar")}
                    className="border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  >
                    Schedule Later
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Post Content Editor Card */}
          <Card className="bg-white text-zinc-900 border border-zinc-200/80 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-zinc-900">
                    Post Content Editor
                  </CardTitle>
                  <p className="text-xs text-zinc-500">
                    Refine copy, hashtags, and formatting
                  </p>
                </div>
                <CopyButton text={editedText} />
              </div>

              {/* Version pills if > 1 version */}
              {draft.versions && draft.versions.length > 1 && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-100">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Versions:
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {draft.versions.map((v, i) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setActiveVariant(i);
                          setEditedText(v.content);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                          activeVariant === i
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        v{v.versionNumber} ({v.generatedBy})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              <div className="relative">
                <textarea
                  id="editor"
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full min-h-[340px] p-4 rounded-lg border border-zinc-200 bg-white text-zinc-900 font-sans text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y shadow-inner"
                  placeholder="Compose or edit your LinkedIn post here..."
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-zinc-500">
                  Pro-tip: Include 3-5 relevant hashtags for maximum reach
                </span>
                <span
                  className={`font-semibold ${
                    isTooLong
                      ? "text-red-600"
                      : isWarning
                        ? "text-amber-600"
                        : "text-zinc-500"
                  }`}
                >
                  {charCount} / 3000 characters
                  {isTooLong && " (Exceeds limit!)"}
                  {isWarning && " (Approaching limit)"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* LinkedIn Live Preview Card */}
          <Card className="bg-white text-zinc-900 border border-zinc-200/80 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-[#0a66c2] text-white flex items-center justify-center text-xs font-bold">
                    in
                  </span>
                  LinkedIn Live Preview
                </CardTitle>
                <p className="text-xs text-zinc-500">
                  Real-time render of how this post appears in the feed
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-xs text-zinc-500 border-zinc-200"
              >
                Feed Simulation
              </Badge>
            </CardHeader>
            <CardContent className="p-6 bg-[#f3f2ef] flex items-center justify-center">
              <LinkedInPostPreview
                content={editedText}
                imageUrl={draft?.article?.imageUrl}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
