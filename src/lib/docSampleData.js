import { generateTrajectory } from './trajectoryMath';

/** Sample path with 180°-locked control points on the middle waypoint. */
export const DOC_WAYPOINTS = [
  {
    x: 2.8, y: 2.2, rotation: 0,
    prevControl: null,
    nextControl: { x: 4.2, y: 2.8 },
  },
  {
    x: 5.5, y: 3.5, rotation: 0,
    prevControl: { x: 4.5, y: 3.1 },
    nextControl: { x: 6.5, y: 3.9 },
  },
  {
    x: 8.0, y: 4.2, rotation: 0,
    prevControl: { x: 7.0, y: 4.2 },
    nextControl: { x: 9.0, y: 4.2 },
  },
  {
    x: 11.5, y: 5.8, rotation: 30,
    prevControl: { x: 10.2, y: 5.2 },
    nextControl: { x: 12.5, y: 6.2 },
  },
  {
    x: 13.8, y: 6.5, rotation: 45,
    prevControl: { x: 12.8, y: 6.2 },
    nextControl: null,
  },
];

export const DOC_CONSTRAINTS = { maxVel: 3.0, maxAccel: 2.5 };

export const DOC_ROTATION_TARGETS = [
  { id: 'rot-1', progress: 0.45, rotation: 90, arcLengthM: 4.2 },
];

export const DOC_SUBSYSTEM_TRIGGERS = [
  { id: 'trig-1', subsystemName: 'Intake', commandName: 'Deploy', progress: 0.65, arcLengthM: 6.1 },
];

export const DOC_TRAJECTORY = generateTrajectory(DOC_WAYPOINTS, DOC_CONSTRAINTS, DOC_ROTATION_TARGETS);

export const DOC_ROBOT_SETTINGS = {
  width: 0.76,
  length: 0.76,
  maxVel: 3.0,
  maxAccel: 2.5,
  subsystems: [
    { name: 'Intake', offsetX: 0.2, offsetY: 0, width: 0.3, length: 0.2, visibleOnStart: false },
  ],
};

export const DOC_SUBSYSTEMS = [
  {
    name: 'Intake',
    commands: [
      { name: 'Deploy', visualBinding: 'Intake', visualAction: 'show' },
      { name: 'Retract', visualBinding: 'Intake', visualAction: 'hide' },
    ],
  },
  {
    name: 'Shooter',
    commands: [
      { name: 'Spin Up', visualBinding: 'none', visualAction: 'show' },
      { name: 'Fire', visualBinding: 'none', visualAction: 'show' },
    ],
  },
];
