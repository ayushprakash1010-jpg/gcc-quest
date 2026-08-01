"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";
import apiClient from "@/lib/api/api-client";

export default function ClustersPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClusters() {
      setLoading(true);
      try {
        const res = await apiClient.get(`/clusters`);
        setClusters(res.data || res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchClusters();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Story Clusters</h2>
      </div>
      <p className="text-muted-foreground mb-6">
        AI automatically groups related news articles over a 72-hour window and
        synthesizes them into comprehensive stories.
      </p>

      {loading ? (
        <div>Loading clusters...</div>
      ) : clusters.length === 0 ? (
        <div className="text-muted-foreground py-8">
          No story clusters found.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clusters.map((cluster) => (
            <Card key={cluster.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge
                    variant={
                      cluster.status === "READY" ? "default" : "secondary"
                    }
                  >
                    {cluster.status}
                  </Badge>
                  <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    <Layers className="w-3 h-3 mr-1" />
                    {cluster._count?.articles || cluster.articleCount} articles
                  </div>
                </div>
                <CardTitle className="text-lg leading-tight">
                  {cluster.theme || "Forming Cluster..."}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Last article:{" "}
                  {new Date(cluster.lastArticleAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {cluster.synthesisText ? (
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {cluster.synthesisText}
                  </p>
                ) : (
                  <div className="flex h-full items-center justify-center border-2 border-dashed rounded-md p-4 text-sm text-muted-foreground">
                    Waiting for AI synthesis...
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-4 border-t">
                {/* Normally we'd link to a cluster detail page, but for now we just link to the content queue if it's ready */}
                {cluster.status === "READY" ? (
                  <Link href="/content" className="w-full">
                    <Button className="w-full" variant="outline">
                      View Generated Post
                    </Button>
                  </Link>
                ) : (
                  <Button disabled className="w-full" variant="ghost">
                    Processing
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
