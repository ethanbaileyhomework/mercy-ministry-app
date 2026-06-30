/**
 * Victorian Food Safety compliance — Food Act 1984 (Vic)
 * Hot holding:  >= 60°C
 * Cold holding:  <= 5°C
 * Reheating:    >= 75°C (must reach 75°C before serving)
 * Fridge units: <= 5°C  (equipment check)
 */
export const FOOD_SAFETY = {
  hotMinTemp: 60,
  coldMaxTemp: 5,
  reheatMinTemp: 75,
  fridgeMaxTemp: 5,
  frozenMaxTemp: -15,
} as const;

export function evaluateTemperature(
  temp: number,
  foodType: 'hot' | 'cold' | 'reheat' | 'fridge' | 'frozen'
): 'PASS' | 'FAIL' {
  switch (foodType) {
    case 'hot':     return temp >= FOOD_SAFETY.hotMinTemp ? 'PASS' : 'FAIL';
    case 'reheat':  return temp >= FOOD_SAFETY.reheatMinTemp ? 'PASS' : 'FAIL';
    case 'cold':    return temp <= FOOD_SAFETY.coldMaxTemp ? 'PASS' : 'FAIL';
    case 'fridge':  return temp <= FOOD_SAFETY.fridgeMaxTemp ? 'PASS' : 'FAIL';
    case 'frozen':  return temp <= FOOD_SAFETY.frozenMaxTemp ? 'PASS' : 'FAIL';
  }
}
