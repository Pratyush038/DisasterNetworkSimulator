# ResQNet — IoT Disaster Relief Communication Network

A browser-based simulator for a **self-healing mesh network** designed to maintain emergency communications when conventional infrastructure fails.  
It combines real routing algorithms, Bluetooth LE discovery, live cryptographic operations, and NIST-standardised **post-quantum cryptography** in a single interactive app.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Cryptographic Architecture](#cryptographic-architecture)
- [Post-Quantum Cryptography](#post-quantum-cryptography)
- [Network Simulation](#network-simulation)
- [API Reference](#api-reference)
- [Security Model](#security-model)

---

## Overview

ResQNet simulates an IoT mesh network deployed across 12 nodes around the RV College area in Bangalore.  
When a disaster strikes and cell towers go down, these nodes communicate directly over BLE / LoRa, routing messages through the healthiest available paths.

**Core problems solved:**
- Communication continuity after infrastructure failure
- Secure, authenticated message delivery across untrusted relay nodes
- Quantum-resistant cryptography for long-lived emergency channels
- Real-time network topology visualisation and fault recovery

---

## Features

| Feature | Details |
|---------|---------|
| **Mesh Topology** | 12 nodes, 17 bidirectional links, self-healing on node failure |
| **Routing** | Dijkstra's algorithm — optimal path by distance × latency weight |
| **SOS Broadcast** | Flood-fill BFS reaches every reachable node simultaneously |
| **BLE Discovery** | Web Bluetooth API scanning with realistic fallback simulation |
| **Geolocation** | Continuous GPS watch via Geolocation API (fallback: RV College coords) |
| **Classical Crypto** | ECDSA P-256 signing · ECDH + HKDF key derivation · AES-256-GCM encryption |
| **Post-Quantum Crypto** | ML-KEM-768 (FIPS 203) · ML-DSA-65 (FIPS 204) — real NIST-standardised implementations |
| **Hybrid Mode** | Classical + PQC layers simultaneously; attacker must break both |
| **Crypto Workbench** | Live step-by-step demo of every algorithm with hex output and timing |
| **Simulation Playback** | 6-step animated disaster-response scenario with network visualisation |
| **REST API** | Express.js backend with nodes, messages, connections, SOS, and stats endpoints |
| **Persistent Storage** | Drizzle ORM schema with PostgreSQL (in-memory mock for development) |

---

## Technology Stack

### Frontend
| Library | Purpose |
|---------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool and dev server |
| Tailwind CSS v3 | Utility-first styling |
| Radix UI + shadcn/ui | Accessible component primitives |
| Framer Motion | Animations |
| Wouter | Client-side routing |
| TanStack Query v5 | Server-state management and polling |
| Leaflet / Mapbox GL | Map rendering |
| Recharts | Data visualisation |
| Lucide React | Icon set |
| **Web Crypto API** | Classical cryptography (browser-native) |
| **@noble/post-quantum** | ML-KEM-768 and ML-DSA-65 (pure JS, NIST FIPS 203/204) |

### Backend
| Library | Purpose |
|---------|---------|
| Node.js + Express.js | HTTP server |
| TypeScript + tsx | Runtime and type-checking |
| Drizzle ORM | Database schema and query builder |
| Neon / PostgreSQL | Production database |
| Zod | Schema validation at API boundaries |
| ws | WebSocket support |

---

## Project Structure

```
DisasterNetworkSimulator/
│
├── client/src/
│   ├── lib/
│   │   ├── crypto-service.ts       Classical + hybrid crypto service (ECDSA, HKDF, AES-GCM)
│   │   ├── pqc-service.ts          Post-quantum service (ML-KEM-768, ML-DSA-65)
│   │   ├── network-simulation.ts   Mesh topology, node events, BLE integration
│   │   ├── dijkstra.ts             Routing algorithm (NetworkGraph, Dijkstra, BFS broadcast)
│   │   ├── bluetooth-service.ts    Web Bluetooth API scanning and device management
│   │   ├── ble-simulator.ts        Realistic BLE device simulation (fallback)
│   │   └── location-service.ts     Geolocation API with Haversine distance
│   │
│   ├── pages/
│   │   ├── home.tsx                Main dashboard (metrics, map, security status)
│   │   ├── maps.tsx                Full-screen map view
│   │   ├── simulation.tsx          Animated disaster-scenario playback + Crypto Workbench
│   │   └── landing.tsx             Onboarding / intro page
│   │
│   ├── components/
│   │   ├── crypto-demo-card.tsx    Live cryptography workbench (Classical / PQC / Hybrid)
│   │   ├── settings-view.tsx       Settings including PQC mode selector
│   │   ├── messages-view.tsx       Message log with encryption indicators
│   │   ├── bluetooth-manager.tsx   BLE device list and signal strength
│   │   ├── sos-button.tsx          Emergency SOS trigger with location
│   │   └── dashboard/              Metric cards, network overview, node list
│   │
│   └── types/
│       └── network.ts              TypeScript interfaces for nodes, connections, stats
│
├── server/
│   ├── index.ts                    Server entry point (port 5050)
│   ├── app.ts                      Express middleware setup
│   ├── routes.ts                   REST API route definitions
│   ├── storage.ts                  DatabaseStorage class (CRUD + seed data)
│   └── db.ts                       Database connection
│
├── shared/
│   └── schema.ts                   Drizzle ORM table definitions + Zod schemas
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── drizzle.config.ts
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.19.0
- npm ≥ 10

### Installation

```bash
# Clone or extract the project
cd DisasterNetworkSimulator

# Install all dependencies (including @noble/post-quantum)
npm install
```

### Running the development server

```bash
npm run dev
```

This starts both the Vite frontend and the Express backend together.  
Open **http://localhost:5050** in your browser.

### Build for production

```bash
npm run build   # bundles client + server
npm start       # serves the production build
```

### Type-checking

```bash
npm run check
```

---

## Usage Guide

### Home Dashboard (`/app`)

The main console shows:
- **Connected Nodes** — live count of online mesh nodes
- **Active Links** — number of healthy LoRa/BLE connections
- **Latency** — weighted average across the current route graph
- **Unread Alerts** — SOS and system messages
- **Security Status card** — current crypto mode with live operation counters; use the **Classical / PQC / Hybrid** toggle to switch modes in real time

### Simulation (`/simulation`)

1. Press **Run Simulation** to start the automated 6-step disaster scenario.
2. Each step shows the active message route highlighted on the SVG network map.
3. At the bottom of the page, the **Cryptography Workbench** is always visible.

#### Cryptography Workbench

Select a mode and press **Run Demo**:

| Mode | What runs |
|------|-----------|
| **Classical** | ECDSA P-256 keygen → sign → HKDF key derive → AES-256-GCM encrypt → decrypt → verify |
| **PQC Only** | ML-DSA-65 sign → ML-KEM-768 encapsulate → HKDF(KEM secret) → AES-256-GCM → KEM decapsulate → ML-DSA verify |
| **Hybrid** | Both paths in parallel → HKDF(classical material ‖ PQC secret) → AES-256-GCM → verify both signatures |

Every step displays:
- The actual algorithm running
- Hex snippets of keys, signatures, and ciphertexts
- Byte sizes (highlighting the trade-off: PQC keys are larger but quantum-resistant)
- Wall-clock timing in milliseconds
- A comparison table summarising all three modes side-by-side

### Settings (`/settings`)

- **Post-Quantum Cryptography** section — choose Classical, PQC Only, or Hybrid (recommended).  
  The change applies immediately across the entire app via `cryptoService.setPQCMode()`.
- Network configuration toggles (auto-discovery, low-power mode, emergency alerts)
- Technical information panel showing the active cryptographic mode

---

## Cryptographic Architecture

### Classical mode

```
Sender                           Receiver
  │                                  │
  ├─ ECDSA P-256 sign(message)        │
  ├─ HKDF-SHA-256(nodeA:nodeB seed)  ─┤─ same derivation
  ├─ AES-256-GCM encrypt             ─┤─ AES-256-GCM decrypt
  └─ transmit {ciphertext, IV, sig}  ─┘─ ECDSA verify
```

### PQC mode

```
Sender                                 Receiver
  │                                        │
  ├─ ML-DSA-65 sign(message)               │
  ├─ ML-KEM-768 encapsulate(receiver PK)  ─┤─ ML-KEM-768 decapsulate(SK)
  │    └─ produces: {KEM_ciphertext, SS}   │    └─ recovers: same SS
  ├─ HKDF-SHA-256(SS) → AES key           ─┤─ HKDF-SHA-256(SS) → same AES key
  ├─ AES-256-GCM encrypt                  ─┤─ AES-256-GCM decrypt
  └─ transmit {ciphertext, IV,            ─┘─ ML-DSA-65 verify
               KEM_ciphertext, sig}
```

### Hybrid mode (recommended)

```
Sender                                       Receiver
  │                                              │
  ├─ ECDSA P-256 sign(message)                   │
  ├─ ML-DSA-65  sign(message)                    │
  ├─ HKDF-SHA-256(seed) → classical_mat (32 B)  ─┤─ same derivation
  ├─ ML-KEM-768 encapsulate → {KEM_CT, PQC_SS}  ─┤─ ML-KEM-768 decapsulate → PQC_SS
  ├─ HKDF-SHA-256(classical_mat ‖ PQC_SS)       ─┤─ same HKDF combination
  │    → hybrid AES key                           │
  ├─ AES-256-GCM encrypt                         ─┤─ AES-256-GCM decrypt
  └─ transmit {ciphertext, IV,                   ─┘─ verify ECDSA AND ML-DSA
               KEM_CT, classical_sig, pqc_sig}
```

Breaking classical crypto alone is not sufficient — the PQC layer must also be broken, and vice versa.

---

## Post-Quantum Cryptography

### Background

Current asymmetric cryptography (ECDSA, ECDH, RSA) relies on the hardness of integer factorisation and discrete logarithms.  
**Shor's algorithm**, running on a sufficiently powerful quantum computer, solves these problems in polynomial time — rendering today's classical cryptography insecure.

NIST completed its post-quantum standardisation process in 2024:

| Standard | Algorithm | Type | Basis |
|----------|-----------|------|-------|
| FIPS 203 | ML-KEM (Kyber) | Key Encapsulation | Module Learning With Errors (MLWE) |
| FIPS 204 | ML-DSA (Dilithium) | Digital Signature | Module Learning With Errors (MLWE) |
| FIPS 205 | SLH-DSA (SPHINCS+) | Digital Signature | Hash-based |

ResQNet implements **ML-KEM-768** and **ML-DSA-65** at NIST security level 3 (≈ AES-192 classical equivalent) using the `@noble/post-quantum` library (pure JavaScript, no WebAssembly required).

### Key and signature sizes

| Property | ECDSA P-256 | ML-DSA-65 | Ratio |
|----------|------------|-----------|-------|
| Public key | 65 bytes | 1,952 bytes | 30× |
| Private key | 32 bytes | 4,032 bytes | 126× |
| Signature | ~71 bytes | 3,309 bytes | 47× |

| Property | ECDH P-256 | ML-KEM-768 | Ratio |
|----------|-----------|-----------|-------|
| Public key | 65 bytes | 1,184 bytes | 18× |
| KEM ciphertext | ~65 bytes | 1,088 bytes | 17× |
| Shared secret | 32 bytes | 32 bytes | 1× |

The shared secret size is identical — only the key exchange overhead increases.

### Implementation

The PQC logic lives in two files:

- **`client/src/lib/pqc-service.ts`** — `PQCService` singleton  
  - Generates ML-KEM-768 + ML-DSA-65 keypairs for all 12 nodes at startup  
  - Exposes synchronous `encapsulate()`, `decapsulate()`, `sign()`, `verify()` methods  
  - Publishes live stats (encapsulations, signatures, mode) via a pub-sub pattern

- **`client/src/lib/crypto-service.ts`** — `CryptoService` singleton  
  - Wraps `pqcService` and the browser's Web Crypto API  
  - `setPQCMode('classical' | 'pqc' | 'hybrid')` changes the active mode globally  
  - `encryptMessage()` and `signMessage()` automatically select the correct primitives  
  - Mirrors PQC stats into a single unified `CryptoStats` object for the UI

---

## Network Simulation

### Topology

12 nodes placed geographically around RV College, Bangalore:

```
user • rv-gate • mysore-road • kengeri • hoskerehalli
rajarajeshwari • banashankari • jayanagar • vijayanagar
magadi-road • nandini-layout • peenya
```

17 bidirectional connections weighted by `distance × 10 + latency / 10`.

### Routing

`dijkstra.ts` implements:
- **Dijkstra's algorithm** — single-source shortest path for unicast messages
- **Flood-fill BFS** — SOS broadcast reaches every online node
- **Self-healing** — when a node goes offline, the graph is recalculated automatically

### Dynamic simulation

`network-simulation.ts` publishes events every ~3 seconds:
- `node_connected` / `node_disconnected`
- `signal_changed`
- `emergency_alert`

Emergency mode reduces all link latencies by 30% to prioritise SOS traffic.

---

## API Reference

Base URL: `http://localhost:5050/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/nodes` | All network nodes |
| GET | `/nodes/:nodeId` | Single node |
| POST | `/nodes` | Register new node |
| PATCH | `/nodes/:nodeId/status` | Update node online/offline status |
| GET | `/connections` | All mesh connections |
| GET | `/connections/:nodeId` | Connections for a specific node |
| GET | `/messages` | All messages |
| POST | `/messages` | Send a new message |
| PATCH | `/messages/:messageId/delivered` | Mark as delivered |
| DELETE | `/messages` | Clear all messages |
| POST | `/sos` | Broadcast SOS to all online nodes |
| GET | `/network/stats` | Connected nodes, latency, coverage, unread count |

---

## Security Model

| Threat | Classical | PQC | Hybrid |
|--------|-----------|-----|--------|
| Eavesdropping (passive) | AES-256-GCM | AES-256-GCM | AES-256-GCM |
| Message forgery | ECDSA P-256 | ML-DSA-65 | Both required |
| Key recovery (classical computer) | Hard | Hard | Hard |
| Key recovery (quantum computer) | **Vulnerable** | Secure | Secure |
| Harvest-now/decrypt-later attack | **Vulnerable** | Secure | Secure |
| Unknown PQC weakness | Secure | **Risk** | Fallback to classical |

**Hybrid mode** is the recommended setting for any real deployment: it provides full classical security today, full post-quantum security against future quantum adversaries, and resilience against undiscovered weaknesses in the new PQC algorithms.

---

## Acknowledgements

- [NIST Post-Quantum Cryptography Standardisation](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [@noble/post-quantum](https://github.com/paulmillr/noble-post-quantum) by Paul Miller — pure-JS FIPS 203/204/205 implementations
- [shadcn/ui](https://ui.shadcn.com/) component library
- Dijkstra's algorithm for optimal mesh routing

---

*ResQNet is a simulation and educational tool. Key material is generated in-memory and not persisted. A production deployment would use hardware-backed keystores (TPM / Secure Enclave) and a proper key-exchange protocol.*
