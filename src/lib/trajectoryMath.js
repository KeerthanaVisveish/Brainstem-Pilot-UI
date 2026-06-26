// Physical dimensions of a standard FRC field in meters
export const FIELD_WIDTH_M = 16.541;
export const FIELD_HEIGHT_M = 8.211;

/**
 * Transforms an array of waypoints into a continuous, time-sampled trajectory map.
 * @param {Array} waypoints List of waypoint objects from the UI canvas.
 * @param {Object} constraints Performance limitations { maxVel, maxAccel }.
 * @param {Array} rotationTargets Keyframe milestones for changing heading orientations.
 * @param {boolean} isRedAlliance If true, mirrors the entire calculation to the red side.
 * @return {Object} Evaluated trajectory stats and sample state arrays.
 */
export function generateTrajectory(waypoints, constraints, rotationTargets = [], isRedAlliance = false) {
  if (!waypoints || waypoints.length < 2) return null;

  // 1. Create a deep working copy of the raw Blue configurations first
  let processedWaypoints = waypoints.map(wp => ({
    x: wp.x,
    y: wp.y,
    rotation: wp.rotation ?? 0,
    prevControl: wp.prevControl ? { ...wp.prevControl } : null,
    nextControl: wp.nextControl ? { ...wp.nextControl } : null,
    params: wp.params ?? {}
  }));

  let processedRotations = rotationTargets.map(rot => ({ ...rot }));

  // 2. Generate initial Bezier curve segments to measure true physical path length
  const segments = [];
  for (let i = 0; i < processedWaypoints.length - 1; i++) {
    const start = processedWaypoints[i];
    const end = processedWaypoints[i + 1];

    const c1 = start.nextControl ? { ...start.nextControl } : { 
      x: start.x + (end.x - start.x) / 3, 
      y: start.y + (end.y - start.y) / 3 
    };
    const c2 = end.prevControl ? { ...end.prevControl } : { 
      x: start.x + 2 * (end.x - start.x) / 3, 
      y: start.y + 2 * (end.y - start.y) / 3 
    };

    segments.push({ p0: start, p1: c1, p2: c2, p3: end });
  }

  // Measure path length safely
  const samplesPerSegment = 50;
  let totalLength = 0;
  let lastPt = null;

  for (const seg of segments) {
    for (let j = 0; j <= samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      const pt = getBezierPoint(seg.p0, seg.p1, seg.p2, seg.p3, t);
      if (lastPt) {
        totalLength += Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
      }
      lastPt = pt;
    }
  }

  // 3. INJECTION: Force append the final waypoint's rotation target at the end of the timeline
  const finalWaypointBlue = processedWaypoints[processedWaypoints.length - 1];
  const hasTerminalTarget = processedRotations.some(r => r.progress === 1.0 || (r.arcLengthM != null && totalLength > 0 && Math.abs(r.arcLengthM - totalLength) < 0.05));
  
  if (!hasTerminalTarget) {
    processedRotations.push({
      progress: 1.0,
      rotation: finalWaypointBlue.rotation,
      arcLengthM: totalLength
    });
  }

  // Normalize absolute progress metrics across target sets
  processedRotations = processedRotations.map(rot => {
    if (rot.arcLengthM != null && totalLength > 0) {
      return { ...rot, progress: Math.min(1, Math.max(0, rot.arcLengthM / totalLength)) };
    }
    return { ...rot, progress: rot.progress ?? 0 };
  });

  // 4. ALLIANCE REFLECTION: Mirror everything down-line simultaneously if playing Red Alliance
  if (isRedAlliance) {
    processedWaypoints = processedWaypoints.map(wp => mirrorWaypointForRed(wp));
    processedRotations = processedRotations.map(rot => ({
      ...rot,
      rotation: normAngle(180 - (rot.rotation ?? 0))
    }));

    // Re-generate segments with mirrored coordinates for exact mapping profiles
    segments.length = 0;
    for (let i = 0; i < processedWaypoints.length - 1; i++) {
      const start = processedWaypoints[i];
      const end = processedWaypoints[i + 1];
      const c1 = start.nextControl ? { ...start.nextControl } : { 
        x: start.x + (end.x - start.x) / 3, 
        y: start.y + (end.y - start.y) / 3 
      };
      const c2 = end.prevControl ? { ...end.prevControl } : { 
        x: start.x + 2 * (end.x - start.x) / 3, 
        y: start.y + 2 * (end.y - start.y) / 3 
      };
      segments.push({ p0: start, p1: c1, p2: c2, p3: end });
    }
  }

  // Discretize points along the final processed segments configuration
  const pathPoints = [];
  let currentLength = 0;
  
  for (const seg of segments) {
    for (let j = 0; j < samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      const pt = getBezierPoint(seg.p0, seg.p1, seg.p2, seg.p3, t);
      
      if (pathPoints.length > 0) {
        currentLength += Math.hypot(pt.x - pathPoints[pathPoints.length - 1].x, pt.y - pathPoints[pathPoints.length - 1].y);
      }
      
      pathPoints.push({
        x: pt.x,
        y: pt.y,
        arcLength: currentLength,
        heading: getBezierTangentHeading(seg.p0, seg.p1, seg.p2, seg.p3, t)
      });
    }
  }
  
  const finalSeg = segments[segments.length - 1];
  const finalPt = getBezierPoint(finalSeg.p0, finalSeg.p1, finalSeg.p2, finalSeg.p3, 1.0);
  if (pathPoints.length > 0) {
    currentLength += Math.hypot(finalPt.x - pathPoints[pathPoints.length - 1].x, finalPt.y - pathPoints[pathPoints.length - 1].y);
  }
  pathPoints.push({
    x: finalPt.x,
    y: finalPt.y,
    arcLength: currentLength,
    heading: getBezierTangentHeading(finalSeg.p0, finalSeg.p1, finalSeg.p2, finalSeg.p3, 1.0)
  });

  // 5. Generate Trapezoidal Velocity Profile state updates
  const maxVel = constraints.maxVel ?? 3.0;
  const maxAccel = constraints.maxAccel ?? 2.5;

  const accelTime = maxVel / maxAccel;
  const accelDist = 0.5 * maxAccel * accelTime * accelTime;

  let totalTime = 0;
  if (totalLength >= accelDist * 2) {
    const cruiseDist = totalLength - (accelDist * 2);
    const cruiseTime = cruiseDist / maxVel;
    totalTime = (accelTime * 2) + cruiseTime;
  } else {
    const peakVel = Math.sqrt(maxAccel * totalLength);
    const splitTime = peakVel / maxAccel;
    totalTime = splitTime * 2;
  }

  // 6. Sample profile timelines at 20ms frame markers
  const states = [];
  const samplePeriodS = 0.02; 
  const totalSamples = Math.ceil(totalTime / samplePeriodS);

  for (let step = 0; step <= totalSamples; step++) {
    const currentTime = Math.min(step * samplePeriodS, totalTime);
    let distanceCovered = 0;
    let currentVel = 0;

    if (totalLength >= accelDist * 2) {
      const cruiseDist = totalLength - (accelDist * 2);
      const cruiseTime = cruiseDist / maxVel;

      if (currentTime < accelTime) {
        currentVel = maxAccel * currentTime;
        distanceCovered = 0.5 * maxAccel * currentTime * currentTime;
      } else if (currentTime < accelTime + cruiseTime) {
        currentVel = maxVel;
        distanceCovered = accelDist + maxVel * (currentTime - accelTime);
      } else {
        const decelTimeElapsed = currentTime - accelTime - cruiseTime;
        currentVel = maxVel - (maxAccel * decelTimeElapsed);
        distanceCovered = accelDist + cruiseDist + (maxVel * decelTimeElapsed) - (0.5 * maxAccel * decelTimeElapsed * decelTimeElapsed);
      }
    } else {
      const peakVel = Math.sqrt(maxAccel * totalLength);
      const splitTime = peakVel / maxAccel;

      if (currentTime < splitTime) {
        currentVel = maxAccel * currentTime;
        distanceCovered = 0.5 * maxAccel * currentTime * currentTime;
      } else {
        const decelTimeElapsed = currentTime - splitTime;
        currentVel = peakVel - (maxAccel * decelTimeElapsed);
        distanceCovered = (0.5 * maxAccel * splitTime * splitTime) + (peakVel * decelTimeElapsed) - (0.5 * maxAccel * decelTimeElapsed * decelTimeElapsed);
      }
    }

    const spatialPose = interpolatePoseAtDistance(pathPoints, distanceCovered);
    const globalProgress = distanceCovered / (totalLength || 1);
    const currentHeading = sampleLookAheadHeading(processedWaypoints[0].rotation, processedRotations, globalProgress);

    states.push({
      time: currentTime,
      x: spatialPose.x,
      y: spatialPose.y,
      velocity: currentVel,
      heading: currentHeading, 
      pathHeading: spatialPose.pathHeading 
    });
  }

  return {
    totalLength,
    totalTime,
    states
  };
}

