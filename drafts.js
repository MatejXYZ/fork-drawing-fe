import { get } from "./api.js";

const section = document.querySelector("#drafts");
const container = section.querySelector(".drafts-grid");
const emptyStateMessage = section.querySelector(".drafts-empty");

const createDraftItem = (draft) => {
  const item = document.createElement("a");
  const thumbnail = document.createElement("img");

  item.className = "draft-item";
  item.href = `?page=index&drawingId=${encodeURIComponent(draft.id)}`;
  item.setAttribute("aria-label", `Open draft ${draft.id}`);
  thumbnail.src = draft.thumbnail;
  thumbnail.alt = `Draft ${draft.id}`;
  item.append(thumbnail);

  return item;
};

const syncEmptyState = () => {
  emptyStateMessage.style.display =
    container.childElementCount === 0 ? "block" : "none";
};

const loadDrafts = async () => {
  try {
    const response = await get("/drawings?published=false");
    const drafts = await response.json();

    container.replaceChildren(...drafts.map(createDraftItem));
    syncEmptyState();
  } catch (error) {
    console.error("Could not load drafts", error);
  }
};

export const showDrafts = () => {
  section.style.display = "flex";
  section.classList.toggle("hidden", false);

  if (container.childElementCount === 0) {
    loadDrafts();
  }
};

export const hideDrafts = () => {
  section.style.display = "none";
  section.classList.toggle("hidden", true);
};
