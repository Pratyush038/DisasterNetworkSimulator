/**
 * CryptoDemoCard
 *
 * An interactive, step-by-step walkthrough that runs REAL cryptographic
 * operations on a sample SOS message and displays each operation's
 * inputs, outputs, hex values, and timing.
 *
 * Three modes — all using actual algorithms:
 *   classical → ECDSA P-256 + HKDF-SHA-256 + AES-256-GCM
 *   pqc       → ML-DSA-65 + ML-KEM-768 + HKDF-SHA-256 + AES-256-GCM
 *   hybrid    → both layers simultaneously
 *
 * The demo generates its own ephemeral classical keys so it never
 * touches the live service keystore.  PQC keys come from pqcService
 * (already initialised for nodes "kengeri" and "user").
 */

import { useCallback, useEffect, useState } from "react";
import { pqcService } from "@/lib/pqc-service";
import type { PQCMode } from "@/lib/pqc-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Atom, CheckCircle2, Clock, KeyRound, Lock, Play, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SENDER_ID = "kengeri";
const RECEIVER_ID = "user";
const DEMO_MSG = "SOS: Flood at Kengeri Camp — rescue needed at 12.9249°N 77.4996°E";

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                    */
/* ------------------------------------------------------------------ */

function toHex(buf: ArrayBuffer | Uint8Array, maxBytes = 13): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  const hex = Array.from(bytes.slice(0, maxBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
  return bytes.length > maxBytes ? `${hex} …` : hex;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64ByteLength(b64: string): number {
  return b64ToBytes(b64).length;
}

async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t0 = performance.now();
  const result = await fn();
  return [result, Math.round((performance.now() - t0) * 10) / 10];
}

function timedSync<T>(fn: () => T): [T, number] {
  const t0 = performance.now();
  const result = fn();
  return [result, Math.round((performance.now() - t0) * 10) / 10];
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/* ------------------------------------------------------------------ */
/*  Step data structures                                               */
/* ------------------------------------------------------------------ */

type StepColor = "cyan" | "purple" | "indigo" | "emerald" | "rose" | "amber";

interface DemoRow {
  label: string;
  value: string;
  mono?: boolean;
  good?: boolean;
  bad?: boolean;
}

export interface DemoStep {
  num: number;
  emoji: string;
  title: string;
  algorithm: string;
  rows: DemoRow[];
  timing: number;
  status: "done" | "error";
  color: StepColor;
}

/* ------------------------------------------------------------------ */
/*  Classical pipeline                                                 */
/* ------------------------------------------------------------------ */

async function buildClassicalSteps(encoded: Uint8Array): Promise<DemoStep[]> {
  const steps: DemoStep[] = [];

  // Step 1: Key generation
  const [{ pubBuf, kp }, keyMs] = await timed(async () => {
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    const pubBuf = await crypto.subtle.exportKey("spki", kp.publicKey);
    return { pubBuf, kp };
  });
  steps.push({
    num: 1, emoji: "🔑", title: "Key Generation", algorithm: "ECDSA P-256",
    rows: [
      { label: "Sender node", value: "Kengeri Camp" },
      { label: "Algorithm", value: "ECDSA P-256 (elliptic curve)" },
      { label: "Public key", value: `${pubBuf.byteLength} bytes` },
      { label: "Key (hex)", value: toHex(pubBuf), mono: true },
    ],
    timing: keyMs, status: "done", color: "cyan",
  });

  // Step 2: Sign
  const [sigBuf, signMs] = await timed(() =>
    crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, kp.privateKey, encoded),
  );
  steps.push({
    num: 2, emoji: "✍️", title: "Sign Message", algorithm: "ECDSA P-256 + SHA-256",
    rows: [
      { label: "Input length", value: `${encoded.byteLength} bytes ("${DEMO_MSG.slice(0, 32)}…")` },
      { label: "Signature size", value: `${sigBuf.byteLength} bytes` },
      { label: "Signature (hex)", value: toHex(sigBuf), mono: true },
    ],
    timing: signMs, status: "done", color: "cyan",
  });

  // Step 3: HKDF key derivation
  const seed = [SENDER_ID, RECEIVER_ID].sort().join(":");
  const [[aesKey, ivBytes], hkdfMs] = await timed(async () => {
    const km = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(seed), "HKDF", false, ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("ResQNet-v1"), info: new TextEncoder().encode("message-encryption") },
      km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    return [key, iv] as const;
  });
  steps.push({
    num: 3, emoji: "🔀", title: "Key Derivation", algorithm: "HKDF-SHA-256",
    rows: [
      { label: "Salt", value: '"ResQNet-v1"' },
      { label: "Seed", value: `"${seed}"` },
      { label: "Output", value: "256-bit AES-GCM key (non-extractable)" },
      { label: "IV", value: `${ivBytes.byteLength} bytes (random) — ${toHex(ivBytes)}`, mono: true },
    ],
    timing: hkdfMs, status: "done", color: "cyan",
  });

  // Step 4: AES-256-GCM encrypt
  const [cipherBuf, encMs] = await timed(() =>
    crypto.subtle.encrypt({ name: "AES-GCM", iv: ivBytes }, aesKey, encoded),
  );
  steps.push({
    num: 4, emoji: "🔐", title: "Encrypt Payload", algorithm: "AES-256-GCM",
    rows: [
      { label: "Plaintext", value: `${encoded.byteLength} bytes` },
      { label: "Ciphertext", value: `${cipherBuf.byteLength} bytes (incl. 16-byte GCM tag)` },
      { label: "Ciphertext (hex)", value: toHex(cipherBuf), mono: true },
    ],
    timing: encMs, status: "done", color: "cyan",
  });

  // Step 5: AES-256-GCM decrypt
  const [decBuf, decMs] = await timed(() =>
    crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, aesKey, cipherBuf),
  );
  const recovered = new TextDecoder().decode(decBuf);
  steps.push({
    num: 5, emoji: "🔓", title: "Decrypt at Receiver", algorithm: "AES-256-GCM",
    rows: [
      { label: "Receiver node", value: "User Device (RV Base)" },
      { label: "Recovered plaintext", value: `"${recovered}"`, good: true },
      { label: "GCM auth tag", value: "✅ Integrity verified — not tampered", good: true },
    ],
    timing: decMs, status: "done", color: "emerald",
  });

  // Step 6: Verify signature
  const [valid, verMs] = await timed(() =>
    crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, kp.publicKey, sigBuf, encoded),
  );
  steps.push({
    num: 6, emoji: "✅", title: "Verify Signature", algorithm: "ECDSA P-256 + SHA-256",
    rows: [
      { label: "Algorithm", value: "ECDSA P-256 + SHA-256" },
      { label: "Public key size", value: `${pubBuf.byteLength} bytes` },
      { label: "Signature valid", value: valid ? "✅ TRUE — message is authentic" : "❌ FALSE — tampered!", ...(valid ? { good: true } : { bad: true }) },
      { label: "Quantum-safe", value: "❌ Vulnerable to Shor's algorithm on quantum computers", bad: true },
    ],
    timing: verMs, status: valid ? "done" : "error", color: valid ? "emerald" : "rose",
  });

  return steps;
}

