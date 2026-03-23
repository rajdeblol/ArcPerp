import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { RescueCipher, awaitComputationFinalization, x25519 } from "@arcium-hq/client";

export interface PollSettlementInput {
  provider: AnchorProvider;
  mxeProgramId: PublicKey;
  computationOffset: BN;
  clientPrivateKey: Uint8Array;
  mxePublicKey: Uint8Array;
  encryptedRealizedPnl: number[][];
  nonce: Uint8Array;
}

export interface SettlementResult {
  orderId: bigint;
  realizedPnlTick: bigint;
  proof: Uint8Array;
}

export async function pollSettlement(input: PollSettlementInput): Promise<SettlementResult> {
  const finalizationSig = await awaitComputationFinalization(
    input.provider,
    input.computationOffset,
    input.mxeProgramId,
    "confirmed",
  );

  const sharedSecret = x25519.getSharedSecret(input.clientPrivateKey, input.mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);
  const decrypted = cipher.decrypt(input.encryptedRealizedPnl, input.nonce);

  return {
    orderId: BigInt(input.computationOffset.toString()),
    realizedPnlTick: BigInt(decrypted[0] ?? 0),
    proof: new TextEncoder().encode(finalizationSig),
  };
}
