import { base44 } from '@/api/base44Client';
import { 
  getProjectDir, 
  loadPathsFromProject, 
  loadSkeletonsFromProject, 
  loadVariantsFromProject,
  loadSettingsFromProject,
  loadSubsystemConfigFromProject,
  savePathToProject,
  saveSkeletonToProject,
  saveVariantToProject,
  saveSettingsToProject,
  saveSubsystemConfigToProject,
  deletePathFromProject,
  deleteSkeletonFromProject,
  deleteVariantFromProject,
  safeNameFromString,
} from './projectFolder';

const ENTITY_FILES = {
  RobotSettings: 'robot-settings.json',
  SubsystemConfig: 'subsystem-config.json',
};

const fileModTimes = {};

function getFolder() {
  return getProjectDir();
}

async function readFromFolder(entityType) {
  const folder = getFolder();
  if (!folder) return null;
  const filename = ENTITY_FILES[entityType];
  if (!filename) return null;
  try {
    const fh = await folder.getFileHandle(filename, { create: false });
    const file = await fh.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function writeToFolder(entityType, data) {
  const folder = getFolder();
  if (!folder) return false;
  const filename = ENTITY_FILES[entityType];
  if (!filename) return false;
  try {
    const fh = await folder.getFileHandle(filename, { create: true });
    const writable = await fh.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    fileModTimes[entityType] = Date.now();
    return true;
  } catch (err) {
    console.error(`Failed to write ${filename}:`, err);
    return false;
  }
}

async function checkExternalChange(entityType) {
  const folder = getFolder();
  if (!folder) return false;
  const filename = ENTITY_FILES[entityType];
  if (!filename) return false;
  try {
    const fh = await folder.getFileHandle(filename, { create: false });
    const lastModTime = fileModTimes[entityType] || 0;
    const stat = await fh.getFile();
    return stat.lastModified > lastModTime + 1000;
  } catch {
    return false;
  }
}

function stripBuiltInFields(obj) {
  if (Array.isArray(obj)) return obj.map(stripBuiltInFields);
  if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'created_date' || key === 'updated_date' || key === 'created_by') continue;
      cleaned[key] = stripBuiltInFields(value);
    }
    return cleaned;
  }
  return obj;
}

function stripIds(records) {
  return records.map(r => stripBuiltInFields(r));
}

function ensureIds(records) {
  return records.map((r, idx) => {
    // Use existing id, or derive a stable one from the name, or generate one
    const id = r.id || (r.name ? safeNameFromString(r.name) : `gen-${Date.now()}-${idx}`);
    return {
      id,
      created_date: r.created_date || new Date().toISOString(),
      updated_date: r.updated_date || new Date().toISOString(),
      ...r,
    };
  });
}

// ─── SavedAuto helpers ──────────────────────────────────────────────────────

// Re-export for UI modules
export { safeNameFromString };

async function readSavedAutos() {
  const paths = await loadPathsFromProject();
  if (!paths) return [];
  return ensureIds(paths);
}

async function readSkeletonAutos() {
  const data = await loadSkeletonsFromProject();
  if (!data) return [];
  return ensureIds(data);
}

async function readChildAutos() {
  const data = await loadVariantsFromProject();
  if (!data) return [];
  return ensureIds(data);
}

async function writeSavedAuto(id, updates) {
  const all = await readSavedAutos();
  const record = all.find(r => r.id === id);
  if (!record) return;
  const oldId = record.id;
  const newName = updates.name ?? record.name;
  const newId = updates.name ? safeNameFromString(newName) : oldId;
  const updated = { ...record, ...updates, id: newId, updated_date: new Date().toISOString() };
  const previousName = updates.name && updates.name !== record.name ? record.name : null;
  await savePathToProject(updated, previousName);
}

// ───────────────────────────────────────────────────────────────────────────

export async function readEntity(entityType) {
  if (getProjectDir()) {
    if (entityType === 'SavedAuto') return await readSavedAutos();
    if (entityType === 'SkeletonAuto') {
      const data = await loadSkeletonsFromProject();
      return data ? ensureIds(data) : [];
    }
    if (entityType === 'ChildAuto') {
      const data = await loadVariantsFromProject();
      return data ? ensureIds(data) : [];
    }
    if (entityType === 'RobotSettings') {
      const s = await loadSettingsFromProject();
      return s ? ensureIds([s]) : [];
    }
    if (entityType === 'SubsystemConfig') {
      const c = await loadSubsystemConfigFromProject();
      return c ? ensureIds([c]) : [];
    }
  }

  if (!getProjectDir()) return [];
  return await base44.entities[entityType].list();
}