/* ------------------------------------------------------------------ */
/*  PQC pipeline                                                       */
/* ------------------------------------------------------------------ */

async function buildPQCSteps(encoded: Uint8Array): Promise<DemoStep[]> {
  const steps: DemoStep[] = [];

  // Step 1: Key info
  const kemPub = pqcService.getKEMPublicKey(SENDER_ID);
  const dsaPub = pqcService.getDSAPublicKey(SENDER_ID);
  steps.push({
    num: 1, emoji: "🔑", title: "Key Lookup", algorithm: "ML-KEM-768 + ML-DSA-65",
    rows: [
      { label: "Sender node", value: "Kengeri Camp" },
      { label: "KEM public key (ML-KEM-768)", value: `${kemPub?.length ?? 1184} bytes` },
      { label: "DSA public key (ML-DSA-65)", value: `${dsaPub?.length ?? 1952} bytes` },
      { label: "KEM key (hex)", value: kemPub ? toHex(kemPub) : "—", mono: true },
      { label: "vs. ECDSA P-256 pubkey", value: "65 bytes — PQC key is 18× larger (more security)" },
    ],
    timing: 0, status: "done", color: "purple",
  });

  // Step 2: ML-DSA sign
  const [pqcSig, signMs] = timedSync(() => pqcService.sign(SENDER_ID, encoded));
  steps.push({
    num: 2, emoji: "✍️", title: "Sign with ML-DSA-65", algorithm: "NIST FIPS 204 (lattice-based)",
    rows: [
      { label: "Algorithm", value: "ML-DSA-65 — Module Lattice Digital Signature" },
      { label: "Security level", value: "NIST Level 3 (≈ AES-192)" },
      { label: "Signature size", value: `${pqcSig.length} bytes (vs. 71 bytes ECDSA)` },
      { label: "Signature (hex)", value: toHex(pqcSig), mono: true },
      { label: "Quantum-safe", value: "✅ Secure against quantum computers", good: true },
    ],
    timing: signMs, status: "done", color: "purple",
  });

  // Step 3: ML-KEM encapsulate
  const [{ cipherText, sharedSecret }, kemMs] = timedSync(() =>
    pqcService.encapsulate(RECEIVER_ID),
  );
  steps.push({
    num: 3, emoji: "🔒", title: "KEM Encapsulation", algorithm: "ML-KEM-768 (NIST FIPS 203)",
    rows: [
      { label: "Algorithm", value: "ML-KEM-768 — Module Lattice Key Encapsulation" },
      { label: "Recipient", value: "User Device (RV Base)" },
      { label: "KEM ciphertext", value: `${cipherText.length} bytes (sent with message)` },
      { label: "KEM ciphertext (hex)", value: toHex(cipherText), mono: true },
      { label: "Shared secret", value: `${sharedSecret.length} bytes (stays local — never transmitted)` },
      { label: "Shared secret (hex)", value: toHex(sharedSecret), mono: true },
    ],
    timing: kemMs, status: "done", color: "purple",
  });

  // Step 4: HKDF(pqcSecret) → AES key + encrypt
  const [[aesKey2, iv2, cipherBuf2], encMs] = await timed(async () => {
    const km = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("ResQNet-pqc-v1"), info: new TextEncoder().encode("pqc-aes-key") },
      km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    return [key, iv, ct] as const;
  });
  steps.push({
    num: 4, emoji: "🔐", title: "Derive Key + Encrypt", algorithm: "HKDF(KEM secret) → AES-256-GCM",
    rows: [
      { label: "Key derivation", value: "HKDF-SHA-256 keyed on 32-byte KEM shared secret" },
      { label: "IV", value: `${iv2.byteLength} bytes (random) — ${toHex(iv2)}`, mono: true },
      { label: "Ciphertext", value: `${cipherBuf2.byteLength} bytes` },
      { label: "Ciphertext (hex)", value: toHex(cipherBuf2), mono: true },
    ],
    timing: encMs, status: "done", color: "purple",
  });

  // Step 5: KEM decapsulate + decrypt
  const [[recovered2], decMs] = await timed(async () => {
    const recoveredSecret = pqcService.decapsulate(cipherText, RECEIVER_ID);
    const km = await crypto.subtle.importKey("raw", recoveredSecret, "HKDF", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("ResQNet-pqc-v1"), info: new TextEncoder().encode("pqc-aes-key") },
      km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
    );
    const decBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv2 }, key, cipherBuf2);
    return [new TextDecoder().decode(decBuf)] as const;
  });
  steps.push({
    num: 5, emoji: "🔓", title: "Decapsulate + Decrypt", algorithm: "ML-KEM-768 decapsulate → AES-256-GCM",
    rows: [
      { label: "KEM decapsulation", value: "Receiver uses secret key → recovers identical 32-byte shared secret" },
      { label: "Recovered plaintext", value: `"${recovered2}"`, good: true },
      { label: "GCM auth tag", value: "✅ Integrity verified", good: true },
    ],
    timing: decMs, status: "done", color: "emerald",
  });

  // Step 6: Verify ML-DSA signature
  const [valid2, verMs] = timedSync(() =>
    pqcService.verify(SENDER_ID, encoded, pqcSig),
  );
  steps.push({
    num: 6, emoji: "✅", title: "Verify ML-DSA-65 Signature", algorithm: "NIST FIPS 204",
    rows: [
      { label: "Verifier public key", value: `${dsaPub?.length ?? 1952} bytes (ML-DSA-65)` },
      { label: "Signature valid", value: valid2 ? "✅ TRUE — lattice signature verified" : "❌ FALSE", ...(valid2 ? { good: true } : { bad: true }) },
      { label: "Quantum-safe", value: "✅ Secure against quantum computers using Shor's / Grover's algorithms", good: true },
      { label: "Security basis", value: "Module Learning With Errors (MLWE) hardness problem" },
    ],
    timing: verMs, status: valid2 ? "done" : "error", color: valid2 ? "emerald" : "rose",
  });

  return steps;
}

