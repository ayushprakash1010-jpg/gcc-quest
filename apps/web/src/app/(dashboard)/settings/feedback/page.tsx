"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function FeedbackSettingsPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeedbacks() {
      setLoading(true);
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`http://localhost:3001/api/v1/feedback`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setFeedbacks(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchFeedbacks();
  }, []);

  const handleDelete = async (id: string) => {
    // Basic optimistic UI
    setFeedbacks(feedbacks.filter((f) => f.id !== id));
    // Would normally call the API to delete
    // fetch(`http://localhost:3001/api/v1/feedback/${id}`, { method: 'DELETE' })
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          AI Feedback Learning
        </h2>
      </div>
      <p className="text-muted-foreground mb-6">
        Review past corrections made by human editors. The AI uses these
        examples to improve future generated drafts.
      </p>

      {loading ? (
        <div>Loading feedback examples...</div>
      ) : feedbacks.length === 0 ? (
        <div className="text-muted-foreground py-8">
          No feedback examples captured yet.
        </div>
      ) : (
        <div className="grid gap-6">
          {feedbacks.map((fb) => (
            <Card key={fb.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    Correction #{fb.id.slice(0, 8)}
                  </CardTitle>
                  <CardDescription>
                    Captured on {new Date(fb.createdAt).toLocaleDateString()}{" "}
                    for {fb.category || "General"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(fb.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-destructive">
                      Original (AI Generated)
                    </h4>
                    <div className="p-3 bg-destructive/10 text-sm rounded-md border border-destructive/20 h-[200px] overflow-y-auto whitespace-pre-wrap">
                      {fb.originalText}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-green-600 dark:text-green-400">
                      Corrected (Human Edited)
                    </h4>
                    <div className="p-3 bg-green-500/10 text-sm rounded-md border border-green-500/20 h-[200px] overflow-y-auto whitespace-pre-wrap">
                      {fb.editedText}
                    </div>
                  </div>
                </div>
                {fb.diffSummary && (
                  <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                    <span className="font-semibold">Summary:</span>{" "}
                    {fb.diffSummary}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
