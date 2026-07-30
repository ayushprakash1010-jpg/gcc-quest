"use client";

import { useEffect, useState } from "react";
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
import { Activity, Layers, Play } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function TrendsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`http://localhost:3001/api/v1/trends`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTrends(data);
      }
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTrends();
  }, []);

  const handleRunDetection = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        `http://localhost:3001/api/v1/trends/run-detection`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        toast.success("Detection triggered", {
          description: "Macro trends are being analyzed.",
        });
        setTimeout(fetchTrends, 2000);
      } else {
        toast.error("Failed to run detection");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleGenerate = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(
        `http://localhost:3001/api/v1/trends/${id}/generate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        toast.success("Generation started", {
          description: "A trend report is being written.",
        });
        setTimeout(fetchTrends, 2000);
      } else {
        toast.error("Failed to start generation");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Macro Trends</h2>
          <p className="text-muted-foreground mt-1">
            Detect industry-wide shifts across technology, categories, and
            locations based on aggregated article scores.
          </p>
        </div>
        <Button onClick={handleRunDetection}>
          <Play className="mr-2 h-4 w-4" /> Run Detection
        </Button>
      </div>

      {loading ? (
        <div className="py-8">Analyzing trends...</div>
      ) : trends.length === 0 ? (
        <div className="text-muted-foreground py-8 border-2 border-dashed rounded-lg p-8 text-center flex flex-col items-center justify-center">
          <Activity className="h-10 w-10 mb-4 text-muted-foreground/50" />
          <p>No macro trends detected yet.</p>
          <p className="text-sm">
            Trends require high-impact articles within a concentrated time
            window.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {trends.map((trend) => (
            <Card key={trend.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge
                    variant={
                      trend.type === "TECHNOLOGY"
                        ? "default"
                        : trend.type === "CATEGORY"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {trend.type}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex items-center">
                      <Activity className="w-3 h-3 mr-1" />
                      Score: {trend.score.toFixed(1)}
                    </span>
                  </div>
                </div>
                <CardTitle className="text-xl leading-tight">
                  {trend.name}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Detected {new Date(trend.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center text-sm mb-4">
                  <Layers className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{trend.articleCount}</span>
                  <span className="text-muted-foreground ml-1">
                    supporting articles
                  </span>
                </div>
                {trend.status === "PROCESSED" && (
                  <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-md">
                    Trend report generated.
                  </p>
                )}
              </CardContent>
              <CardFooter className="pt-4 border-t gap-2 flex-col">
                {trend.status === "DETECTED" ? (
                  <Button
                    className="w-full"
                    onClick={() => handleGenerate(trend.id)}
                  >
                    Generate Trend Report
                  </Button>
                ) : (
                  <Link href="/content" className="w-full">
                    <Button variant="outline" className="w-full">
                      View Generated Post
                    </Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
