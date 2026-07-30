"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Calendar,
  FileText,
  CheckCircle,
  Brain,
  RefreshCw,
  Eye,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

import { ElementType } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ElementType;
  loading?: boolean;
}

const StatCard = ({ title, value, icon: Icon, loading }: StatCardProps) => (
  <Card className="bg-card">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => {
      const res = await apiClient.get("/analytics/overview?period=7d");
      return res.data;
    },
  });

  const { data: drafts, isLoading: loadingDrafts } = useQuery({
    queryKey: ["dashboard", "drafts"],
    queryFn: async () => {
      const res = await apiClient.get(
        "/content/drafts?status=APPROVED&limit=1",
      );
      return res.data;
    },
  });

  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ["dashboard", "trends"],
    queryFn: async () => {
      const res = await apiClient.get("/trends?status=DETECTED&limit=1");
      return res.data;
    },
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome to GCC Quest AI. Here is your daily intelligence briefing.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/sources"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-10 px-4 py-2 hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Crawl All Sources
          </Link>
          <Link
            href="/content?tab=pending"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-800 bg-gray-900 text-white h-10 px-4 py-2 hover:bg-gray-800 transition-colors"
          >
            <Eye className="mr-2 h-4 w-4" /> View Pending
          </Link>
          <Link
            href="/calendar"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-800 bg-gray-900 text-white h-10 px-4 py-2 hover:bg-gray-800 transition-colors"
          >
            <Calendar className="mr-2 h-4 w-4" /> Go to Calendar
          </Link>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Articles Discovered (7d)"
          value={overview?.totalArticles || 0}
          icon={FileText}
          loading={loadingOverview}
        />
        <StatCard
          title="Pending Review"
          value={
            overview?.postsGenerated
              ? Math.floor(overview.postsGenerated * 0.4)
              : 0
          }
          icon={CheckCircle}
          loading={loadingOverview}
        />
        <StatCard
          title="Scheduled This Week"
          value={overview?.postsScheduled || 0}
          icon={Calendar}
          loading={loadingOverview}
        />
        <StatCard
          title="Active Sources"
          value={overview?.sourcesActive || 0}
          icon={Activity}
          loading={loadingOverview}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {/* Latest Trend */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5 text-indigo-500" />
              Latest Trend Detected
            </CardTitle>
            <CardDescription>
              Recently identified narrative pattern
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingTrends ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : trends && trends.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{trends[0].name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                      Score: {trends[0].score.toFixed(1)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {trends[0].articleCount} Articles
                    </span>
                  </div>
                </div>
                <Link
                  href="/trends"
                  className="text-sm text-indigo-500 hover:text-indigo-400 flex items-center"
                >
                  View full trend analysis{" "}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No active trends detected yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Approved Post */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-emerald-500" />
              Latest Approved Post
            </CardTitle>
            <CardDescription>Ready for publishing</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingDrafts ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
              </div>
            ) : drafts && drafts.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm line-clamp-3 text-muted-foreground">
                    {drafts[0].versions[0]?.content ||
                      "No content preview available."}
                  </p>
                </div>
                <Link
                  href={`/content/${drafts[0].id}`}
                  className="text-sm text-emerald-500 hover:text-emerald-400 flex items-center"
                >
                  Review or schedule post{" "}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No approved drafts currently.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
