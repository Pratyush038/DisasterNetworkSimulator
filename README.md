# ResQNet: Disaster Relief Communication Network

**ResQNet** is an IoT-based Disaster Communication Network that establishes a resilient mesh topology for emergency communication when traditional infrastructure (cell towers, internet) fails.  
Designed for disaster scenarios such as earthquakes, floods, and hurricanes, the system ensures fault-tolerant, self-healing, and real-time message delivery across affected zones.

---

## Overview

During disasters, communication infrastructure often collapses — isolating victims and rescue teams.  
ResQNet bridges this gap by creating a mesh network using distributed IoT nodes that communicate autonomously.  
It provides reliable message routing, location tracking, and priority-based delivery even under network fragmentation or partial failure.

---

## Core Features

- Self-healing mesh network with automatic route recalculation when nodes fail  
- Multi-path redundancy for reliable message delivery  
- Dijkstra’s algorithm for optimal path routing  
- Real-time GPS tracking and node visualization on the map  
- Offline message queuing and automatic resend when reconnected  
- Priority-based routing for critical SOS messages  
- Scalable topology simulation with up to 12 IoT nodes (each covering a 5 km radius)  
- Secure communication using HTTPS and WebSocket encryption  
- Progressive Web App (PWA) for cross-platform offline functionality  

---

## System Architecture

**Frontend:** React 18, TypeScript, Tailwind CSS, Mapbox GL  
**Backend:** Node.js, Express.js, WebSocket, PostgreSQL  
**IoT Layer:** LoRa or Bluetooth Mesh-enabled devices for node-to-node communication  
**Algorithmic Layer:** Dijkstra’s algorithm for optimal route selection with self-healing redundancy  

---

## Key Modules

1. **Node Management:** Maintains active node connections, IDs, and coordinates.  
2. **Message Routing Engine:** Determines optimal paths and reroutes upon node failure.  
3. **SOS Broadcasting:** Enables high-priority emergency message propagation across all nodes.  
4. **Network Monitor:** Displays live node activity, latency, and performance metrics.  
5. **Offline Queue Handler:** Buffers unsent messages until connectivity is restored.  

---

## How It Works

1. Each IoT node connects to nearby nodes forming a decentralized mesh.  
2. When a message is sent, Dijkstra’s algorithm computes the optimal route.  
3. If any node goes offline, the network self-heals by recalculating alternate paths.  
4. Data packets are transmitted using WebSocket for real-time communication.  
5. The React dashboard visualizes nodes, connections, and message flow dynamically on the map.  

---

## Installation and Setup

1. Clone the repository  
   ```bash
   git clone https://github.com/Pratyush038/DisasterNetworkSimulator.git
   cd DisasterNetworkSimulator
   ```
2. Install dependencies
  ```bash
   npm install
  ```
3. Setup PostgreSQL database and configure .env with credentials
   ```bash
   DATABASE_URL="FILL_YOUR_INFO"
   ```
4. Run the backend server
5. Start the frontend

## Future Scope
	•	Integration with real LoRa modules for field deployment
	•	Mobile-native version using React Native
	•	AI-driven route optimization and congestion prediction
	•	Integration with emergency service APIs for automated response
	•	Deployment on cloud edge nodes for large-scale disaster simulations

---
## Scalability Beyond Disaster Scenarios

The mesh-based architecture of ResQNet can be adapted for other fields such as:
	•	Smart city IoT networks
	•	Rural connectivity systems
	•	Defense communication networks
	•	Wildlife monitoring in remote terrains
