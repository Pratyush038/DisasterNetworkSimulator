import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  MapPin,
  Play,
  Radio,
  RotateCcw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Users,
  Wifi,
  TrendingUp,
  MapPinCheck,
  Zap,
  Target,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type ScenarioNode = {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  signal: number;
  battery: number;
  status: "online" | "warning" | "offline";
};

type ScenarioLink = {
  from: string;
  to: string;
  latency: number;
  active: boolean;
};

const nodes: ScenarioNode[] = [
  { id: "rv-base", name: "RV Base", role: "Command", x: 50, y: 48, signal: 98, battery: 85, status: "online" },
  { id: "gate", name: "Gate Relay", role: "Relay", x: 34, y: 34, signal: 94, battery: 91, status: "online" },
  { id: "metro", name: "Metro Aid", role: "Medical", x: 65, y: 31, signal: 86, battery: 58, status: "warning" },
  { id: "camp", name: "Kengeri Camp", role: "Shelter", x: 19, y: 64, signal: 74, battery: 72, status: "online" },
  { id: "hospital", name: "Magadi Hospital", role: "Hospital", x: 72, y: 69, signal: 0, battery: 44, status: "offline" },
  { id: "supply", name: "Supply Node", role: "Supplies", x: 42, y: 78, signal: 83, battery: 96, status: "online" },
  { id: "vehicle", name: "Rescue Van", role: "Mobile", x: 83, y: 45, signal: 79, battery: 67, status: "online" },
  { id: "backup", name: "Backup Relay", role: "Relay", x: 58, y: 86, signal: 88, battery: 100, status: "online" },
];

const links: ScenarioLink[] = [
  { from: "rv-base", to: "gate", latency: 24, active: true },
  { from: "rv-base", to: "metro", latency: 42, active: true },
  { from: "rv-base", to: "supply", latency: 51, active: true },
  { from: "gate", to: "camp", latency: 64, active: true },
  { from: "camp", to: "supply", latency: 71, active: true },
  { from: "metro", to: "vehicle", latency: 58, active: true },
  { from: "vehicle", to: "hospital", latency: 82, active: false },
  { from: "supply", to: "backup", latency: 48, active: true },
  { from: "backup", to: "hospital", latency: 96, active: true },
  { from: "metro", to: "backup", latency: 88, active: true },
];

const steps = [
  {
    title: "Incident Detected",
    detail: "Kengeri Camp sends an SOS packet through Gate Relay to RV Base.",
    route: ["camp", "gate", "rv-base"],
    metric: "SOS packet created",
  },
  {
    title: "Route Calculated",
    detail: "Dijkstra avoids the failed hospital link and chooses Backup Relay as the stable path.",
    route: ["rv-base", "supply", "backup", "hospital"],
    metric: "3-hop route selected",
  },
  {
    title: "Broadcast Fan-out",
    detail: "Command broadcasts location, triage, and resource request to every reachable node.",
    route: ["rv-base", "gate", "metro", "supply", "vehicle"],
    metric: "6 devices reached",
  },
  {
    title: "Rescue Dispatched",
    detail: "Rescue Van receives the packet, acknowledges it, and updates the field status.",
    route: ["metro", "vehicle"],
    metric: "Acknowledgement received",
  },
  {
    title: "Network Heals",
    detail: "The hospital remains isolated, but the backup relay keeps the route alive.",
    route: ["hospital", "backup", "supply", "rv-base"],
    metric: "Service preserved",
  },
  {
    title: "Secure Channel Verified",
    detail: "All messages are signed with ECDSA P-256 and encrypted with AES-256-GCM. Node identities verified via public-key authentication.",
    route: ["rv-base", "gate", "camp", "supply"],
    metric: "End-to-end encrypted",
  },
];

