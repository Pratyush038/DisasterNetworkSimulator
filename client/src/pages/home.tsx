import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import type { NetworkNode, NetworkConnection, NetworkStats } from "@/types/network";
import { networkSimulation } from "@/lib/network-simulation";
import { locationService, type LocationData } from "@/lib/location-service";
import { MessagesView } from "@/components/messages-view";
import { SettingsView } from "@/components/settings-view";
import { SOSButton } from "@/components/sos-button";
import { BottomNavigation } from "@/components/bottom-navigation";
import Maps from "./maps";
import { 
  Activity,
  User,
  Smartphone,
  Radio,
  AlertTriangle,
  Network,
  Info
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [simulationData, setSimulationData] = useState<{
    nodes: NetworkNode[];
    connections: NetworkConnection[];
    stats: NetworkStats;
  }>({
    nodes: [],
    connections: [],
    stats: {
      connectedNodes: 0,
      totalNodes: 0,
      activeConnections: 0,
      averageLatency: 0,
      coverageRadius: 0,
      totalMessages: 0,
      unreadMessages: 0,
    },
  });

  const { data: nodes = [] } = useQuery<NetworkNode[]>({
    queryKey: ["/api/nodes"],
    refetchInterval: 5000,
  });

  const { data: connections = [] } = useQuery<NetworkConnection[]>({
    queryKey: ["/api/connections"],
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery<NetworkStats>({
    queryKey: ["/api/network/stats"],
    refetchInterval: 2000,
  });

  // Update simulation data
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
    const interval = setInterval(() => {
      setSimulationData({
        nodes: networkSimulation.getCurrentNodes(),
        connections: networkSimulation.getCurrentConnections(),
        stats: networkSimulation.getCurrentStats(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // GPS location tracking
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

  const getNodeIcon = (node: NetworkNode) => {
    if (node.nodeId === "user") return User;
    if (node.name.includes("Emergency")) return AlertTriangle;
    if (node.name.includes("Relay")) return Radio;
    return Smartphone;
  };

  const getNodePosition = (node: NetworkNode) => {
    const centerLat = 12.9249;
    const centerLon = 77.4996;
    const mapWidth = 800;
    const mapHeight = 400;

    const latRange = 0.02;
    const lonRange = 0.02;

    const x = ((node.longitude - (centerLon - lonRange/2)) / lonRange) * mapWidth;
    const y = ((centerLat + latRange/2 - node.latitude) / latRange) * mapHeight;

    return {
      x: Math.max(60, Math.min(mapWidth - 60, x)),
      y: Math.max(60, Math.min(mapHeight - 60, y))
    };
  };

  const renderHomeContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Header */}
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ResQNet</h1>
        <p className="text-gray-600">Emergency Mesh Network Communication</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-24 space-y-6">
        {/* Network Status Card */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center text-blue-900">
                <Activity className="h-5 w-5 mr-2" />
                Network Status
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md" aria-describedby="network-concepts-description">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <Network className="h-5 w-5 mr-2" />
                      Network Concepts
                    </DialogTitle>
                  </DialogHeader>
                  <div id="network-concepts-description" className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">🔄 Mesh Topology:</h4>
                      <p className="text-gray-700">Each node connects to multiple others, creating redundant paths for message delivery during emergencies.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">📊 Dijkstra's Algorithm:</h4>
                      <p className="text-gray-700">Finds shortest path based on distance + latency weights for optimal routing efficiency.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">📡 Packet Switching:</h4>
                      <p className="text-gray-700">Messages broken into packets, routed independently through mesh network for reliability.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">🚨 Emergency Broadcasting:</h4>
                      <p className="text-gray-700">SOS messages use flooding protocol to reach all nodes simultaneously for maximum coverage.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">🛡️ Disaster Recovery:</h4>
                      <p className="text-gray-700">Network automatically reroutes when nodes fail, ensuring communication during disasters.</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{simulationData.stats.connectedNodes}</div>
                <div className="text-sm text-green-600">Connected Nodes</div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{simulationData.stats.averageLatency}ms</div>
                <div className="text-sm text-blue-600">Network Latency</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">Network Health:</span>
              <Badge variant={simulationData.stats.connectedNodes > 8 ? "default" : "destructive"} className="text-sm">
                {simulationData.stats.connectedNodes > 8 ? 'Excellent' : 'Critical'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Algorithm:</span>
                <span className="text-purple-600 font-medium">Dijkstra</span>
              </div>
              <div className="flex justify-between">
                <span>Topology:</span>
                <span className="text-orange-600 font-medium">Mesh</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Status Card */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center text-red-700">
              <User className="h-5 w-5 mr-2" />
              Your Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {userLocation ? (
              <>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-green-800">GPS Location Active</div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-6 px-2"
                      onClick={async () => {
                        try {
                          const newLocation = await locationService.getCurrentLocation();
                          setUserLocation({
                            latitude: newLocation.latitude,
                            longitude: newLocation.longitude
                          });
                        } catch (error) {
                          console.error('Failed to update location:', error);
                        }
                      }}
                    >
                      📍 Refresh
                    </Button>
                  </div>
                  <div className="text-xs text-green-600">
                    {userLocation.latitude.toFixed(6)}°N, {userLocation.longitude.toFixed(6)}°E
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <div className="text-lg">📶</div>
                    <div className="text-xs text-green-700">Strong Signal</div>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <div className="text-lg">🔋</div>
                    <div className="text-xs text-green-700">85% Battery</div>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <div className="text-lg">🏫</div>
                    <div className="text-xs text-blue-700">RV College</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-yellow-600 mb-2">📍 Acquiring GPS signal...</div>
                <div className="text-xs text-yellow-700">Please enable location services</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Actions Card */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center text-orange-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Emergency Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <Button variant="outline" className="justify-start h-12">
                <User className="h-4 w-4 mr-3" />
                Find Nearby Survivors
              </Button>
              <Button variant="outline" className="justify-start h-12">
                <Radio className="h-4 w-4 mr-3" />
                Broadcast Location
              </Button>
              <Button variant="outline" className="justify-start h-12">
                <AlertTriangle className="h-4 w-4 mr-3" />
                Emergency Contacts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOS Button */}
      {userLocation && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <SOSButton userLocation={userLocation} />
        </div>
      )}
    </div>
  );

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
    <div className="flex flex-col h-screen bg-white">
      <div className="flex-1">
        {renderContent()}
      </div>
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        unreadCount={simulationData.stats.unreadMessages}
      />
    </div>
  );
}