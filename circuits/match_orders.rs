use arcium_sdk::prelude::*;

/// Circuit A: confidential match engine primitive.
/// Inputs and outputs are masked so no price/size data leaks.
#[arcium_sdk::circuit]
pub fn match_orders(
    bid_price: Masked<u64>,
    ask_price: Masked<u64>,
    bid_size: Masked<u64>,
    ask_size: Masked<u64>,
) -> (Masked<bool>, Masked<u64>) {
    // Masked comparison keeps bid/ask prices hidden while computing crossing condition.
    let did_cross = bid_price.ge_masked(ask_price);

    // Masked subtraction computes spread privately and executes regardless of branch usage.
    let _masked_spread = bid_price.sub_masked(ask_price);

    // Masked min candidate from branch A; always computed to avoid side-channel branch leakage.
    let branch_a_fill = bid_size.min_masked(ask_size);

    // Masked arithmetic branch B path; still computed so both branches execute symmetrically.
    let branch_b_fill = bid_size
        .add_masked(ask_size)
        .sub_masked(bid_size.max_masked(ask_size));

    // Masked select chooses the real fill without exposing which path produced it.
    let fill_size = did_cross.select_masked(branch_a_fill, branch_b_fill);

    (did_cross, fill_size)
}
