import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NetworkConnection, NetworkNode, NetworkStats } from "@/types/network";
import { networkSimulation } from "@/lib/network-simulation";
import { locationService, type LocationData } from "@/lib/location-service";
import { cryptoService, type CryptoStats } from "@/lib/crypto-service";
import { MessagesView } from "@/components/messages-view";
import { SettingsView } from "@/components/settings-view";
import { SOSButton } from "@/components/sos-button";
import { BluetoothManager } from "@/components/bluetooth-manager";
import { BottomNavigation } from "@/components/bottom-navigation";
import { EmergencyActionsCard } from "@/components/dashboard/emergency-actions-card";
import { LocationStatusCard } from "@/components/dashboard/location-status-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { NetworkOverview } from "@/components/dashboard/network-overview";
import { NodeListCard } from "@/components/dashboard/node-list-card";
import Maps from "./maps";
import { Activity, KeyRound, Lock, MessageSquare, Play, Radio, Route, ShieldCheck, Atom } from "lucide-react";
import { pqcService, type PQCStats } from "@/lib/pqc-service";
import type { PQCMode } from "@/lib/crypto-service";

const emptyStats: NetworkStats = {
  connectedNodes: 0,
  totalNodes: 0,
  activeConnections: 0,
  averageLatency: 0,
  coverageRadius: 0,
  totalMessages: 0,
  unreadMessages: 0,
};