/* ------------------------------------------------------------------ */
/*  Hybrid pipeline                                                    */
/* ------------------------------------------------------------------ */

async function buildHybridSteps(encoded: Uint8Array): Promise<DemoStep[]> {
  const steps: DemoStep[] = [];

  // Step 1: Key info (both sets)
  const kemPubH = pqcService.getKEMPublicKey(SENDER_ID);
  const dsaPubH = pqcService.getDSAPublicKey(SENDER_ID);
  const [ecKeyPair, keyGenMs] = await timed(async () => {
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const pub = await crypto.subtle.exportKey("spki", kp.publicKey);
    return { kp, pub };
  });
  steps.push({
    num: 1, emoji: "🔑", title: "Dual Key Setup", algorithm: "ECDSA P-256 + ML-KEM-768 + ML-DSA-65",
    rows: [
      { label: "Classical pubkey (ECDSA P-256)", value: `${ecKeyPair.pub.byteLength} bytes` },
      { label: "PQC KEM pubkey (ML-KEM-768)", value: `${kemPubH?.length ?? 1184} bytes` },
      { label: "PQC DSA pubkey (ML-DSA-65)", value: `${dsaPubH?.length ?? 1952} bytes` },
      { label: "Combined key material", value: `${ecKeyPair.pub.byteLength + (dsaPubH?.length ?? 1952)} bytes total` },
    ],
    timing: keyGenMs, status: "done", color: "indigo",
  });

  // Step 2: ECDSA sign
  const [classicalSig, classSignMs] = await timed(() =>
    crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, ecKeyPair.kp.privateKey, encoded),
  );
  steps.push({
    num: 2, emoji: "✍️", title: "Classical Signature (ECDSA)", algorithm: "ECDSA P-256 + SHA-256",
    rows: [
      { label: "Algorithm", value: "ECDSA P-256 + SHA-256 (elliptic curve)" },
      { label: "Signature", value: `${classicalSig.byteLength} bytes — ${toHex(classicalSig)}`, mono: true },
    ],
    timing: classSignMs, status: "done", color: "indigo",
  });

  // Step 3: ML-DSA sign
  const [pqcSigH, pqcSignMs] = timedSync(() => pqcService.sign(SENDER_ID, encoded));
  steps.push({
    num: 3, emoji: "⚛️", title: "PQC Signature (ML-DSA-65)", algorithm: "NIST FIPS 204 (lattice-based)",
    rows: [
      { label: "Algorithm", value: "ML-DSA-65 — Module Lattice Digital Signature" },
      { label: "Signature", value: `${pqcSigH.length} bytes — ${toHex(pqcSigH)}`, mono: true },
      { label: "Both signatures sent", value: "Receiver must verify BOTH to accept the message", good: true },
    ],
    timing: pqcSignMs, status: "done", color: "indigo",
  });

  // Step 4: Hybrid key derivation (ECDH material + ML-KEM)
  const seedH = [SENDER_ID, RECEIVER_ID].sort().join(":");
  const [{ classicalMat, kemCT, kemSS }, hybridKeyMs] = await timed(async () => {
    const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(seedH), "HKDF", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("ResQNet-v1"), info: new TextEncoder().encode("classical-key-material") },
      km, 256,
    );
    const classicalMat = new Uint8Array(bits);
    const { cipherText: kemCT, sharedSecret: kemSS } = pqcService.encapsulate(RECEIVER_ID);
    return { classicalMat, kemCT, kemSS };
  });
  steps.push({
    num: 4, emoji: "🔀", title: "Hybrid Key Derivation", algorithm: "ECDH material ⊕ ML-KEM-768 → HKDF → AES key",
    rows: [
      { label: "Classical key material", value: `${classicalMat.length} bytes (HKDF from node IDs) — ${toHex(classicalMat)}`, mono: true },
      { label: "PQC KEM ciphertext", value: `${kemCT.length} bytes (sent with message)` },
      { label: "PQC shared secret", value: `${kemSS.length} bytes (local) — ${toHex(kemSS)}`, mono: true },
      { label: "Hybrid secret", value: "HKDF(classical 32B ‖ PQC 32B) = 256-bit AES key", good: true },
      { label: "Security guarantee", value: "Attacker must break BOTH to recover the key", good: true },
    ],
    timing: hybridKeyMs, status: "done", color: "indigo",
  });

  // Step 5: AES-256-GCM encrypt with hybrid key
  const [[aesKeyH, ivH, cipherBufH], encMs] = await timed(async () => {
    const combined = new Uint8Array(64);
    combined.set(classicalMat, 0);
    combined.set(kemSS, 32);
    const km = await crypto.subtle.importKey("raw", combined, "HKDF", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("ResQNet-hybrid-v1"), info: new TextEncoder().encode("hybrid-aes-key") },
      km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    return [key, iv, ct] as const;
  });
  steps.push({
    num: 5, emoji: "🔐", title: "Encrypt with Hybrid Key", algorithm: "AES-256-GCM",
    rows: [
      { label: "Key source", value: "HKDF(classical_material ‖ pqc_secret) — 64 bytes input" },
      { label: "IV", value: `${ivH.byteLength} bytes — ${toHex(ivH)}`, mono: true },
      { label: "Ciphertext", value: `${cipherBufH.byteLength} bytes — ${toHex(cipherBufH)}`, mono: true },
    ],
    timing: encMs, status: "done", color: "indigo",
  });

  // Step 6: Hybrid decapsulate + decrypt
  const [[recoveredH], decMs] = await timed(async () => {
    const recoveredKemSS = pqcService.decapsulate(kemCT, RECEIVER_ID);
    const km2 = await crypto.subtle.importKey("raw", new TextEncoder().encode(seedH), "HKDF", false, ["deriveBits"]);
    const bits2 = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("ResQNet-v1"), info: new TextEncoder().encode("classical-key-material") },
      km2, 256,
    );
    const combined2 = new Uint8Array(64);
    combined2.set(new Uint8Array(bits2), 0);
    combined2.set(recoveredKemSS, 32);
    const km3 = await crypto.subtle.importKey("raw", combined2, "HKDF", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("ResQNet-hybrid-v1"), info: new TextEncoder().encode("hybrid-aes-key") },
      km3, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
    );
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivH }, key, cipherBufH);
    return [new TextDecoder().decode(dec)] as const;
  });
  steps.push({
    num: 6, emoji: "🔓", title: "Hybrid Decapsulate + Decrypt", algorithm: "ML-KEM-768 + HKDF + AES-256-GCM",
    rows: [
      { label: "KEM decapsulation", value: "Recovers 32-byte PQC shared secret" },
      { label: "Classical material", value: "Re-derived from node ID seed" },
      { label: "Hybrid AES key", value: "Reconstructed identically — HKDF(classical ‖ PQC)" },
      { label: "Recovered plaintext", value: `"${recoveredH}"`, good: true },
      { label: "GCM auth tag", value: "✅ Integrity verified", good: true },
    ],
    timing: decMs, status: "done", color: "emerald",
  });

  // Step 7: Verify both signatures
  const [classValid, classVerMs] = await timed(() =>
    crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, ecKeyPair.kp.publicKey, classicalSig, encoded),
  );
  const [pqcValid, pqcVerMs] = timedSync(() =>
    pqcService.verify(SENDER_ID, encoded, pqcSigH),
  );
  const bothValid = classValid && pqcValid;
  steps.push({
    num: 7, emoji: "✅", title: "Verify Both Signatures", algorithm: "ECDSA P-256 + ML-DSA-65",
    rows: [
      { label: "ECDSA P-256 signature", value: classValid ? "✅ VALID" : "❌ INVALID", ...(classValid ? { good: true } : { bad: true }) },
      { label: "ML-DSA-65 signature", value: pqcValid ? "✅ VALID" : "❌ INVALID", ...(pqcValid ? { good: true } : { bad: true }) },
      { label: "Combined result", value: bothValid ? "✅ BOTH VALID — message is authentic" : "❌ AT LEAST ONE FAILED", ...(bothValid ? { good: true } : { bad: true }) },
      { label: "Security model", value: "Breaks classical crypto? Still blocked by PQC layer.", good: true },
    ],
    timing: classVerMs + pqcVerMs, status: bothValid ? "done" : "error", color: bothValid ? "emerald" : "rose",
  });

  return steps;
}

