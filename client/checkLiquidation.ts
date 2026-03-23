import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { RescueCipher, awaitComputationFinalization, x25519 } from "@arcium-hq/client";

export interface CheckLiquidationInput {
  provider: AnchorProvider;
  mxeProgramId: PublicKey;
  traderId: string;
  computationOffset: BN;
  clientPrivateKey: Uint8Array;
  mxePublicKey: Uint8Array;
  encryptedLiquidationFlag: number[][];
  nonce: Uint8Array;
}

export interface LiquidationCheckResult {
  traderId: string;
  isUnderwater: boolean;
  proof: Uint8Array;
}

export async function checkLiquidation(input: CheckLiquidationInput): Promise<LiquidationCheckResult> {
  const finalizationSig = await awaitComputationFinalization(
    input.provider,
    input.computationOffset,
    input.mxeProgramId,
    "confirmed",
  );

  const sharedSecret = x25519.getSharedSecret(input.clientPrivateKey, input.mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);
  const decrypted = cipher.decrypt(input.encryptedLiquidationFlag, input.nonce);

  return {
    traderId: input.traderId,
    isUnderwater: BigInt(decrypted[0] ?? 0) === 1n,
    proof: new TextEncoder().encode(finalizationSig),
  };
}
