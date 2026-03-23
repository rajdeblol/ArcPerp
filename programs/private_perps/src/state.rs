use anchor_lang::prelude::*;

#[account]
pub struct MarketState {
    pub admin: Pubkey,
    pub mxe_id: [u8; 32],
    pub next_order_id: u64,
    pub bump: u8,
}

impl MarketState {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1;
}

#[account]
pub struct TraderAccount {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub encrypted_position_commitment: Vec<u8>,
    pub realized_pnl_tick: i64,
    pub is_liquidated: bool,
    pub bump: u8,
}

impl TraderAccount {
    pub const MAX_COMMITMENT_BYTES: usize = 512;
    pub const SPACE: usize = 8 + 32 + 32 + 4 + Self::MAX_COMMITMENT_BYTES + 8 + 1 + 1;
}

#[account]
pub struct VaultAccount {
    pub market: Pubkey,
    pub authority_bump: u8,
    pub collateral_pool: u64,
}

impl VaultAccount {
    pub const SPACE: usize = 8 + 32 + 1 + 8;
}

#[event]
pub struct OrderSubmitted {
    pub order_id: u64,
    pub trader: Pubkey,
    pub market: Pubkey,
    pub encrypted_order_blob: Vec<u8>,
}

#[event]
pub struct FillSettled {
    pub order_id: u64,
    pub trader: Pubkey,
    pub realized_pnl_tick: i64,
}

#[event]
pub struct TraderLiquidated {
    pub trader: Pubkey,
    pub market: Pubkey,
    pub redistributed_collateral: u64,
}
