"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { RefreshCw, Trash2, Plus, Rss, Loader2, AlertCircle, CheckCircle } from "lucide-react";

type FeedsResponse = { feeds: Record<string, string> };
type CollectResult = {
  ips_count: number;
  duration_seconds: number;
  feed_results: { name: string; ips_count: number; error: string | null }[];
  error: string | null;
};
type CollectStatus = {
  last_run: {
    last_run: number;
    ips_count: number;
    duration_seconds: number;
    feed_count: number;
  } | null;
};

export default function AdminPage() {
  const [feeds, setFeeds] = useState<Record<string, string>>({});
  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<CollectResult | null>(null);
  const [lastRun, setLastRun] = useState<CollectStatus["last_run"]>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const loadFeeds = async () => {
    setLoadingFeeds(true);
    try {
      const res = await fetch("/api/admin/feeds", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as FeedsResponse;
        setFeeds(data.feeds ?? {});
      }
    } finally {
      setLoadingFeeds(false);
    }
  };

  const loadCollectStatus = async () => {
    try {
      const res = await fetch("/api/admin/collect/status", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as CollectStatus;
        setLastRun(data.last_run ?? null);
      }
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
    loadCollectStatus();
  }, []);

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const url = newUrl.trim();
    if (!name || !url) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      if (res.ok) {
        const data = (await res.json()) as FeedsResponse;
        setFeeds(data.feeds ?? {});
        setNewName("");
        setNewUrl("");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFeed = async (name: string) => {
    try {
      const res = await fetch(`/api/admin/feeds/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (res.ok) {
        const data = (await res.json()) as FeedsResponse;
        setFeeds(data.feeds ?? {});
      }
    } catch {
      // ignore
    }
  };

  const handleRunCollect = async () => {
    setCollecting(true);
    setCollectResult(null);
    try {
      const res = await fetch("/api/admin/collect", { method: "POST" });
      const data = (await res.json()) as CollectResult;
      setCollectResult(data);
      if (res.ok && !data.error) {
        await loadCollectStatus();
      }
    } finally {
      setCollecting(false);
    }
  };

  const formatLastRun = (ts: number) => {
    const d = new Date(ts * 1000);
    const now = Date.now();
    const diff = Math.floor((now - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return d.toLocaleString();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage threat intelligence feeds and sync data into Redis (same format as existing: ip:&lt;ip&gt; with first_seen, last_seen, score, count, sources).
        </p>
      </div>

      {/* Collector run */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Rss className="h-5 w-5" />
              Sync feeds to Redis
            </CardTitle>
            <Button
              onClick={handleRunCollect}
              disabled={collecting || Object.keys(feeds).length === 0}
              className="gap-2"
            >
              {collecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Run collector
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <p className="text-sm text-muted-foreground">Loading status…</p>
          ) : lastRun ? (
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-muted-foreground">Last run: {formatLastRun(lastRun.last_run)}</span>
              <span>IPs written: <strong>{lastRun.ips_count.toLocaleString()}</strong></span>
              <span>Duration: <strong>{lastRun.duration_seconds}s</strong></span>
              <span>Feeds: <strong>{lastRun.feed_count}</strong></span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No run yet. Click &quot;Run collector&quot; to sync feeds into Redis.</p>
          )}
          {collectResult && (
            <div className={`rounded-lg border p-4 text-sm ${collectResult.error ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/30"}`}>
              {collectResult.error ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{collectResult.error}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                  <span>Stored <strong>{collectResult.ips_count.toLocaleString()}</strong> IPs in <strong>{collectResult.duration_seconds}s</strong>.</span>
                </div>
              )}
              {collectResult.feed_results && collectResult.feed_results.length > 0 && (
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {collectResult.feed_results.map((f) => (
                    <li key={f.name}>
                      {f.name}: {f.ips_count} IPs{f.error ? ` — ${f.error}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feeds list + add */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Threat intelligence feeds</CardTitle>
          <p className="text-sm text-muted-foreground">
            These feeds are fetched when you run the collector. Data is written to Redis as <code className="text-xs bg-muted px-1 rounded">ip:&lt;ip&gt;</code> with first_seen, last_seen (unix), score, count, sources.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAddFeed} className="flex flex-wrap items-end gap-3">
            <div className="grid w-full sm:w-auto sm:min-w-[200px] gap-2">
              <Label htmlFor="feed-name">Feed name</Label>
              <Input
                id="feed-name"
                placeholder="e.g. Blocklist.de"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="grid flex-1 min-w-[200px] gap-2">
              <Label htmlFor="feed-url">URL</Label>
              <Input
                id="feed-url"
                type="url"
                placeholder="https://..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={adding || !newName.trim() || !newUrl.trim()} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add feed
            </Button>
          </form>

          {loadingFeeds ? (
            <p className="text-sm text-muted-foreground">Loading feeds…</p>
          ) : Object.keys(feeds).length === 0 ? (
            <p className="text-sm text-muted-foreground">No feeds configured. Add one above or run the backend once to seed defaults.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="max-w-[300px] truncate">URL</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(feeds).map(([name, url]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground" title={url}>{url}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFeed(name)}
                        aria-label={`Remove ${name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
