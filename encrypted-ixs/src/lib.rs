use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    type Masked<T> = Enc<Shared, T>;

    pub struct MatchOrdersInput {
        bid_price: u64,
        ask_price: u64,
        bid_size: u64,
        ask_size: u64,
    }

    pub struct MatchOrdersOutput {
        did_cross: bool,
        fill_size: u64,
    }

    pub struct UpdatePositionInput {
        current_pos: i64,
        fill_qty: i64,
        entry_price: u64,
        fill_price: u64,
    }

    pub struct UpdatePositionOutput {
        new_pos: i64,
        pnl_tick: i64,
    }

    pub struct CheckLiquidationInput {
        position_value: u64,
        collateral: u64,
        liq_threshold_bps: u64,
    }

    #[instruction]
    pub fn match_orders(input_ctxt: Masked<MatchOrdersInput>) -> Masked<MatchOrdersOutput> {
        let input = input_ctxt.to_arcis();

        // Masked comparison: keeps bid/ask prices secret while evaluating crossing.
        let did_cross = input.bid_price >= input.ask_price;

        // Masked branch A arithmetic is always evaluated to avoid branch side-channel leakage.
        let branch_a_fill = if input.bid_size < input.ask_size {
            input.bid_size
        } else {
            input.ask_size
        };

        // Masked branch B arithmetic is also always evaluated for symmetric execution.
        let branch_b_fill = input.bid_size + input.ask_size
            - if input.bid_size > input.ask_size {
                input.bid_size
            } else {
                input.ask_size
            };

        // Masked select chooses output without exposing which branch value is used.
        let fill_size = if did_cross { branch_a_fill } else { branch_b_fill };

        input_ctxt.owner.from_arcis(MatchOrdersOutput {
            did_cross,
            fill_size,
        })
    }

    #[instruction]
    pub fn update_position(input_ctxt: Masked<UpdatePositionInput>) -> Masked<UpdatePositionOutput> {
        let input = input_ctxt.to_arcis();

        // Masked add: keeps position direction and magnitude private during accumulation.
        let new_pos = input.current_pos + input.fill_qty;

        // Masked subtraction: keeps price movement private while deriving PnL delta.
        let price_delta = input.fill_price as i64 - input.entry_price as i64;

        // Masked multiply: computes PnL tick without revealing position size/sign.
        let pnl_tick = input.fill_qty * price_delta;

        // Masked absolute value is computed unconditionally to reduce sign-leak side channels.
        let _abs_new_pos = if new_pos < 0 { -new_pos } else { new_pos };

        input_ctxt.owner.from_arcis(UpdatePositionOutput { new_pos, pnl_tick })
    }

    #[instruction]
    pub fn check_liquidation(input_ctxt: Masked<CheckLiquidationInput>) -> bool {
        let input = input_ctxt.to_arcis();

        // Masked multiply: keeps position value private while scaling by threshold bps.
        let scaled_position = input.position_value * input.liq_threshold_bps;

        // Masked multiply: keeps collateral private while normalizing to same basis points scale.
        let scaled_collateral = input.collateral * 10_000;

        // Masked comparison runs inside MXE; only final boolean is revealed.
        let is_underwater = scaled_position > scaled_collateral;

        // Reveal only liquidation boolean to on-chain settlement path.
        is_underwater.reveal()
    }
}
