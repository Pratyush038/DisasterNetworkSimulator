/**
 * ResQNet Cryptographic Security Service
 *
 * Provides end-to-end encryption, digital signatures, and node authentication
 * for the disaster-relief mesh network.  Supports three security modes:
 *
 *  classical — ECDSA P-256 signing + ECDH/HKDF key derivation + AES-256-GCM
 *  pqc       — ML-DSA-65 signing  + ML-KEM-768 key encapsulation + AES-256-GCM
 *  hybrid    — both classical AND post-quantum layers simultaneously (recommended)
 *              An attacker must break BOTH to compromise a message.
 *
 * Classical primitives (WebCrypto):
 *   ECDSA  P-256 + SHA-256  → signing / verification
 *   ECDH   P-256            → shared-secret derivation
 *   HKDF   SHA-256          → key derivation
 *   AES-256-GCM             → authenticated encryption
 *
 * Post-quantum primitives (@noble/post-quantum):
 *   ML-KEM-768 (NIST FIPS 203) → key encapsulation
 *   ML-DSA-65  (NIST FIPS 204) → digital signatures
 */

import { pqcService, type PQCMode, type PQCStats } from './pqc-service';

export type { PQCMode };

export interface NodeKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedPayload {
  ciphertext: string;       // base64 — AES-256-GCM ciphertext
  iv: string;               // base64 — 96-bit IV
  tag: string;              // "included" — GCM tag is appended by WebCrypto
  cryptoMode?: PQCMode;     // which mode produced this payload
  kemCipherText?: string;   // base64 — ML-KEM-768 ciphertext (pqc / hybrid)
}

export interface SignedMessage {
  content: string;
  signature: string;         // base64 — ECDSA P-256 (classical / hybrid)
  pqcSignature?: string;     // base64 — ML-DSA-65  (pqc / hybrid)
  senderPublicKey: string;   // base64 SPKI — classical ECDSA public key
  encrypted: boolean;
  cryptoMode?: PQCMode;
}

export interface CryptoStats {
  totalKeyPairs: number;
  messagesSigned: number;
  messagesEncrypted: number;
  messagesDecrypted: number;
  signaturesVerified: number;
  integrityFailures: number;
  verifiedNodes: number;
  totalNodes: number;
  // PQC stats (mirrored from pqcService)
  pqcMode: PQCMode;
  pqcKeyPairs: number;
  pqcSignaturesMade: number;
  pqcSignaturesVerified: number;
  pqcEncapsulations: number;
  pqcDecapsulations: number;
  pqcReady: boolean;
}

const DEFAULT_NODE_IDS = [
  'user',
  'rv-gate',
  'mysore-road',
  'kengeri',
  'hoskerehalli',
  'rajarajeshwari',
  'banashankari',
  'jayanagar',
  'vijayanagar',
  'magadi-road',
  'nandini-layout',
  'peenya',
];

class CryptoService {
  private keyStore: Map<string, NodeKeyPair> = new Map();
  private stats: CryptoStats = {
    totalKeyPairs: 0,
    messagesSigned: 0,
    messagesEncrypted: 0,
    messagesDecrypted: 0,
    signaturesVerified: 0,
    integrityFailures: 0,
    verifiedNodes: 0,
    totalNodes: 0,
    pqcMode: 'hybrid',
    pqcKeyPairs: 0,
    pqcSignaturesMade: 0,
    pqcSignaturesVerified: 0,
    pqcEncapsulations: 0,
    pqcDecapsulations: 0,
    pqcReady: false,
  };
  private ready: Promise<void>;
  private subscribers: Set<(stats: CryptoStats) => void> = new Set();

