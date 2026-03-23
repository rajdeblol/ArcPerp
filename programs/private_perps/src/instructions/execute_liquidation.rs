use anchor_lang::prelude::*;

use crate::{
    state::{MarketState, TraderAccount, TraderLiquidated, VaultAccount},
    PrivatePerpsError,
};

#[derive(Accounts)]
pub struct ExecuteLiquidation<'info> {
    #[account(mut)]
    pub liquidator: Signer<'info>,
    #[account(seeds = [b"market-state"], bump = market_state.bump)]
    pub market_state: Account<'info, MarketState>,
    #[account(
        mut,
        seeds = [b"trader", market_state.key().as_ref(), trader_account.owner.as_ref()],
        bump = trader_account.bump
    )]
    pub trader_account: Account<'info, TraderAccount>,
    #[account(mut)]
    pub vault_account: Account<'info, VaultAccount>,
}

pub fn handler(
    ctx: Context<ExecuteLiquidation>,
    is_underwater: bool,
    mxe_proof: Vec<u8>,
) -> Result<()> {
    require!(!mxe_proof.is_empty(), PrivatePerpsError::InvalidMxeProof);
    require!(is_underwater, PrivatePerpsError::NotLiquidatable);

    let trader_account = &mut ctx.accounts.trader_account;
    let vault_account = &mut ctx.accounts.vault_account;

    trader_account.encrypted_position_commitment = vec![];
    trader_account.is_liquidated = true;

    let redistributed_collateral = vault_account.collateral_pool / 100;
    vault_account.collateral_pool = vault_account.collateral_pool.saturating_sub(redistributed_collateral);

    emit!(TraderLiquidated {
        trader: trader_account.owner,
        market: ctx.accounts.market_state.key(),
        redistributed_collateral,
    });

    Ok(())
}
