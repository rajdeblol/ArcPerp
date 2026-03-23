import type { ReactElement } from "react";

interface Props {
  isUnderwater: boolean;
}

export function LiquidationWarning({ isUnderwater }: Props): ReactElement {
  if (!isUnderwater) {
    return (
      <aside className="surface-card liquidation healthy">
        <strong>Risk Status: Healthy</strong>
        <p>No liquidation signal from confidential checks.</p>
      </aside>
    );
  }

  return (
    <aside className="surface-card liquidation danger" role="alert">
      <strong>Liquidation Risk Triggered</strong>
      <p>Alert is driven only by confidential MXE boolean output.</p>
    </aside>
  );
}
