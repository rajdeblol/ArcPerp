export async function submitOrder(provider, program, marketStatePda, traderAccountPda, encrypted) {
    const txSig = await program.methods
        .submitOrder(Array.from(encrypted.blob))
        .accounts({
        trader: provider.wallet.publicKey,
        marketState: marketStatePda,
        traderAccount: traderAccountPda,
    })
        .rpc();
    const marketStateNamespace = program.account.marketState;
    const marketState = await marketStateNamespace.fetch(marketStatePda);
    const nextOrderId = BigInt(marketState.nextOrderId.toString());
    return { orderId: nextOrderId - 1n, txSig };
}
