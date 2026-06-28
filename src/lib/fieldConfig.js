import fieldsCatalog from '../fields/fields.json';

const DEFAULT_WIDTH_M = 16.541;
const DEFAULT_HEIGHT_M = 8.211;

export function getFieldsCatalog() {
  return fieldsCatalog.fields ?? [];
}

export function resolveField(fieldId) {
  const fields = fieldsCatalog.fields ?? [];
  const found = fields.find(f => f.id === fieldId);
  if (found) return found;
  const fallbackId = fieldsCatalog.defaultFieldId;
  return fields.find(f => f.id === fallbackId) ?? fields[0] ?? null;
}

let activeField = resolveField(fieldsCatalog.defaultFieldId);

export function getActiveField() {
  return activeField;
}

export function setActiveField(fieldId) {
  activeField = resolveField(fieldId);
  return activeField;
}

export function getFieldDimensions(field = activeField) {
  return {
    widthM: field?.widthM ?? DEFAULT_WIDTH_M,
    heightM: field?.heightM ?? DEFAULT_HEIGHT_M,
  };
}

export function getFieldImageUrl(field = activeField) {
  if (!field) return '/fields/rebuilt_2026.png';
  if (field.imageUrl) return field.imageUrl;
  return `/fields/${field.imageFile}`;
}

export function computeFieldPadding(field = activeField) {
  if (!field?.imageWidth || !field?.originPixel || !field?.endPixel) {
    return { paddingX: 0.033, paddingY: 0.033 };
  }
  const { imageWidth, imageHeight, originPixel, endPixel } = field;
  const padLeft = originPixel.x / imageWidth;
  const padRight = (imageWidth - endPixel.x) / imageWidth;
  const padTop = endPixel.y / imageHeight;
  const padBottom = (imageHeight - originPixel.y) / imageHeight;
  return {
    paddingX: (padLeft + padRight) / 2,
    paddingY: (padTop + padBottom) / 2,
    paddingLeft: padLeft,
    paddingRight: padRight,
    paddingTop: padTop,
    paddingBottom: padBottom,
  };
}

export function getDefaultFieldId() {
  return fieldsCatalog.defaultFieldId;
}
