import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function LiquidationWarning({ isUnderwater }) {
    if (!isUnderwater) {
        return (_jsxs("aside", { className: "surface-card liquidation healthy", children: [_jsx("strong", { children: "Risk Status: Healthy" }), _jsx("p", { children: "No liquidation signal from confidential checks." })] }));
    }
    return (_jsxs("aside", { className: "surface-card liquidation danger", role: "alert", children: [_jsx("strong", { children: "Liquidation Risk Triggered" }), _jsx("p", { children: "Alert is driven only by confidential MXE boolean output." })] }));
}
