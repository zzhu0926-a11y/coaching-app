export type ActivityLevel = 1.2 | 1.375 | 1.55 | 1.725 | 1.9

export interface CalculatorInputs {
  gender: 'male' | 'female'
  age: number
  weightKg: number
  heightCm: number
  currentBfPct: number
  goalBfPct: number
  weeks: number
  activityLevel: ActivityLevel
  proteinPerKgLbm: number // 1.6–2.0
}

export interface MacroTargets {
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
}

export interface PhaseTargets extends MacroTargets {
  phase: string
  deficit: number
}

export interface CalculatorResults {
  lbmKg: number
  targetWeightKg: number
  fatToLoseKg: number
  weeklyLossKg: number
  bmr: number
  tdee: number
  dailyDeficit: number
  base: MacroTargets
  phases: {
    menstrual: PhaseTargets
    follicular: PhaseTargets
    ovulatory: PhaseTargets
    luteal: PhaseTargets
  }
  warnings: string[]
}

export function calculate(inputs: CalculatorInputs): CalculatorResults {
  const {
    gender,
    age,
    weightKg,
    heightCm,
    currentBfPct,
    goalBfPct,
    weeks,
    activityLevel,
    proteinPerKgLbm,
  } = inputs

  // 1. Lean body mass
  const lbmKg = weightKg * (1 - currentBfPct / 100)

  // 2. Target weight
  const targetWeightKg = lbmKg / (1 - goalBfPct / 100)

  // 3. Fat to lose
  const fatToLoseKg = weightKg - targetWeightKg

  // 4. Weekly loss rate
  const weeklyLossKg = fatToLoseKg / weeks

  // 5. Daily deficit (1 kg fat ≈ 7700 kcal)
  const dailyDeficit = Math.round((fatToLoseKg * 7700) / (weeks * 7))

  // 6. BMR — hybrid of Katch-McArdle + Mifflin-St Jeor
  const bmrKatch = 370 + 21.6 * lbmKg
  const bmrMifflin =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  const bmr = Math.round((bmrKatch + bmrMifflin) / 2)

  // 7. TDEE
  const tdee = Math.round(bmr * activityLevel)

  // 8. Base target calories
  const baseCal = Math.round(tdee - dailyDeficit)

  // 9. Base macros
  const fatPct = gender === 'male' ? 0.25 : 0.28
  const proteinG = Math.round(lbmKg * proteinPerKgLbm)
  const proteinCal = proteinG * 4
  const fatCal = Math.round(baseCal * fatPct)
  const fatG = Math.round(fatCal / 9)
  const carbsCal = baseCal - proteinCal - fatCal
  const carbsG = Math.max(0, Math.round(carbsCal / 4))

  const base: MacroTargets = { calories: baseCal, proteinG, fatG, carbsG }

  // 10. Phase adjustments (cycle-based redistribution)
  // Deficit multipliers — weighted to average 1.0 over 28-day cycle
  // Days: menstrual=5, follicular=8, ovulatory=3, luteal=12 (≈28)
  const rawMultipliers = { menstrual: 0.6, follicular: 1.3, ovulatory: 1.3, luteal: 0.7 }
  const phaseDays = { menstrual: 5, follicular: 9, ovulatory: 3, luteal: 11 }
  const weightedSum = Object.keys(rawMultipliers).reduce(
    (s, k) => s + rawMultipliers[k as keyof typeof rawMultipliers] * phaseDays[k as keyof typeof phaseDays],
    0
  )
  const norm = weightedSum / 28

  const phaseNames = ['menstrual', 'follicular', 'ovulatory', 'luteal'] as const
  const phaseProteinMult: Record<string, number> = {
    menstrual: -0.2,
    follicular: 0.1,
    ovulatory: 0.2,
    luteal: 0,
  }
  const phaseFatPct: Record<string, number> = {
    menstrual: 0.30,
    follicular: 0.22,
    ovulatory: 0.22,
    luteal: 0.28,
  }

  const phases: CalculatorResults['phases'] = {} as CalculatorResults['phases']

  for (const p of phaseNames) {
    const deficitMult = rawMultipliers[p] / norm
    const phaseDeficit = Math.round(dailyDeficit * deficitMult)
    const phaseCal = Math.round(tdee - phaseDeficit)

    const phaseProteinPerKg = Math.min(2.0, Math.max(1.6, proteinPerKgLbm + phaseProteinMult[p]))
    const phaseProteinG = Math.round(lbmKg * phaseProteinPerKg)
    const phaseProteinCal = phaseProteinG * 4
    const phaseFatCal = Math.round(phaseCal * phaseFatPct[p])
    const phaseFatG = Math.round(phaseFatCal / 9)
    const phaseCarbsCal = phaseCal - phaseProteinCal - phaseFatCal
    const phaseCarbsG = Math.max(0, Math.round(phaseCarbsCal / 4))

    phases[p] = {
      phase: p,
      calories: phaseCal,
      proteinG: phaseProteinG,
      fatG: phaseFatG,
      carbsG: phaseCarbsG,
      deficit: phaseDeficit,
    }
  }

  // 11. Warnings
  const warnings: string[] = []
  if (baseCal < 1200) warnings.push('Target calories are very low (<1200 kcal). Consider extending your timeframe.')
  if (weeklyLossKg > 1.0) warnings.push('Weekly loss rate exceeds 1 kg/week. This risks muscle loss.')
  if (dailyDeficit > 1000) warnings.push('Daily deficit exceeds 1000 kcal. Consider a slower approach.')
  if (carbsG < 50) warnings.push('Carb intake is very low (<50g). You may experience low energy.')
  if (gender === 'female' && goalBfPct < 15) warnings.push('Body fat below 15% can disrupt hormonal balance. Consider 18–22% as a goal.')
  if (gender === 'male' && goalBfPct < 6) warnings.push('Body fat below 6% is very difficult to maintain sustainably.')

  return {
    lbmKg,
    targetWeightKg,
    fatToLoseKg,
    weeklyLossKg,
    bmr,
    tdee,
    dailyDeficit,
    base,
    phases,
    warnings,
  }
}

// Get phase-adjusted targets for TODAY based on current cycle phase
export function getPhaseAdjustedGoals(
  baseGoals: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  phaseAdjustments: Record<string, { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number }>,
  currentPhase: string | null
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  if (!currentPhase || !phaseAdjustments[currentPhase]) return baseGoals

  const adj = phaseAdjustments[currentPhase]
  return {
    calories: adj.calories ?? baseGoals.calories,
    protein_g: adj.protein_g ?? baseGoals.protein_g,
    carbs_g: adj.carbs_g ?? baseGoals.carbs_g,
    fat_g: adj.fat_g ?? baseGoals.fat_g,
  }
}
