/**
 * Platform fee resolution — the single source of truth for what LyoDex charges.
 *
 * The rate was previously hardcoded as `0.09` in fourteen places across the
 * webhook, the bid routes, the admin reports and the scheduler. Changing it
 * meant editing money-handling code in every one of them and hoping none was
 * missed.
 *
 * It is now driven by `PLATFORM_FEE_PERCENT`:
 *
 *     PLATFORM_FEE_PERCENT=0     launch — connect operators and buyers for free
 *     PLATFORM_FEE_PERCENT=9     switch commission on, no redeploy of code
 *
 * The default is 0. A missing or malformed value must never silently start
 * charging people: under-charging is a business decision, over-charging is a
 * chargeback and a lost customer.
 *
 * IMPORTANT — historical contracts:
 * The rate in force when a contract was awarded is snapshotted onto the bid
 * (`bids.platform_fee_rate`). Reports and payouts read that snapshot, never the
 * current environment value. Without this, flipping 0% → 9% would retroactively
 * rewrite every past contract's revenue and make the books disagree with what
 * was actually charged.
 */

const DEFAULT_FEE_PERCENT = 0;

function parseFeePercent(): number {
  const raw = process.env.PLATFORM_FEE_PERCENT?.trim();
  if (raw === undefined || raw === "") return DEFAULT_FEE_PERCENT;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    console.warn(
      `[fees] PLATFORM_FEE_PERCENT="${raw}" is not a percentage between 0 and 100 — ` +
        `falling back to ${DEFAULT_FEE_PERCENT}%. No fee will be charged.`,
    );
    return DEFAULT_FEE_PERCENT;
  }
  return parsed;
}

/** Configured platform fee as a percentage, e.g. 9 means 9%. */
export const PLATFORM_FEE_PERCENT: number = parseFeePercent();

/** Configured platform fee as a rate, e.g. 0.09. */
export const PLATFORM_FEE_RATE: number = PLATFORM_FEE_PERCENT / 100;

/**
 * Effective fee rate for a contract, honouring a per-operator override.
 *
 * `operators.platform_fee_override` is stored as a numeric string holding a
 * RATE (0.05 = 5%), not a percentage. Null means "use the platform default".
 */
export function resolveFeeRate(operatorOverride?: string | number | null): number {
  if (operatorOverride === null || operatorOverride === undefined || operatorOverride === "") {
    return PLATFORM_FEE_RATE;
  }
  const parsed = Number(operatorOverride);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    console.warn(
      `[fees] Ignoring invalid platform_fee_override="${operatorOverride}" — ` +
        `expected a rate between 0 and 1. Using the platform default.`,
    );
    return PLATFORM_FEE_RATE;
  }
  return parsed;
}

export interface FeeBreakdown {
  /** Rate actually applied — snapshot this onto the contract. */
  rate: number;
  feeCents: number;
  operatorPayoutCents: number;
  fee: number;
  operatorPayout: number;
}

/**
 * Split a contract value between the platform fee and the operator payout.
 *
 * Works in cents so the two parts always add back up to the contract value —
 * computing each side independently from a float would let rounding drop or
 * invent a cent.
 */
export function calculateFees(contractValueCents: number, rate: number): FeeBreakdown {
  const safeRate = Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : PLATFORM_FEE_RATE;
  const feeCents = Math.round(contractValueCents * safeRate);
  const operatorPayoutCents = contractValueCents - feeCents;
  return {
    rate: safeRate,
    feeCents,
    operatorPayoutCents,
    fee: feeCents / 100,
    operatorPayout: operatorPayoutCents / 100,
  };
}

/** True when no fee is charged — callers should skip the fee checkout entirely. */
export function isFeeWaived(rate: number = PLATFORM_FEE_RATE): boolean {
  return rate <= 0;
}

/**
 * Rate that applied to a contract awarded before `bids.platform_fee_rate`
 * existed. Those contracts were all charged the then-hardcoded 9%.
 */
export const LEGACY_FEE_RATE = 0.09;

/**
 * Fee rate to use when reporting on a historical contract.
 *
 * Always prefer the rate stored on the row. Reports must reflect what was
 * actually charged, not what the platform charges today — otherwise switching
 * the rate would silently restate past revenue.
 */
export function historicalFeeRate(snapshot: number | null | undefined): number {
  return snapshot ?? LEGACY_FEE_RATE;
}
