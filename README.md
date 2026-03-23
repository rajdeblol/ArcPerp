# private_perps

Private perpetuals DEX scaffold using Arcium confidential circuits + Solana Anchor settlement.

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
