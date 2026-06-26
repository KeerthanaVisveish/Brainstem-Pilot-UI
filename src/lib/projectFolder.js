// Project folder management using File System Access API
// Stores a directory handle in memory (persists for the browser session)

let _dirHandle = null;

export function getProjectDir() { return _dirHandle; }
export function setProjectDir(handle) { _dirHandle = handle; }
export function hasProjectDir() { return _dirHandle !== null; }

async function getOrCreateSubdir(name) {
  return _dirHandle.getDirectoryHandle(name, { create: true });
}

async function deleteFileIfExists(dir, filename) {
  try { await dir.removeEntry(filename); } catch (_) { /* ignore */ }
}

export async function savePathToProject(pathObj, previousName) {
  if (!_dirHandle) return;
  // Guard: name must exist and be non-empty, otherwise skip to avoid creating path.path.json
  if (!pathObj.name || pathObj.name.trim() === '') return;
  const dir = await getOrCreateSubdir('paths');
  const safeName = pathObj.name.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (previousName && previousName !== pathObj.name) {
    const oldSafe = previousName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    await deleteFileIfExists(dir, `${oldSafe}.path.json`);
  }

  // Build a clean export object with waypointParams summarized at the bottom for readability
  const fmt4 = v => parseFloat((v ?? 0).toFixed(4));
  const wps = pathObj.waypoints ?? [];
  const exportObj = {
    ...pathObj,
    waypoints: wps.map((w, i) => ({
      x: fmt4(w.x),
      y: fmt4(w.y),
      prevControl: (i === 0) ? null : (w.prevControl ? { x: fmt4(w.prevControl.x), y: fmt4(w.prevControl.y) } : null),
      nextControl: (i === wps.length - 1) ? null : (w.nextControl ? { x: fmt4(w.nextControl.x), y: fmt4(w.nextControl.y) } : null),
      rotation: fmt4(w.rotation ?? 0),
    })),
    // Waypoint optional parameters indexed by waypoint index for easy reference
    waypointParams: Object.fromEntries(
      wps.map((w, i) => [i, w.params ?? {}]).filter(([, p]) => Object.keys(p).length > 0)
    ),
  };

  const fh = await dir.getFileHandle(`${safeName}.path.json`, { create: true });
  const writable = await fh.createWritable();
  await writable.write(JSON.stringify(exportObj, null, 2));
  await writable.close();
}

export async function deletePathFromProject(name) {
  if (!_dirHandle) return;
  try {
    const dir = await getOrCreateSubdir('paths');
    const safeName = (name ?? '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (!safeName) return;
    await deleteFileIfExists(dir, `${safeName}.path.json`);
  } catch (_) { /* ignore */ }
}

export async function saveSkeletonToProject(skeletonObj, previousName) {
  if (!_dirHandle) return;
  if (!skeletonObj.name || skeletonObj.name.trim() === '') return;
  const dir = await getOrCreateSubdir('skeletons');
  const safeName = skeletonObj.name.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (previousName && previousName !== skeletonObj.name) {
    const oldSafe = previousName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    await deleteFileIfExists(dir, `${oldSafe}.skeleton.json`);
  }
  const fh = await dir.getFileHandle(`${safeName}.skeleton.json`, { create: true });
  const writable = await fh.createWritable();
  await writable.write(JSON.stringify(skeletonObj, null, 2));
  await writable.close();
}

export async function saveVariantToProject(variantObj, previousName) {
  if (!_dirHandle) return;
  if (!variantObj.name || variantObj.name.trim() === '') return;
  const dir = await getOrCreateSubdir('variants');
  const safeName = variantObj.name.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  if (previousName && previousName !== variantObj.name) {
    const oldSafe = previousName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    await deleteFileIfExists(dir, `${oldSafe}.variant.json`);
  }
  const fh = await dir.getFileHandle(`${safeName}.variant.json`, { create: true });
  const writable = await fh.createWritable();
  await writable.write(JSON.stringify(variantObj, null, 2));
  await writable.close();
}

export async function saveSettingsToProject(settingsObj) {
  if (!_dirHandle) return;
  const fh = await _dirHandle.getFileHandle('robot_settings.json', { create: true });
  const writable = await fh.createWritable();
  await writable.write(JSON.stringify(settingsObj, null, 2));
  await writable.close();
}

export async function saveSubsystemConfigToProject(configObj) {
  if (!_dirHandle) return;
  const fh = await _dirHandle.getFileHandle('subsystem_config.json', { create: true });
  const writable = await fh.createWritable();
  await writable.write(JSON.stringify(configObj, null, 2));
  await writable.close();
}

// FIX: getFileHandle returns a FileSystemFileHandle — must call .getFile() then .text()
export async function loadPathsFromProject() {
  if (!_dirHandle) return null;
  try {
    const dir = await _dirHandle.getDirectoryHandle('paths', { create: false });
    const paths = [];
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.path.json')) {
        const fh = await dir.getFileHandle(entry.name);
        const file = await fh.getFile();
        const text = await file.text();
        paths.push(JSON.parse(text));
      }
    }
    return paths.length > 0 ? paths : null;
  } catch {
    return null;
  }
}

export async function loadSkeletonsFromProject() {
  if (!_dirHandle) return null;
  try {
    const dir = await _dirHandle.getDirectoryHandle('skeletons', { create: false });
    const skeletons = [];
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.skeleton.json')) {
        const fh = await dir.getFileHandle(entry.name);
        const file = await fh.getFile();
        const text = await file.text();
        skeletons.push(JSON.parse(text));
      }
    }
    return skeletons.length > 0 ? skeletons : null;
  } catch {
    return null;
  }
}

export async function loadVariantsFromProject() {
  if (!_dirHandle) return null;
  try {
    const dir = await _dirHandle.getDirectoryHandle('variants', { create: false });
    const variants = [];
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.variant.json')) {
        const fh = await dir.getFileHandle(entry.name);
        const file = await fh.getFile();
        const text = await file.text();
        variants.push(JSON.parse(text));
      }
    }
    return variants.length > 0 ? variants : null;
  } catch {
    return null;
  }
}

export async function loadSettingsFromProject() {
  if (!_dirHandle) return null;
  try {
    const fh = await _dirHandle.getFileHandle('robot_settings.json', { create: false });
    const file = await fh.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function loadSubsystemConfigFromProject() {
  if (!_dirHandle) return null;
  try {
    const fh = await _dirHandle.getFileHandle('subsystem_config.json', { create: false });
    const file = await fh.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function initializeProjectFolder() {
  if (!_dirHandle) return;
  const settingsExists = await loadSettingsFromProject();
  if (!settingsExists) {
    await saveSettingsToProject({
      width: 0.76,
      length: 0.76,
      maxVel: 3.0,
      maxAccel: 2.5,
      subsystems: []
    });
  }
  const configExists = await loadSubsystemConfigFromProject();
  if (!configExists) {
    await saveSubsystemConfigToProject({ subsystems: [] });
  }
}