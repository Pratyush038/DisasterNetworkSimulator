/**
 * ResQNet Post-Quantum Cryptography Service
 *
 * Provides quantum-resistant key encapsulation and digital signatures
 * using NIST-standardised algorithms:
 *
 *  - ML-KEM-768  (FIPS 203)  → lattice-based key encapsulation (replaces ECDH)
 *  - ML-DSA-65   (FIPS 204)  → lattice-based digital signatures (replaces ECDSA)
 *
 * Security levels vs. classical equivalents:
 *  ML-KEM-768  ≈ AES-192 classical security  (quantum security level 3)
 *  ML-DSA-65   ≈ AES-192 classical security  (quantum security level 3)
 *
 * Key sizes (bytes):
 *  ML-KEM-768 public key : 1 184   (vs. ECDH P-256: 65)
 *  ML-KEM-768 secret key : 2 400
 *  ML-KEM-768 ciphertext : 1 088
 *  ML-DSA-65  public key : 1 952   (vs. ECDSA P-256: 65)
 *  ML-DSA-65  secret key : 4 032
 *  ML-DSA-65  signature  : 3 309   (vs. ECDSA P-256: ~71)
 */

// @ts-ignore — noble/post-quantum ships .js entry points per its exports map
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
// @ts-ignore
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';

export type PQCMode = 'classical' | 'pqc' | 'hybrid';

export interface PQCNodeKeyPair {
  kemPublicKey: Uint8Array;   // ML-KEM-768 public key  (1 184 B)
  kemSecretKey: Uint8Array;   // ML-KEM-768 secret key  (2 400 B)
  dsaPublicKey: Uint8Array;   // ML-DSA-65  public key  (1 952 B)
  dsaSecretKey: Uint8Array;   // ML-DSA-65  secret key  (4 032 B)
}

export interface PQCStats {
  mode: PQCMode;
  pqcKeyPairs: number;
  kemAlgorithm: string;
  dsaAlgorithm: string;
  kemPublicKeyBytes: number;
  dsaPublicKeyBytes: number;
  dsaSignatureBytes: number;
  kemCipherTextBytes: number;
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

class PQCService {
  private keyStore: Map<string, PQCNodeKeyPair> = new Map();
  private mode: PQCMode = 'hybrid';
  private stats: PQCStats = {
    mode: 'hybrid',
    pqcKeyPairs: 0,
    kemAlgorithm: 'ML-KEM-768 (NIST FIPS 203)',
    dsaAlgorithm: 'ML-DSA-65 (NIST FIPS 204)',
    kemPublicKeyBytes: 1184,
    dsaPublicKeyBytes: 1952,
    dsaSignatureBytes: 3309,
    kemCipherTextBytes: 1088,
    pqcSignaturesMade: 0,
    pqcSignaturesVerified: 0,
    pqcEncapsulations: 0,
    pqcDecapsulations: 0,
    pqcReady: false,
  };
  private ready: Promise<void>;
  private subscribers: Set<(stats: PQCStats) => void> = new Set();

  constructor() {
    this.ready = this.initialise();
  }

  /* ------------------------------------------------------------------ */
  /*  Initialisation                                                     */
  /* ------------------------------------------------------------------ */

  private async initialise(): Promise<void> {
    try {
      console.log('🔒 PQCService: generating post-quantum keypairs...');
      for (const nodeId of DEFAULT_NODE_IDS) {
        await this.generateNodeKeyPair(nodeId);
      }
      this.stats.pqcReady = true;
      console.log(
        `🔒 PQCService ready — ${this.keyStore.size} PQC keypairs (ML-KEM-768 + ML-DSA-65)`,
      );
      this.notifySubscribers();
    } catch (err) {
      console.error('PQCService initialisation failed:', err);
    }
  }

  async waitUntilReady(): Promise<void> {
    return this.ready;
  }

  /* ------------------------------------------------------------------ */
  /*  Key Generation                                                     */
  /* ------------------------------------------------------------------ */

  async generateNodeKeyPair(nodeId: string): Promise<void> {
    const kemPair = ml_kem768.keygen() as { publicKey: Uint8Array; secretKey: Uint8Array };
    const dsaPair = ml_dsa65.keygen() as { publicKey: Uint8Array; secretKey: Uint8Array };

    this.keyStore.set(nodeId, {
      kemPublicKey: kemPair.publicKey,
      kemSecretKey: kemPair.secretKey,
      dsaPublicKey: dsaPair.publicKey,
      dsaSecretKey: dsaPair.secretKey,
    });

    this.stats.pqcKeyPairs = this.keyStore.size;
  }

