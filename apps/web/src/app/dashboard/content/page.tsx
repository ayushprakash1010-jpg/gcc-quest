"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api/api-client";
import { FileText, Clock, ArrowRight, Trash2, X } from "lucide-react";
import { toast } from "sonner";

// LOW-05: Strict TypeScript interface
interface DraftPreview {
  id: string;
  status: string;
  targetPlatform: string;
  createdAt: string;
  article?: {
    title: string;
    source?: {
      name: string;
    };
    analysis?: {
      impactScore?: number;
    };
  };
  cluster?: {
    theme: string;
    articles?: Array<{ id: string }>;
  };
  trend?: {
    name: string;
  };
  versions: Array<{
    content: string;
  }>;
}

export default function ContentQueuePage() {
  const [drafts, setDrafts] = useState<DraftPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("DRAFT");

  useEffect(() => {
    async function fetchDrafts() {
      setLoading(true);
      try {
        const res = await apiClient.get(
          `/content/drafts?status=${statusFilter}&take=200`,
        );
        setDrafts(res.data || res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDrafts();
  }, [statusFilter]);

  const handleRejectOne = async (id: string) => {
    try {
      await apiClient.put(`/content/drafts/${id}/status`, {
        status: "REJECTED",
      });
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success("Draft rejected.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject draft.");
    }
  };

  const handleRejectAll = async () => {
    if (
      !confirm(
        "Are you sure you want to reject ALL pending drafts? This cannot be undone.",
      )
    )
      return;

    setLoading(true);
    let count = 0;
    try {
      // Process in batches so we don't overwhelm the backend
      for (const draft of drafts) {
        await apiClient.put(`/content/drafts/${draft.id}/status`, {
          status: "REJECTED",
        });
        count++;
      }
      toast.success(`Successfully rejected ${count} drafts.`);
      setDrafts([]); // Clear UI immediately
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while rejecting drafts.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Content Review Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve AI-generated LinkedIn posts before publishing.
          </p>
        </div>
        {!loading && drafts.length > 0 && statusFilter === "DRAFT" && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {drafts.length} pending review
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRejectAll}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Reject All
            </Button>
          </div>
        )}
      </div>

      <Tabs
        defaultValue="DRAFT"
        onValueChange={setStatusFilter}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="DRAFT">Pending Review</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="ARCHIVED">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value={statusFilter} className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3 mt-1" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
              <p className="text-lg font-medium text-muted-foreground">
                No drafts in this queue
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Crawl your sources to generate new content drafts.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
                <Card
                  key={draft.id}
                  className="flex flex-col hover:border-primary/50 transition-colors"
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold leading-tight line-clamp-2 pr-2 flex-1">
                      {draft.article?.title ||
                        draft.cluster?.theme ||
                        draft.trend?.name ||
                        "Unknown Article"}
                    </CardTitle>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Badge
                        variant={
                          statusFilter === "DRAFT" ? "default" : "outline"
                        }
                        className="text-xs"
                      >
                        {draft.targetPlatform}
                      </Badge>
                      {statusFilter === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => handleRejectOne(draft.id)}
                          title="Reject draft"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <span className="truncate">
                        {draft.article?.source?.name ||
                          (draft.cluster?.articles
                            ? draft.cluster.articles
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                .map((a: any) => a.source?.name)
                                .filter(Boolean)
                                .join(", ")
                            : draft.trend
                              ? "Macro Trend"
                              : "Unknown")}
                      </span>
                      {draft.article?.analysis?.impactScore && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Impact: {draft.article.analysis.impactScore}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm line-clamp-3 text-muted-foreground mb-3 leading-relaxed">
                      {draft.versions[0]?.content || "No content generated"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Generated:{" "}
                      {new Date(draft.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Link
                      href={`/dashboard/content/${draft.id}`}
                      className="w-full"
                    >
                      <Button className="w-full group" variant="outline">
                        Review Draft
                        <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
