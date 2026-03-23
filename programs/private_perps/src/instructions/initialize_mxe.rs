use anchor_lang::prelude::*;

use crate::state::MarketState;

#[derive(Accounts)]
pub struct InitializeMxe<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = MarketState::SPACE,
        seeds = [b"market-state"],
        bump
    )]
    pub market_state: Account<'info, MarketState>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeMxe>, mxe_id: [u8; 32]) -> Result<()> {
    let market_state = &mut ctx.accounts.market_state;
    market_state.admin = ctx.accounts.payer.key();
    market_state.mxe_id = mxe_id;
    market_state.next_order_id = 1;
    market_state.bump = ctx.bumps.market_state;
    Ok(())
}
