import type { ReactElement } from "react";

interface SettledPnlItem {
  orderId: string;
  pnlTick: string;
}

interface Props {
  settledPnls: SettledPnlItem[];
}

export function Portfolio({ settledPnls }: Props): ReactElement {
  const total = settledPnls.reduce((acc, item) => acc + Number(item.pnlTick), 0);

  return (
    <section className="surface-card portfolio">
      <div className="surface-head">
        <h2>Settled PnL Ledger</h2>
        <p>Only finalized PnL is visible. Position size and direction remain confidential.</p>
      </div>

      <div className="portfolio-total">
        <span>Total Settled PnL (ticks)</span>
        <strong>{total}</strong>
      </div>

      <ul className="ledger-list">
        {settledPnls.length === 0 ? (
          <li className="empty-row">No settled fills yet.</li>
        ) : (
          settledPnls.map((item) => (
            <li key={item.orderId}>
              <span>Order #{item.orderId}</span>
              <strong>{item.pnlTick}</strong>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
