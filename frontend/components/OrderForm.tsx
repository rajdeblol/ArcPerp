import type { ReactElement } from "react";
import { useState } from "react";

import { encryptOrder, type EncryptedOrder, type OrderDirection } from "../lib/encryptOrder";

interface Props {
  traderPubkey: string;
  mxePublicKey: Uint8Array;
  onEncryptedSubmit: (encryptedOrder: EncryptedOrder) => Promise<void>;
  canSubmit: boolean;
  disabledReason?: string;
}

export function OrderForm({
  traderPubkey,
  mxePublicKey,
  onEncryptedSubmit,
  canSubmit,
  disabledReason,
}: Props): ReactElement {
  const [price, setPrice] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [direction, setDirection] = useState<OrderDirection>("long");
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);

    try {
      const encrypted = await encryptOrder(
        {
          price: BigInt(price),
          size: BigInt(size),
          direction,
          traderPubkey,
        },
        mxePublicKey,
      );

      await onEncryptedSubmit(encrypted);
      setPrice("");
      setSize("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="surface-card order-form" onSubmit={handleSubmit}>
      <div className="surface-head">
        <h2>Confidential Order Entry</h2>
        <p>All inputs are encrypted in-browser before transmission.</p>
      </div>

      <label>
        Price
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          disabled={!canSubmit}
          inputMode="numeric"
          placeholder="e.g. 102450"
        />
      </label>
      <label>
        Size
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          required
          disabled={!canSubmit}
          inputMode="numeric"
          placeholder="e.g. 5"
        />
      </label>
      <label>
        Direction
        <select
          value={direction}
          disabled={!canSubmit}
          onChange={(e) => setDirection(e.target.value as OrderDirection)}
        >
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </label>

      <button type="submit" disabled={submitting || !canSubmit}>
        {submitting ? "Encrypting + Submitting..." : "Submit Encrypted Order"}
      </button>

      <p className="form-note">
        Private fields never leave the browser in plaintext: price, size, direction.
      </p>
      {!canSubmit && disabledReason ? (
        <p className="form-note form-note-warning">{disabledReason}</p>
      ) : null}
    </form>
  );
}
