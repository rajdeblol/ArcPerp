import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Portfolio({ settledPnls }) {
    const total = settledPnls.reduce((acc, item) => acc + Number(item.pnlTick), 0);
    return (_jsxs("section", { className: "surface-card portfolio", children: [_jsxs("div", { className: "surface-head", children: [_jsx("h2", { children: "Settled PnL Ledger" }), _jsx("p", { children: "Only finalized PnL is visible. Position size and direction remain confidential." })] }), _jsxs("div", { className: "portfolio-total", children: [_jsx("span", { children: "Total Settled PnL (ticks)" }), _jsx("strong", { children: total })] }), _jsx("ul", { className: "ledger-list", children: settledPnls.length === 0 ? (_jsx("li", { className: "empty-row", children: "No settled fills yet." })) : (settledPnls.map((item) => (_jsxs("li", { children: [_jsxs("span", { children: ["Order #", item.orderId] }), _jsx("strong", { children: item.pnlTick })] }, item.orderId)))) })] }));
}
