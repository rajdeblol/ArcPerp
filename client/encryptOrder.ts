import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { RescueCipher, getMXEPublicKey, x25519 } from "@arcium-hq/client";

export type OrderDirection = "long" | "short";

export interface EncryptOrderInput {
  price: bigint;
  size: bigint;
  direction: OrderDirection;
  traderPubkey: string;
}

export interface EncryptedOrder {
  blob: Uint8Array;
  commitment: string;
  clientPrivateKey: Uint8Array;
  clientPublicKey: Uint8Array;
  nonce: Uint8Array;
}

export async function resolveMxePublicKey(
  provider: AnchorProvider,
  mxeProgramId: PublicKey,
): Promise<Uint8Array> {
  const mxePublicKey = await getMXEPublicKey(provider, mxeProgramId);
  if (!mxePublicKey) {
    throw new Error("MXE public key is not initialized on-chain");
  }
  return mxePublicKey;
}

export async function encryptOrder(
  input: EncryptOrderInput,
  mxePublicKey: Uint8Array,
): Promise<EncryptedOrder> {
  const clientPrivateKey = x25519.utils.randomSecretKey();
  const clientPublicKey = x25519.getPublicKey(clientPrivateKey);
  const sharedSecret = x25519.getSharedSecret(clientPrivateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  const directionBit = input.direction === "long" ? 1n : 0n;
  const plaintext: bigint[] = [input.price, input.size, directionBit];

  const nonce = new Uint8Array(16);
  globalThis.crypto.getRandomValues(nonce);

  const ciphertext = cipher.encrypt(plaintext, nonce);

  const payload = {
    traderPubkey: input.traderPubkey,
    nonce: Array.from(nonce),
    clientPublicKey: Array.from(clientPublicKey),
    ciphertext,
  };

  const blob = new TextEncoder().encode(JSON.stringify(payload));
  const commitment = await sha256Hex(blob);

  return {
    blob,
    commitment,
    clientPrivateKey,
    clientPublicKey,
    nonce,
  };
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const exact = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const hash = await globalThis.crypto.subtle.digest("SHA-256", exact);
  const hashBytes = new Uint8Array(hash);
  return Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
