import { getFieldDimensions, getFieldBounds, getActiveField } from './fieldConfig';
import { getProfileForField } from './coordinateProfiles';

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

function centerOriginToImagePixels(x, y, field) {
  const { centerPixel, extentPixels, halfExtentX, halfExtentY } = field;
  const cx = centerPixel?.x ?? (field.imageWidth ?? 1024) / 2;
  const cy = centerPixel?.y ?? (field.imageHeight ?? 1024) / 2;
  const hx = halfExtentX ?? 72;
  const hy = halfExtentY ?? 72;
  const xMaxPx = extentPixels?.xMax?.x ?? field.imageWidth ?? 1024;
  const yMaxPx = extentPixels?.yMax?.y ?? 0;

  return {
    ix: cx + (x / hx) * (xMaxPx - cx),
    iy: cy - (y / hy) * (cy - yMaxPx),
  };
}

function imagePixelsToCenterOrigin(ix, iy, field) {
  const { centerPixel, extentPixels, halfExtentX, halfExtentY } = field;
  const cx = centerPixel?.x ?? (field.imageWidth ?? 1024) / 2;
  const cy = centerPixel?.y ?? (field.imageHeight ?? 1024) / 2;
  const hx = halfExtentX ?? 72;
  const hy = halfExtentY ?? 72;
  const xMaxPx = extentPixels?.xMax?.x ?? field.imageWidth ?? 1024;
  const yMaxPx = extentPixels?.yMax?.y ?? 0;

  return {
    x: ((ix - cx) / (xMaxPx - cx)) * hx,
    y: -((iy - cy) / (cy - yMaxPx)) * hy,
  };
}

/** Field coords in native units → image file pixels (top-left origin, y down). */
export function fieldToImagePixels(x, y, field) {
  const active = field ?? getActiveField();
  if (active?.originMode === 'center') {
    return centerOriginToImagePixels(x, y, active);
  }

  const { bounds } = getFieldDimensions(active);
  const width = bounds.xMax - bounds.xMin;
  const height = bounds.yMax - bounds.yMin;
  const { originPixel, endPixel, imageWidth, imageHeight } = active ?? {};
  const localX = x - bounds.xMin;
  const localY = y - bounds.yMin;

  if (originPixel && endPixel) {
    return {
      ix: originPixel.x + (localX / width) * (endPixel.x - originPixel.x),
      iy: originPixel.y + (localY / height) * (endPixel.y - originPixel.y),
    };
  }
  return {
    ix: (localX / width) * (imageWidth ?? 1024),
    iy: (1 - localY / height) * (imageHeight ?? 415),
  };
}

/** @deprecated Use fieldToImagePixels — kept for existing imports. */
export function metersToImagePixels(x, y, field) {
  return fieldToImagePixels(x, y, field);
}

