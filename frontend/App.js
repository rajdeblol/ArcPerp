import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { ConnectionProvider, WalletProvider, useConnection, useWallet, } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { resolveMxePublicKey } from "../client/encryptOrder";
import { submitOrder } from "../client/submitOrder";
import { LiquidationWarning } from "./components/LiquidationWarning";
import { OrderForm } from "./components/OrderForm";
import { Portfolio } from "./components/Portfolio";
import "./components/styles.css";
import privatePerpsIdl from "./idl/private_perps.json";
const PROGRAM_ID = new PublicKey(privatePerpsIdl.address);
const DEFAULT_MXE_PROGRAM_ID = new PublicKey("ArciumLz8H8M5j4nD2ccnE9vrFica8FWHQrQQizxgxYk");
const MARKET_STATE_SEED = new TextEncoder().encode("market-state");
const TRADER_SEED = new TextEncoder().encode("trader");
function AppBody() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [settledPnls, setSettledPnls] = useState([]);
    const [isUnderwater, setIsUnderwater] = useState(false);
    const [lastTradePrice, setLastTradePrice] = useState("Hidden");
    const [lastTradeVolume, setLastTradeVolume] = useState("0");
    const [status, setStatus] = useState("Connect wallet to submit encrypted orders");
    const [mxePublicKey, setMxePublicKey] = useState(new Uint8Array(32).fill(1));
    const [marketAdmin, setMarketAdmin] = useState("");
    const anchorWallet = wallet.publicKey && wallet.signTransaction && wallet.signAllTransactions
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
        return new AnchorProvider(connection, anchorWallet, {
            commitment: "confirmed",
        });
    }, [anchorWallet, connection]);
    const program = useMemo(() => {
        if (!provider) {
            return null;
        }
        return new Program(privatePerpsIdl, provider);
    }, [provider]);
    const marketStatePda = useMemo(() => PublicKey.findProgramAddressSync([MARKET_STATE_SEED], PROGRAM_ID)[0], []);
    const traderAccountPda = useMemo(() => {
        if (!wallet.publicKey) {
            return null;
        }
        return PublicKey.findProgramAddressSync([TRADER_SEED, marketStatePda.toBuffer(), wallet.publicKey.toBuffer()], PROGRAM_ID)[0];
    }, [wallet.publicKey, marketStatePda]);
    const isAdminWallet = useMemo(() => {
        if (!wallet.publicKey || !marketAdmin) {
            return false;
        }
        return wallet.publicKey.toBase58() === marketAdmin;
    }, [marketAdmin, wallet.publicKey]);
    useEffect(() => {
        async function loadMxePublicKey() {
            if (!provider) {
                return;
            }
            try {
                const key = await resolveMxePublicKey(provider, DEFAULT_MXE_PROGRAM_ID);
                setMxePublicKey(key);
            }
            catch {
                setStatus("MXE key unavailable; using placeholder key until MXE is initialized");
            }
        }
        void loadMxePublicKey();
    }, [provider]);
    useEffect(() => {
        async function loadMarketAdmin() {
            if (!program) {
                return;
            }
            try {
                const marketState = await program.account.marketState.fetch(marketStatePda);
                setMarketAdmin(marketState.admin.toBase58());
            }
            catch {
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
    const refreshTraderState = useCallback(async () => {
        if (!program || !traderAccountPda) {
            return;
        }
        try {
            const traderAccount = await program.account.traderAccount.fetch(traderAccountPda);
            setSettledPnls([
                {
                    orderId: "lifetime",
                    pnlTick: traderAccount.realizedPnlTick.toString(),
                },
            ]);
            setIsUnderwater(Boolean(traderAccount.isLiquidated));
        }
        catch {
            setSettledPnls([]);
            setIsUnderwater(false);
        }
    }, [program, traderAccountPda]);
    useEffect(() => {
        void refreshTraderState();
    }, [refreshTraderState]);
    async function handleEncryptedSubmit(encryptedOrder) {
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
            const { orderId, txSig } = await submitOrder(provider, program, marketStatePda, traderAccountPda, encryptedOrder);
            setStatus(`Submitted order #${orderId.toString()} (${txSig.slice(0, 8)}...)`);
            setLastTradeVolume((prev) => (Number(prev || "0") + 1).toString());
            setLastTradePrice("Hidden");
            await refreshTraderState();
        }
        catch (error) {
            setStatus(`Order submission failed: ${String(error)}`);
        }
    }
    return (_jsxs("main", { className: "landing-shell", children: [_jsxs("section", { className: "top-panel", id: "top", children: [_jsxs("header", { className: "nav-row", children: [_jsx("h1", { className: "brand", children: "ArcPerp" }), _jsxs("nav", { children: [_jsx("a", { href: "#how", children: "How It Works" }), _jsx("a", { href: "#security", children: "Security" }), _jsx("a", { href: "#arcium", children: "Arcium" }), _jsx("a", { className: "app-pill", href: "#app", children: "App" })] })] }), _jsxs("section", { className: "hero-grid", children: [_jsxs("article", { className: "hero-left", children: [_jsx("p", { className: "eyebrow", children: "Private Perpetuals on Solana" }), _jsxs("h2", { children: ["Private Orders.", _jsx("br", {}), "Verifiable Settlement."] }), _jsx("p", { children: "ArcPerp keeps order price, size, direction, position state, and liquidation thresholds confidential using Arcium encrypted computation. Only match events and finalized PnL are revealed for settlement." }), _jsxs("div", { className: "hero-actions", children: [_jsx("a", { className: "primary-btn", href: "#app", children: "Launch ArcPerp App" }), _jsx("a", { className: "secondary-btn", href: "#security", children: "Why It Is Safe" })] })] }), _jsxs("aside", { className: "hero-right", children: [_jsx("p", { className: "panel-title", children: "Privacy Guarantees" }), _jsxs("div", { className: "stat-tile", children: [_jsx("small", { children: "Order Inputs" }), _jsx("strong", { children: "Encrypted Client-Side" })] }), _jsxs("div", { className: "stat-tile", children: [_jsx("small", { children: "On-Chain State" }), _jsx("strong", { children: "Commitments, Not Raw Positions" })] }), _jsxs("div", { className: "stat-tile", children: [_jsx("small", { children: "Public Outputs" }), _jsx("strong", { children: "Match Events + Realized PnL Only" })] })] })] })] }), _jsxs("section", { className: "info-panel", id: "how", children: [_jsx("h3", { children: "How ArcPerp Works" }), _jsx("p", { children: "Trade flow is split between confidential computation and transparent settlement." }), _jsxs("div", { className: "step-grid", children: [_jsxs("article", { children: [_jsx("span", { children: "Step 1" }), _jsx("h4", { children: "Encrypt Before Submit" }), _jsx("p", { children: "Wallet-side encryption protects intent before data leaves the browser." })] }), _jsxs("article", { children: [_jsx("span", { children: "Step 2" }), _jsx("h4", { children: "Arcium Computes Confidentially" }), _jsx("p", { children: "Matching, position updates, and liquidation checks run in encrypted circuits." })] }), _jsxs("article", { children: [_jsx("span", { children: "Step 3" }), _jsx("h4", { children: "Anchor Settles Final Result" }), _jsx("p", { children: "Only proofs and final scalars settle on Solana, preserving confidentiality." })] })] })] }), _jsxs("section", { className: "info-panel", id: "security", children: [_jsx("h3", { children: "Why ArcPerp Is Safe" }), _jsxs("div", { className: "safety-grid", children: [_jsxs("article", { children: [_jsx("h4", { children: "No Intent Leakage" }), _jsx("p", { children: "Prices, sizes, and direction never post in plaintext on-chain or through the frontend state model." })] }), _jsxs("article", { children: [_jsx("h4", { children: "Proof-Based Settlement" }), _jsx("p", { children: "Solana instructions are constrained to encrypted blobs, MXE proof artifacts, and final PnL numbers." })] }), _jsxs("article", { children: [_jsx("h4", { children: "Minimal Disclosure Liquidation" }), _jsx("p", { children: "Liquidation checks reveal only a boolean safety signal rather than position internals or collateral details." })] })] })] }), _jsxs("section", { className: "info-panel", id: "arcium", children: [_jsx("h3", { children: "What Is Arcium" }), _jsx("p", { children: "Arcium is a confidential computing network for encrypted applications. ArcPerp uses Arcium circuits to run sensitive trading logic off the transparent path while still producing verifiable outputs for Solana settlement. This model combines privacy for trader intent with auditability for final outcomes." })] }), _jsxs("section", { className: "app-panel", id: "app", children: [_jsxs("div", { className: "app-head", children: [_jsx("h3", { children: "ArcPerp App" }), _jsx(WalletMultiButton, {})] }), _jsxs("div", { className: "metric-row", children: [_jsxs("article", { children: [_jsx("span", { children: "Status" }), _jsx("strong", { children: status })] }), _jsxs("article", { children: [_jsx("span", { children: "Last Trade Price" }), _jsx("strong", { children: lastTradePrice })] }), _jsxs("article", { children: [_jsx("span", { children: "Last Trade Volume" }), _jsx("strong", { children: lastTradeVolume })] }), _jsxs("article", { children: [_jsx("span", { children: "Program" }), _jsxs("strong", { children: [PROGRAM_ID.toBase58().slice(0, 12), "..."] })] })] }), _jsxs("div", { className: "app-grid", children: [_jsxs("div", { className: "app-stack", children: [_jsx(OrderForm, { traderPubkey: wallet.publicKey?.toBase58() ?? "disconnected", mxePublicKey: mxePublicKey, onEncryptedSubmit: handleEncryptedSubmit, canSubmit: isAdminWallet }), _jsx(LiquidationWarning, { isUnderwater: isUnderwater })] }), _jsx(Portfolio, { settledPnls: settledPnls })] })] }), _jsx("footer", { className: "site-disclaimer", children: "Demo disclaimer: ArcPerp is a Devnet prototype. Use a burner wallet and test funds only." })] }));
}
export default function App() {
    const endpoint = "https://api.devnet.solana.com";
    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
    return (_jsx(ConnectionProvider, { endpoint: endpoint, children: _jsx(WalletProvider, { wallets: wallets, autoConnect: true, children: _jsx(WalletModalProvider, { children: _jsx(AppBody, {}) }) }) }));
}
