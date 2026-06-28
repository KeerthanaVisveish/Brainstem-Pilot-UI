import { getFieldDimensions, getActiveField } from './fieldConfig';

/** Uniform image layout on canvas — image is never stretched, only scaled uniformly. */
export function computeFieldLayout(canvasWidth, canvasHeight, pan, zoom, field) {
  const active = field ?? getActiveField();
  const iw = active?.imageWidth ?? 1024;
  const ih = active?.imageHeight ?? 415;
  const scale = Math.min(canvasWidth / iw, canvasHeight / ih) * zoom;
  const drawW = iw * scale;
  const drawH = ih * scale;
  const drawX = pan.x + (canvasWidth - drawW) / 2;
  const drawY = pan.y + (canvasHeight - drawH) / 2;
  return { field: active, scale, drawX, drawY, drawW, drawH, iw, ih };
}

/** Field meters (0,0 = bottom-left of playable area) → image file pixels (top-left origin, y down). */
export function metersToImagePixels(x, y, field) {
  const active = field ?? getActiveField();
  const { widthM, heightM } = getFieldDimensions(active);
  const { originPixel, endPixel, imageWidth, imageHeight } = active ?? {};
  if (originPixel && endPixel) {
    return {
      ix: originPixel.x + (x / widthM) * (endPixel.x - originPixel.x),
      iy: originPixel.y + (y / heightM) * (endPixel.y - originPixel.y),
    };
  }
  return {
    ix: (x / widthM) * (imageWidth ?? 1024),
    iy: (1 - y / heightM) * (imageHeight ?? 415),
  };
}

/** Image file pixels → canvas pixels (direct mapping, no image rotation). */
export function imagePixelsToCanvas(ix, iy, layout) {
  const { scale, drawX, drawY } = layout;
  return {
    px: drawX + ix * scale,
    py: drawY + iy * scale,
  };
}

export function canvasToImagePixels(px, py, layout) {
  const { scale, drawX, drawY } = layout;
  return {
    ix: (px - drawX) / scale,
    iy: (py - drawY) / scale,
  };
}

export function metersToPixels(x, y, canvasWidth, canvasHeight, pan, zoom, field) {
  const layout = computeFieldLayout(canvasWidth, canvasHeight, pan, zoom, field);
  const { ix, iy } = metersToImagePixels(x, y, layout.field);
  return imagePixelsToCanvas(ix, iy, layout);
}

export function pixelsToMeters(px, py, canvasWidth, canvasHeight, pan, zoom, field) {
  const layout = computeFieldLayout(canvasWidth, canvasHeight, pan, zoom, field);
  const { ix, iy } = canvasToImagePixels(px, py, layout);
  const { widthM, heightM } = getFieldDimensions(layout.field);
  const { originPixel, endPixel } = layout.field ?? {};
  if (originPixel && endPixel) {
    return {
      x: ((ix - originPixel.x) / (endPixel.x - originPixel.x)) * widthM,
      y: ((iy - originPixel.y) / (endPixel.y - originPixel.y)) * heightM,
    };
  }
  return {
    x: (ix / (layout.iw ?? 1024)) * widthM,
    y: (1 - iy / (layout.ih ?? 415)) * heightM,
  };
}

export function drawFieldImage(ctx, fieldImage, layout) {
  if (!fieldImage || !layout) return;
  const { drawX, drawY, drawW, drawH } = layout;
  ctx.drawImage(fieldImage, drawX, drawY, drawW, drawH);
}

export function clampToField(x, y, field) {
  const { widthM, heightM } = getFieldDimensions(field ?? getActiveField());
  return {
    x: Math.max(0, Math.min(widthM, x)),
    y: Math.max(0, Math.min(heightM, y)),
  };
}

export function clampPan(pan, zoom, canvasWidth, canvasHeight, margin = 0.15, field) {
  const active = field ?? getActiveField();
  const iw = active?.imageWidth ?? 1024;
  const ih = active?.imageHeight ?? 415;
  const scale = Math.min(canvasWidth / iw, canvasHeight / ih) * zoom;
  const drawW = iw * scale;
  const drawH = ih * scale;
  const baseX = (canvasWidth - drawW) / 2;
  const baseY = (canvasHeight - drawH) / 2;
  const minPanX = margin * canvasWidth - baseX - drawW;
  const maxPanX = (1 - margin) * canvasWidth - baseX;
  const minPanY = margin * canvasHeight - baseY - drawH;
  const maxPanY = (1 - margin) * canvasHeight - baseY;
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

/** Field grid line spacing in meters (matches FieldCanvas drawGrid). */
export const FIELD_GRID_SPACING_M = 1;

/** Default visible field region (meters) when opening the path editor — bottom-left anchored. */
export const DEFAULT_PATH_EDITOR_VIEW_RECT = {
  xMin: 0,
  yMin: 0,
  xMax: 9.25,
};

/** Compute zoom + pan to fit {@link DEFAULT_PATH_EDITOR_VIEW_RECT} in the canvas. */
export function getDefaultPathEditorView(canvasWidth, canvasHeight, field) {
  const active = field ?? getActiveField();
  const { heightM } = getFieldDimensions(active);
  const rect = { ...DEFAULT_PATH_EDITOR_VIEW_RECT, yMax: heightM };
  const margin = 0.03;
  if (!canvasWidth || !canvasHeight) return { zoom: 1.5, pan: { x: 0, y: 0 } };

  const { ix: ix0, iy: iy0 } = metersToImagePixels(rect.xMin, rect.yMin, active);
  const { ix: ix1, iy: iy1 } = metersToImagePixels(rect.xMax, rect.yMax, active);

  const layout1 = computeFieldLayout(canvasWidth, canvasHeight, { x: 0, y: 0 }, 1, active);
  const bl1 = imagePixelsToCanvas(ix0, iy0, layout1);
  const tr1 = imagePixelsToCanvas(ix1, iy1, layout1);
  const rectW1 = Math.abs(tr1.px - bl1.px);
  const rectH1 = Math.abs(tr1.py - bl1.py);
  if (rectW1 < 1 || rectH1 < 1) return { zoom: 1.5, pan: { x: 0, y: 0 } };

  const availW = canvasWidth * (1 - 2 * margin);
  const availH = canvasHeight * (1 - 2 * margin);
  const zoom = Math.min(availW / rectW1, availH / rectH1);

  const layout = computeFieldLayout(canvasWidth, canvasHeight, { x: 0, y: 0 }, zoom, active);
  const bl = imagePixelsToCanvas(ix0, iy0, layout);
  const tr = imagePixelsToCanvas(ix1, iy1, layout);
  const rectCenterY = (bl.py + tr.py) / 2;

  const { ix: ixNudge } = metersToImagePixels(0.5 * FIELD_GRID_SPACING_M, 0, active);
  const { px: pxNudge } = imagePixelsToCanvas(ixNudge, iy0, layout);
  const panRightPx = pxNudge - bl.px;

  const pan = {
    x: canvasWidth * margin - bl.px + panRightPx,
    y: canvasHeight / 2 - rectCenterY,
  };
  return {
    zoom,
    pan: clampPan(pan, zoom, canvasWidth, canvasHeight, 0.02, active),
  };
}
