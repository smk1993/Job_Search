"use client";

import { TopNav } from "@/components/layout/TopNav";
import { useStats } from "@/hooks/useJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { Briefcase, Heart, FileText, Mail, TrendingUp, BarChart2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  SAVED: "#94a3b8", APPLIED: "#3b82f6", PHONE_SCREEN: "#8b5cf6",
  INTERVIEW: "#f59e0b", OFFER: "#10b981", REJECTED: "#ef4444", WITHDRAWN: "#6b7280",
};
const PLATFORM_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function StatsPage() {
  const { data: stats, isLoading } = useStats();

  const summaryCards = [
    { title: "Total Applications", value: stats?.totalApplications ?? 0, icon: Briefcase, color: "text-blue-500" },
    { title: "Saved Jobs", value: stats?.savedJobsCount ?? 0, icon: Heart, color: "text-red-500" },
    { title: "Cover Letters", value: stats?.coverLettersCount ?? 0, icon: FileText, color: "text-purple-500" },
    { title: "Emails Sent", value: stats?.emailsSentCount ?? 0, icon: Mail, color: "text-green-500" },
  ];

  const successRate = stats?.applicationsByStatus
    ? (() => {
        const offer = stats.applicationsByStatus.find((s: { status: string }) => s.status === "OFFER")?.count ?? 0;
        const total = stats.totalApplications;
        return total > 0 ? ((offer / total) * 100).toFixed(1) : "0";
      })()
    : "0";

  return (
    <div>
      <TopNav title="Analytics" />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Job Search Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Track your progress and optimize your job search</p>
        </div>

        {/* Summary */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((card) => (
              <Card key={card.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{card.title}</p>
                      <p className="text-3xl font-bold mt-1">{card.value}</p>
                    </div>
                    <card.icon className={`h-8 w-8 ${card.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Success rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Offer Rate</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
              <p className="text-sm text-muted-foreground ml-4">
                {stats?.applicationsByStatus?.find((s: { status: string }) => s.status === "OFFER")?.count ?? 0} offer(s) from {stats?.totalApplications ?? 0} applications
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-56" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats?.applicationsByStatus ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} tickFormatter={(v) => v.replace("_", " ")} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v?: string | number, n?: string | number) => [String(v ?? ""), String(n ?? "").replace("_", " ")]} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(stats?.applicationsByStatus ?? []).map((entry: { status: string }, i: number) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Platform Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Applications by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-56" /> : (
                stats?.applicationsByPlatform?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.applicationsByPlatform} dataKey="count" nameKey="platform" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {stats.applicationsByPlatform.map((_: unknown, i: number) => (
                          <Cell key={i} fill={PLATFORM_COLORS[i % PLATFORM_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                    No application data yet. Start applying to jobs!
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
