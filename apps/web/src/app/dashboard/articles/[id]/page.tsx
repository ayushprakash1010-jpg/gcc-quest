"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Hash,
  Activity,
  Building,
  MapPin,
  Cpu,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await axios.get(`${apiUrl}/api/v1/articles/${params.id}`);
      setArticle(res.data);
    } catch (error) {
      console.error("Failed to fetch article", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchArticle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-1/3 bg-zinc-800" />
        <Skeleton className="h-4 w-1/4 bg-zinc-800" />
        <Skeleton className="h-64 w-full bg-zinc-800 mt-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Skeleton className="h-32 bg-zinc-800" />
          <Skeleton className="h-32 bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!article) {
    return <div className="p-6 text-white">Article not found.</div>;
  }

  const analysis = article.analysis;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inbox
      </Button>

      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6">
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
            {article.title}
          </h1>
          <Badge variant="outline" className="ml-4 whitespace-nowrap text-sm">
            {article.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
          {article.source && (
            <span className="flex items-center gap-1">
              <Hash className="h-4 w-4 text-zinc-500" />
              {article.source.name}
              <span className="text-xs text-zinc-600 ml-1">
                (Score: {article.source.compositeScore})
              </span>
            </span>
          )}
          {article.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-zinc-500" />
              {new Date(article.publishedAt).toLocaleDateString()}
            </span>
          )}
          <a
            href={article.externalUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> View Original
          </a>
        </div>
      </div>

      {!analysis && article.status !== "ANALYZED" && (
        <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
          <CardHeader>
            <CardTitle className="text-zinc-400 flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 animate-spin" />
              Analysis Pending...
            </CardTitle>
            <CardDescription>
              The AI analyzer is currently processing this article. Please check
              back in a few seconds.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-300 leading-relaxed">
                  {analysis.summary}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Raw Content</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400 text-sm whitespace-pre-wrap">
                  {article.rawText || "No content available."}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Analysis Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">
                    Business Impact
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-amber-500" />
                    <span className="text-2xl font-semibold text-white">
                      {analysis.impactScore}/10
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-zinc-500 mb-1">GCC Category</div>
                  <Badge
                    variant="secondary"
                    className="bg-blue-500/10 text-blue-400 border-blue-500/20"
                  >
                    {analysis.gccCategory}
                  </Badge>
                </div>

                <div>
                  <div className="text-xs text-zinc-500 mb-1">Sentiment</div>
                  <Badge
                    variant="secondary"
                    className={
                      analysis.sentiment.toLowerCase() === "positive"
                        ? "bg-green-500/10 text-green-400"
                        : analysis.sentiment.toLowerCase() === "negative"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-zinc-500/10 text-zinc-400"
                    }
                  >
                    {analysis.sentiment}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Extracted Entities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <Building className="h-3 w-3" /> Companies
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.entities?.companies?.length > 0 ? (
                      analysis.entities.companies.map((c: string) => (
                        <Badge
                          key={c}
                          variant="outline"
                          className="border-zinc-700 bg-zinc-800/50"
                        >
                          {c}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-zinc-600 text-sm">None</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <MapPin className="h-3 w-3" /> Locations
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.entities?.locations?.length > 0 ? (
                      analysis.entities.locations.map((l: string) => (
                        <Badge
                          key={l}
                          variant="outline"
                          className="border-zinc-700 bg-zinc-800/50"
                        >
                          {l}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-zinc-600 text-sm">None</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                    <Cpu className="h-3 w-3" /> Technologies
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.entities?.technologies?.length > 0 ? (
                      analysis.entities.technologies.map((t: string) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="border-zinc-700 bg-zinc-800/50"
                        >
                          {t}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-zinc-600 text-sm">None</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
