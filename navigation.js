import { hideEditor, showEditor } from "./editor.js";
import { hideGallery, showGallery } from "./gallery.js";

// navbar

const nav = document.querySelector("nav");
const editorLink = nav.querySelector('a[href="?page=index"]');
const galleryLink = nav.querySelector('a[href="?page=gallery"]');

const toggleActiveOn = (el) => {
  el.classList.toggle("active", true);
};
const toggleActiveOff = (el) => {
  el.classList.toggle("active", false);
};

const updateActiveLink = (page) => {
  switch (page) {
    case "gallery":
      toggleActiveOn(galleryLink);
      toggleActiveOff(editorLink);
      break;
    default:
      toggleActiveOn(editorLink);
      toggleActiveOff(galleryLink);
  }
};

// navigation

const getPageFromHref = (href) => {
  const url = new URL(href, window.location.href);

  return url.searchParams.get("page");
};

const showPage = (page) => {
  switch (page) {
    case "gallery":
      showGallery();
      hideEditor();
      break;
    default:
      showEditor();
      hideGallery();
  }
};

const route = () => {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  showPage(page);

  updateActiveLink(page);
};

nav.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const link = e.target.closest("a");
  if (!link) return;

  const nextUrl = new URL(link.href, window.location.href);
  const page = getPageFromHref(nextUrl.href);
  if (!page) return;

  e.preventDefault();
  history.pushState("", "", nextUrl);
  route();
});

window.addEventListener("popstate", route);

route();

// offline

const offlineIndicator = document.querySelector("#offline-indicator");

const syncOfflineIndicator = () => {
  offlineIndicator.style.display = navigator.onLine ? "none" : "flex";
};

window.addEventListener("online", () => {
  syncOfflineIndicator();
});
window.addEventListener("offline", () => {
  syncOfflineIndicator();
});

syncOfflineIndicator();
