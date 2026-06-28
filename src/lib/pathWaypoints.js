/** Rename legacy param keys when loading or exporting saved paths. */
export function migrateWaypointParams(params) {
  if (!params || typeof params !== 'object') return {};
  const next = { ...params };
  if (Object.prototype.hasOwnProperty.call(next, 'maxLinearPow') && !Object.prototype.hasOwnProperty.call(next, 'maxLinearSpeed')) {
    next.maxLinearSpeed = next.maxLinearPow;
  }
  delete next.maxLinearPow;
  if (Object.prototype.hasOwnProperty.call(next, 'minLinearPow') && !Object.prototype.hasOwnProperty.call(next, 'minLinearSpeed')) {
    next.minLinearSpeed = next.minLinearPow;
  }
  delete next.minLinearPow;
  if (Object.prototype.hasOwnProperty.call(next, 'maxTurnSpeed') && !Object.prototype.hasOwnProperty.call(next, 'maxTurnPower')) {
    next.maxTurnPower = next.maxTurnSpeed;
  }
  delete next.maxTurnSpeed;
  return next;
}

/** Merge legacy index-keyed waypointParams into each waypoint; params stay on the waypoint object. */
export function normalizeSavedPath(pathRecord) {
  if (!pathRecord) return pathRecord;
  const legacy = pathRecord.waypointParams ?? {};
  const waypoints = (pathRecord.waypoints ?? []).map((w, i) => {
    const fromLegacy = legacy[i] ?? legacy[String(i)] ?? {};
    const params = migrateWaypointParams({ ...fromLegacy, ...(w.params ?? {}) });
    return { ...w, params };
  });
  return { ...pathRecord, waypoints };
}

export function normalizeSavedPaths(paths) {
  if (!Array.isArray(paths)) return [];
  return paths.map(normalizeSavedPath);
}

/** Format a waypoint for JSON export — params live on the waypoint, not by index. */
export function formatWaypointForExport(w, i, total, fmt4) {
  const wp = {
    x: fmt4(w.x),
    y: fmt4(w.y),
    prevControl: i === 0 ? null : (w.prevControl ? { x: fmt4(w.prevControl.x), y: fmt4(w.prevControl.y) } : null),
    nextControl: i === total - 1 ? null : (w.nextControl ? { x: fmt4(w.nextControl.x), y: fmt4(w.nextControl.y) } : null),
    rotation: fmt4(w.rotation ?? 0),
  };
  const params = migrateWaypointParams(w.params ?? {});
  if (Object.keys(params).length > 0) wp.params = params;
  return wp;
}
