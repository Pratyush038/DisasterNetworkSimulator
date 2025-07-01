export interface NetworkNode {
  id: number;
  nodeId: string;
  name: string;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  signalStrength: number;
  lastSeen: Date;
}

export interface NetworkConnection {
  id: number;
  fromNodeId: string;
  toNodeId: string;
  distance: number;
  latency: number;
  isActive: boolean;
}

export interface Message {
  id: number;
  senderId: string;
  receiverId?: string;
  content: string;
  messageType: "normal" | "sos" | "system";
  routingPath?: string[];
  hops: number;
  timestamp: Date;
  isDelivered: boolean;
}

export interface NetworkStats {
  connectedNodes: number;
  totalNodes: number;
  activeConnections: number;
  averageLatency: number;
  coverageRadius: number;
  totalMessages: number;
  unreadMessages: number;
}

export interface GraphNode {
  id: string;
  name: string;
  position: { x: number; y: number };
  isOnline: boolean;
  signalStrength: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  isActive: boolean;
}

export interface RoutingResult {
  path: string[];
  totalDistance: number;
  hops: number;
}
