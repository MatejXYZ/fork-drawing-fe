import { get, post } from "./api.js";
import { showSuccessFeedback } from "./toast.js";
import { clearCanvas, renderActions } from "./drawing-renderer.js";

const section = document.querySelector("#detail");
const canvas = section.querySelector(".detail-canvas");
const emptyState = section.querySelector(".detail-empty");
const forkForm = section.querySelector(".detail-fork-form");
const forkPointInput = section.querySelector("#fork-point");
const forkButton = section.querySelector("#fork");

let drawings = [];
let currentIndex = -1;

const getDrawingId = () =>
  new URLSearchParams(window.location.search).get("drawingId");
const getSource = () =>
  new URLSearchParams(window.location.search).get("source") || "published";
const getListUrl = (source) =>
  source === "published" ? "/drawings?published=true" : source;

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
  forkPointInput.value = "";
  forkButton.disabled = !hasDrawing;

  if (!hasDrawing) {
    clearCanvas(canvas.getContext("2d"));
    return;
  }

  canvas.setAttribute("aria-label", `Illustration ${drawing.id}`);
  renderActions(canvas, [
    ...(drawing.parentActions ?? []),
    ...(drawing.actions ?? []),
  ]);
};

forkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!forkPointInput.reportValidity()) return;

  const drawing = drawings[currentIndex];
  const forkPoint = Number(forkPointInput.value);
  if (!drawing || !Number.isInteger(forkPoint) || forkPoint < 1) return;

  forkButton.disabled = true;
  try {
    const { id, parentActions, parentMap, ...forkedDrawing } = drawing;
    const response = await post("/drawings", {
      ...forkedDrawing,
      parentId: id,
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