export function mirrorWaypointForRed(wp) {
  if (!wp) return null;
  const mirroredX = FIELD_WIDTH_M - wp.x;
  const mirroredY = wp.y; 
  const mirroredRotation = normAngle(180 - (wp.rotation ?? 0));

  const mirroredPrev = wp.prevControl ? {
    x: FIELD_WIDTH_M - wp.prevControl.x,
    y: wp.prevControl.y
  } : null;

  const mirroredNext = wp.nextControl ? {
    x: FIELD_WIDTH_M - wp.nextControl.x,
    y: wp.nextControl.y
  } : null;

  return {
    ...wp,
    x: mirroredX,
    y: mirroredY,
    rotation: mirroredRotation,
    prevControl: mirroredPrev,
    nextControl: mirroredNext
  };
}

function getBezierPoint(p0, p1, p2, p3, t) {
  const cx = 3 * (p1.x - p0.x);
  const bx = 3 * (p2.x - p1.x) - cx;
  const ax = p3.x - p0.x - cx - bx;
  const cy = 3 * (p1.y - p0.y);
  const by = 3 * (p2.y - p1.y) - cy;
  const ay = p3.y - p0.y - cy - by;

  const x = ax * Math.pow(t, 3) + bx * Math.pow(t, 2) + cx * t + p0.x;
  const y = ay * Math.pow(t, 3) + by * Math.pow(t, 2) + cy * t + p0.y;
  return { x, y };
}

