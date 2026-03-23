import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { encryptOrder } from "../../client/encryptOrder";
export function OrderForm({ traderPubkey, mxePublicKey, onEncryptedSubmit, canSubmit, disabledReason, }) {
    const [price, setPrice] = useState("");
    const [size, setSize] = useState("");
    const [direction, setDirection] = useState("long");
    const [submitting, setSubmitting] = useState(false);
    async function handleSubmit(event) {
        event.preventDefault();
        if (!canSubmit) {
            return;
        }
        setSubmitting(true);
        try {
            const encrypted = await encryptOrder({
                price: BigInt(price),
                size: BigInt(size),
                direction,
                traderPubkey,
            }, mxePublicKey);
            await onEncryptedSubmit(encrypted);
            setPrice("");
            setSize("");
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs("form", { className: "surface-card order-form", onSubmit: handleSubmit, children: [_jsxs("div", { className: "surface-head", children: [_jsx("h2", { children: "Confidential Order Entry" }), _jsx("p", { children: "All inputs are encrypted in-browser before transmission." })] }), _jsxs("label", { children: ["Price", _jsx("input", { value: price, onChange: (e) => setPrice(e.target.value), required: true, disabled: !canSubmit, inputMode: "numeric", placeholder: "e.g. 102450" })] }), _jsxs("label", { children: ["Size", _jsx("input", { value: size, onChange: (e) => setSize(e.target.value), required: true, disabled: !canSubmit, inputMode: "numeric", placeholder: "e.g. 5" })] }), _jsxs("label", { children: ["Direction", _jsxs("select", { value: direction, disabled: !canSubmit, onChange: (e) => setDirection(e.target.value), children: [_jsx("option", { value: "long", children: "Long" }), _jsx("option", { value: "short", children: "Short" })] })] }), _jsx("button", { type: "submit", disabled: submitting || !canSubmit, children: submitting ? "Encrypting + Submitting..." : "Submit Encrypted Order" }), _jsx("p", { className: "form-note", children: "Private fields never leave the browser in plaintext: price, size, direction." }), !canSubmit && disabledReason ? (_jsx("p", { className: "form-note form-note-warning", children: disabledReason })) : null] }));
}