export default function Home() {
  const [location, setLocation] = useLocation();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [simulationData, setSimulationData] = useState<{
    nodes: NetworkNode[];
    connections: NetworkConnection[];
    stats: NetworkStats;
  }>({
    nodes: [],
    connections: [],
    stats: emptyStats,
  });
  const [cryptoStats, setCryptoStats] = useState<CryptoStats>(cryptoService.getStats());
  const [pqcStats, setPqcStats] = useState<PQCStats>(pqcService.getStats());

  const {
    data: nodes = [],
    isError: nodesError,
  } = useQuery<NetworkNode[]>({
    queryKey: ["/api/nodes"],
    refetchInterval: 5000,
  });

  const {
    data: connections = [],
    isError: connectionsError,
  } = useQuery<NetworkConnection[]>({
    queryKey: ["/api/connections"],
    refetchInterval: 5000,
  });

  const {
    data: stats,
    isError: statsError,
  } = useQuery<NetworkStats>({
    queryKey: ["/api/network/stats"],
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (nodes.length > 0 && connections.length > 0 && stats) {
      networkSimulation.setData(nodes, connections, stats);
      setSimulationData({
        nodes: networkSimulation.getCurrentNodes(),
        connections: networkSimulation.getCurrentConnections(),
        stats: networkSimulation.getCurrentStats(),
      });
    }
  }, [nodes, connections, stats]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSimulationData({
        nodes: networkSimulation.getCurrentNodes(),
        connections: networkSimulation.getCurrentConnections(),
        stats: networkSimulation.getCurrentStats(),
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = locationService.subscribe((location: LocationData) => {
      setUserLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      });
    });

    locationService.startWatching();

    return () => {
      unsubscribe();
      locationService.stopWatching();
    };
  }, []);

  // Subscribe to crypto stats (includes mirrored PQC stats)
  useEffect(() => {
    const unsubscribe = cryptoService.subscribe((stats) => {
      setCryptoStats(stats);
    });
    return unsubscribe;
  }, []);

  // Subscribe to PQC stats directly for real-time PQC counters
  useEffect(() => {
    const unsubscribe = pqcService.subscribe((stats) => {
      setPqcStats(stats);
    });
    return unsubscribe;
  }, []);

  const refreshLocation = async () => {
    const newLocation = await locationService.getCurrentLocation();
    setUserLocation({
      latitude: newLocation.latitude,
      longitude: newLocation.longitude,
    });
  };

  const activeTab = (() => {
    if (location === "/maps") return "maps";
    if (location === "/messages") return "messages";
    if (location === "/settings") return "settings";
    return "home";
  })();

  const handleRouteChange = (path: string) => {
    setLocation(path);
  };

  const renderHomeContent = () => {
    const hasApiError = nodesError || connectionsError || statsError;
    const { nodes: currentNodes, connections: currentConnections, stats: currentStats } = simulationData;

    return (
      <div className="min-h-full overflow-y-auto bg-slate-50 pb-28">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 sm:px-6">
            <p className="text-sm font-semibold text-blue-600">ResQNet Console</p>
            <h1 className="text-2xl font-bold tracking-normal text-slate-950">
              Live Disaster Network
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Monitor mesh health, field nodes, emergency messages, BLE discovery, and responder location from the operational app.
            </p>
            <Button
              variant="outline"
              className="mt-2 w-fit"
              onClick={() => setLocation("/simulation")}
            >
              <Play className="mr-2 h-4 w-4" />
              Run Simulation
            </Button>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Connected Nodes"
                value={currentStats.connectedNodes}
                detail={`${currentStats.totalNodes || currentNodes.length} total devices`}
                icon={Radio}
                tone="emerald"
              />
              <MetricCard
                label="Active Links"
                value={currentStats.activeConnections}
                detail={`${currentConnections.length} mesh paths tracked`}
                icon={Route}
                tone="blue"
              />
              <MetricCard
                label="Latency"
                value={`${currentStats.averageLatency}ms`}
                detail="weighted route average"
                icon={Activity}
                tone="amber"
              />
              <MetricCard
                label="Unread Alerts"
                value={currentStats.unreadMessages}
                detail={`${currentStats.totalMessages} messages in log`}
                icon={MessageSquare}
                tone="rose"
              />
            </div>

            <NetworkOverview
              nodes={currentNodes}
              connections={currentConnections}
              stats={currentStats}
              isError={hasApiError}
            />

            <NodeListCard nodes={currentNodes} />
          </div>

          <div className="space-y-5">
            <LocationStatusCard userLocation={userLocation} onRefresh={refreshLocation} />
            <BluetoothManager />

            {/* Security Status Card */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">

                {/* Mode selector */}
                <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {(["classical", "pqc", "hybrid"] as PQCMode[]).map((m) => {
                    const active = pqcStats.mode === m;
                    const label = m === "classical" ? "Classical" : m === "pqc" ? "PQC" : "Hybrid";
                    const activeClass =
                      m === "hybrid"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : m === "pqc"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-slate-700 text-white shadow-sm";
                    return (
                      <button
                        key={m}
                        onClick={() => cryptoService.setPQCMode(m)}
                        className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
                          active ? activeClass : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Active mode badge */}
                {pqcStats.mode !== "classical" && (
                  <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    pqcStats.mode === "hybrid" ? "bg-indigo-50" : "bg-purple-50"
                  }`}>
                    <div className="flex items-center gap-2">
                      <Atom className={`h-3.5 w-3.5 ${pqcStats.mode === "hybrid" ? "text-indigo-600" : "text-purple-600"}`} />
                      <span className={`text-sm font-medium ${pqcStats.mode === "hybrid" ? "text-indigo-800" : "text-purple-800"}`}>
                        {pqcStats.mode === "hybrid" ? "Quantum-Safe Hybrid" : "Post-Quantum Only"}
                      </span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      pqcStats.mode === "hybrid"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {pqcStats.pqcReady ? "ACTIVE" : "LOADING…"}
                    </span>
                  </div>
                )}

                {/* Encryption row */}
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">Encryption</span>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    AES-256-GCM
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <div className="text-xs text-slate-500">Verified Nodes</div>
                    <div className="mt-0.5 text-lg font-bold text-slate-900">
                      {cryptoStats.verifiedNodes}/{cryptoStats.totalNodes}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <div className="text-xs text-slate-500">
                      {pqcStats.mode !== "classical" ? "Classical + PQC Keys" : "Key Pairs"}
                    </div>
                    <div className="mt-0.5 text-lg font-bold text-slate-900">
                      {cryptoStats.totalKeyPairs}
                      {pqcStats.mode !== "classical" && (
                        <span className="ml-1 text-xs font-normal text-slate-400">+{pqcStats.pqcKeyPairs} PQC</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <div className="flex items-center gap-1">
                      <KeyRound className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500">Msgs Signed</span>
                    </div>
                    <div className="mt-0.5 text-lg font-bold text-slate-900">
                      {cryptoStats.messagesSigned}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <div className="text-xs text-slate-500">Integrity Fails</div>
                    <div className={`mt-0.5 text-lg font-bold ${
                      cryptoStats.integrityFailures > 0 ? "text-red-600" : "text-emerald-600"
                    }`}>
                      {cryptoStats.integrityFailures}
                    </div>
                  </div>
                </div>

                {/* Signing algorithm */}
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="text-xs text-slate-500">Signing Algorithm</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-800">
                    {pqcStats.mode === "classical" && "ECDSA P-256 + SHA-256"}
                    {pqcStats.mode === "pqc" && "ML-DSA-65 (NIST FIPS 204)"}
                    {pqcStats.mode === "hybrid" && "ECDSA P-256 + ML-DSA-65"}
                  </div>
                </div>

                {/* Key exchange algorithm */}
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="text-xs text-slate-500">Key Exchange</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-800">
                    {pqcStats.mode === "classical" && "ECDH P-256 + HKDF-SHA-256"}
                    {pqcStats.mode === "pqc" && "ML-KEM-768 (NIST FIPS 203)"}
                    {pqcStats.mode === "hybrid" && "ECDH P-256 ⊕ ML-KEM-768"}
                  </div>
                </div>

                {/* PQC operation counters — shown when PQC is active */}
                {pqcStats.mode !== "classical" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-lg border p-2.5 ${
                      pqcStats.mode === "hybrid" ? "border-indigo-100 bg-indigo-50" : "border-purple-100 bg-purple-50"
                    }`}>
                      <div className="text-xs text-slate-500">KEM Encapsulations</div>
                      <div className="mt-0.5 text-lg font-bold text-slate-900">
                        {pqcStats.pqcEncapsulations}
                      </div>
                    </div>
                    <div className={`rounded-lg border p-2.5 ${
                      pqcStats.mode === "hybrid" ? "border-indigo-100 bg-indigo-50" : "border-purple-100 bg-purple-50"
                    }`}>
                      <div className="text-xs text-slate-500">PQC Signatures</div>
                      <div className="mt-0.5 text-lg font-bold text-slate-900">
                        {pqcStats.pqcSignaturesMade}
                      </div>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            <EmergencyActionsCard />
          </div>
        </div>

        {userLocation && <SOSButton userLocation={userLocation} />}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return renderHomeContent();
      case "maps":
        return <Maps />;
      case "messages":
        return <MessagesView />;
      case "settings":
        return <SettingsView />;
      default:
        return renderHomeContent();
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <main className="min-h-0 flex-1">{renderContent()}</main>
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleRouteChange}
        unreadCount={simulationData.stats.unreadMessages}
      />
    </div>
  );
}
