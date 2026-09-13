import { del, get } from "./api.js";
import { showSuccessFeedback } from "./toast.js";

const section = document.querySelector("#drafts");
const container = section.querySelector(".drafts-grid");
const emptyStateMessage = section.querySelector(".drafts-empty");
const deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`;

const clearLongPressActiveItems = (currentItem) => {
  document.querySelectorAll(".long-press-active").forEach((item) => {
    if (item !== currentItem) {
      item.classList.remove("long-press-active");
    }
  });
};

const createDraftItem = (draft) => {
  const item = document.createElement("a");
  const thumbnail = document.createElement("img");
  const deleteButton = document.createElement("button");
  let longPressTimer = null;
  let longPressTriggered = false;

  item.className = "draft-item";
  item.href = `?page=index&drawingId=${encodeURIComponent(draft.id)}`;
  item.setAttribute("aria-label", `Open draft ${draft.id}`);
  thumbnail.src = draft.thumbnail;
  thumbnail.alt = `Draft ${draft.id}`;

  deleteButton.type = "button";
  deleteButton.className = "draft-item__delete";
  deleteButton.setAttribute("aria-label", `Delete draft ${draft.id}`);
  deleteButton.innerHTML = deleteIcon;
  const cancelLongPress = () => {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  };

  item.addEventListener("pointerup", cancelLongPress);
  item.addEventListener("pointercancel", cancelLongPress);
  item.addEventListener("pointermove", (event) => {
    if (
      event.pointerType === "touch" &&
      event.movementX ** 2 + event.movementY ** 2 > 100
    ) {
      cancelLongPress();
    }
  });
  item.addEventListener("contextmenu", (event) => {
    if (longPressTriggered) {
      event.preventDefault();
    }
  });
  item.addEventListener("focus", () => {
    clearLongPressActiveItems(item);
  });
  item.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;

    cancelLongPress();
    longPressTimer = setTimeout(() => {
      clearLongPressActiveItems(item);
      longPressTriggered = true;
      item.classList.add("long-press-active");
      item.focus();
    }, 500);
  });
  item.addEventListener("click", (event) => {
    if (!longPressTriggered) return;

    longPressTriggered = false;
    event.preventDefault();
  });
  deleteButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    longPressTriggered = false;
    deleteButton.disabled = true;

    try {
      await del(`/drawings/${encodeURIComponent(draft.id)}`);
      item.remove();
      syncEmptyState();
      showSuccessFeedback("Deleted draft");
    } catch (error) {
      console.error("Could not delete draft", error);
      deleteButton.disabled = false;
    }
  });

  item.append(thumbnail, deleteButton);

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

    const sortedDrafts = [...drafts].sort((a, b) => {
      const aTime = a?.dateCreated ? new Date(a.dateCreated).getTime() : 0;
      const bTime = b?.dateCreated ? new Date(b.dateCreated).getTime() : 0;
      return bTime - aTime;
    });

    container.replaceChildren(...sortedDrafts.map(createDraftItem));
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
