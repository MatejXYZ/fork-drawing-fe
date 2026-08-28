import { showSuccessFeedback } from "./toast.js";
import { del, get, patch, post } from "./api.js";
import {
  BACKGROUND_COLOR,
  getCanvasScale,
  renderAction,
  renderActions,
} from "./drawing-renderer.js";

const editorPage = document.querySelector("#editor");
const editorListeners = [];
let editorListenersAttached = true;

const addEditorEventListener = (target, type, listener) => {
  target.addEventListener(type, listener);
  editorListeners.push({ target, type, listener });
};

const attachEditorListeners = () => {
  if (editorListenersAttached) return;

  editorListeners.forEach(({ target, type, listener }) => {
    target.addEventListener(type, listener);
  });
  editorListenersAttached = true;
};

const detachEditorListeners = () => {
  if (!editorListenersAttached) return;

  editorListeners.forEach(({ target, type, listener }) => {
    target.removeEventListener(type, listener);
  });
  editorListenersAttached = false;
};

//

const drawing = {
  actions: [],
  thumbnail: null,
};

// config

const backgroundColor = BACKGROUND_COLOR;
let scale = 2;
let brushSize = 25;
let color = "#000000";
let isEraser = false;
const defaultSize = 25;

// canvas init

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
let rect = canvas.getBoundingClientRect();

// dynamic cursor

const brushCursor = document.querySelector("#cursor");
const svgNamespace = "http://www.w3.org/2000/svg";

// fn that redraws cursor UI on canvas
const redrawBrushCursor = () => {
  const diameter = brushSize / scale;
  const strokeWidth = 1;
  const center = diameter / 2;
  const radius = Math.max(center - strokeWidth / 2, 0.5);
  const svg = document.createElementNS(svgNamespace, "svg");
  const outerCircle = document.createElementNS(svgNamespace, "circle");
  const innerCircle = document.createElementNS(svgNamespace, "circle");

  brushCursor.style.width = `${diameter}px`;
  brushCursor.style.height = `${diameter}px`;

  svg.setAttribute("width", String(diameter));
  svg.setAttribute("height", String(diameter));
  svg.setAttribute("viewBox", `0 0 ${diameter} ${diameter}`);

  for (const circle of [outerCircle, innerCircle]) {
    circle.setAttribute("cx", String(center));
    circle.setAttribute("cy", String(center));
    circle.setAttribute("r", String(radius));
    circle.setAttribute("fill", "none");
  }

  outerCircle.setAttribute("stroke", "#fff");
  outerCircle.setAttribute("stroke-width", String(strokeWidth + 1));

  innerCircle.setAttribute("stroke", "#111");
  innerCircle.setAttribute("stroke-width", String(strokeWidth));

  svg.append(outerCircle, innerCircle);
  brushCursor.replaceChildren(svg);
};

// fn that updates cursor position on canvas
const positionBrushCursor = (clientX, clientY) => {
  const diameter =
    brushCursor.getBoundingClientRect().width || brushSize / scale;
  brushCursor.style.left = `${clientX - diameter / 2}px`;
  brushCursor.style.top = `${clientY - diameter / 2}px`;
};

const showBrushCursor = () => {
  brushCursor.classList.toggle("visible", true);
};

const hideBrushCursor = () => {
  brushCursor.classList.toggle("visible", false);
};

// responsive canvas

// after resize update scale for operations with coordinates
const handleWindowResize = () => {
  rect = canvas.getBoundingClientRect();
  scale = getCanvasScale(canvas);
  redrawBrushCursor();
};

addEditorEventListener(window, "resize", handleWindowResize);

handleWindowResize();

// drawing

let isDrawing = false;
let editorSessionGeneration = 0;

const getDrawingIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("drawingId");
};

let points = []; // list of coordinates in a single action

// cursor pointer events

addEditorEventListener(canvas, "pointerenter", (e) => {
  showBrushCursor();
});
addEditorEventListener(canvas, "pointerleave", () => {
  hideBrushCursor();
});

