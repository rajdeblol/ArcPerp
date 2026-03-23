use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Fc4GhUpsp7J9sGR8b94q1Hm6gZuqGvzRD345M7yNybHR");

#[program]
pub mod private_perps {
    use super::*;

    pub fn initialize_mxe(ctx: Context<InitializeMxe>, mxe_id: [u8; 32]) -> Result<()> {
        instructions::initialize_mxe::handler(ctx, mxe_id)
    }

    pub fn submit_order(ctx: Context<SubmitOrder>, encrypted_order_blob: Vec<u8>) -> Result<()> {
        instructions::submit_order::handler(ctx, encrypted_order_blob)
    }

    pub fn settle_fill(
        ctx: Context<SettleFill>,
        order_id: u64,
        decrypted_realized_pnl_tick: i64,
        mxe_proof: Vec<u8>,
        new_encrypted_position_commitment: Vec<u8>,
    ) -> Result<()> {
        instructions::settle_fill::handler(
            ctx,
            order_id,
            decrypted_realized_pnl_tick,
            mxe_proof,
            new_encrypted_position_commitment,
        )
    }

    pub fn execute_liquidation(
        ctx: Context<ExecuteLiquidation>,
        is_underwater: bool,
        mxe_proof: Vec<u8>,
    ) -> Result<()> {
        instructions::execute_liquidation::handler(ctx, is_underwater, mxe_proof)
    }
}

#[error_code]
pub enum PrivatePerpsError {
    #[msg("Invalid MXE proof payload.")]
    InvalidMxeProof,
    #[msg("Liquidation check did not signal underwater position.")]
    NotLiquidatable,
    #[msg("Encrypted payload exceeds configured limit.")]
    PayloadTooLarge,
}