const incidents = [
  { label: "Medical triage", value: "12 patients", tone: "text-rose-700 bg-rose-50 border-rose-200" },
  { label: "Water supply", value: "2 crates left", tone: "text-blue-700 bg-blue-50 border-blue-200" },
  { label: "Road status", value: "1 route blocked", tone: "text-amber-700 bg-amber-50 border-amber-200" },
  { label: "Responders", value: "4 teams active", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
];

export default function Simulation() {
  const [, setLocation] = useLocation();
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = window.setInterval(() => {
      setStepIndex((current) => {
        const next = current + 1;
        if (next >= steps.length) {
          setIsCompleted(true);
          setIsPlaying(false);
          return current;
        }
        return next;
      });
    }, 2400);

    return () => window.clearInterval(interval);
  }, [isPlaying]);

  const activeStep = steps[stepIndex];
  const activeRoute = new Set(activeStep.route);
  const deliveryProgress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const deliveredPackets = 18 + stepIndex * 11;
  const averageLatency = 96 - stepIndex * 9;
  const isSecurityStep = stepIndex === steps.length - 1;
  // Crypto is shown as "active" once we reach step 6 or after
  const cryptoActive = stepIndex >= 5;
  // Show progressive crypto stats based on step
  const signedCount = Math.min(stepIndex + 1, steps.length) * 35;
  const encryptedCount = Math.min(stepIndex + 1, steps.length) * 35;
  
  const handleRestart = () => {
    setStepIndex(0);
    setIsPlaying(true);
    setIsCompleted(false);
  };

  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [],
  );

  const isActiveLink = (link: ScenarioLink) => {
    const route = activeStep.route;
    return route.some((nodeId, index) => {
      const nextNodeId = route[index + 1];
      return (
        nextNodeId &&
        ((link.from === nodeId && link.to === nextNodeId) ||
          (link.to === nodeId && link.from === nextNodeId))
      );
    });
  };

  const getLinkMidpoint = (link: ScenarioLink) => {
    const from = nodeById.get(link.from);
    const to = nodeById.get(link.to);
    if (!from || !to) return { x: 0, y: 0 };
    return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              className="mb-2 -ml-3 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setLocation("/app")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Console
            </Button>
            <h1 className="text-2xl font-bold tracking-normal">ResQNet Simulation</h1>
            <p className="mt-1 text-sm text-white/50">
              {isCompleted 
                ? "Simulation completed — review results below" 
                : "Animated disaster-response flow using mock mesh, BLE, routing, and rescue data."}
            </p>
          </div>
          <Button
            onClick={() => {
              if (isCompleted) {
                handleRestart();
              } else {
                setIsPlaying((value) => !value);
              }
            }}
            className="rounded-full bg-white text-slate-950 hover:bg-white/90"
          >
            {isCompleted ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Run Again
              </>
            ) : isPlaying ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Auto running
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Play
              </>
            )}
          </Button>
        </div>
      </header>

      {isCompleted ? (
        <main className="mx-auto max-w-7xl px-5 py-6">
          <div className="space-y-6">
            {/* Results Header */}
            <Card className="overflow-hidden rounded-lg border-emerald-500/30 bg-emerald-500/5 text-white shadow-2xl">
              <CardHeader className="border-b border-emerald-500/20 bg-emerald-500/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <div>
                    <CardTitle className="text-2xl text-emerald-100">Simulation Complete</CardTitle>
                    <p className="mt-2 text-sm text-emerald-200/70">
                      Network successfully routed emergency response through disaster scenario
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <ResultMetric icon={Wifi} label="Network Reachability" value="87.5%" color="blue" />
                  <ResultMetric icon={Clock} label="Avg Latency" value="24ms" color="purple" />
                  <ResultMetric icon={Truck} label="Assets Dispatched" value="2" color="emerald" />
                  <ResultMetric icon={Lock} label="Encryption" value="AES-256" color="rose" />
                </div>
              </CardContent>
            </Card>

            {/* Full Scenario Timeline */}
            <Card className="rounded-lg border-white/10 bg-white/[0.04] text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-blue-200" />
                  Complete Scenario Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`rounded-full p-2 ${idx < steps.length - 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {idx < steps.length - 1 ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        </div>
                        {idx < steps.length - 1 && (
                          <div className="mt-2 h-8 w-0.5 bg-white/10" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-white">{step.title}</h4>
                            <p className="mt-1 text-sm text-white/60">{step.detail}</p>
                          </div>
                          <Badge className="shrink-0 bg-white/10 text-white/80">{step.metric}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {step.route.map((nodeId, i) => (
                            <span key={`${nodeId}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200">
                              {nodeById.get(nodeId)?.name || nodeId}
                              {i < step.route.length - 1 && <Route className="h-3 w-3" />}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-lg border-white/10 bg-white/[0.04] text-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Zap className="mr-2 h-5 w-5 text-yellow-200" />
                    Performance Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ResultRow label="Total Messages" value="210" detail="Delivered successfully" />
                  <ResultRow label="Network Nodes" value="8/8" detail="All connected at completion" />
                  <ResultRow label="Route Redundancy" value="3" detail="Backup paths available" />
                  <ResultRow label="System Uptime" value="100%" detail="No critical failures" />
                </CardContent>
              </Card>

              <Card className="rounded-lg border-white/10 bg-white/[0.04] text-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <ShieldCheck className="mr-2 h-5 w-5 text-cyan-200" />
                    Cryptographic Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ResultRow label="Messages Signed" value="210/210" detail="ECDSA P-256 + SHA-256" />
                  <ResultRow label="Messages Encrypted" value="210/210" detail="AES-256-GCM" />
                  <ResultRow label="Node Keys" value="8 pairs" detail="ECDSA P-256 keypairs" />
                  <ResultRow label="Integrity Failures" value="0" detail="No tampered messages" />
                </CardContent>
              </Card>

              <Card className="rounded-lg border-white/10 bg-white/[0.04] text-white">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Target className="mr-2 h-5 w-5 text-rose-200" />
                    Operational Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ResultRow label="Medical Response" value="12 patients" detail="Triaged and coordinated" />
                  <ResultRow label="Resource Delivery" value="3 crates" detail="Water & supplies deployed" />
                  <ResultRow label="Field Teams" value="4 active" detail="Coordinated via mesh" />
                  <ResultRow label="Est. Lives Saved" value="18" detail="Based on response time" />
                </CardContent>
              </Card>
            </div>

            {/* Call to Action */}
            <Card className="rounded-lg border-white/10 bg-white/[0.04] text-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-blue-200" />
                  How This Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-white/55">
                <p>
                  <strong className="text-white">1. Detection:</strong> Disaster detected at Kengeri Camp via BLE, SOS signal created
                </p>
                <p>
                  <strong className="text-white">2. Routing:</strong> Dijkstra algorithm calculates optimal path around failed hospital link
                </p>
                <p>
                  <strong className="text-white">3. Distribution:</strong> Message broadcast fan-out reaches 6+ devices in network
                </p>
                <p>
                  <strong className="text-white">4. Coordination:</strong> Rescue Van receives packet, acknowledges, and dispatches teams
                </p>
                <p>
                  <strong className="text-white">5. Recovery:</strong> Backup relay maintains hospital connectivity despite infrastructure damage
                </p>
                <p>
                  <strong className="text-white">6. Security:</strong> All messages signed (ECDSA) and encrypted (AES-256-GCM), node identities verified
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={handleRestart}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Simulation Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      ) : (
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1.35fr_0.85fr]">
        <Card className="overflow-hidden rounded-lg border-white/10 bg-white/[0.04] text-white shadow-2xl">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center text-white">
                  <Radio className="mr-2 h-5 w-5 text-blue-200" />
                  Live Mesh Playback
                </CardTitle>
                <p className="mt-2 text-sm text-white/45">{activeStep.detail}</p>
              </div>
              <Badge className="bg-blue-500/20 text-blue-100 hover:bg-blue-500/20">
                Step {stepIndex + 1}/{steps.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative aspect-[16/10] min-h-[26rem] overflow-hidden bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.18),transparent_34%),linear-gradient(135deg,#111827,#020617)]">
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                {/* SVG Defs for crypto glow filters */}
                <defs>
                  <filter id="crypto-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="0.8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="encrypted-link" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>

                {links.map((link) => {
                  const from = nodeById.get(link.from);
                  const to = nodeById.get(link.to);
                  if (!from || !to) return null;

                  const active = isActiveLink(link);
                  const showEncrypted = isSecurityStep && active;

                  return (
                    <g key={`${link.from}-${link.to}`}>
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={showEncrypted ? "url(#encrypted-link)" : active ? "#38bdf8" : link.active ? "#475569" : "#ef4444"}
                        strokeWidth={showEncrypted ? 1.1 : active ? 0.9 : 0.35}
                        strokeDasharray={link.active ? (active ? "2 1.2" : undefined) : "1.5 1.5"}
                        opacity={active ? 1 : 0.62}
                        className={active ? "simulation-flow" : undefined}
                        filter={showEncrypted ? "url(#crypto-glow)" : undefined}
                      />
                      {/* Lock icon on encrypted links */}
                      {showEncrypted && (() => {
                        const mid = getLinkMidpoint(link);
                        return (
                          <g className="crypto-lock-appear">
                            <circle cx={mid.x} cy={mid.y} r="2.2" fill="#0e7490" fillOpacity="0.9" stroke="#22d3ee" strokeWidth="0.35" />
                            <text x={mid.x} y={mid.y + 0.9} textAnchor="middle" fontSize="2.2" fill="#ecfeff">🔒</text>
                          </g>
                        );
                      })()}
                    </g>
                  );
                })}
                {nodes.map((node) => {
                  const isRouteNode = activeRoute.has(node.id);
                  const fill =
                    node.status === "offline"
                      ? "#64748b"
                      : node.status === "warning"
                        ? "#f59e0b"
                        : "#10b981";

                  return (
                    <g key={node.id}>
                      {/* Security step: cyan shield ring around route nodes */}
                      {isSecurityStep && isRouteNode && (
                        <circle cx={node.x} cy={node.y} r="6.5" fill="none" stroke="#06b6d4" strokeWidth="0.4" strokeDasharray="1.5 1" className="crypto-shield-ring" />
                      )}
                      {isRouteNode && (
                        <circle cx={node.x} cy={node.y} r="5.8" fill="none" stroke={isSecurityStep ? "#22d3ee" : "#38bdf8"} strokeWidth="0.65" className="simulation-pulse" />
                      )}
                      <circle cx={node.x} cy={node.y} r="3.5" fill={fill} stroke="#ffffff" strokeWidth="0.65" />
                      {/* Shield icon on verified nodes during security step */}
                      {isSecurityStep && isRouteNode && node.status !== "offline" && (
                        <g className="crypto-lock-appear">
                          <text x={node.x - 1.2} y={node.y - 5} fontSize="2.8" fill="#22d3ee">🛡️</text>
                        </g>
                      )}
                      <text x={node.x + 4.8} y={node.y + 0.6} fontSize="2.55" fill="#e2e8f0">
                        {node.name}
                      </text>
                      <text x={node.x + 4.8} y={node.y + 3.9} fontSize="1.9" fill={isSecurityStep && isRouteNode ? "#67e8f9" : "#94a3b8"}>
                        {isSecurityStep && isRouteNode ? "Verified ✓" : node.role}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Step info overlay — top left */}
              <div className="absolute left-5 top-5 rounded-lg border border-white/10 bg-slate-950/75 p-4 backdrop-blur">
                <div className="text-sm font-semibold">{activeStep.title}</div>
                <div className="mt-1 text-xs text-white/50">{activeStep.metric}</div>
              </div>

              {/* Encryption status overlay — top right */}
              <div className={`absolute right-5 top-5 rounded-lg border px-3 py-2 backdrop-blur transition-all duration-500 ${
                isSecurityStep
                  ? "border-cyan-500/40 bg-cyan-950/80 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                  : "border-white/10 bg-slate-950/75"
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    isSecurityStep ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)] animate-pulse" : "bg-emerald-400"
                  }`} />
                  <span className={`text-xs font-medium ${
                    isSecurityStep ? "text-cyan-200" : "text-white/60"
                  }`}>
                    {isSecurityStep ? "🔐 E2E Encrypted" : "🔑 Keys Active"}
                  </span>
                </div>
                {isSecurityStep && (
                  <div className="mt-1.5 space-y-0.5">
                    <div className="text-[10px] text-cyan-300/70">ECDSA P-256 · AES-256-GCM</div>
                    <div className="text-[10px] text-cyan-300/70">{nodes.filter(n => n.status !== 'offline').length} nodes verified</div>
                  </div>
                )}
              </div>

              {/* Route badges — bottom bar */}
              <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-white/10 bg-slate-950/75 p-4 backdrop-blur">
                <div className="flex flex-wrap items-center gap-2">
                  {activeStep.route.map((nodeId, index) => (
                    <div key={`${nodeId}-${index}`} className="flex items-center gap-2">
                      <Badge className={`rounded-full ${
                        isSecurityStep
                          ? "bg-cyan-500/20 text-cyan-100 border border-cyan-500/30 hover:bg-cyan-500/20"
                          : "bg-white/10 text-white hover:bg-white/10"
                      }`}>
                        {isSecurityStep && "🔒 "}{nodeById.get(nodeId)?.name || nodeId}
                      </Badge>
                      {index < activeStep.route.length - 1 && (
                        isSecurityStep
                          ? <Lock className="h-3.5 w-3.5 text-cyan-300" />
                          : <Route className="h-4 w-4 text-blue-200" />
                      )}
                    </div>
                  ))}
                </div>
                {isSecurityStep && (
                  <div className="mt-2 text-[10px] text-cyan-300/60">
                    All packets: signed → encrypted → transmitted → decrypted → verified
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-lg border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Activity className="mr-2 h-5 w-5 text-emerald-200" />
                Live Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-white/55">Delivery progress</span>
                  <span className="font-semibold">{deliveryProgress}%</span>
                </div>
                <Progress value={deliveryProgress} className="h-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric icon={Wifi} label="Reachable" value="7/8" />
                <Metric icon={Clock} label="Latency" value={`${averageLatency}ms`} />
                <Metric icon={CheckCircle2} label="Packets" value={deliveredPackets} />
                <Metric icon={Truck} label="Dispatch" value="1 van" />
              </div>
            </CardContent>
          </Card>

          {/* Step Timeline Indicator */}
          <Card className="rounded-lg border-white/10 bg-white/[0.04] text-white">
            <CardHeader>
              <CardTitle className="flex items-center text-sm text-white">
                <Clock className="mr-2 h-4 w-4 text-blue-200" />
                Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setStepIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-all ${
                      idx === stepIndex
                        ? "bg-blue-500/30 border-l-2 border-blue-400 text-white"
                        : idx < stepIndex
                          ? "bg-emerald-500/10 text-emerald-200/70 hover:bg-emerald-500/20"
                          : "bg-white/5 text-white/40 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold">{step.title}</div>
                    <div className="mt-0.5 opacity-75">{step.metric}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Channel Security Card */}
          <Card className={`rounded-lg text-white transition-all duration-500 ${
            isSecurityStep
              ? "border-cyan-500/30 bg-cyan-500/[0.06] shadow-[0_0_30px_rgba(6,182,212,0.08)]"
              : "border-white/10 bg-white/[0.04]"
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <ShieldCheck className={`mr-2 h-5 w-5 ${
                  isSecurityStep ? "text-cyan-300" : "text-cyan-200/60"
                }`} />
                Channel Security
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className={`flex items-center justify-between rounded-lg border p-2.5 transition-all duration-500 ${
                isSecurityStep
                  ? "border-cyan-500/30 bg-cyan-500/10"
                  : "border-white/10 bg-white/[0.04]"
              }`}>
                <div className="flex items-center gap-2">
                  <Lock className={`h-3.5 w-3.5 ${isSecurityStep ? "text-cyan-300" : "text-white/40"}`} />
                  <span className="text-xs text-white/70">Encryption</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isSecurityStep
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-white/10 text-white/50"
                }`}>
                  AES-256-GCM
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-lg border p-2 transition-all duration-500 ${
                  isSecurityStep ? "border-cyan-500/20 bg-cyan-500/5" : "border-white/10 bg-white/[0.03]"
                }`}>
                  <div className="text-[10px] text-white/50">Signed</div>
                  <div className={`text-sm font-bold ${isSecurityStep ? "text-cyan-200" : "text-white/80"}`}>{signedCount}</div>
                </div>
                <div className={`rounded-lg border p-2 transition-all duration-500 ${
                  isSecurityStep ? "border-cyan-500/20 bg-cyan-500/5" : "border-white/10 bg-white/[0.03]"
                }`}>
                  <div className="text-[10px] text-white/50">Encrypted</div>
                  <div className={`text-sm font-bold ${isSecurityStep ? "text-cyan-200" : "text-white/80"}`}>{encryptedCount}</div>
                </div>
                <div className={`rounded-lg border p-2 transition-all duration-500 ${
                  isSecurityStep ? "border-cyan-500/20 bg-cyan-500/5" : "border-white/10 bg-white/[0.03]"
                }`}>
                  <div className="text-[10px] text-white/50">Key Pairs</div>
                  <div className={`text-sm font-bold ${isSecurityStep ? "text-cyan-200" : "text-white/80"}`}>8</div>
                </div>
                <div className={`rounded-lg border p-2 transition-all duration-500 ${
                  isSecurityStep ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-white/[0.03]"
                }`}>
                  <div className="text-[10px] text-white/50">Integrity</div>
                  <div className={`text-sm font-bold ${isSecurityStep ? "text-emerald-300" : "text-white/80"}`}>✓ 0 fails</div>
                </div>
              </div>
              <div className={`rounded-lg border p-2 transition-all duration-500 ${
                isSecurityStep ? "border-cyan-500/20 bg-cyan-500/5" : "border-white/10 bg-white/[0.03]"
              }`}>
                <div className="text-[10px] text-white/50">Signing Algorithm</div>
                <div className={`text-xs font-semibold ${isSecurityStep ? "text-cyan-200" : "text-white/60"}`}>
                  ECDSA P-256 + SHA-256
                </div>
              </div>
              {isSecurityStep && (
                <div className="mt-1 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2">
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="h-3 w-3 text-cyan-400" />
                    <span className="text-[10px] font-medium text-cyan-300">Pipeline Active</span>
                  </div>
                  <div className="mt-1 text-[9px] leading-relaxed text-cyan-200/60">
                    Sign → Encrypt → Route → Decrypt → Verify
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      )}


      <style>{`
        .simulation-flow {
          animation: simulationDash 1.2s linear infinite;
        }

        .simulation-pulse {
          animation: simulationPulse 1.4s ease-in-out infinite;
        }

        .crypto-shield-ring {
          animation: cryptoShieldSpin 4s linear infinite;
          transform-origin: center;
        }

        .crypto-lock-appear {
          animation: cryptoLockAppear 0.6s ease-out forwards;
        }

        @keyframes simulationDash {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -10; }
        }

        @keyframes simulationPulse {
          0%, 100% { opacity: 0.35; transform: scale(1); transform-origin: center; }
          50% { opacity: 1; transform: scale(1.22); transform-origin: center; }
        }

        @keyframes cryptoShieldSpin {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -20; }
        }

        @keyframes cryptoLockAppear {
          0% { opacity: 0; transform: scale(0.3); }
          60% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <Icon className="mb-2 h-4 w-4 text-blue-200" />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-white/45">{label}</div>
    </div>
  );
}

function ResultMetric({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string;
  color: "blue" | "purple" | "emerald" | "rose";
}) {
  const colorMap = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <Icon className="mb-2 h-5 w-5" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs opacity-80">{label}</div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="mt-0.5 text-xs text-white/50">{detail}</div>
      </div>
      <div className="text-lg font-bold text-emerald-400">{value}</div>
    </div>
  );
}
