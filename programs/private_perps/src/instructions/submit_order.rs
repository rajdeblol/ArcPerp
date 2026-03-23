use anchor_lang::prelude::*;

use crate::{
    state::{MarketState, OrderSubmitted, TraderAccount},
    PrivatePerpsError,
};

#[derive(Accounts)]
pub struct SubmitOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    #[account(mut, seeds = [b"market-state"], bump = market_state.bump)]
    pub market_state: Account<'info, MarketState>,
    #[account(
        init_if_needed,
        payer = trader,
        space = TraderAccount::SPACE,
        seeds = [b"trader", market_state.key().as_ref(), trader.key().as_ref()],
        bump
    )]
    pub trader_account: Account<'info, TraderAccount>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SubmitOrder>, encrypted_order_blob: Vec<u8>) -> Result<()> {
    require!(
        encrypted_order_blob.len() <= TraderAccount::MAX_COMMITMENT_BYTES,
        PrivatePerpsError::PayloadTooLarge
    );

    let market_state = &mut ctx.accounts.market_state;
    let trader_account = &mut ctx.accounts.trader_account;
    require_keys_eq!(
        ctx.accounts.trader.key(),
        market_state.admin,
        PrivatePerpsError::Unauthorized
    );

    if trader_account.owner == Pubkey::default() {
        trader_account.owner = ctx.accounts.trader.key();
        trader_account.market = market_state.key();
        trader_account.encrypted_position_commitment = vec![];
        trader_account.realized_pnl_tick = 0;
        trader_account.is_liquidated = false;
        trader_account.bump = ctx.bumps.trader_account;
    }

    let order_id = market_state.next_order_id;
    market_state.next_order_id = market_state
        .next_order_id
        .checked_add(1)
        .ok_or(PrivatePerpsError::PayloadTooLarge)?;

    emit!(OrderSubmitted {
        order_id,
        trader: ctx.accounts.trader.key(),
        market: market_state.key(),
        encrypted_order_blob,
    });

    Ok(())
}
