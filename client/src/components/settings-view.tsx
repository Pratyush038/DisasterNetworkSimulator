import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Atom,
  HelpCircle,
  Network,
  Phone,
  Radio,
  Route,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cryptoService } from "@/lib/crypto-service";
import { pqcService } from "@/lib/pqc-service";
import type { PQCMode } from "@/lib/pqc-service";

const PQC_MODES: { value: PQCMode; label: string; description: string; color: string }[] = [
  {
    value: "classical",
    label: "Classical",
    description: "ECDSA P-256 + ECDH/HKDF + AES-256-GCM. Fast and widely tested, but theoretically vulnerable to future quantum computers using Shor's algorithm.",
    color: "bg-slate-700 text-white",
  },
  {
    value: "pqc",
    label: "PQC Only",
    description: "ML-DSA-65 (FIPS 204) signing + ML-KEM-768 (FIPS 203) key exchange + AES-256-GCM. Fully quantum-resistant; larger keys/signatures.",
    color: "bg-purple-600 text-white",
  },
  {
    value: "hybrid",
    label: "Hybrid (Recommended)",
    description: "Runs both classical and post-quantum layers simultaneously. An attacker must break BOTH to compromise a message — best of both worlds during the PQC transition.",
    color: "bg-indigo-600 text-white",
  },
];

export function SettingsView() {
  const [currentMode, setCurrentMode] = useState<PQCMode>(pqcService.getMode());

  const handleModeChange = (mode: PQCMode) => {
    cryptoService.setPQCMode(mode);
    setCurrentMode(mode);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Settings Header */}
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-lg">Settings & Info</CardTitle>
        <p className="text-xs text-gray-500">Network configuration and help</p>
      </CardHeader>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Post-Quantum Cryptography ────────────────────────── */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Atom className="h-4 w-4 text-indigo-600 mr-2" />
            Post-Quantum Cryptography
          </h3>

          {/* Mode selector */}
          <div className="space-y-2 mb-4">
            {PQC_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => handleModeChange(m.value)}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
                  currentMode === m.value
                    ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-300"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">{m.label}</span>
                  <div className="flex items-center gap-2">
                    {currentMode === m.value && (
                      <Badge className={`text-[10px] py-0 ${m.color}`}>Active</Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{m.description}</p>
              </button>
            ))}
          </div>

          {/* Algorithm reference */}
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-3 space-y-2">
              <h4 className="font-semibold text-indigo-900 text-xs uppercase tracking-wide">
                Algorithm Reference
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700">Signing (Classical)</span>
                  <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-700">ECDSA P-256</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700">Signing (PQC)</span>
                  <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700">ML-DSA-65 FIPS 204</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700">Key Exchange (Classical)</span>
                  <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-700">ECDH + HKDF-SHA-256</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700">Key Exchange (PQC)</span>
                  <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700">ML-KEM-768 FIPS 203</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700">Symmetric Encryption</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">AES-256-GCM</Badge>
                </div>
              </div>
              <p className="text-[10px] text-indigo-600 pt-1 leading-relaxed">
                PQC key sizes: ML-KEM-768 pubkey 1,184 B · ML-DSA-65 pubkey 1,952 B · signature 3,309 B
              </p>
            </CardContent>
          </Card>

          {/* Quantum threat info */}
          <Card className="mt-3 bg-amber-50 border-amber-200">
            <CardContent className="p-3">
              <h4 className="font-medium text-amber-900 text-xs mb-1 flex items-center">
                <Zap className="h-3 w-3 mr-1" /> Why Post-Quantum?
              </h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                Shor&apos;s algorithm on a sufficiently powerful quantum computer can break
                ECDSA and ECDH in polynomial time. NIST finalised ML-KEM (FIPS 203)
                and ML-DSA (FIPS 204) in 2024 as quantum-resistant replacements.
                Hybrid mode protects against both current and future threats.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works Section */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <HelpCircle className="h-4 w-4 text-blue-500 mr-2" />
            How ResQNet Works
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <h4 className="font-medium text-blue-900 mb-1 flex items-center">
                  <Network className="h-4 w-4 mr-1" />
                  Mesh Networking
                </h4>
                <p className="text-xs">
                  Devices form a self-healing network where each node can relay messages,
                  ensuring communication even when infrastructure fails.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <h4 className="font-medium text-green-900 mb-1 flex items-center">
                  <Route className="h-4 w-4 mr-1" />
                  Dijkstra's Algorithm
                </h4>
                <p className="text-xs">
                  Messages are routed through the most efficient path based on distance,
                  signal strength, and node availability.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-3">
                <h4 className="font-medium text-purple-900 mb-1 flex items-center">
                  <Zap className="h-4 w-4 mr-1" />
                  Emergency Broadcasting
                </h4>
                <p className="text-xs">
                  SOS messages use flood routing to reach all nodes simultaneously,
                  maximizing rescue coordination.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Network Settings */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <SettingsIcon className="h-4 w-4 text-green-600 mr-2" />
            Network Configuration
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Auto-discovery</span>
                <p className="text-xs text-gray-500">Automatically find nearby nodes</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Low power mode</span>
                <p className="text-xs text-gray-500">Extend battery life</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Emergency alerts</span>
                <p className="text-xs text-gray-500">Receive emergency broadcasts</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Radio className="h-4 w-4 text-gray-500 mr-2" />
            Technical Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Protocol:</span>
              <Badge variant="outline">LoRa Mesh</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Frequency:</span>
              <span className="font-medium">868 MHz</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Max Range:</span>
              <span className="font-medium">5 km</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Encryption:</span>
              <Badge variant="outline" className="text-green-700 border-green-300">
                <Shield className="h-3 w-3 mr-1" />
                AES-256-GCM
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">PQC Mode:</span>
              <Badge variant="outline" className={
                currentMode === "hybrid"    ? "text-indigo-700 border-indigo-300" :
                currentMode === "pqc"       ? "text-purple-700 border-purple-300" :
                                              "text-slate-700 border-slate-300"
              }>
                <ShieldCheck className="h-3 w-3 mr-1" />
                {currentMode === "hybrid" ? "Hybrid" : currentMode === "pqc" ? "PQC" : "Classical"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Battery Life:</span>
              <Badge variant="outline" className="text-green-700 border-green-300">
                72 hours
              </Badge>
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            <Phone className="h-4 w-4 text-red-600 mr-2" />
            Emergency Contacts
          </h3>
          <div className="space-y-2">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Emergency Services</p>
                  <p className="text-xs text-gray-500">Primary emergency line</p>
                </div>
                <Badge variant="destructive" className="font-bold">
                  108
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Disaster Management</p>
                  <p className="text-xs text-gray-500">NDRF coordination</p>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-300 font-bold">
                  011-26701728
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* App Information */}
        <div className="p-4 border-t border-gray-100">
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p className="font-medium">ResQNet v1.0.0</p>
            <p>Disaster Relief Communication Network</p>
            <p>Built for emergency response scenarios</p>
          </div>
        </div>
      </div>
    </div>
  );
}
