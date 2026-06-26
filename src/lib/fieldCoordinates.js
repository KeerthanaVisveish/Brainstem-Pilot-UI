import { FIELD_WIDTH_M, FIELD_HEIGHT_M } from './trajectoryMath';

// Calibrated from Path 3 corner waypoints placed visually on the field image.
// These are the raw coordinate values (in the old coord system) where the
// actual playable field corners are located in the image.
const RAW_FIELD_X0 = 0.8476;   // left edge of playable field
const RAW_FIELD_Y0 = 0.4878;   // bottom edge of playable field
const RAW_FIELD_X1 = 16.4131;  // right edge of playable field
const RAW_FIELD_Y1 = 7.6231;   // top edge of playable field

const RAW_W = RAW_FIELD_X1 - RAW_FIELD_X0; // 15.6608
const RAW_H = RAW_FIELD_Y1 - RAW_FIELD_Y0; // 7.1353

// Total image span (borders are assumed symmetric on each side)
const IMG_RAW_W = RAW_FIELD_X0 + RAW_W + RAW_FIELD_X0;
const IMG_RAW_H = RAW_FIELD_Y0 + RAW_H + RAW_FIELD_Y0;

// Padding fractions: fraction of image outside playable field on each side.
// Used by FieldCanvas and AutoSimulator to overdraw the image so borders show.
export const FIELD_IMAGE_PADDING_X = RAW_FIELD_X0 / IMG_RAW_W; // ≈ 0.0213
export const FIELD_IMAGE_PADDING_Y = RAW_FIELD_Y0 / IMG_RAW_H; // ≈ 0.0601

// Convert FRC meters (0,0 = bottom-left of playable field) to canvas pixels.
// The playable field exactly fills the canvas letterbox area.
export function metersToPixels(x, y, canvasWidth, canvasHeight, pan, zoom) {
  const scale = Math.min(canvasWidth / FIELD_WIDTH_M, canvasHeight / FIELD_HEIGHT_M) * zoom;
  const offsetX = pan.x + (canvasWidth - FIELD_WIDTH_M * scale) / 2;
  const offsetY = pan.y + (canvasHeight - FIELD_HEIGHT_M * scale) / 2;
  return {
    px: offsetX + x * scale,
    py: offsetY + (FIELD_HEIGHT_M - y) * scale, // flip Y: y=0 → bottom
  };
}

// Convert canvas pixels to FRC meters
export function pixelsToMeters(px, py, canvasWidth, canvasHeight, pan, zoom) {
  const scale = Math.min(canvasWidth / FIELD_WIDTH_M, canvasHeight / FIELD_HEIGHT_M) * zoom;
  const offsetX = pan.x + (canvasWidth - FIELD_WIDTH_M * scale) / 2;
  const offsetY = pan.y + (canvasHeight - FIELD_HEIGHT_M * scale) / 2;
  const x = (px - offsetX) / scale;
  const y = FIELD_HEIGHT_M - (py - offsetY) / scale;
  return { x, y };
}

// Clamp to playable field bounds (FRC meters)
export function clampToField(x, y) {
  return {
    x: Math.max(0, Math.min(FIELD_WIDTH_M, x)),
    y: Math.max(0, Math.min(FIELD_HEIGHT_M, y)),
  };
}

// Clamp pan so the field image is never entirely off-screen.
// At least a `margin` fraction of the field must remain visible.
export function clampPan(pan, zoom, canvasWidth, canvasHeight, margin = 0.15) {
  const scale = Math.min(canvasWidth / FIELD_WIDTH_M, canvasHeight / FIELD_HEIGHT_M) * zoom;
  const fieldPxW = FIELD_WIDTH_M * scale;
  const fieldPxH = FIELD_HEIGHT_M * scale;
  // The field rect top-left in canvas coords (without pan) is centered
  const basePx = (canvasWidth - fieldPxW) / 2;
  const basePy = (canvasHeight - fieldPxH) / 2;
  // With pan, field left = basePx + pan.x, field right = basePx + pan.x + fieldPxW
  // We want field right  > margin * canvasWidth  → pan.x > margin*cw - basePx - fieldPxW
  // We want field left   < (1-margin) * canvasWidth → pan.x < (1-margin)*cw - basePx
  const minPanX = margin * canvasWidth - basePx - fieldPxW;
  const maxPanX = (1 - margin) * canvasWidth - basePx;
  const minPanY = margin * canvasHeight - basePy - fieldPxH;
  const maxPanY = (1 - margin) * canvasHeight - basePy;
  return {
    x: Math.max(minPanX, Math.min(maxPanX, pan.x)),
    y: Math.max(minPanY, Math.min(maxPanY, pan.y)),
  };
}

export function snapToGrid(x, y, gridSize = 0.5) {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}