// drawing pointer events
addEditorEventListener(canvas, "pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  isDrawing = true;
  points = [];
  tryDraw(e);
});
addEditorEventListener(document, "pointerup", (e) => {
  if (!isDrawing) return;

  if (canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }

  if (points.length > 0) {
    drawing.actions.push({
      coordinates: points,
      color: color,
      size: brushSize,
    });
  }
  points = [];
  autosave();
  isDrawing = false;
});
addEditorEventListener(canvas, "pointermove", (e) => {
  positionBrushCursor(e.clientX, e.clientY);
  tryDraw(e);
});

// toolbar events

const form = document.querySelector("form");
addEditorEventListener(form, "submit", (e) => {
  e.preventDefault();
});

const colorInput = document.querySelector("input[type=color]");
addEditorEventListener(colorInput, "change", (e) => {
  color = e.target.value;
});

const sizeInput = document.querySelector("input[type=range]");
const sizeInput2 = document.querySelector("input[type=number]");
const minSize = Number(sizeInput.min);
const maxSize = Number(sizeInput.max);

// fn that calculates expected brush size
const clampSizeValue = (value) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.min(maxSize, Math.max(minSize, Math.round(parsedValue)));
};

const updateBrushSize = (value) => {
  sizeInput.value = value;
  sizeInput2.value = value;
  sizeInput2.setCustomValidity("");

  // small increments at small size, large increments at large (classic brush size UX)
  brushSize = 1 + Math.pow(value / maxSize, 2) * 300;
  redrawBrushCursor();
};

// fn for numeral input which allows arbitrary values
const validateSizeField = (value) => {
  if (value.trim() === "") {
    sizeInput2.setCustomValidity(
      `Enter a size between ${minSize} and ${maxSize}.`,
    );
    return false;
  }

  const parsedValue = Number(value);
  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < minSize ||
    parsedValue > maxSize
  ) {
    sizeInput2.setCustomValidity(
      `Size must stay between ${minSize} and ${maxSize}.`,
    );
    return false;
  }

  sizeInput2.setCustomValidity("");
  return true;
};

const commitSizeValue = (value) => {
  const normalizedValue = clampSizeValue(value);

  // clamp can return non-null
  if (normalizedValue === null) {
    sizeInput2.reportValidity();
    updateBrushSize(sizeInput.value);
    return;
  }

  updateBrushSize(normalizedValue);
};

addEditorEventListener(sizeInput, "input", (e) => {
  commitSizeValue(e.target.value);
});

addEditorEventListener(sizeInput2, "input", (e) => {
  const rawValue = e.target.value;

  if (!validateSizeField(rawValue)) {
    return;
  }

  commitSizeValue(rawValue);
});

addEditorEventListener(sizeInput2, "change", (e) => {
  commitSizeValue(e.target.value);
});

updateBrushSize(defaultSize);

// 1 tool can be active at a time, either Brush or Eraser
const brushRadio = document.querySelector("input[id=brush]");
const brushRadioLabel = document.querySelector("label[for=brush]");
const eraserRadio = document.querySelector("input[id=eraser]");
const eraserRadioLabel = document.querySelector("label[for=eraser]");
brushRadioLabel.classList.toggle("active", true);
eraserRadioLabel.classList.toggle("active", false);
addEditorEventListener(brushRadio, "change", (e) => {
  isEraser = false;
  brushRadioLabel.classList.toggle("active", true);
  eraserRadioLabel.classList.toggle("active", false);
});
addEditorEventListener(eraserRadio, "change", (e) => {
  isEraser = true;
  brushRadioLabel.classList.toggle("active", false);
  eraserRadioLabel.classList.toggle("active", true);
});

const publishButton = document.querySelector("button#publish");
addEditorEventListener(publishButton, "click", async () => {
  if (drawing.actions.length === 0) return;

  publishButton.disabled = true;
  try {
    updateThumbnail();
    const id = await ensureDrawingSaved();
    await patch(`/drawings/${encodeURIComponent(id)}`, {
      ...drawing,
      isPublished: true,
    });
    showSuccessFeedback("Published drawing");
    window.location.href = `?page=detail&drawingId=${encodeURIComponent(id)}&source=published`;
  } catch (error) {
    console.error("Could not publish drawing", error);
    publishButton.disabled = false;
  }
});

