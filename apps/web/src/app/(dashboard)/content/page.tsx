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

export default function ContentQueuePage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("DRAFT");

  useEffect(() => {
    async function fetchDrafts() {
      setLoading(true);
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(
          `http://localhost:3001/api/v1/content/drafts?status=${statusFilter}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setDrafts(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDrafts();
  }, [statusFilter]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Content Review Queue
        </h2>
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
            <div>Loading drafts...</div>
          ) : drafts.length === 0 ? (
            <div className="text-muted-foreground py-8">
              No drafts found in this queue.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
                <Card key={draft.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {draft.article?.title || "Unknown Article"}
                    </CardTitle>
                    <Badge
                      variant={statusFilter === "DRAFT" ? "default" : "outline"}
                    >
                      {draft.targetPlatform}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground mb-4">
                      Source: {draft.article?.source?.name || "Unknown"}
                    </div>
                    <div className="text-sm line-clamp-3 mb-2">
                      {draft.versions[0]?.content || "No content generated"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Generated:{" "}
                      {new Date(draft.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/content/${draft.id}`} className="w-full">
                      <Button className="w-full">Review Draft</Button>
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