/** Image file pixels → field coords in native units. */
export function imagePixelsToField(ix, iy, field) {
  const active = field ?? getActiveField();
  if (active?.originMode === 'center') {
    return imagePixelsToCenterOrigin(ix, iy, active);
  }

  const { bounds } = getFieldDimensions(active);
  const width = bounds.xMax - bounds.xMin;
  const height = bounds.yMax - bounds.yMin;
  const { originPixel, endPixel } = active ?? {};

  if (originPixel && endPixel) {
    return {
      x: bounds.xMin + ((ix - originPixel.x) / (endPixel.x - originPixel.x)) * width,
      y: bounds.yMin + ((iy - originPixel.y) / (endPixel.y - originPixel.y)) * height,
    };
  }
  return {
    x: bounds.xMin + (ix / (active?.imageWidth ?? 1024)) * width,
    y: bounds.yMin + (1 - iy / (active?.imageHeight ?? 415)) * height,
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

export function fieldToPixels(x, y, canvasWidth, canvasHeight, pan, zoom, field) {
  const layout = computeFieldLayout(canvasWidth, canvasHeight, pan, zoom, field);
  const { ix, iy } = fieldToImagePixels(x, y, layout.field);
  return imagePixelsToCanvas(ix, iy, layout);
}

export function pixelsToField(px, py, canvasWidth, canvasHeight, pan, zoom, field) {
  const layout = computeFieldLayout(canvasWidth, canvasHeight, pan, zoom, field);
  const { ix, iy } = canvasToImagePixels(px, py, layout);
  return imagePixelsToField(ix, iy, layout.field);
}

/** @deprecated Use fieldToPixels — kept for existing imports. */
export function metersToPixels(x, y, canvasWidth, canvasHeight, pan, zoom, field) {
  return fieldToPixels(x, y, canvasWidth, canvasHeight, pan, zoom, field);
}

/** @deprecated Use pixelsToField — kept for existing imports. */
export function pixelsToMeters(px, py, canvasWidth, canvasHeight, pan, zoom, field) {
  return pixelsToField(px, py, canvasWidth, canvasHeight, pan, zoom, field);
}

export function drawFieldImage(ctx, fieldImage, layout) {
  if (!fieldImage || !layout) return;
  const { drawX, drawY, drawW, drawH } = layout;
  ctx.drawImage(fieldImage, drawX, drawY, drawW, drawH);
}

export function clampToField(x, y, field) {
  const bounds = getFieldBounds(field ?? getActiveField());
  return {
    x: Math.max(bounds.xMin, Math.min(bounds.xMax, x)),
    y: Math.max(bounds.yMin, Math.min(bounds.yMax, y)),
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

export function getGridSpacing(field) {
  return getProfileForField(field ?? getActiveField()).gridSpacing;
}

/** @deprecated Use getGridSpacing(field). */
export const FIELD_GRID_SPACING_M = 1;

export function snapToGrid(x, y, gridSize) {
  const size = gridSize ?? 0.5;
  return {
    x: Math.round(x / size) * size,
    y: Math.round(y / size) * size,
  };
}

/** Default visible field region when opening the path editor. */
export const DEFAULT_PATH_EDITOR_VIEW_RECT = {
  xMin: 0,
  yMin: 0,
  xMax: 9.25,
};

function getDefaultFieldView(canvasWidth, canvasHeight, field, rect, { anchor = 'start' } = {}) {
  const active = field ?? getActiveField();
  const profile = getProfileForField(active);
  const bounds = getFieldBounds(active);
  const viewRect = {
    xMin: rect.xMin ?? bounds.xMin,
    yMin: rect.yMin ?? bounds.yMin,
    xMax: rect.xMax ?? bounds.xMax,
    yMax: rect.yMax ?? bounds.yMax,
  };
  const margin = 0.03;
  if (!canvasWidth || !canvasHeight) return { zoom: 1.5, pan: { x: 0, y: 0 } };

  const { ix: ix0, iy: iy0 } = fieldToImagePixels(viewRect.xMin, viewRect.yMin, active);
  const { ix: ix1, iy: iy1 } = fieldToImagePixels(viewRect.xMax, viewRect.yMax, active);

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
  const rectCenterX = (bl.px + tr.px) / 2;
  const rectCenterY = (bl.py + tr.py) / 2;

  if (active?.originMode === 'center') {
    return {
      zoom,
      pan: clampPan(
        { x: canvasWidth / 2 - rectCenterX, y: canvasHeight / 2 - rectCenterY },
        zoom,
        canvasWidth,
        canvasHeight,
        0.02,
        active,
      ),
    };
  }

  const gridSpacing = profile.gridSpacing;
  const nudge = 0.5 * gridSpacing;
  const nudgeX = anchor === 'end' ? bounds.xMax - nudge : bounds.xMin + nudge;
  const { ix: ixNudge } = fieldToImagePixels(nudgeX, viewRect.yMin, active);
  const { px: pxNudge } = imagePixelsToCanvas(ixNudge, iy0, layout);

  let panX;
  if (anchor === 'end') {
    const br = imagePixelsToCanvas(ix1, iy0, layout);
    panX = canvasWidth * (1 - margin) - br.px - (br.px - pxNudge);
  } else {
    panX = canvasWidth * margin - bl.px + (pxNudge - bl.px);
  }

  const pan = {
    x: panX,
    y: canvasHeight / 2 - rectCenterY,
  };
  return {
    zoom,
    pan: clampPan(pan, zoom, canvasWidth, canvasHeight, 0.02, active),
  };
}

/** Compute zoom + pan to fit the league-appropriate default view rect. */
export function getDefaultPathEditorView(canvasWidth, canvasHeight, field) {
  const profile = getProfileForField(field ?? getActiveField());
  return getDefaultFieldView(canvasWidth, canvasHeight, field, profile.defaultViewRect);
}

/** Default simulator view rect — blue (left) or red (right) alliance side (FRC only). */
export function getSimulatorViewRect(field, alliance = 'blue') {
  const active = field ?? getActiveField();
  const profile = getProfileForField(active);
  const bounds = getFieldBounds(active);

  if (profile.simulatorHalfFieldSpan == null) {
    return {
      xMin: bounds.xMin,
      yMin: bounds.yMin,
      xMax: bounds.xMax,
      yMax: bounds.yMax,
    };
  }

  const span = profile.simulatorHalfFieldSpan;
  if (alliance === 'red') {
    return {
      xMin: bounds.xMax - span,
      yMin: bounds.yMin,
      xMax: bounds.xMax,
      yMax: bounds.yMax,
    };
  }
  return {
    xMin: bounds.xMin,
    yMin: bounds.yMin,
    xMax: bounds.xMin + span,
    yMax: bounds.yMax,
  };
}

/** Simulator default view — frames the active alliance side (FRC) or full field (FTC). */
export function getDefaultSimulatorView(canvasWidth, canvasHeight, field, alliance = 'blue') {
  const rect = getSimulatorViewRect(field, alliance);
  const anchor = alliance === 'red' && getProfileForField(field).simulatorHalfFieldSpan != null ? 'end' : 'start';
  return getDefaultFieldView(canvasWidth, canvasHeight, field, rect, { anchor });
}
