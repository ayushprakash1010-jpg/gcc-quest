"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/api-client";
import { Plus, Search, RefreshCw, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// LOW-05: Strict TypeScript interface instead of any
interface Source {
  id: string;
  name: string;
  url: string;
  status: string;
  type: string;
  category: string;
  compositeScore: number;
  totalArticles: number;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // MED-02: Search state

  const fetchSources = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/sources");
      setSources(res.data.items || res.data);
    } catch (error) {
      console.error("Failed to fetch sources", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSources();
  }, []);

  const handleCrawl = async (id: string) => {
    try {
      await apiClient.post(`/sources/${id}/crawl`);
      toast.success("Crawl triggered successfully!"); // MED-01: Use toast instead of alert
    } catch (error) {
      console.error("Failed to trigger crawl", error);
      toast.error("Failed to trigger crawl."); // MED-01: Use toast instead of alert
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await apiClient.put(`/sources/${id}`, { status: newStatus });
      toast.success(`Source marked as ${newStatus}`);
      fetchSources();
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status.");
    }
  };

  // MED-02: Filter logic
  const filteredSources = sources.filter(
    (source) =>
      source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.url.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Sources Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your RSS and Web sources for GCC discovery.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => toast.info("Add Source dialog coming in Phase 2")}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Source
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search sources..."
            className="pl-8 bg-zinc-900 border-zinc-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          onClick={fetchSources}
          aria-label="Refresh sources"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-white">Loading sources...</p>
        ) : filteredSources.length === 0 ? (
          <p className="text-muted-foreground">No sources found.</p>
        ) : (
          filteredSources.map((source) => (
            <Card key={source.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-white">
                      {source.name}
                    </CardTitle>
                    <CardDescription className="truncate max-w-[200px]">
                      {source.url}
                    </CardDescription>
                  </div>
                  <Badge
                    onClick={() => handleToggleStatus(source.id, source.status)}
                    variant={
                      source.status === "ACTIVE" ? "default" : "destructive"
                    }
                    className={`cursor-pointer transition-colors ${
                      source.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                        : "hover:bg-destructive/80"
                    }`}
                  >
                    {source.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm text-zinc-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    {source.type}
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {source.category}
                  </div>
                  <div>
                    Score:{" "}
                    <span className="font-bold text-white">
                      {source.compositeScore}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                  <span className="text-xs text-muted-foreground">
                    Articles: {source.totalArticles}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCrawl(source.id)}
                  >
                    Crawl Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