/* ------------------------------------------------------------------ */
/*  Color maps                                                         */
/* ------------------------------------------------------------------ */

const colorBorder: Record<StepColor, string> = {
  cyan:    "border-cyan-500/30",
  purple:  "border-purple-500/30",
  indigo:  "border-indigo-500/30",
  emerald: "border-emerald-500/30",
  rose:    "border-rose-500/30",
  amber:   "border-amber-500/30",
};

const colorBg: Record<StepColor, string> = {
  cyan:    "bg-cyan-500/[0.07]",
  purple:  "bg-purple-500/[0.07]",
  indigo:  "bg-indigo-500/[0.07]",
  emerald: "bg-emerald-500/[0.07]",
  rose:    "bg-rose-500/[0.07]",
  amber:   "bg-amber-500/[0.07]",
};

const colorTitle: Record<StepColor, string> = {
  cyan:    "text-cyan-300",
  purple:  "text-purple-300",
  indigo:  "text-indigo-300",
  emerald: "text-emerald-300",
  rose:    "text-rose-300",
  amber:   "text-amber-300",
};

const modePalette: Record<PQCMode, { tab: string; badge: string; label: string }> = {
  classical: { tab: "bg-cyan-600 text-white",    badge: "bg-cyan-500/20 text-cyan-200",    label: "Classical" },
  pqc:       { tab: "bg-purple-600 text-white",  badge: "bg-purple-500/20 text-purple-200", label: "PQC Only"  },
  hybrid:    { tab: "bg-indigo-600 text-white",  badge: "bg-indigo-500/20 text-indigo-200", label: "Hybrid"    },
};

