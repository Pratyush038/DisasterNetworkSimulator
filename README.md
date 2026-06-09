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
- **End-to-end encryption** of messages using AES-256-GCM  
- **Digital signatures** on all messages using ECDSA P-256 for authentication and tamper detection  
- **Per-node cryptographic identity** — each node holds an ECDSA keypair for identity verification  
- **Integrity verification** — tampered or corrupted messages are detected and rejected automatically  
- Progressive Web App (PWA) for cross-platform offline functionality  

---

## System Architecture

**Frontend:** React 18, TypeScript, Tailwind CSS, Mapbox GL  
**Backend:** Node.js, Express.js, WebSocket, PostgreSQL  
**IoT Layer:** LoRa or Bluetooth Mesh-enabled devices for node-to-node communication  
**Algorithmic Layer:** Dijkstra’s algorithm for optimal route selection with self-healing redundancy  
**Cryptographic Layer:** Web Crypto API — ECDSA P-256 (signing), AES-256-GCM (encryption), HKDF (key derivation)  

---

## Key Modules

1. **Node Management:** Maintains active node connections, IDs, and coordinates.  
2. **Message Routing Engine:** Determines optimal paths and reroutes upon node failure.  
3. **SOS Broadcasting:** Enables high-priority emergency message propagation across all nodes.  
4. **Network Monitor:** Displays live node activity, latency, and performance metrics.  
5. **Offline Queue Handler:** Buffers unsent messages until connectivity is restored.  
6. **Cryptographic Security Engine:** Handles keypair generation, message signing/verification, end-to-end encryption/decryption, and integrity checks using the Web Crypto API.  

---

## How It Works

1. Each IoT node generates an ECDSA P-256 keypair on initialization, establishing a cryptographic identity.  
2. Each IoT node connects to nearby nodes forming a decentralized mesh.  
3. When a message is sent, it is **digitally signed** with the sender's private key and **encrypted** with AES-256-GCM using a shared secret derived via HKDF.  
4. Dijkstra’s algorithm computes the optimal route across the mesh.  
5. If any node goes offline, the network self-heals by recalculating alternate paths.  
6. On receipt, the message is **decrypted** and the **signature is verified** against the sender's public key — tampered messages are rejected.  
7. Data packets are transmitted using WebSocket for real-time communication.  
8. The React dashboard visualizes nodes, connections, encryption status, and message flow dynamically on the map.  

---

## Cryptographic Security

ResQNet implements a full cryptographic security layer using the **Web Crypto API** (zero external dependencies):

| Feature | Algorithm | Purpose |
|---------|-----------|----------|
| Node Identity | ECDSA P-256 | Each node generates a public/private keypair for authentication |
| Message Signing | ECDSA + SHA-256 | Every message carries a digital signature to prevent spoofing |
| End-to-End Encryption | AES-256-GCM | Message content is encrypted so only the intended recipient can read it |
| Key Derivation | HKDF (SHA-256) | Symmetric keys are derived per node-pair for encryption |
| Integrity Verification | AES-GCM Auth Tag | Tampered or corrupted messages are automatically detected and rejected |

### Security Pipeline

```
Sender                                           Receiver
  │                                                 │
  ├─ Sign message (ECDSA P-256)                     │
  ├─ Encrypt message (AES-256-GCM)                  │
  ├─ Transmit via mesh ──────────────────────────▶  │
  │                                    Decrypt ─────┤
  │                              Verify signature ──┤
  │                                                 │
```

### Dashboard Visibility

- **Home Console** — Live Security Status card showing verified nodes, active keypairs, messages signed, and integrity failures  
- **Simulation** — Step 6 ("Secure Channel Verified") visualizes the crypto layer with animated lock icons on encrypted links, shield indicators on verified nodes, and a real-time Channel Security panel  

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
