/**
 * Simplified actuarial life table based on SSA 2021 period life tables (unisex average).
 * Maps current age → probability of surviving to each future age.
 * Used for longevity-risk sampling in Monte Carlo simulations.
 */

/**
 * Probability of death within one year, indexed by age (50–100).
 * Source: SSA 2021 period life table, averaged male/female.
 * Ages below 50 are omitted — retirement simulations start withdrawal at 50+.
 */
const ANNUAL_MORTALITY: Record<number, number> = {
  50: 0.0040, 51: 0.0044, 52: 0.0048, 53: 0.0053, 54: 0.0058,
  55: 0.0064, 56: 0.0071, 57: 0.0078, 58: 0.0086, 59: 0.0095,
  60: 0.0105, 61: 0.0116, 62: 0.0128, 63: 0.0142, 64: 0.0157,
  65: 0.0174, 66: 0.0193, 67: 0.0214, 68: 0.0238, 69: 0.0265,
  70: 0.0295, 71: 0.0329, 72: 0.0367, 73: 0.0410, 74: 0.0459,
  75: 0.0514, 76: 0.0576, 77: 0.0646, 78: 0.0725, 79: 0.0815,
  80: 0.0917, 81: 0.1033, 82: 0.1164, 83: 0.1312, 84: 0.1480,
  85: 0.1670, 86: 0.1884, 87: 0.2124, 88: 0.2393, 89: 0.2693,
  90: 0.3027, 91: 0.3297, 92: 0.3580, 93: 0.3876, 94: 0.4183,
  95: 0.4500, 96: 0.4825, 97: 0.5156, 98: 0.5490, 99: 0.5824,
  100: 1.0000,
}

/**
 * Sample a death age from the actuarial table given a current age.
 * Uses inverse-transform sampling: draw U ~ Uniform(0,1), walk forward
 * through mortality probabilities until cumulative probability exceeds U.
 *
 * @param currentAge - The person's current age (integer)
 * @param rng - Random number generator function returning [0, 1)
 * @returns Sampled age at death (integer, minimum currentAge + 1, maximum 100)
 */
export function sampleDeathAge(currentAge: number, rng: () => number): number {
  const startAge = Math.max(Math.ceil(currentAge), 50)
  const u = rng()
  let survivalProb = 1.0

  for (let age = startAge; age <= 100; age++) {
    const q = ANNUAL_MORTALITY[age] ?? 0.0040 // fallback for ages < 50
    survivalProb *= (1 - q)
    // Probability of dying at this age = survivalProb_before * q
    // Equivalent: if cumulative death probability > u, die at this age
    if (1 - survivalProb >= u) {
      return age
    }
  }

  return 100
}
