import { get } from "./api.js";
import { clearCanvas, renderActions } from "./drawing-renderer.js";

const section = document.querySelector("#detail");
const canvas = section.querySelector(".detail-canvas");
const emptyState = section.querySelector(".detail-empty");

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

  if (!hasDrawing) {
    clearCanvas(canvas.getContext("2d"));
    return;
  }

  canvas.setAttribute("aria-label", `Illustration ${drawing.id}`);
  renderActions(canvas, drawing.actions ?? []);
};

const loadDetail = async () => {
  try {
    const response = await get(getListUrl(getSource()));
    drawings = await response.json();
    const index = drawings.findIndex(
      (drawing) => String(drawing.id) === getDrawingId(),
    );

    if (index !== -1 && !Array.isArray(drawings[index].actions)) {
      const response = await get(
        `/drawings/${encodeURIComponent(drawings[index].id)}`,
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
