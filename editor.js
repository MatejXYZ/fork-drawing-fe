import { showSuccessFeedback } from "./toast.js";

const editorPage = document.querySelector("#editor");

//

const drawing = {
  actions: [],
};

// config

const backgroundColor = "#fff";
let scale = 2;
let brushSize = 25;
let color = "#000";
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
  scale = 1000 / rect.width; // default canvas is 1000x1000
  redrawBrushCursor();
};

window.addEventListener("resize", handleWindowResize);

handleWindowResize();

// drawing

let isDrawing = false;

// fn that calculates coordinates to scale
const getCoordinates = (x, y) => {
  return [x * scale, y * scale];
};

let points = []; // list of coordinates in a single action

// cursor pointer events

canvas.addEventListener("pointerenter", (e) => {
  showBrushCursor();
});
canvas.addEventListener("pointerleave", () => {
  hideBrushCursor();
});

// drawing pointer events
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  isDrawing = true;
  points = [];
  tryDraw(e);
});
document.addEventListener("pointerup", (e) => {
  canvas.releasePointerCapture(e.pointerId);
  drawing.actions.push({ coordinates: points });
  autosave();
  isDrawing = false;
});
canvas.addEventListener("pointermove", (e) => {
  positionBrushCursor(e.clientX, e.clientY);
  tryDraw(e);
});

// toolbar events

const form = document.querySelector("form");
form.addEventListener("submit", (e) => {
  e.preventDefault();
});

const colorInput = document.querySelector("input[type=color]");
colorInput.addEventListener("change", (e) => {
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

sizeInput.addEventListener("input", (e) => {
  commitSizeValue(e.target.value);
});

sizeInput2.addEventListener("input", (e) => {
  const rawValue = e.target.value;

  if (!validateSizeField(rawValue)) {
    return;
  }

  commitSizeValue(rawValue);
});

sizeInput2.addEventListener("change", (e) => {
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
brushRadio.addEventListener("change", (e) => {
  isEraser = false;
  brushRadioLabel.classList.toggle("active", true);
  eraserRadioLabel.classList.toggle("active", false);
});
eraserRadio.addEventListener("change", (e) => {
  isEraser = true;
  brushRadioLabel.classList.toggle("active", false);
  eraserRadioLabel.classList.toggle("active", true);
});

// save image to db

const saveButton = document.querySelector("button#save");
saveButton.addEventListener("click", () => {
  ifReadyDB(() => {
    canvas.toBlob((blob) => {
      if (!blob) return;

      saveBlobToDB(blob, () => {
        showSuccessFeedback("Saved to gallery");
      });
    });
  });
});

// download image to filesystem

const downloadButton = document.querySelector("button#download");
downloadButton.addEventListener("click", () => {
  const url = canvas.toDataURL();
  const a = document.createElement("a");
  a.href = url;
  a.download = new Date(Date.now()).toISOString() + ".png";
  a.click();
  a.remove();
  showSuccessFeedback("Download started");
});

// drawing

// logical draw
const draw = (x, y) => {
  points.push({ x, y });
};

// render from point array
const render = () => {
  let lColor = isEraser ? backgroundColor : color;
  ctx.beginPath();

  if (points.length == 1) {
    ctx.fillStyle = lColor;
    ctx.arc(
      ...getCoordinates(points[0].x, points[0].y),
      brushSize / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  } else {
    ctx.strokeStyle = lColor;
    ctx.lineWidth = brushSize;
    ctx.moveTo(...getCoordinates(points[0].x, points[0].y));

    if (points.length == 2) {
      ctx.lineTo(...getCoordinates(points[0].x, points[0].y));
    } else if (points.length > 2) {
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;

        // curve to avoid jagged lines when drawing fast
        ctx.quadraticCurveTo(
          ...getCoordinates(points[i].x, points[i].y),
          ...getCoordinates(midX, midY),
        );
      }
    }

    ctx.stroke();
  }
};

// draw if app logic allows, render
const tryDraw = (e) => {
  e.preventDefault();
  if (isDrawing) {
    draw(e.clientX - rect.left, e.clientY - rect.top);

    requestAnimationFrame(render);
  }
};

// navigation

export const showEditor = () => {
  editorPage.style.display = "flex";

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 1000, 1000);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  requestAnimationFrame(() => {
    sizeInput.focus({ preventScroll: true });
  });
};

export const hideEditor = () => {
  editorPage.style.display = "none";
};

// BE connection

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response;
}

async function patch(url, body) {
  const response = await fetch(url, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response;
}

let isDrawingBeingCreated = false;
let drawingId = null;

const createDrawing = async () => {
  const response = await post("http://localhost:8080/drawings", drawing);
  const json = await response.json();
  drawingId = json.id;
};

const autosave = () => {
  // TODO - debounce
  if (drawingId != null) {
    patch("http://localhost:8080/drawings/" + drawingId, drawing);
  } else if (!isDrawingBeingCreated) {
    isDrawingBeingCreated = true;
    createDrawing();
  } else {
    console.info("Waiting to create drawing on BE.");
  }
};
