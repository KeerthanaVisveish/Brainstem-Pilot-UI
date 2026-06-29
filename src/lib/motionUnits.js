/** Linear motion unit labels and defaults per league (matches field coordinate units). */

export function getMotionUnitsForLeague(league) {
  if (league === 'ftc') {
    return {
      lengthUnit: 'in',
      speedUnit: 'in/s',
      accelUnit: 'in/s²',
      defaultConstraints: { maxVel: 60, maxAccel: 40 },
      constraintMin: 1,
      constraintMax: 150,
      constraintStep: 1,
      optionalParams: [
        { key: 'distTol', label: 'Distance Tolerance', unit: 'in', default: 2, step: 0.5, min: 0 },
        { key: 'headingTol', label: 'Heading Tolerance', unit: '°', default: 3.0, step: 0.1, min: 0 },
        { key: 'minLinearSpeed', label: 'Min Linear Speed', unit: 'in/s', default: 0, step: 1, min: 0, max: 150 },
        { key: 'maxLinearSpeed', label: 'Max Linear Speed', unit: 'in/s', default: 60, step: 1, min: 0, max: 150 },
        { key: 'maxTurnPower', label: 'Max Turn Power', unit: '%', default: 1, step: 0.01, min: 0, max: 1 },
        { key: 'maxTime', label: 'Max Time', unit: 's', default: 10, step: 0.1, min: 0 },
        { key: 'passPosition', label: 'Pass Position', unit: '', default: false, type: 'bool' },
      ],
    };
  }

  return {
    lengthUnit: 'm',
    speedUnit: 'm/s',
    accelUnit: 'm/s²',
    defaultConstraints: { maxVel: 3.0, maxAccel: 2.5 },
    constraintMin: 0.1,
    constraintMax: 20,
    constraintStep: 0.1,
    optionalParams: [
      { key: 'distTol', label: 'Distance Tolerance', unit: 'm', default: 0.1, step: 0.001, min: 0 },
      { key: 'headingTol', label: 'Heading Tolerance', unit: '°', default: 3.0, step: 0.1, min: 0 },
      { key: 'minLinearSpeed', label: 'Min Linear Speed', unit: 'm/s', default: 0, step: 0.1, min: 0, max: 20 },
      { key: 'maxLinearSpeed', label: 'Max Linear Speed', unit: 'm/s', default: 1, step: 0.1, min: 0, max: 20 },
      { key: 'maxTurnPower', label: 'Max Turn Power', unit: '%', default: 1, step: 0.01, min: 0, max: 1 },
      { key: 'maxTime', label: 'Max Time', unit: 's', default: 10, step: 0.1, min: 0 },
      { key: 'passPosition', label: 'Pass Position', unit: '', default: false, type: 'bool' },
    ],
  };
}
