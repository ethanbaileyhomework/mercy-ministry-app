/**
 * Victorian Food Safety compliance thresholds.
 * Food Act 1984 (Vic) + Food Safety Standard 3.2.2
 *
 * Temperature Danger Zone: 5°C - 60°C
 * Hot food must be held at >= 60°C
 * Cold food must be held at <= 5°C
 * Reheated food must reach >= 75°C core temperature
 */
export const FOOD_SAFETY = {
  hotMinTemp: 60,
  coldMaxTemp: 5,
  reheatMinTemp: 75,
  tempCheckIntervalMinutes: 120,
  dangerZone: { min: 5, max: 60 },
} as const;

export function evaluateTemperature(
  tempCelsius: number,
  category: 'hot_meal' | 'cold_item' | 'dairy' | 'produce' | 'packaged'
): 'PASS' | 'FAIL' | 'ADVISORY' {
  if (category === 'packaged') return 'ADVISORY';
  if (category === 'hot_meal') {
    return tempCelsius >= FOOD_SAFETY.hotMinTemp ? 'PASS' : 'FAIL';
  }
  // cold_item, dairy, produce
  return tempCelsius <= FOOD_SAFETY.coldMaxTemp ? 'PASS' : 'FAIL';
}