  /* ------------------------------------------------------------------ */
  /*  ML-KEM-768  Key Encapsulation Mechanism                            */
  /* ------------------------------------------------------------------ */

  /**
   * Encapsulate a fresh shared secret using the recipient's public KEM key.
   * Returns the KEM ciphertext (to be sent to the recipient) and the
   * 32-byte shared secret (used locally to derive the AES key).
   */
  encapsulate(recipientNodeId: string): { cipherText: Uint8Array; sharedSecret: Uint8Array } {
    const keys = this.keyStore.get(recipientNodeId);
    if (!keys) throw new Error(`No PQC keypair for node "${recipientNodeId}"`);

    const result = ml_kem768.encapsulate(keys.kemPublicKey) as {
      cipherText: Uint8Array;
      sharedSecret: Uint8Array;
    };

    this.stats.pqcEncapsulations++;
    this.notifySubscribers();
    return result;
  }

  /**
   * Decapsulate the KEM ciphertext with the recipient's secret key to
   * recover the 32-byte shared secret.
   */
  decapsulate(cipherText: Uint8Array, recipientNodeId: string): Uint8Array {
    const keys = this.keyStore.get(recipientNodeId);
    if (!keys) throw new Error(`No PQC keypair for node "${recipientNodeId}"`);

    const sharedSecret = ml_kem768.decapsulate(cipherText, keys.kemSecretKey) as Uint8Array;

    this.stats.pqcDecapsulations++;
    this.notifySubscribers();
    return sharedSecret;
  }

  /* ------------------------------------------------------------------ */
  /*  ML-DSA-65  Digital Signatures                                      */
  /* ------------------------------------------------------------------ */

  /** Sign a message with the sender node's ML-DSA-65 secret key. */
  sign(senderNodeId: string, message: Uint8Array): Uint8Array {
    const keys = this.keyStore.get(senderNodeId);
    if (!keys) throw new Error(`No PQC keypair for node "${senderNodeId}"`);

    // Noble API: sign(msg, secretKey)
    const signature = ml_dsa65.sign(message, keys.dsaSecretKey) as Uint8Array;

    this.stats.pqcSignaturesMade++;
    this.notifySubscribers();
    return signature;
  }

  /** Verify an ML-DSA-65 signature against the sender's public key. */
  verify(senderNodeId: string, message: Uint8Array, signature: Uint8Array): boolean {
    const keys = this.keyStore.get(senderNodeId);
    if (!keys) return false;

    // Noble API: verify(sig, msg, publicKey)
    const valid = ml_dsa65.verify(signature, message, keys.dsaPublicKey) as boolean;

    this.stats.pqcSignaturesVerified++;
    this.notifySubscribers();
    return valid;
  }

  /* ------------------------------------------------------------------ */
  /*  Key accessors                                                      */
  /* ------------------------------------------------------------------ */

  getKEMPublicKey(nodeId: string): Uint8Array | undefined {
    return this.keyStore.get(nodeId)?.kemPublicKey;
  }

  getDSAPublicKey(nodeId: string): Uint8Array | undefined {
    return this.keyStore.get(nodeId)?.dsaPublicKey;
  }

  hasKeyPair(nodeId: string): boolean {
    return this.keyStore.has(nodeId);
  }

  /* ------------------------------------------------------------------ */
  /*  Mode management                                                    */
  /* ------------------------------------------------------------------ */

  setMode(mode: PQCMode): void {
    this.mode = mode;
    this.stats.mode = mode;
    this.notifySubscribers();
  }

  getMode(): PQCMode {
    return this.mode;
  }

  /* ------------------------------------------------------------------ */
  /*  Stats & subscriptions                                              */
  /* ------------------------------------------------------------------ */

  getStats(): PQCStats {
    return { ...this.stats };
  }

  subscribe(callback: (stats: PQCStats) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getStats());
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const snapshot = this.getStats();
    this.subscribers.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (err) {
        console.error('PQCService subscriber error:', err);
      }
    });
  }
}

/** Singleton — auto-initialises on import. */
export const pqcService = new PQCService();
