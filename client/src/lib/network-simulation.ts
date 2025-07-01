import type { NetworkNode, NetworkConnection, NetworkStats } from "@/types/network";

export class NetworkSimulation {
  private nodes: NetworkNode[] = [];
  private connections: NetworkConnection[] = [];
  private stats: NetworkStats = {
    connectedNodes: 0,
    totalNodes: 0,
    activeConnections: 0,
    averageLatency: 0,
    coverageRadius: 0,
    totalMessages: 0,
    unreadMessages: 0,
  };

  private simulationInterval: number | null = null;

  constructor() {
    this.startSimulation();
  }

  setData(nodes: NetworkNode[], connections: NetworkConnection[], stats: NetworkStats) {
    this.nodes = nodes;
    this.connections = connections;
    this.stats = stats;
  }

  private startSimulation() {
    // Simulate network changes every 5 seconds
    this.simulationInterval = window.setInterval(() => {
      this.simulateNetworkChanges();
    }, 5000);
  }

  private simulateNetworkChanges() {
    // Simulate latency fluctuations
    this.stats.averageLatency = Math.floor(Math.random() * 50) + 20;

    // Occasionally simulate node discovery or disconnection
    if (Math.random() < 0.1) { // 10% chance
      this.simulateNodeChange();
    }

    // Simulate signal strength changes
    this.nodes.forEach(node => {
      if (node.isOnline && Math.random() < 0.3) { // 30% chance
        node.signalStrength = Math.max(20, Math.min(100, 
          node.signalStrength + (Math.random() - 0.5) * 20
        ));
      }
    });
  }

  private simulateNodeChange() {
    // Find a node to toggle status
    const changeableNodes = this.nodes.filter(node => node.nodeId !== "user");
    if (changeableNodes.length === 0) return;

    const randomNode = changeableNodes[Math.floor(Math.random() * changeableNodes.length)];
    
    if (randomNode.isOnline && Math.random() < 0.3) {
      // Simulate disconnection
      randomNode.isOnline = false;
      randomNode.signalStrength = 0;
      this.stats.connectedNodes = Math.max(0, this.stats.connectedNodes - 1);
    } else if (!randomNode.isOnline && Math.random() < 0.7) {
      // Simulate reconnection
      randomNode.isOnline = true;
      randomNode.signalStrength = Math.floor(Math.random() * 50) + 50;
      this.stats.connectedNodes++;
    }
  }

  getCurrentStats(): NetworkStats {
    return { ...this.stats };
  }

  getCurrentNodes(): NetworkNode[] {
    return [...this.nodes];
  }

  getCurrentConnections(): NetworkConnection[] {
    return [...this.connections];
  }

  getNodePosition(node: NetworkNode): { x: number; y: number } {
    // Convert lat/lng to screen coordinates (simplified)
    // This is a basic projection for demo purposes
    const baseLatitude = 12.9249; // RV College latitude
    const baseLongitude = 77.4996; // RV College longitude
    
    const x = (node.longitude - baseLongitude) * 50000 + 200;
    const y = (baseLatitude - node.latitude) * 50000 + 200;
    
    return { x: Math.max(50, Math.min(350, x)), y: Math.max(50, Math.min(350, y)) };
  }

  cleanup() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }
}

export const networkSimulation = new NetworkSimulation();
