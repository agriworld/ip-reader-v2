"use client";

import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion, ExternalLink, Globe, Clock, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface IPResult {
  ipAddress: string;
  threatScore: number;
  verdict: "malicious" | "suspicious" | "clean";
  sources: { name: string; reported: boolean; lastSeen?: string }[];
  country?: string;
  isp?: string;
  lastAnalyzed?: string;
}

interface IPResultPanelProps {
  result: IPResult | null;
}

export function IPResultPanel({ result }: IPResultPanelProps) {
  if (!result) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ShieldQuestion className="h-16 w-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">No IP analyzed</p>
          <p className="text-sm">Enter an IP address above to check its reputation</p>
        </CardContent>
      </Card>
    );
  }

  const getVerdictConfig = (verdict: IPResult["verdict"]) => {
    switch (verdict) {
      case "malicious":
        return {
          icon: ShieldAlert,
          label: "Malicious",
          bgColor: "bg-danger/10",
          textColor: "text-danger",
          borderColor: "border-danger/30",
          progressColor: "bg-danger",
        };
      case "suspicious":
        return {
          icon: Shield,
          label: "Suspicious",
          bgColor: "bg-warning/10",
          textColor: "text-warning",
          borderColor: "border-warning/30",
          progressColor: "bg-warning",
        };
      case "clean":
        return {
          icon: ShieldCheck,
          label: "Clean",
          bgColor: "bg-success/10",
          textColor: "text-success",
          borderColor: "border-success/30",
          progressColor: "bg-success",
        };
    }
  };

  const verdictConfig = getVerdictConfig(result.verdict);
  const VerdictIcon = verdictConfig.icon;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-card-foreground">Analysis Results</CardTitle>
          <Badge variant="outline" className={`${verdictConfig.bgColor} ${verdictConfig.textColor} ${verdictConfig.borderColor} font-medium`}>
            <VerdictIcon className="h-3.5 w-3.5 mr-1.5" />
            {verdictConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* IP Address and Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Globe className="h-4 w-4" />
              <span>IP Address</span>
            </div>
            <p className="font-mono text-2xl font-bold text-foreground">{result.ipAddress}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {result.country && <span>{result.country}</span>}
              {result.isp && <span className="truncate">{result.isp}</span>}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Threat Score</span>
              <span className={`text-2xl font-bold ${verdictConfig.textColor}`}>{result.threatScore}/100</span>
            </div>
            <Progress value={result.threatScore} className="h-3 bg-secondary" />
            <p className="text-xs text-muted-foreground">
              {result.threatScore >= 70 ? "High risk - Immediate action recommended" : 
               result.threatScore >= 40 ? "Medium risk - Monitor closely" : 
               "Low risk - No immediate concerns"}
            </p>
          </div>
        </div>

        {/* Metadata */}
        {result.lastAnalyzed && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground border-t border-border pt-4">
            <Clock className="h-4 w-4" />
            <span>Last analyzed: {result.lastAnalyzed}</span>
          </div>
        )}

        {/* Sources */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Server className="h-4 w-4" />
            <span>Threat Intelligence Sources</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {result.sources.map((source, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-3 py-2 rounded-md border ${
                  source.reported
                    ? "bg-danger/5 border-danger/20"
                    : "bg-secondary border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${source.reported ? "bg-danger" : "bg-success"}`} />
                  <span className="text-sm font-medium text-foreground">{source.name}</span>
                </div>
                <span className={`text-xs ${source.reported ? "text-danger" : "text-success"}`}>
                  {source.reported ? "Reported" : "Clean"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
