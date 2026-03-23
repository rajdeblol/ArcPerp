# private_perps

Private perpetuals DEX scaffold using Arcium confidential circuits + Solana Anchor settlement.

## Judge quickstart (30 seconds)

**One-liner**

> Every other perps DEX leaks your position to the mempool. ArcPerp computes everything inside Arcium's MXE - orders match, positions update, and liquidations check privately. The only thing that ever hits Solana is your PnL.

**Three demo beats**

1. Submit an order: show the transaction carries an encrypted blob, not plaintext price/size/direction.
2. Open portfolio: show settled PnL only, with no live position size exposure.
3. Trigger liquidation warning: show only a boolean safety signal, not collateral internals.

**If asked about proof verification**

> Proof verification is a placeholder in this demo. In production, one Arcium verification CPI cryptographically binds decrypted PnL and liquidation output to circuit execution.

## Demo script (read this live)

1. "I connect wallet on Solana Devnet and submit an encrypted order."
2. "Matching and position math run in Arcium confidential circuits, not in plaintext on-chain."
3. "On Solana, we settle only final outcomes - match events and realized PnL."
4. "The portfolio view intentionally hides live position internals."
5. "Liquidation logic reveals only a boolean warning."
6. "This is a Devnet prototype, so use burner wallet and test funds only."

## Commit-ready checklist

- Demo scope: Devnet prototype only.
- Wallet safety: burner wallet only, test funds only.
- Privacy model: no plaintext order price/size/direction leaves client.
- On-chain model: encrypted commitments plus finalized settlement outputs only.
- Known production TODO: replace placeholder proof checks with full Arcium proof verification CPI in settlement/liquidation paths.

## Privacy invariants enforced

1. No plaintext order price, size, or direction leaves the client.
2. Position state is persisted on-chain only as an encrypted commitment.
3. Liquidation checks run in MXE and only return a boolean to Solana.
4. On-chain instructions consume encrypted blobs, MXE proofs, and decrypted realized PnL scalar.
5. Masked conditional branches are executed symmetrically in circuits to reduce side-channel leakage.

## Structure

- `circuits/`: Arcis circuits for matching, position update, liquidation check.
- `programs/private_perps/`: Anchor program for settlement and liquidation execution.
- `client/`: TypeScript confidential client functions using `@arcium-hq/client`.
- `frontend/`: React wallet + encrypted order flow + settled-only portfolio.
- `tests/`: Integration tests.

## Setup

```bash
arcup install
arcium init private_perps
arcium build
arcium test
arcium deploy --cluster-offset 42 --keypair-path ~/.config/solana/id.json -ud
```

## Notes

- Target cluster: Solana devnet.
- TypeScript should be run in strict mode (see `client/tsconfig.json` and `frontend/tsconfig.json`).
- Validate exact Arcium SDK API names against your installed version before deployment.
- Pinned and typechecked versions used in this scaffold:
  - `@arcium-hq/client`: `0.9.2`
  - `@coral-xyz/anchor` (TS): `0.32.1`
  - `anchor-lang` (Rust): `0.32.1`
  - `@solana/web3.js`: `1.98.4`
