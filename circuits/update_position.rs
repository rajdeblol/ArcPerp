use arcium_sdk::prelude::*;

/// Circuit B: confidential position and PnL tick update.
#[arcium_sdk::circuit]
pub fn update_position(
    current_pos: Masked<i64>,
    fill_qty: Masked<i64>,
    entry_price: Masked<u64>,
    fill_price: Masked<u64>,
) -> (Masked<i64>, Masked<i64>) {
    // Masked add keeps position direction and size private when accumulating fills.
    let new_pos = current_pos.add_masked(fill_qty);

    // Masked subtraction keeps price movement private while deriving mark delta.
    let price_delta = fill_price.sub_masked(entry_price);

    // Masked cast preserves secrecy when moving to signed arithmetic for PnL ticks.
    let signed_price_delta = price_delta.cast_masked::<i64>();

    // Masked multiply computes unrealized PnL contribution without leaking position magnitude/sign.
    let pnl_tick = fill_qty.mul_masked(signed_price_delta);

    // Masked absolute value computed unconditionally to avoid sign-based side-channel inference.
    let _abs_new_pos = new_pos.abs_masked();

    (new_pos, pnl_tick)
}
