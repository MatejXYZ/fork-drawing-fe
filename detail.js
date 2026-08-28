import { get, post } from "./api.js";
import { showSuccessFeedback } from "./toast.js";
import { clearCanvas, renderActions } from "./drawing-renderer.js";

const section = document.querySelector("#detail");
const canvas = section.querySelector(".detail-canvas");
const emptyState = section.querySelector(".detail-empty");
const forkForm = section.querySelector(".detail-fork-form");
const forkPointInput = section.querySelector("#fork-point");
const forkPointValue = section.querySelector("#fork-point-value");
const historyTicks = section.querySelector(".detail-history-ticks");
const forkButton = section.querySelector("#fork");

let drawings = [];
let currentIndex = -1;

const getDrawingId = () =>
  new URLSearchParams(window.location.search).get("drawingId");
const getSource = () =>
  new URLSearchParams(window.location.search).get("source") || "published";
const getListUrl = (source) =>
  source === "published" ? "/drawings?published=true" : source;

const getHistorySegments = (drawing) => {
  const segments = [];
  let historyLength = 0;

  Object.entries(drawing.parentMap ?? {}).forEach(([id, cutoff]) => {
    const length = Math.max(0, Number(cutoff) || 0);
    if (length === 0) return;
    segments.push({
      id,
      start: historyLength + 1,
      end: historyLength + length,
    });
    historyLength += length;
  });

  const actionsLength = (drawing.actions ?? []).length;
  if (actionsLength > 0) {
    segments.push({
      id: drawing.id,
      start: historyLength + 1,
      end: historyLength + actionsLength,
    });
  }

  return segments;
};

const renderHistorySlider = (drawing) => {
  const segments = getHistorySegments(drawing);
  const historyLength = segments.at(-1)?.end ?? 0;

  forkPointInput.max = String(Math.max(1, historyLength));
  forkPointInput.value = String(Math.max(1, historyLength));
  forkPointInput.disabled = historyLength === 0;
  forkPointValue.value = forkPointInput.value;
  historyTicks.replaceChildren();

  for (let point = 1; point <= historyLength; point++) {
    const tick = document.createElement("span");
    tick.className = "detail-history-tick";
    if (segments.some((segment) => segment.end === point)) {
      tick.classList.add("detail-history-tick--drawing");
    }
    historyTicks.append(tick);
  }

  return segments;
};

const navigateToIndex = (index) => {
  const drawing = drawings[index];
  if (!drawing) return;

  const url = new URL(window.location.href);
  url.searchParams.set("page", "detail");
  url.searchParams.set("drawingId", drawing.id);
  url.searchParams.set("source", getSource());
  history.pushState("", "", url);
  render(index);
};

const render = (index) => {
  currentIndex = index;
  const drawing = drawings[index];
  const hasDrawing = Boolean(drawing);

  emptyState.hidden = hasDrawing;
  canvas.hidden = !hasDrawing;
  forkForm.hidden = !hasDrawing;
  forkButton.disabled = !hasDrawing;

  if (!hasDrawing) {
    clearCanvas(canvas.getContext("2d"));
    return;
  }

  canvas.setAttribute("aria-label", `Illustration ${drawing.id}`);
  const actions = [
    ...(drawing.parentActions ?? []),
    ...(drawing.actions ?? []),
  ];
  renderHistorySlider(drawing);
  renderActions(canvas, actions, Number(forkPointInput.value));
};

forkPointInput.addEventListener("input", () => {
  const drawing = drawings[currentIndex];
  if (!drawing) return;

  forkPointValue.value = forkPointInput.value;
  renderActions(canvas, [
    ...(drawing.parentActions ?? []),
    ...(drawing.actions ?? []),
  ], Number(forkPointInput.value));
});

forkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const drawing = drawings[currentIndex];
  const globalForkPoint = Number(forkPointInput.value);
  const segments = drawing && getHistorySegments(drawing);
  const segment = segments?.find(
    ({ start, end }) => globalForkPoint >= start && globalForkPoint <= end,
  );
  if (!drawing || !segment) return;

  const forkPoint = globalForkPoint - segment.start + 1;

  forkButton.disabled = true;
  try {
    const { parentActions, parentMap, ...forkedDrawing } = drawing;
    const response = await post("/drawings", {
      ...forkedDrawing,
      parentId: segment.id,
      forkPoint,
    });
    const fork = await response.json();
    showSuccessFeedback("Forked drawing");
    window.location.href = `?page=detail&drawingId=${encodeURIComponent(fork.id)}&source=${encodeURIComponent(getSource())}`;
  } catch (error) {
    console.error("Could not fork drawing", error);
    forkButton.disabled = false;
  }
});

const loadDetail = async () => {
  try {
    const response = await get(getListUrl(getSource()));
    drawings = await response.json();
    const index = drawings.findIndex(
      (drawing) => String(drawing.id) === getDrawingId(),
    );

    if (index !== -1) {
      const response = await get(
        `/drawings/${encodeURIComponent(drawings[index].id)}?parent=true`,
      );
      drawings[index] = await response.json();
    }

    render(index);
  } catch (error) {
    drawings = [];
    render(-1);
    console.error("Could not load drawing detail", error);
  }
};

document.addEventListener("keydown", (event) => {
  if (section.classList.contains("hidden")) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigateToIndex(currentIndex - 1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    navigateToIndex(currentIndex + 1);
  }
});

export const showDetail = () => {
  section.style.display = "flex";
  section.classList.remove("hidden");
  loadDetail();
};

export const hideDetail = () => {
  section.style.display = "none";
  section.classList.add("hidden");
  clearCanvas(canvas.getContext("2d"));
};