// Fixed line tangent math direction reflection for red side operations
function getBezierTangentHeading(p0, p1, p2, p3, t) {
  const dxt = 3 * Math.pow(1 - t, 2) * (p1.x - p0.x) + 6 * (1 - t) * t * (p2.x - p1.x) + 3 * Math.pow(t, 2) * (p3.x - p2.x);
  const dyt = 3 * Math.pow(1 - t, 2) * (p1.y - p0.y) + 6 * (1 - t) * t * (p2.y - p1.y) + 3 * Math.pow(t, 2) * (p3.y - p2.y);
  return normAngle(Math.atan2(dyt, dxt) * (180 / Math.PI));
}

function interpolatePoseAtDistance(points, distance) {
  if (points.length === 0) return { x: 0, y: 0, pathHeading: 0 };
  if (distance <= 0) return { x: points[0].x, y: points[0].y, pathHeading: points[0].heading };
  if (distance >= points[points.length - 1].arcLength) {
    const last = points[points.length - 1];
    return { x: last.x, y: last.y, pathHeading: last.heading };
  }

  let low = 0;
  let high = points.length - 1;
  while (low < high - 1) {
    const mid = (low + high) >> 1;
    if (points[mid].arcLength < distance) low = mid;
    else high = mid;
  }

  const pStart = points[low];
  const pEnd = points[high];
  const segmentDiff = pEnd.arcLength - pStart.arcLength;
  const ratio = segmentDiff > 1e-4 ? (distance - pStart.arcLength) / segmentDiff : 0;

  return {
    x: lerp(pStart.x, pEnd.x, ratio),
    y: lerp(pStart.y, pEnd.y, ratio),
    pathHeading: lerpAngle(pStart.heading, pEnd.heading, ratio)
  };
}

function sampleLookAheadHeading(startHeading, rotationTargets, globalProgress) {
  if (!rotationTargets || rotationTargets.length === 0) return startHeading;
  const sorted = [...rotationTargets].sort((a, b) => a.progress - b.progress);

  if (globalProgress <= sorted[0].progress) {
    const t = sorted[0].progress > 0 ? globalProgress / sorted[0].progress : 1;
    return lerpAngle(startHeading, sorted[0].rotation, t);
  }
  if (globalProgress >= sorted[sorted.length - 1].progress) {
    return sorted[sorted.length - 1].rotation;
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    if (globalProgress >= sorted[i].progress && globalProgress <= sorted[i + 1].progress) {
      const span = sorted[i + 1].progress - sorted[i].progress;
      const t = span > 0 ? (globalProgress - sorted[i].progress) / span : 1;
      return lerpAngle(sorted[i].rotation, sorted[i + 1].rotation, t);
    }
  }
  return sorted[sorted.length - 1].rotation;
}

function trueMod(n, m) {
  return ((n % m) + m) % m;
}

function normAngle(deg) {
  let angle = trueMod(deg + 180, 360) - 180;
  return angle === -180 ? 180 : angle;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  let diff = trueMod(b - a + 180, 360) - 180;
  return a + diff * t;
}

export function getPoseAtProgress(trajectory, progress) {
  if (!trajectory || !trajectory.states || trajectory.states.length === 0) return null;
  const pts = trajectory.states;
  const targetTime = progress * trajectory.totalTime;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].time <= targetTime) lo = mid; else hi = mid;
  }
  const a = pts[lo], b = pts[hi];
  const span = b.time - a.time;
  if (span < 0.0001) return a;
  const t = (targetTime - a.time) / span;
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    heading: lerpAngle(a.heading ?? 0, b.heading ?? 0, t),
    rotation: lerpAngle(a.heading ?? 0, b.heading ?? 0, t),
    velocity: lerp(a.velocity ?? 0, b.velocity ?? 0, t),
    acceleration: lerp(a.velocity ?? 0, b.velocity ?? 0, t),
  };
}