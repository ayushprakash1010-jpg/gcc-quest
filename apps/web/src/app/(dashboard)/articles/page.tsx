"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Search, ExternalLink, Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async (query?: string) => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      let url = `${apiUrl}/api/v1/articles`;
      if (query) {
        url = `${apiUrl}/api/v1/articles/search?q=${encodeURIComponent(query)}`;
      }

      const res = await axios.get(url);
      setArticles(res.data.items || res.data || []);
    } catch (error) {
      console.error("Failed to fetch articles", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles(searchQuery);
  };

  const handleSkip = async (id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await axios.post(`${apiUrl}/api/v1/articles/${id}/skip`);
      // Update locally
      setArticles(
        articles.map((a) => (a.id === id ? { ...a, status: "SKIPPED" } : a)),
      );
    } catch (error) {
      console.error("Failed to skip", error);
    }
  };

  const handleAnalyze = async (id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await axios.post(`${apiUrl}/api/v1/articles/${id}/analyze`);
      setArticles(
        articles.map((a) => (a.id === id ? { ...a, status: "ANALYZED" } : a)),
      );
    } catch (error) {
      console.error("Failed to analyze", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Article Inbox
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and analyze discovered GCC articles.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search articles by full-text search..."
            className="pl-8 bg-zinc-900 border-zinc-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearchQuery("");
              fetchArticles();
            }}
          >
            Clear
          </Button>
        )}
      </form>

      <div className="space-y-4">
        {loading ? (
          <p className="text-white">Loading articles...</p>
        ) : articles.length === 0 ? (
          <p className="text-muted-foreground">No articles found.</p>
        ) : (
          articles.map((article) => (
            <div
              key={article.id}
              className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-start justify-between">
                  <Link
                    href={`/articles/${article.id}`}
                    className="hover:underline"
                  >
                    <h3 className="font-semibold text-lg text-white">
                      {article.title}
                    </h3>
                  </Link>
                  <Badge variant="outline" className="ml-2 whitespace-nowrap">
                    {article.status}
                  </Badge>
                </div>

                <p className="text-zinc-400 text-sm line-clamp-2">
                  {article.rawText?.substring(0, 200) ||
                    "No content available."}
                </p>

                <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2">
                  {article.source && (
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {article.source.name}
                    </span>
                  )}
                  {article.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                  <a
                    href={article.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Original Source
                  </a>
                </div>
              </div>

              <div className="flex md:flex-col gap-2 min-w-[120px]">
                <Link href={`/articles/${article.id}`}>
                  <Button size="sm">View Details</Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAnalyze(article.id)}
                >
                  Analyze Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSkip(article.id)}
                >
                  Skip
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
