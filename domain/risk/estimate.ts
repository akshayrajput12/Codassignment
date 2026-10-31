/**
 * Risk Estimator for COD Orders
 * Implements Empirical Bayesian Shrinkage to prevent catastrophic small-sample errors.
 */

export interface TrainingPriors {
  globalRtoRate: number; // ~0.2808
  firstTimeRtoRate: number; // ~0.301
  repeatRtoRate: number; // ~0.226
  metaAdsRtoRate: number; // ~0.312
  directRtoRate: number; // ~0.229
  buyerCohortK: number; // shrinkage hyperparameter k = 20
  pincodeK: number; // shrinkage hyperparameter k = 30
}

export const TRAINING_PRIORS: TrainingPriors = {
  globalRtoRate: 0.2808,
  firstTimeRtoRate: 0.3010,
  repeatRtoRate: 0.2260,
  metaAdsRtoRate: 0.3120,
  directRtoRate: 0.2290,
  buyerCohortK: 20,
  pincodeK: 30,
};

/**
 * Empirical Bayesian Smoothed Rate:
 * p_shrunk = (observed_rto + k * prior) / (observed_total + k)
 */
export function calculateSmoothedRate(
  observedRto: number,
  observedTotal: number,
  priorRate: number,
  k: number
): number {
  if (observedTotal < 0 || observedRto < 0) {
    return priorRate;
  }
  const safeRto = Math.min(observedRto, observedTotal);
  return (safeRto + k * priorRate) / (observedTotal + k);
}

export interface RiskInput {
  priorOrders: number;
  priorRto: number;
  pincode?: string;
  pincodeStats?: { total: number; rto: number };
  orderValue?: number;
  utmSource?: string;
  priors?: TrainingPriors;
}

export interface RiskOutput {
  probability: number; // [0, 1]
  band: 'LOW' | 'MEDIUM' | 'ELEVATED' | 'HIGH';
  cohortPrior: number;
  pincodeAdjustedRate: number;
  pincodeSupport: number;
  isSparsePincode: boolean;
  customerHistoryRate: number | null;
  explanation: string;
}

export function estimateOrderRisk(input: RiskInput): RiskOutput {
  const priors = input.priors || TRAINING_PRIORS;

  const priorOrders = Math.max(0, input.priorOrders || 0);
  const priorRto = Math.max(0, Math.min(input.priorRto || 0, priorOrders));
  const isFirstTime = priorOrders === 0;

  // 1. Base cohort rate
  const cohortPrior = isFirstTime ? priors.firstTimeRtoRate : priors.repeatRtoRate;

  // 2. Customer specific history (if repeat)
  let customerHistoryRate: number | null = null;
  const isRepeatReturnAbuser = priorOrders >= 2 && priorRto === priorOrders;
  if (!isFirstTime) {
    // Shrink customer's individual track record toward repeat prior with k=2
    customerHistoryRate = calculateSmoothedRate(
      priorRto,
      priorOrders,
      priors.repeatRtoRate,
      2
    );
    if (isRepeatReturnAbuser) {
      customerHistoryRate = Math.max(0.68, customerHistoryRate);
    }
  }

  // 3. Pincode smoothing
  const pinStats = input.pincodeStats || { total: 0, rto: 0 };
  const pincodeSupport = pinStats.total;
  const isSparsePincode = pincodeSupport < 5;

  const pincodeAdjustedRate = calculateSmoothedRate(
    pinStats.rto,
    pinStats.total,
    priors.globalRtoRate,
    priors.pincodeK
  );

  // 4. UTM Source adjustment (mild weight)
  let sourceAdjustment = 0;
  const utm = (input.utmSource || '').toLowerCase();
  if (utm.includes('meta')) {
    sourceAdjustment = 0.015; // +1.5% empirical lift
  } else if (utm.includes('direct')) {
    sourceAdjustment = -0.015; // -1.5% empirical drop
  }

  // 5. Blended Probability
  // Start with cohort/customer baseline
  let baseRate = customerHistoryRate !== null ? customerHistoryRate : cohortPrior;

  // Blend in pincode signal proportionally to pincode sample support
  // If support is 0, weight is 0. If support >= 20, weight caps at 0.35.
  const pinWeight = Math.min(0.35, (pincodeSupport / (pincodeSupport + priors.pincodeK)));
  const blended = (1 - pinWeight) * baseRate + pinWeight * pincodeAdjustedRate + sourceAdjustment;

  // Bound strictly in [0.05, 0.95]
  const probability = Math.max(0.05, Math.min(0.95, Number(blended.toFixed(4))));

  // Determine risk band
  let band: 'LOW' | 'MEDIUM' | 'ELEVATED' | 'HIGH';
  if (probability < 0.22) {
    band = 'LOW';
  } else if (probability < 0.32) {
    band = 'MEDIUM';
  } else if (probability < 0.45) {
    band = 'ELEVATED';
  } else {
    band = 'HIGH';
  }

  let explanation = '';
  if (isFirstTime) {
    explanation = `First-time customer (baseline ${Number(priors.firstTimeRtoRate * 100).toFixed(1)}%). `;
  } else {
    explanation = `Repeat customer with ${priorOrders} past order(s) and ${priorRto} RTO(s). `;
  }

  if (isSparsePincode) {
    explanation += `Pincode ${input.pincode || 'N/A'} has only ${pincodeSupport} historical record(s); shrunk toward national average.`;
  } else {
    explanation += `Pincode historical RTO: ${Number(pincodeAdjustedRate * 100).toFixed(1)}% (N=${pincodeSupport}).`;
  }

  return {
    probability,
    band,
    cohortPrior,
    pincodeAdjustedRate,
    pincodeSupport,
    isSparsePincode,
    customerHistoryRate,
    explanation,
  };
}
