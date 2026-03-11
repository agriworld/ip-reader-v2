"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { IPSearch } from "@/components/ip-search";
import { IPResultPanel, type IPResult } from "@/components/ip-result-panel";
import { MaliciousIPsTable, type TopIP } from "@/components/malicious-ips-table";
import { StatsPanel } from "@/components/stats-panel";
import { ActivityFeed } from "@/components/activity-feed";

type ActivityItem = {
  id: string;
  type: "malicious" | "suspicious" | "clean" | "alert";
  message: string;
  ip?: string;
  timestamp: string;
  first_seen?: string | null;
  last_seen?: string | null;
};

type BackendStats = { malicious_ips: number; clean_ips: number; total_tracked_ips: number };
type BackendTop = { ip: string; score: number }[];
type BackendLookup =
  | {
      ip: string;
      malicious: true;
      score: number;
      source_count: number;
      sources: string[];
      first_seen?: string | null;
      last_seen?: string | null;
    }
  | {
      ip: string;
      malicious: false;
      message?: string;
    };

export default function ThreatIntelligenceDashboard() {
  const [searchResult, setSearchResult] = useState<IPResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [topIps, setTopIps] = useState<TopIP[]>([]);
  const [stats, setStats] = useState<BackendStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const refreshStats = async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as BackendStats;
      setStats(json);
    } catch {
      // ignore
    }
  };

  const refreshActivity = async () => {
    try {
      const res = await fetch("/api/activity", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as ActivityItem[];
      setActivities(json);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, topRes] = await Promise.all([
          fetch("/api/stats", { cache: "no-store" }),
          fetch("/api/top", { cache: "no-store" }),
        ]);

        if (!statsRes.ok || !topRes.ok) return;

        const [statsJson, topJson] = (await Promise.all([
          statsRes.json(),
          topRes.json(),
        ])) as [BackendStats, BackendTop];

        if (cancelled) return;
        setStats(statsJson);
        setTopIps(topJson);
        void refreshActivity();
      } catch {
        // If backend is down, keep UI usable (empty data).
      }
    }

    load();
    const interval = window.setInterval(() => {
      void refreshActivity();
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handleIPSearch = async (ip: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ip/${encodeURIComponent(ip)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("lookup failed");
      const data = (await res.json()) as BackendLookup;

      const result: IPResult = data.malicious
        ? {
            ipAddress: data.ip,
            threatScore: data.score,
            verdict: data.score >= 70 ? "malicious" : "suspicious",
            lastAnalyzed: "Just now",
            sources: (data.sources ?? []).map((name) => ({ name, reported: true })),
          }
        : {
            ipAddress: data.ip,
            threatScore: 0,
            verdict: "clean",
            lastAnalyzed: "Just now",
            sources: [
              {
                name: data.message?.trim() ? `Threat DB: ${data.message}` : "Threat DB: not found",
                reported: false,
              },
            ],
          };

      setSearchResult(result);
      // If it was clean, backend just recorded it; refresh counts.
      if (!data.malicious) {
        void refreshStats();
      }
      void refreshActivity();
    } catch {
      setSearchResult({
        ipAddress: ip,
        threatScore: 0,
        verdict: "clean",
        lastAnalyzed: "Just now",
        sources: [{ name: "Backend unreachable", reported: false }],
      });
    }
    setIsLoading(false);
  };

  const handleSelectIP = (ip: string) => {
    handleIPSearch(ip);
    // Scroll to results
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Threat Intelligence Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor, analyze, and respond to cybersecurity threats in real-time</p>
        </div>

        {/* Stats Overview */}
        <StatsPanel
          totalTrackedIPs={stats?.total_tracked_ips ?? 0}
          maliciousCount={stats?.malicious_ips ?? 0}
          suspiciousCount={0}
          cleanCount={stats?.clean_ips ?? 0}
        />

        {/* Search Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">IP Reputation Check</h2>
          </div>
          <IPSearch onSearch={handleIPSearch} isLoading={isLoading} />
        </div>

        {/* Results Panel */}
        <IPResultPanel result={searchResult} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Malicious IPs Table - Takes 2 columns */}
          <div className="lg:col-span-2">
            <MaliciousIPsTable ips={topIps} onSelectIP={handleSelectIP} />
          </div>
          
          {/* Activity Feed - Takes 1 column */}
          <div className="lg:col-span-1">
            <ActivityFeed activities={activities} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>ThreatGuard Intelligence Platform</p>
            <p>Last data sync: March 9, 2026 • All times in UTC</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
