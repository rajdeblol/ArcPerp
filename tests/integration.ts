import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

describe("private_perps", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PrivatePerps as Program;

  it("initializes market MXE", async () => {
    const [marketStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market-state")],
      program.programId,
    );

    const mxeId = new Uint8Array(32);
    mxeId[0] = 42;

    await program.methods
      .initializeMxe(Buffer.from(mxeId))
      .accounts({
        payer: provider.wallet.publicKey,
        marketState: marketStatePda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const state = await (program.account as any).marketState.fetch(marketStatePda);
    expect(state.nextOrderId.toString()).to.equal("1");
  });

  it("emits encrypted order event", async () => {
    const [marketStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market-state")],
      program.programId,
    );

    const [traderAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("trader"),
        marketStatePda.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId,
    );

    const encryptedBlob = Buffer.alloc(32, 7);

    await program.methods
      .submitOrder(encryptedBlob)
      .accounts({
        trader: provider.wallet.publicKey,
        marketState: marketStatePda,
        traderAccount: traderAccountPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it("rejects oversized encrypted order payload", async () => {
    const [marketStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("market-state")],
      program.programId,
    );

    const [traderAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("trader"),
        marketStatePda.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId,
    );

    const oversizedBlob = Buffer.alloc(513, 1);

    try {
      await program.methods
        .submitOrder(oversizedBlob)
        .accounts({
          trader: provider.wallet.publicKey,
          marketState: marketStatePda,
          traderAccount: traderAccountPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("expected oversized encrypted payload to be rejected");
    } catch (error) {
      const msg = String(error);
      expect(msg).to.include("PayloadTooLarge");
    }
  });

  it("rejects order submission before market initialization", async () => {
    const newMarketState = anchor.web3.Keypair.generate().publicKey;
    const [traderAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("trader"),
        newMarketState.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId,
    );

    try {
      await program.methods
        .submitOrder(Buffer.alloc(32, 9))
        .accounts({
          trader: provider.wallet.publicKey,
          marketState: newMarketState,
          traderAccount: traderAccountPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      expect.fail("expected submit_order to fail when market_state is missing");
    } catch (error) {
      const msg = String(error);
      expect(msg.toLowerCase()).to.include("account");
    }
  });
});
