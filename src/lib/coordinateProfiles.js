/** Per-league coordinate and UI defaults. */

export const PROFILES = {
  frc: {
    unit: 'm',
    originMode: 'bottomLeft',
    gridSpacing: 1,
    defaultViewRect: { xMin: 0, yMin: 0, xMax: 9.25 },
    simulatorHalfFieldSpan: 9.25,
  },
  ftc: {
    unit: 'in',
    originMode: 'center',
    gridSpacing: 6,
    defaultViewRect: { xMin: -72, yMin: -72, xMax: 72, yMax: 72 },
    simulatorHalfFieldSpan: null,
  },
};

export function getProfileForLeague(league) {
  return PROFILES[league === 'ftc' ? 'ftc' : 'frc'];
}

export function getProfileForField(field) {
  return getProfileForLeague(field?.league ?? 'frc');
}