const deleteButton = document.querySelector("button#delete");
addEditorEventListener(deleteButton, "click", async () => {
  const id = getDrawingIdFromUrl();
  if (!id) return;

  deleteButton.disabled = true;
  try {
    await del(`/drawings/${encodeURIComponent(id)}`);
    window.location.href = "?page=gallery";
  } catch (error) {
    console.error("Could not delete drawing", error);
    deleteButton.disabled = false;
  }
});

// drawing

// logical draw
const draw = (x, y) => {
  points.push({ x: x * scale, y: y * scale });
  console.info(`Drawn point at (${x * scale}, ${y * scale})`);
};

// render from point array
const render = (settings) => {
  renderAction(ctx, {
    coordinates: points,
    color: isEraser ? backgroundColor : (settings?.color ?? color),
    size: settings?.size ?? brushSize,
  });
};

// draw if app logic allows, render
const tryDraw = (e) => {
  e.preventDefault();
  if (isDrawing) {
    draw(e.clientX - rect.left, e.clientY - rect.top);

    requestAnimationFrame(() => render());
  }
};

const renderDrawing = (actions, parentActions = []) => {
  renderActions(canvas, [...parentActions, ...actions]);

  redrawBrushCursor();
};

// navigation

export const showEditor = () => {
  resetEditorState();
  attachEditorListeners();
  editorPage.style.display = "flex";
  handleWindowResize();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const drawingIdFromUrl = getDrawingIdFromUrl();
  if (drawingIdFromUrl !== null) {
    loadDrawing(drawingIdFromUrl);
  }

  requestAnimationFrame(() => {
    sizeInput.focus({ preventScroll: true });
  });
};

export const hideEditor = () => {
  detachEditorListeners();
  resetEditorState();
  editorPage.style.display = "none";
};

let isDrawingBeingCreated = false;

const createDrawing = async () => {
  const sessionGeneration = editorSessionGeneration;
  const response = await post("/drawings", drawing);
  const json = await response.json();
  if (sessionGeneration !== editorSessionGeneration) return;

  const url = new URL(window.location.href);
  url.searchParams.set("drawingId", json.id);
  history.replaceState("", "", url);
  return json.id;
};

const ensureDrawingSaved = async () => {
  const id = getDrawingIdFromUrl();
  if (id) return id;

  return createDrawing();
};

// BE connection

const loadDrawing = async (id) => {
  try {
    const response = await get(
      `/drawings/${encodeURIComponent(id)}?parent=true`,
    );
    const loadedDrawing = await response.json();

    if (getDrawingIdFromUrl() !== id || String(loadedDrawing.id) !== id) {
      return;
    }

    drawing.actions = loadedDrawing.actions ?? [];
    drawing.thumbnail = loadedDrawing.thumbnail ?? null;
    renderDrawing(drawing.actions, loadedDrawing.parentActions);
  } catch (error) {
    console.error("Could not load drawing", error);
  }
};

const updateThumbnail = () => {
  const thumbnail = canvas.toDataURL("image/jpeg", 0.1);
  drawing.thumbnail = thumbnail;
};

// TODO - debounce
const autosave = () => {
  if (drawing.actions.length === 0) {
    return;
  }
  console.info("Autosave");
  updateThumbnail();
  const drawingIdFromUrl = getDrawingIdFromUrl();
  if (drawingIdFromUrl != null) {
    patch(`/drawings/${encodeURIComponent(drawingIdFromUrl)}`, drawing);
  } else if (!isDrawingBeingCreated) {
    isDrawingBeingCreated = true;
    createDrawing();
  } else {
    console.info("Autosave - Waiting to create drawing on BE.");
  }
};

const resetEditorState = () => {
  editorSessionGeneration += 1;
  drawing.actions = [];
  drawing.thumbnail = null;
  points = [];
  isDrawing = false;
  isDrawingBeingCreated = false;
  color = "#000000";
  isEraser = false;

  colorInput.value = color;
  brushRadio.checked = true;
  eraserRadio.checked = false;
  brushRadioLabel.classList.toggle("active", true);
  eraserRadioLabel.classList.toggle("active", false);
  updateBrushSize(defaultSize);

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  hideBrushCursor();
};