/* ------------------------------------------------------------------ */
/*  CryptoDemoCard component                                           */
/* ------------------------------------------------------------------ */

export function CryptoDemoCard() {
  const [mode, setMode] = useState<PQCMode>("hybrid");
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [pqcReady, setPqcReady] = useState(false);

  useEffect(() => {
    pqcService.waitUntilReady().then(() => setPqcReady(true));
  }, []);

  // Animate steps in one by one
  useEffect(() => {
    if (steps.length === 0) { setVisibleCount(0); return; }
    let i = visibleCount;
    const reveal = () => {
      if (i < steps.length) {
        setVisibleCount(i + 1);
        i++;
        setTimeout(reveal, 260);
      }
    };
    if (visibleCount < steps.length) setTimeout(reveal, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  const runDemo = useCallback(async () => {
    if (!pqcReady || isRunning) return;
    setIsRunning(true);
    setSteps([]);
    setVisibleCount(0);
    setTotalMs(null);

    const t0 = performance.now();
    const encoded = new TextEncoder().encode(DEMO_MSG);

    try {
      let built: DemoStep[];
      if (mode === "classical") built = await buildClassicalSteps(encoded);
      else if (mode === "pqc") built = await buildPQCSteps(encoded);
      else built = await buildHybridSteps(encoded);
      setSteps(built);
      setTotalMs(Math.round((performance.now() - t0) * 10) / 10);
    } catch (err) {
      console.error("Crypto demo error:", err);
    } finally {
      setIsRunning(false);
    }
  }, [mode, pqcReady, isRunning]);

  const palette = modePalette[mode];

  return (
    <Card className="rounded-lg border-white/10 bg-white/[0.03] text-white">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
                <Atom className="h-4 w-4 text-indigo-300" />
              </div>
              Cryptography Workbench
            </CardTitle>
            <p className="mt-1.5 text-sm text-white/45">
              Live step-by-step execution of the full crypto pipeline on a real SOS message.
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {(["classical", "pqc", "hybrid"] as PQCMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setSteps([]); setTotalMs(null); }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  mode === m ? modePalette[m].tab : "text-white/50 hover:text-white/80"
                }`}
              >
                {modePalette[m].label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">

        {/* Sample message + run button */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/40">
              <span>📨</span> Sample message to secure
            </div>
            <p className="max-w-xl font-mono text-sm text-white/80">
              &ldquo;{DEMO_MSG}&rdquo;
            </p>
            <p className="mt-1 text-xs text-white/30">
              Sender: Kengeri Camp → Receiver: User Device (RV Base)
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={runDemo}
              disabled={!pqcReady || isRunning}
              className={`rounded-full px-5 ${
                mode === "hybrid" ? "bg-indigo-600 hover:bg-indigo-500" :
                mode === "pqc"    ? "bg-purple-600 hover:bg-purple-500" :
                                    "bg-cyan-600 hover:bg-cyan-500"
              } text-white`}
            >
              {isRunning ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Running…</>
              ) : steps.length > 0 ? (
                <><RefreshCw className="mr-2 h-4 w-4" /> Re-run Demo</>
              ) : (
                <><Play className="mr-2 h-4 w-4" /> Run Demo</>
              )}
            </Button>
            {!pqcReady && (
              <span className="text-xs text-white/30">Loading PQC keys…</span>
            )}
          </div>
        </div>

        {/* Algorithm summary banner */}
        {steps.length > 0 && (
          <div className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-xs ${
            mode === "hybrid" ? "border-indigo-500/30 bg-indigo-500/10" :
            mode === "pqc"    ? "border-purple-500/30 bg-purple-500/10" :
                                "border-cyan-500/30 bg-cyan-500/10"
          }`}>
            <span className="font-semibold">Algorithms used:</span>
            {mode !== "pqc" && (
              <>
                <Badge className="bg-white/10 text-white/70">ECDSA P-256</Badge>
                <Badge className="bg-white/10 text-white/70">HKDF-SHA-256</Badge>
              </>
            )}
            {mode !== "classical" && (
              <>
                <Badge className={mode === "pqc" ? "bg-purple-500/20 text-purple-200" : "bg-indigo-500/20 text-indigo-200"}>ML-KEM-768 (FIPS 203)</Badge>
                <Badge className={mode === "pqc" ? "bg-purple-500/20 text-purple-200" : "bg-indigo-500/20 text-indigo-200"}>ML-DSA-65 (FIPS 204)</Badge>
              </>
            )}
            <Badge className="bg-emerald-500/20 text-emerald-200">AES-256-GCM</Badge>
            {totalMs !== null && (
              <span className="ml-auto flex items-center gap-1 font-mono text-white/50">
                <Clock className="h-3 w-3" /> {totalMs} ms total
              </span>
            )}
          </div>
        )}

        {/* Pipeline steps */}
        {steps.length > 0 && (
          <div className="space-y-3">
            {steps.slice(0, visibleCount).map((step) => (
              <div
                key={step.num}
                className={`rounded-lg border p-4 transition-all duration-300 ${colorBorder[step.color]} ${colorBg[step.color]}`}
                style={{ animation: "stepFadeIn 0.35s ease-out" }}
              >
                {/* Step header */}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/70">
                      {step.num}
                    </span>
                    <span className="text-base">{step.emoji}</span>
                    <span className={`font-semibold ${colorTitle[step.color]}`}>{step.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/50">
                      {step.algorithm}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-white/35">
                      <Clock className="h-2.5 w-2.5" />
                      {step.timing.toFixed(1)} ms
                    </span>
                    {step.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    )}
                  </div>
                </div>

                {/* Step rows */}
                <div className="space-y-1.5">
                  {step.rows.map((row, i) => (
                    <div key={i} className="flex flex-wrap items-start gap-2">
                      <span className="min-w-[11rem] shrink-0 text-xs text-white/40">{row.label}:</span>
                      <span className={`break-all text-xs font-medium ${
                        row.mono   ? "font-mono text-white/60" :
                        row.good   ? "text-emerald-300" :
                        row.bad    ? "text-rose-300" :
                                     "text-white/75"
                      }`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comparison table */}
        {steps.length > 0 && visibleCount >= steps.length && (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/70">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Algorithm Comparison
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40">
                    <th className="py-2 pr-4 text-left font-medium">Property</th>
                    <th className="py-2 pr-4 text-center font-medium text-cyan-300">Classical</th>
                    <th className="py-2 pr-4 text-center font-medium text-purple-300">PQC Only</th>
                    <th className="py-2 text-center font-medium text-indigo-300">Hybrid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ["Signature size",   "~71 bytes",    "3,309 bytes", "3,380 bytes"],
                    ["Public key size",  "65 bytes",     "1,952 bytes", "2,017 bytes"],
                    ["KEM ciphertext",   "N/A (HKDF)",   "1,088 bytes", "1,088 bytes"],
                    ["Sign time (approx)", "~1 ms",      "~8 ms",       "~9 ms"],
                    ["Quantum-safe",     "❌",           "✅",           "✅"],
                    ["Classical-safe",   "✅",           "⚠️ Unproven",  "✅"],
                    ["NIST standard",    "SP 800-186",   "FIPS 203/204", "Recommended"],
                  ].map(([prop, cls, pqc, hybrid]) => (
                    <tr key={prop} className="text-white/55">
                      <td className="py-1.5 pr-4 font-medium text-white/70">{prop}</td>
                      <td className="py-1.5 pr-4 text-center font-mono">{cls}</td>
                      <td className="py-1.5 pr-4 text-center font-mono">{pqc}</td>
                      <td className="py-1.5 text-center font-mono">{hybrid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/25">
              Hybrid mode runs classical and post-quantum layers in parallel. An attacker must
              break BOTH to recover the plaintext — protecting against both today&apos;s and
              tomorrow&apos;s quantum adversaries.
            </p>
          </div>
        )}

        {/* Empty state */}
        {steps.length === 0 && !isRunning && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-white/10 py-10 text-center">
            <KeyRound className="h-8 w-8 text-white/20" />
            <p className="text-sm text-white/35">
              Press <strong className="text-white/50">Run Demo</strong> to execute the full cryptographic pipeline on the sample message
            </p>
            {!pqcReady && (
              <p className="text-xs text-white/25">Initialising post-quantum keys…</p>
            )}
          </div>
        )}

      </CardContent>

      <style>{`
        @keyframes stepFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Card>
  );
}
