use anchor_lang::prelude::*;

use crate::{
    state::{FillSettled, MarketState, TraderAccount, VaultAccount},
    PrivatePerpsError,
};

#[derive(Accounts)]
pub struct SettleFill<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"market-state"], bump = market_state.bump)]
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
    ctx: Context<SettleFill>,
    order_id: u64,
    decrypted_realized_pnl_tick: i64,
    mxe_proof: Vec<u8>,
    new_encrypted_position_commitment: Vec<u8>,
) -> Result<()> {
    require!(!mxe_proof.is_empty(), PrivatePerpsError::InvalidMxeProof);
    require!(
        new_encrypted_position_commitment.len() <= TraderAccount::MAX_COMMITMENT_BYTES,
        PrivatePerpsError::PayloadTooLarge
    );

    let trader_account = &mut ctx.accounts.trader_account;
    let vault_account = &mut ctx.accounts.vault_account;

    trader_account.realized_pnl_tick = trader_account
        .realized_pnl_tick
        .checked_add(decrypted_realized_pnl_tick)
        .ok_or(PrivatePerpsError::PayloadTooLarge)?;
    trader_account.encrypted_position_commitment = new_encrypted_position_commitment;

    if decrypted_realized_pnl_tick >= 0 {
        vault_account.collateral_pool = vault_account
            .collateral_pool
            .saturating_sub(decrypted_realized_pnl_tick as u64);
    } else {
        vault_account.collateral_pool = vault_account
            .collateral_pool
            .saturating_add(decrypted_realized_pnl_tick.unsigned_abs());
    }

    emit!(FillSettled {
        order_id,
        trader: trader_account.owner,
        realized_pnl_tick: decrypted_realized_pnl_tick,
    });

    Ok(())
}
