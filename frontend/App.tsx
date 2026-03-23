import type { Idl } from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";

import type { EncryptedOrder } from "../client/encryptOrder";
import { resolveMxePublicKey } from "../client/encryptOrder";
import { submitOrder } from "../client/submitOrder";
import { LiquidationWarning } from "./components/LiquidationWarning";
import { OrderForm } from "./components/OrderForm";
import { Portfolio } from "./components/Portfolio";
import "./components/styles.css";
import privatePerpsIdl from "./idl/private_perps.json";

interface SettledPnlItem {
  orderId: string;
  pnlTick: string;
}

const PROGRAM_ID = new PublicKey((privatePerpsIdl as { address: string }).address);
const DEFAULT_MXE_PROGRAM_ID = new PublicKey("ArciumLz8H8M5j4nD2ccnE9vrFica8FWHQrQQizxgxYk");
const MARKET_STATE_SEED = new TextEncoder().encode("market-state");
const TRADER_SEED = new TextEncoder().encode("trader");

function AppBody(): ReactElement {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [settledPnls, setSettledPnls] = useState<SettledPnlItem[]>([]);
  const [isUnderwater, setIsUnderwater] = useState<boolean>(false);
  const [lastTradePrice, setLastTradePrice] = useState<string>("Hidden");
  const [lastTradeVolume, setLastTradeVolume] = useState<string>("0");
  const [status, setStatus] = useState<string>("Connect wallet to submit encrypted orders");
  const [mxePublicKey, setMxePublicKey] = useState<Uint8Array>(new Uint8Array(32).fill(1));
  const [marketAdmin, setMarketAdmin] = useState<string>("");

  const anchorWallet =
    wallet.publicKey && wallet.signTransaction && wallet.signAllTransactions
      ? {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        }
      : null;

  const provider = useMemo(() => {
    if (!anchorWallet) {
      return null;
    }

    return new AnchorProvider(connection as Connection, anchorWallet, {
      commitment: "confirmed",
    });
  }, [anchorWallet, connection]);

  const program = useMemo(() => {
    if (!provider) {
      return null;
    }

    return new Program(privatePerpsIdl as Idl, provider) as Program;
  }, [provider]);

  const marketStatePda = useMemo(
    () => PublicKey.findProgramAddressSync([MARKET_STATE_SEED], PROGRAM_ID)[0],
    [],
  );

  const traderAccountPda = useMemo(() => {
    if (!wallet.publicKey) {
      return null;
    }

    return PublicKey.findProgramAddressSync(
      [TRADER_SEED, marketStatePda.toBuffer(), wallet.publicKey.toBuffer()],
      PROGRAM_ID,
    )[0];
  }, [wallet.publicKey, marketStatePda]);
  const isAdminWallet = useMemo(() => {
    if (!wallet.publicKey || !marketAdmin) {
      return false;
    }

    return wallet.publicKey.toBase58() === marketAdmin;
  }, [marketAdmin, wallet.publicKey]);

  useEffect(() => {
    async function loadMxePublicKey(): Promise<void> {
      if (!provider) {
        return;
      }

      try {
        const key = await resolveMxePublicKey(provider, DEFAULT_MXE_PROGRAM_ID);
        setMxePublicKey(key);
      } catch {
        setStatus("MXE key unavailable; using placeholder key until MXE is initialized");
      }
    }

    void loadMxePublicKey();
  }, [provider]);

  useEffect(() => {
    async function loadMarketAdmin(): Promise<void> {
      if (!program) {
        return;
      }

      try {
        const marketState = await (program.account as any).marketState.fetch(marketStatePda);
        setMarketAdmin(marketState.admin.toBase58());
      } catch {
        setMarketAdmin("");
      }
    }

    void loadMarketAdmin();
  }, [program, marketStatePda]);

  useEffect(() => {
    if (!wallet.publicKey) {
      setStatus("Connect wallet to submit encrypted orders");
      return;
    }

    if (!marketAdmin) {
      setStatus("Waiting for market admin configuration...");
      return;
    }

    if (!isAdminWallet) {
      setStatus("Demo is admin-only. Connect the organizer wallet to trade.");
      return;
    }

    setStatus("Admin wallet connected. Ready to submit encrypted orders.");
  }, [isAdminWallet, marketAdmin, wallet.publicKey]);

  const refreshTraderState = useCallback(async (): Promise<void> => {
    if (!program || !traderAccountPda) {
      return;
    }

    try {
      const traderAccount = await (program.account as any).traderAccount.fetch(traderAccountPda);
      setSettledPnls([
        {
          orderId: "lifetime",
          pnlTick: traderAccount.realizedPnlTick.toString(),
        },
      ]);
      setIsUnderwater(Boolean(traderAccount.isLiquidated));
    } catch {
      setSettledPnls([]);
      setIsUnderwater(false);
    }
  }, [program, traderAccountPda]);

  useEffect(() => {
    void refreshTraderState();
  }, [refreshTraderState]);

  async function handleEncryptedSubmit(encryptedOrder: EncryptedOrder): Promise<void> {
    if (!provider || !program || !traderAccountPda || !wallet.publicKey) {
      setStatus("Connect wallet before submitting orders");
      return;
    }
    if (!isAdminWallet) {
      setStatus("Demo is admin-only. Connect the organizer wallet to trade.");
      return;
    }

    setStatus("Submitting encrypted order on-chain...");

    try {
      const { orderId, txSig } = await submitOrder(
        provider,
        program,
        marketStatePda,
        traderAccountPda,
        encryptedOrder,
      );

      setStatus(`Submitted order #${orderId.toString()} (${txSig.slice(0, 8)}...)`);
      setLastTradeVolume((prev) => (Number(prev || "0") + 1).toString());
      setLastTradePrice("Hidden");
      await refreshTraderState();
    } catch (error) {
      setStatus(`Order submission failed: ${String(error)}`);
    }
  }

  return (
    <main className="landing-shell">
      <section className="top-panel" id="top">
        <header className="nav-row">
          <h1 className="brand">ArcPerp</h1>
          <nav>
            <a href="#how">How It Works</a>
            <a href="#security">Security</a>
            <a href="#arcium">Arcium</a>
            <a className="app-pill" href="#app">App</a>
          </nav>
        </header>

        <section className="hero-grid">
          <article className="hero-left">
            <p className="eyebrow">Private Perpetuals on Solana</p>
            <h2>
              Private Orders.
              <br />
              Verifiable Settlement.
            </h2>
            <p>
              ArcPerp keeps order price, size, direction, position state, and liquidation thresholds
              confidential using Arcium encrypted computation. Only match events and finalized PnL are
              revealed for settlement.
            </p>
            <div className="hero-actions">
              <a className="primary-btn" href="#app">
                Launch ArcPerp App
              </a>
              <a className="secondary-btn" href="#security">
                Why It Is Safe
              </a>
            </div>
          </article>

          <aside className="hero-right">
            <p className="panel-title">Privacy Guarantees</p>
            <div className="stat-tile">
              <small>Order Inputs</small>
              <strong>Encrypted Client-Side</strong>
            </div>
            <div className="stat-tile">
              <small>On-Chain State</small>
              <strong>Commitments, Not Raw Positions</strong>
            </div>
            <div className="stat-tile">
              <small>Public Outputs</small>
              <strong>Match Events + Realized PnL Only</strong>
            </div>
          </aside>
        </section>
      </section>

      <section className="info-panel" id="how">
        <h3>How ArcPerp Works</h3>
        <p>Trade flow is split between confidential computation and transparent settlement.</p>
        <div className="step-grid">
          <article>
            <span>Step 1</span>
            <h4>Encrypt Before Submit</h4>
            <p>Wallet-side encryption protects intent before data leaves the browser.</p>
          </article>
          <article>
            <span>Step 2</span>
            <h4>Arcium Computes Confidentially</h4>
            <p>Matching, position updates, and liquidation checks run in encrypted circuits.</p>
          </article>
          <article>
            <span>Step 3</span>
            <h4>Anchor Settles Final Result</h4>
            <p>Only proofs and final scalars settle on Solana, preserving confidentiality.</p>
          </article>
        </div>
      </section>

      <section className="info-panel" id="security">
        <h3>Why ArcPerp Is Safe</h3>
        <div className="safety-grid">
          <article>
            <h4>No Intent Leakage</h4>
            <p>
              Prices, sizes, and direction never post in plaintext on-chain or through the frontend
              state model.
            </p>
          </article>
          <article>
            <h4>Proof-Based Settlement</h4>
            <p>
              Solana instructions are constrained to encrypted blobs, MXE proof artifacts, and final
              PnL numbers.
            </p>
          </article>
          <article>
            <h4>Minimal Disclosure Liquidation</h4>
            <p>
              Liquidation checks reveal only a boolean safety signal rather than position internals or
              collateral details.
            </p>
          </article>
        </div>
      </section>

      <section className="info-panel" id="arcium">
        <h3>What Is Arcium</h3>
        <p>
          Arcium is a confidential computing network for encrypted applications. ArcPerp uses Arcium
          circuits to run sensitive trading logic off the transparent path while still producing
          verifiable outputs for Solana settlement. This model combines privacy for trader intent with
          auditability for final outcomes.
        </p>
      </section>

      <section className="app-panel" id="app">
        <div className="app-head">
          <h3>ArcPerp App</h3>
          <WalletMultiButton />
        </div>

        <div className="metric-row">
          <article>
            <span>Status</span>
            <strong>{status}</strong>
          </article>
          <article>
            <span>Last Trade Price</span>
            <strong>{lastTradePrice}</strong>
          </article>
          <article>
            <span>Last Trade Volume</span>
            <strong>{lastTradeVolume}</strong>
          </article>
          <article>
            <span>Program</span>
            <strong>{PROGRAM_ID.toBase58().slice(0, 12)}...</strong>
          </article>
        </div>

        <div className="app-grid">
          <div className="app-stack">
            <OrderForm
              traderPubkey={wallet.publicKey?.toBase58() ?? "disconnected"}
              mxePublicKey={mxePublicKey}
              onEncryptedSubmit={handleEncryptedSubmit}
              canSubmit={isAdminWallet}
            />
            <LiquidationWarning isUnderwater={isUnderwater} />
          </div>
          <Portfolio settledPnls={settledPnls} />
        </div>
      </section>
      <footer className="site-disclaimer">
        Demo disclaimer: ArcPerp is a Devnet prototype. Use a burner wallet and test funds only.
      </footer>
    </main>
  );
}

export default function App(): ReactElement {
  const endpoint = "https://api.devnet.solana.com";
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppBody />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
