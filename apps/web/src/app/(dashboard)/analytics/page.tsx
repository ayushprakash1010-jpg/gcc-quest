"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from "recharts";
import {
  useAnalyticsOverview,
  useAnalyticsFunnel,
  useAnalyticsTimeSeries,
  useAnalyticsTopCompanies,
  useAnalyticsTopCities,
  useAnalyticsCategories,
  useAnalyticsSources,
  useAnalyticsAiUsage,
  useAnalyticsPromptPerformance,
} from "@/lib/api/hooks/useAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Brain, CheckCircle, Database, FileText } from "lucide-react";

import { ElementType } from "react";

const COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#64748b",
];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ElementType;
  loading?: boolean;
}

const StatCard = ({ title, value, icon: Icon, loading }: StatCardProps) => (
  <Card>
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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");

  const { data: overview, isLoading: loadingOverview } =
    useAnalyticsOverview(period);
  const { data: funnel, isLoading: loadingFunnel } = useAnalyticsFunnel(period);
  const { data: timeSeries, isLoading: loadingTimeSeries } =
    useAnalyticsTimeSeries(period);
  const { data: companies, isLoading: loadingCompanies } =
    useAnalyticsTopCompanies(period);
  const { data: cities, isLoading: loadingCities } =
    useAnalyticsTopCities(period);
  const { data: categories, isLoading: loadingCategories } =
    useAnalyticsCategories(period);
  const { data: sources, isLoading: loadingSources } =
    useAnalyticsSources(period);
  const { data: aiUsage, isLoading: loadingAi } = useAnalyticsAiUsage(period);
  const { data: prompts, isLoading: loadingPrompts } =
    useAnalyticsPromptPerformance(period);

  return (
    <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive performance and intelligence metrics.
          </p>
        </div>
        <Tabs
          value={period}
          onValueChange={setPeriod}
          className="w-[400px] justify-end"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
            <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
            <TabsTrigger value="90d">Last 90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Articles"
          value={overview?.totalArticles || 0}
          icon={Database}
          loading={loadingOverview}
        />
        <StatCard
          title="Posts Generated"
          value={overview?.postsGenerated || 0}
          icon={FileText}
          loading={loadingOverview}
        />
        <StatCard
          title="Approval Rate"
          value={`${(overview?.approvalRate || 0).toFixed(1)}%`}
          icon={CheckCircle}
          loading={loadingOverview}
        />
        <StatCard
          title="Active Sources"
          value={overview?.sourcesActive || 0}
          icon={Activity}
          loading={loadingOverview}
        />
        <StatCard
          title="AI Tokens Used"
          value={(aiUsage?.totalTokens || 0).toLocaleString()}
          icon={Brain}
          loading={loadingAi}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Content Pipeline Funnel */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Content Processing Pipeline</CardTitle>
            <CardDescription>
              Article discovery through publication funnel
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loadingFunnel ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnel}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="step" type="category" width={100} />
                  <RechartsTooltip />
                  <Bar
                    dataKey="count"
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Categories Donut */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>GCC Categories</CardTitle>
            <CardDescription>Distribution of analyzed articles</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] flex justify-center items-center">
            {loadingCategories ? (
              <Skeleton className="h-[300px] w-[300px] rounded-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="category"
                  >
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {categories?.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Time Series */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Article Discovery & AI Usage Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loadingTimeSeries || loadingAi ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={timeSeries}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#0ea5e9" />
                  <YAxis yAxisId="right" orientation="right" stroke="#ec4899" />
                  <RechartsTooltip />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Articles Discovered"
                    fill="#0ea5e9"
                    opacity={0.3}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    data={aiUsage?.dailyTokens}
                    dataKey="tokens"
                    name="AI Tokens"
                    stroke="#ec4899"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Entity Intelligence */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Entity Intelligence (Top 10)</CardTitle>
            <CardDescription>
              Most frequently mentioned companies
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loadingCompanies ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={companies}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <RechartsTooltip />
                  <Bar
                    dataKey="count"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    barSize={25}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Locations</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loadingCities ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cities}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <RechartsTooltip />
                  <Bar
                    dataKey="count"
                    fill="#f59e0b"
                    radius={[0, 4, 4, 0]}
                    barSize={25}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Source Performance & AI Prompt Performance Tables */}
        <div className="lg:col-span-7 grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Source Yield</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSources ? (
                <Skeleton className="h-48" />
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted">
                      <tr>
                        <th className="px-6 py-3">Source Name</th>
                        <th className="px-6 py-3">Articles</th>
                        <th className="px-6 py-3">Composite Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {sources?.slice(0, 8).map((s: any) => (
                        <tr key={s.id} className="border-b border-border/50">
                          <td className="px-6 py-4 font-medium">{s.name}</td>
                          <td className="px-6 py-4">{s.articlesCount}</td>
                          <td className="px-6 py-4">
                            {(s.compositeScore * 10).toFixed(1)}/10
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prompt Performance & Latency</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPrompts ? (
                <Skeleton className="h-48" />
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted">
                      <tr>
                        <th className="px-6 py-3">Prompt Key</th>
                        <th className="px-6 py-3">Success Rate</th>
                        <th className="px-6 py-3">Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {prompts?.slice(0, 8).map((p: any) => (
                        <tr
                          key={`${p.promptKey}-${p.version}`}
                          className="border-b border-border/50"
                        >
                          <td className="px-6 py-4 font-medium">
                            {p.promptKey} (v{p.version})
                          </td>
                          <td className="px-6 py-4 text-emerald-500">
                            {p.successRate.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4">
                            {p.avgLatency.toFixed(0)} ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
