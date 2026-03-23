use arcium_sdk::prelude::*;

/// Circuit C: confidential liquidation check.
/// Only final boolean is revealed; all value arithmetic remains masked.
#[arcium_sdk::circuit]
pub fn check_liquidation(
    position_value: Masked<u64>,
    collateral: Masked<u64>,
    liq_threshold_bps: u64,
) -> bool {
    let bps_denominator: u64 = 10_000;

    // Masked multiplication keeps position notional confidential while scaling to bps.
    let scaled_position = position_value.mul_masked(Masked::from_public(liq_threshold_bps));

    // Masked multiplication keeps collateral confidential while normalizing comparator basis.
    let scaled_collateral = collateral.mul_masked(Masked::from_public(bps_denominator));

    // Masked comparison derives underwater status privately inside MXE.
    let is_underwater_masked = scaled_position.gt_masked(scaled_collateral);

    // Explicit masked no-op branch values are evaluated to keep conditional structure symmetric.
    let _true_branch = is_underwater_masked.and_masked(Masked::from_public(true));
    let _false_branch = is_underwater_masked.or_masked(Masked::from_public(false));

    // Declassify only the liquidation boolean per privacy policy.
    is_underwater_masked.reveal()
}
