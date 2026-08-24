import { showSuccessFeedback } from "./toast.js";

// elements

const section = document.querySelector("#gallery");
const container = section.querySelector(".gallery-grid");
const emptyStateMessage = section.querySelector(".gallery-empty");

// icons

const deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`;
const previousIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/></svg>`;
const nextIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>`;

// modal

class GalleryModal {
  constructor(host) {
    this.host = host;
    this.dialog = document.createElement("dialog");
    this.dialogContent = document.createElement("div");
    this.closeButton = document.createElement("button");
    this.deleteButton = document.createElement("button");
    this.previousButton = document.createElement("button");
    this.nextButton = document.createElement("button");
    this.dialogImage = document.createElement("img");
    this.currentItem = null;

    this.dialog.className = "gallery-modal";

    this.dialogContent.className = "gallery-modal__content";

    this.closeButton.type = "button";
    this.closeButton.className = "gallery-modal__close";
    this.closeButton.textContent = "×";

    this.deleteButton.type = "button";
    this.deleteButton.className = "gallery-modal__delete";
    this.deleteButton.innerHTML = deleteIcon;

    this.previousButton.type = "button";
    this.previousButton.className =
      "gallery-modal__nav gallery-modal__nav--previous";
    this.previousButton.innerHTML = previousIcon;

    this.nextButton.type = "button";
    this.nextButton.className = "gallery-modal__nav gallery-modal__nav--next";
    this.nextButton.innerHTML = nextIcon;

    this.dialogImage.className = "gallery-modal__image";

    this.dialogContent.append(
      this.closeButton,
      this.deleteButton,
      this.previousButton,
      this.nextButton,
      this.dialogImage,
    );
    this.dialog.append(this.dialogContent);
    document.body.appendChild(this.dialog);

    // events

    this.boundHandleOpenImage = this.handleOpenImage.bind(this);
    this.boundHandleDialogClick = this.handleDialogClick.bind(this);
    this.boundHandleDialogClose = this.handleDialogClose.bind(this);
    this.boundHandleDelete = this.handleDelete.bind(this);
    this.boundHandlePrevious = this.handlePrevious.bind(this);
    this.boundHandleNext = this.handleNext.bind(this);
    this.boundHandleKeydown = this.handleKeydown.bind(this);
    this.boundClose = this.close.bind(this);

    this.host.addEventListener("open-image", this.boundHandleOpenImage);
    this.closeButton.addEventListener("click", this.boundClose);
    this.deleteButton.addEventListener("click", this.boundHandleDelete);
    this.previousButton.addEventListener("click", this.boundHandlePrevious);
    this.nextButton.addEventListener("click", this.boundHandleNext);
    this.dialog.addEventListener("click", this.boundHandleDialogClick);
    this.dialog.addEventListener("close", this.boundHandleDialogClose);
    document.addEventListener("keydown", this.boundHandleKeydown);
  }

  handleOpenImage(event) {
    this.open(event.detail.item, event.detail.url, event.detail.alt);
  }
  handleDialogClick(event) {
    if (event.target === this.dialog) {
      this.close();
    }
  }
  handleDialogClose() {
    const focusTarget = this.currentItem;

    this.currentItem = null;
    this.dialogImage.removeAttribute("src");
    this.dialogImage.alt = "";
    this.syncNavigation();

    if (focusTarget?.isConnected) {
      focusTarget.focus();
    }
  }
  handleDelete() {
    if (!this.currentItem) return;

    this.currentItem.deleteImage(this.boundClose);
  }
  handlePrevious() {
    this.navigate(-1);
  }
  handleNext() {
    this.navigate(1);
  }
  handleKeydown(event) {
    if (!this.dialog.open) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.handlePrevious();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.handleNext();
    }
  }
  open(item, url, alt) {
    this.currentItem = item;
    this.dialogImage.src = url;
    this.dialogImage.alt = alt;
    this.syncNavigation();

    if (!this.dialog.open) {
      this.dialog.showModal();
    }
  }
  close() {
    if (this.dialog.open) {
      this.dialog.close();
    }
  }
  getAdjacentItem(step) {
    if (!this.currentItem) return null;

    // navigation follows the live DOM order so modal controls stay in sync after deletes
    return step < 0
      ? this.currentItem.previousElementSibling
      : this.currentItem.nextElementSibling;
  }
  navigate(step) {
    const item = this.getAdjacentItem(step);

    if (!item) return;

    this.open(item, item.imageUrl, item.imageAlt);
  }
  syncNavigation() {
    const hasPrevious = Boolean(this.getAdjacentItem(-1));
    const hasNext = Boolean(this.getAdjacentItem(1));

    this.previousButton.disabled = !hasPrevious;
    this.nextButton.disabled = !hasNext;
  }
}

// fn that checks if gallery is empty (ie. no saved images)
const syncEmptyState = () => {
  console.log("sync");
  emptyStateMessage.style.display =
    container.childElementCount === 0 ? "block" : "none";
};

// web component
class GalleryItem extends HTMLElement {
  constructor() {
    super();

    this.imageUrl = "";
    this.imageAlt = "";
    this.imageId = "";
    this.icon = document.createElement("div");
    this.img = document.createElement("img");
    this.deleteButton = document.createElement("button");

    this.icon.className = "icon";
    this.deleteButton.type = "button";
    this.deleteButton.className = "gallery-item__delete";

    this.deleteButton.innerHTML = deleteIcon;
    this.addEventListener("click", this.handleActivate);
    this.addEventListener("keydown", this.handleKeydown);
    this.deleteButton.addEventListener("click", this.handleDelete);
  }

  connectedCallback() {
    this.tabIndex = 0;

    if (!this.img.isConnected) {
      this.append(this.icon, this.img, this.deleteButton);
    }

    this.sync();
  }

  set data({ id, url, alt }) {
    this.imageId = id;
    this.imageUrl = url;
    this.imageAlt = alt;
    this.sync();
  }

  handleActivate = () => {
    if (!this.imageUrl) return;

    this.dispatchEvent(
      new CustomEvent("open-image", {
        bubbles: true,
        detail: {
          item: this,
          alt: this.imageAlt,
          url: this.imageUrl,
        },
      }),
    );
  };

  handleKeydown = (event) => {
    if (event.target !== this) return;

    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    this.handleActivate();
  };

  handleDelete = (event) => {
    event.stopPropagation();
    this.deleteImage();
  };

  deleteImage = (ondone) => {
    deleteImageFromDB(this.imageId, () => {
      const urlIndex = galleryUrls.indexOf(this.imageUrl);

      URL.revokeObjectURL(this.imageUrl);

      if (urlIndex !== -1) {
        galleryUrls.splice(urlIndex, 1);
      }

      this.remove();
      syncEmptyState();
      showSuccessFeedback("Deleted image");

      if (ondone) {
        ondone();
      }
    });
  };

  sync() {
    if (!this.isConnected || !this.imageUrl) return;

    this.img.src = this.imageUrl;
    this.img.id = `image${this.imageId}`;
    this.img.alt = this.imageAlt;
  }
}

customElements.define("gallery-item", GalleryItem);

const galleryUrls = [];
const galleryModal = new GalleryModal(container);

// navigation

export const showGallery = () => {
  section.style.display = "flex";
  section.classList.toggle("hidden", false);

  if (container.childElementCount > 0) {
    return;
  }

  loadImages((id, url) => {
    const item = document.createElement("img");
    const alt = `Illustration ${id}`;
    galleryUrls.push(url);
    item.setAttribute("src", url);
    item.setAttribute("alt", alt);

    item.classList.add("gallery-modal__image");

    container.appendChild(item);
    syncEmptyState();
  });
};

export const hideGallery = () => {
  galleryModal.close();
  galleryUrls.forEach((url) => URL.revokeObjectURL(url));
  galleryUrls.length = 0;
  section.style.display = "none";
  section.classList.toggle("hidden", true);
  container.innerHTML = "";
};

// DB connection mock

const loadImages = (handleImage) => {
  const images = [
    {
      id: 0,
      url: "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fimages8.alphacoders.com%2F407%2F407173.jpg&f=1&nofb=1&ipt=46609d734b6d488f2dce38766e2687d81672c30fb5b942b97cce5dfd6d9f8ab3",
    },
  ];
  images.forEach((image) => handleImage(image.id, image.url));
};