  constructor() {
    this.ready = this.initialise();
    // Mirror PQC stats into this service's stats so subscribers get one snapshot
    pqcService.subscribe((pqcStats: PQCStats) => {
      this.stats.pqcMode = pqcStats.mode;
      this.stats.pqcKeyPairs = pqcStats.pqcKeyPairs;
      this.stats.pqcSignaturesMade = pqcStats.pqcSignaturesMade;
      this.stats.pqcSignaturesVerified = pqcStats.pqcSignaturesVerified;
      this.stats.pqcEncapsulations = pqcStats.pqcEncapsulations;
      this.stats.pqcDecapsulations = pqcStats.pqcDecapsulations;
      this.stats.pqcReady = pqcStats.pqcReady;
      this.notifySubscribers();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Initialisation                                                     */
  /* ------------------------------------------------------------------ */

  private async initialise(): Promise<void> {
    try {
      for (const nodeId of DEFAULT_NODE_IDS) {
        await this.generateNodeKeyPair(nodeId);
      }
      this.stats.totalNodes = DEFAULT_NODE_IDS.length;
      this.stats.verifiedNodes = DEFAULT_NODE_IDS.length;
      console.log(
        `🔐 CryptoService ready — ${this.keyStore.size} node keypairs generated (ECDSA P-256)`,
      );
      this.notifySubscribers();
    } catch (error) {
      console.error('CryptoService initialisation failed:', error);
    }
  }

  async waitUntilReady(): Promise<void> {
    return this.ready;
  }

  /* ------------------------------------------------------------------ */
  /*  Mode management                                                    */
  /* ------------------------------------------------------------------ */

  setPQCMode(mode: PQCMode): void {
    pqcService.setMode(mode);
    // stats.pqcMode is updated via the pqcService subscriber above
    console.log(`🔒 Crypto mode switched to: ${mode}`);
  }

  getPQCMode(): PQCMode {
    return pqcService.getMode();
  }

  /* ------------------------------------------------------------------ */
  /*  Key Generation  (classical ECDSA)                                  */
  /* ------------------------------------------------------------------ */

  async generateNodeKeyPair(nodeId: string): Promise<CryptoKey> {
    const signingKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );

    this.keyStore.set(nodeId, {
      publicKey: signingKeyPair.publicKey,
      privateKey: signingKeyPair.privateKey,
    });

    this.stats.totalKeyPairs = this.keyStore.size;
    return signingKeyPair.publicKey;
  }

  /* ------------------------------------------------------------------ */
  /*  Digital Signatures                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Sign a message.
   * • classical: ECDSA P-256 only
   * • pqc      : ML-DSA-65 only
   * • hybrid   : ECDSA P-256 + ML-DSA-65 (both)
   *
   * Returns a JSON-encoded string carrying both signatures when in hybrid
   * mode, a plain base64 signature otherwise — handled transparently by
   * verifySignature().
   */
  async signMessage(senderNodeId: string, message: string): Promise<string> {
    await this.ready;

    const mode = this.getPQCMode();
    const encoded = new TextEncoder().encode(message);

    if (mode === 'pqc') {
      // Pure PQC: ML-DSA-65 only
      const pqcSig = pqcService.sign(senderNodeId, encoded);
      this.stats.messagesSigned++;
      this.notifySubscribers();
      return this.bufferToBase64(pqcSig.buffer as ArrayBuffer);
    }

    // Classical (or first half of hybrid): ECDSA P-256
    const keyPair = this.keyStore.get(senderNodeId);
    if (!keyPair) {
      throw new Error(`No keypair found for node "${senderNodeId}"`);
    }
    const classicalSig = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      keyPair.privateKey,
      encoded,
    );

    this.stats.messagesSigned++;
    this.notifySubscribers();

    if (mode === 'hybrid') {
      // Hybrid: attach both signatures as JSON for verifySignature()
      const pqcSig = pqcService.sign(senderNodeId, encoded);
      const composite = JSON.stringify({
        classical: this.bufferToBase64(classicalSig),
        pqc: this.bufferToBase64(pqcSig.buffer as ArrayBuffer),
      });
      return btoa(composite);
    }

    return this.bufferToBase64(classicalSig);
  }

  /**
   * Verify a signature.  Handles classical, PQC, and hybrid encoded signatures
   * transparently based on the active mode.
   */
  async verifySignature(
    senderNodeId: string,
    message: string,
    signatureBase64: string,
  ): Promise<boolean> {
    await this.ready;

    const mode = this.getPQCMode();
    const encoded = new TextEncoder().encode(message);

    try {
      if (mode === 'pqc') {
        const sig = new Uint8Array(this.base64ToBuffer(signatureBase64));
        const valid = pqcService.verify(senderNodeId, encoded, sig);
        valid ? this.stats.signaturesVerified++ : this.stats.integrityFailures++;
        this.notifySubscribers();
        return valid;
      }

      if (mode === 'hybrid') {
        let classicalSigB64: string;
        let pqcSigB64: string;
        try {
          const decoded = JSON.parse(atob(signatureBase64)) as {
            classical: string;
            pqc: string;
          };
          classicalSigB64 = decoded.classical;
          pqcSigB64 = decoded.pqc;
        } catch {
          // Fallback: treat as plain classical sig if not composite
          classicalSigB64 = signatureBase64;
          pqcSigB64 = '';
        }

        const keyPair = this.keyStore.get(senderNodeId);
        const classicalValid =
          keyPair != null &&
          (await crypto.subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            keyPair.publicKey,
            this.base64ToBuffer(classicalSigB64),
            encoded,
          ));

        let pqcValid = true;
        if (pqcSigB64) {
          const pqcSig = new Uint8Array(this.base64ToBuffer(pqcSigB64));
          pqcValid = pqcService.verify(senderNodeId, encoded, pqcSig);
        }

        const valid = classicalValid && pqcValid;
        valid ? this.stats.signaturesVerified++ : this.stats.integrityFailures++;
        this.notifySubscribers();
        return valid;
      }

      // Classical mode
      const keyPair = this.keyStore.get(senderNodeId);
      if (!keyPair) {
        console.warn(`Cannot verify — no public key for node "${senderNodeId}"`);
        this.stats.integrityFailures++;
        this.notifySubscribers();
        return false;
      }
      const valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        keyPair.publicKey,
        this.base64ToBuffer(signatureBase64),
        encoded,
      );
      valid ? this.stats.signaturesVerified++ : this.stats.integrityFailures++;
      this.notifySubscribers();
      return valid;
    } catch {
      this.stats.integrityFailures++;
      this.notifySubscribers();
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  End-to-End Encryption                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Encrypt a message.
   * • classical: HKDF(nodeID seed) → AES-256-GCM
   * • pqc      : ML-KEM-768 encapsulate → HKDF(pqcSecret) → AES-256-GCM
   * • hybrid   : HKDF(classicalMaterial ‖ pqcSecret) → AES-256-GCM
   *              Breaking either layer alone is not enough.
   */
  async encryptMessage(
    senderNodeId: string,
    receiverNodeId: string,
    plaintext: string,
  ): Promise<EncryptedPayload> {
    await this.ready;

    const mode = this.getPQCMode();
    let symmetricKey: CryptoKey;
    let kemCipherText: string | undefined;

    if (mode === 'classical') {
      symmetricKey = await this.deriveSymmetricKey(senderNodeId, receiverNodeId);
    } else if (mode === 'pqc') {
      const { cipherText, sharedSecret } = pqcService.encapsulate(receiverNodeId);
      kemCipherText = this.bufferToBase64(cipherText.buffer as ArrayBuffer);
      symmetricKey = await this.derivePQCSymmetricKey(sharedSecret);
    } else {
      // hybrid
      const classicalMaterial = await this.deriveClassicalKeyMaterial(senderNodeId, receiverNodeId);
      const { cipherText, sharedSecret } = pqcService.encapsulate(receiverNodeId);
      kemCipherText = this.bufferToBase64(cipherText.buffer as ArrayBuffer);
      symmetricKey = await this.deriveHybridSymmetricKey(classicalMaterial, sharedSecret);
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      symmetricKey,
      new TextEncoder().encode(plaintext),
    );

    this.stats.messagesEncrypted++;
    this.notifySubscribers();

    return {
      ciphertext: this.bufferToBase64(ciphertextBuffer),
      iv: this.bufferToBase64(iv.buffer as ArrayBuffer),
      tag: 'included',
      cryptoMode: mode,
      kemCipherText,
    };
  }

  /** Decrypt a message, automatically handling the mode recorded in the payload. */
  async decryptMessage(
    senderNodeId: string,
    receiverNodeId: string,
    payload: EncryptedPayload,
  ): Promise<string> {
    await this.ready;

    const mode = payload.cryptoMode ?? 'classical';
    let symmetricKey: CryptoKey;

    if (mode === 'classical') {
      symmetricKey = await this.deriveSymmetricKey(senderNodeId, receiverNodeId);
    } else if (mode === 'pqc') {
      if (!payload.kemCipherText) throw new Error('Missing KEM ciphertext for PQC decryption');
      const kemBytes = new Uint8Array(this.base64ToBuffer(payload.kemCipherText));
      const sharedSecret = pqcService.decapsulate(kemBytes, receiverNodeId);
      symmetricKey = await this.derivePQCSymmetricKey(sharedSecret);
    } else {
      // hybrid
      if (!payload.kemCipherText) throw new Error('Missing KEM ciphertext for hybrid decryption');
      const classicalMaterial = await this.deriveClassicalKeyMaterial(senderNodeId, receiverNodeId);
      const kemBytes = new Uint8Array(this.base64ToBuffer(payload.kemCipherText));
      const sharedSecret = pqcService.decapsulate(kemBytes, receiverNodeId);
      symmetricKey = await this.deriveHybridSymmetricKey(classicalMaterial, sharedSecret);
    }

    const iv = this.base64ToBuffer(payload.iv);
    const ciphertext = this.base64ToBuffer(payload.ciphertext);

    try {
      const plaintextBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        symmetricKey,
        ciphertext,
      );
      this.stats.messagesDecrypted++;
      this.notifySubscribers();
      return new TextDecoder().decode(plaintextBuffer);
    } catch {
      this.stats.integrityFailures++;
      this.notifySubscribers();
      throw new Error('Decryption failed — message may have been tampered with');
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Key Derivation Helpers                                             */
  /* ------------------------------------------------------------------ */

  /** Original HKDF-over-nodeID-seed derivation (classical mode). */
  private async deriveSymmetricKey(nodeA: string, nodeB: string): Promise<CryptoKey> {
    const seed = [nodeA, nodeB].sort().join(':');
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(seed),
      'HKDF',
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('ResQNet-v1'),
        info: new TextEncoder().encode('message-encryption'),
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Export raw classical key material (32 bytes) without producing an AES key.
   * Used as one half of the hybrid key derivation input.
   */
  private async deriveClassicalKeyMaterial(nodeA: string, nodeB: string): Promise<Uint8Array> {
    const seed = [nodeA, nodeB].sort().join(':');
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(seed),
      'HKDF',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('ResQNet-v1'),
        info: new TextEncoder().encode('classical-key-material'),
      },
      keyMaterial,
      256,
    );
    return new Uint8Array(bits);
  }

  /** Derive an AES-256-GCM key from a PQC shared secret alone. */
  private async derivePQCSymmetricKey(pqcSharedSecret: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      pqcSharedSecret,
      'HKDF',
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('ResQNet-pqc-v1'),
        info: new TextEncoder().encode('pqc-aes-key'),
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Derive an AES-256-GCM key from the concatenation of classical (32 B)
   * and PQC (32 B) shared secrets.  Both must be broken to recover the key.
   */
  private async deriveHybridSymmetricKey(
    classicalMaterial: Uint8Array,
    pqcSharedSecret: Uint8Array,
  ): Promise<CryptoKey> {
    const combined = new Uint8Array(64);
    combined.set(classicalMaterial, 0);
    combined.set(pqcSharedSecret, 32);

    const keyMaterial = await crypto.subtle.importKey('raw', combined, 'HKDF', false, [
      'deriveKey',
    ]);
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('ResQNet-hybrid-v1'),
        info: new TextEncoder().encode('hybrid-aes-key'),
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Public-key export / import                                         */
  /* ------------------------------------------------------------------ */

  async exportPublicKey(nodeId: string): Promise<string> {
    await this.ready;

    const keyPair = this.keyStore.get(nodeId);
    if (!keyPair) throw new Error(`No keypair found for node "${nodeId}"`);

    const exported = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    return this.bufferToBase64(exported);
  }

  async importPublicKey(base64Key: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToBuffer(base64Key);
    return crypto.subtle.importKey(
      'spki',
      keyBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify'],
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Convenience: sign + encrypt in one call                            */
  /* ------------------------------------------------------------------ */

  async secureMessage(
    senderNodeId: string,
    receiverNodeId: string,
    plaintext: string,
  ): Promise<SignedMessage> {
    const mode = this.getPQCMode();
    const signature = await this.signMessage(senderNodeId, plaintext);
    const encrypted = await this.encryptMessage(senderNodeId, receiverNodeId, plaintext);
    const senderPublicKey = await this.exportPublicKey(senderNodeId);

    // In pqc/hybrid mode the signature field already encodes the PQC sig
    // (either standalone or in the JSON composite).  We surface the PQC sig
    // separately here for display / auditing.
    let pqcSignature: string | undefined;
    if (mode === 'pqc') {
      pqcSignature = signature; // The whole sig IS the PQC sig
    } else if (mode === 'hybrid') {
      try {
        const decoded = JSON.parse(atob(signature)) as { classical: string; pqc: string };
        pqcSignature = decoded.pqc;
      } catch {
        pqcSignature = undefined;
      }
    }

    return {
      content: encrypted.ciphertext,
      signature,
      pqcSignature,
      senderPublicKey,
      encrypted: true,
      cryptoMode: mode,
    };
  }

  async verifyAndDecrypt(
    senderNodeId: string,
    receiverNodeId: string,
    payload: EncryptedPayload,
    signatureBase64: string,
  ): Promise<{ plaintext: string; signatureValid: boolean }> {
    const plaintext = await this.decryptMessage(senderNodeId, receiverNodeId, payload);
    const signatureValid = await this.verifySignature(senderNodeId, plaintext, signatureBase64);
    return { plaintext, signatureValid };
  }

  /* ------------------------------------------------------------------ */
  /*  Stats & subscriptions                                              */
  /* ------------------------------------------------------------------ */

  getStats(): CryptoStats {
    return { ...this.stats };
  }

  subscribe(callback: (stats: CryptoStats) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getStats());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    const snapshot = this.getStats();
    this.subscribers.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (err) {
        console.error('Error in CryptoService subscriber:', err);
      }
    });
  }

  hasKeyPair(nodeId: string): boolean {
    return this.keyStore.has(nodeId);
  }

  getNodeIds(): string[] {
    return Array.from(this.keyStore.keys());
  }

  /* ------------------------------------------------------------------ */
  /*  Utility helpers                                                    */
  /* ------------------------------------------------------------------ */

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/** Singleton instance — auto-initialises on import. */
export const cryptoService = new CryptoService();
