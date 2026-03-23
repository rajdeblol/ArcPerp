import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import type { EncryptedOrder } from "./encryptOrder";

export interface SubmitOrderResult {
  orderId: bigint;
  txSig: string;
}

export async function submitOrder(
  provider: AnchorProvider,
  program: Program,
  marketStatePda: PublicKey,
  traderAccountPda: PublicKey,
  encrypted: EncryptedOrder,
): Promise<SubmitOrderResult> {
  const txSig = await program.methods
    .submitOrder(Array.from(encrypted.blob))
    .accounts({
      trader: provider.wallet.publicKey,
      marketState: marketStatePda,
      traderAccount: traderAccountPda,
    })
    .rpc();

  const marketStateNamespace = (program.account as Record<string, { fetch: (pubkey: PublicKey) => Promise<{ nextOrderId: number | bigint | { toString(): string } }> }>).marketState;

  const marketState = await marketStateNamespace.fetch(marketStatePda);
  const nextOrderId = BigInt(marketState.nextOrderId.toString());

  return { orderId: nextOrderId - 1n, txSig };
}