export async function createEntity(entityType, data) {
  const folder = getFolder();

  if (folder) {
    if (entityType === 'SavedAuto') {
      const id = safeNameFromString(data.name) || `gen-${Date.now()}`;
      const record = {
        id,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ...data,
      };
      await savePathToProject(record, null);
      return record;
    }
    if (entityType === 'SkeletonAuto') {
      const id = safeNameFromString(data.name) || `gen-${Date.now()}`;
      const record = {
        id,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ...data,
      };
      await saveSkeletonToProject(record, null);
      return record;
    }
    if (entityType === 'ChildAuto') {
      const id = safeNameFromString(data.name) || `gen-${Date.now()}`;
      const record = {
        id,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        ...data,
      };
      await saveVariantToProject(record, null);
      return record;
    }
    const records = (await readFromFolder(entityType)) || [];
    const record = { ...data };
    records.push(record);
    await writeToFolder(entityType, stripIds(records));
    return {
      id: `gen-${Date.now()}`,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      ...data,
    };
  } else {
    return await base44.entities[entityType].create(data);
  }
}

export async function updateEntity(entityType, id, updates) {
  const folder = getFolder();

  // SavedAuto is always folder-only (IDs are safe-name slugs, not DB IDs)
  if (entityType === 'SavedAuto') {
    if (folder) await writeSavedAuto(id, updates);
    return;
  }

  if (entityType === 'SkeletonAuto' && folder) {
    const all = await readSkeletonAutos();
    const record = all.find(r => r.id === id);
    if (!record) return;
    const oldId = record.id;
    const newName = updates.name ?? record.name;
    const newId = updates.name ? safeNameFromString(newName) : oldId;
    const updated = { ...record, ...updates, id: newId, updated_date: new Date().toISOString() };
    const previousName = updates.name && updates.name !== record.name ? record.name : null;
    await saveSkeletonToProject(updated, previousName);

    if (newId !== oldId) {
      const variants = await readChildAutos();
      for (const v of variants.filter(v => v.skeletonId === oldId)) {
        await saveVariantToProject({ ...v, skeletonId: newId }, null);
      }
    }
    return;
  }

  if (entityType === 'ChildAuto' && folder) {
    const all = await readChildAutos();
    const record = all.find(r => r.id === id);
    if (!record) return;
    const oldId = record.id;
    const newName = updates.name ?? record.name;
    const newId = updates.name ? safeNameFromString(newName) : oldId;
    const updated = { ...record, ...updates, id: newId, updated_date: new Date().toISOString() };
    const previousName = updates.name && updates.name !== record.name ? record.name : null;
    await saveVariantToProject(updated, previousName);
    return;
  }

  if (folder) {
    if (await checkExternalChange(entityType)) {
      const proceed = window.confirm(`${entityType} was modified externally. Overwrite with your changes?`);
      if (!proceed) return;
    }

    let records = (await readFromFolder(entityType)) || [];
    const withIds = ensureIds(records);
    const idx = withIds.findIndex(r => r.id === id);
    if (idx >= 0) {
      withIds[idx] = { ...withIds[idx], ...updates, updated_date: new Date().toISOString() };
      await writeToFolder(entityType, stripIds(withIds));
    }
  } else {
    await base44.entities[entityType].update(id, {
      ...updates,
      updated_date: new Date().toISOString(),
    });
  }
}

export async function deleteEntity(entityType, id) {
  const folder = getFolder();

  if (folder) {
    if (entityType === 'SavedAuto') {
      const all = await readSavedAutos();
      const record = all.find(r => r.id === id);
      await deletePathFromProject(record?.name ?? id);
      return;
    }
    if (entityType === 'SkeletonAuto') {
      const all = await readSkeletonAutos();
      const record = all.find(r => r.id === id);
      await deleteSkeletonFromProject(record?.name ?? id);
      return;
    }
    if (entityType === 'ChildAuto') {
      const all = await readChildAutos();
      const record = all.find(r => r.id === id);
      await deleteVariantFromProject(record?.name ?? id);
      return;
    }

    let records = (await readFromFolder(entityType)) || [];
    const withIds = ensureIds(records);
    const filtered = withIds.filter(r => r.id !== id);
    await writeToFolder(entityType, stripIds(filtered));
  } else {
    await base44.entities[entityType].delete(id);
  }
}

export async function writeEntity(entityType, data) {
  const folder = getFolder();

  if (folder) {
    if (await checkExternalChange(entityType)) {
      const proceed = window.confirm(`${entityType} was modified externally. Overwrite with your changes?`);
      if (!proceed) return;
    }
    if (entityType === 'RobotSettings') await saveSettingsToProject(data);
    else if (entityType === 'SubsystemConfig') await saveSubsystemConfigToProject(data);
    else await writeToFolder(entityType, data);
  } else {
    const all = await base44.entities[entityType].list();
    if (all.length > 0) {
      await base44.entities[entityType].update(all[0].id, data);
    } else {
      await base44.entities[entityType].create(data);
    }
  }
}