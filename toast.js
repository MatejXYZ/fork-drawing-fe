const toast = document.querySelector("#toast");
const actionSuccessSound = document.querySelector("#editor-action-sound");

let toastTimeoutId = 0;

const modalVisibleTime = 2500;

const playSuccessSound = () => {
  if (!actionSuccessSound) return;

  actionSuccessSound.currentTime = 0;

  const playPromise = actionSuccessSound.play();
  if (playPromise) {
    playPromise.catch(() => {});
  }
};

export const showSuccessFeedback = (message) => {
  playSuccessSound();

  if (!toast) return;

  clearTimeout(toastTimeoutId);
  toast.textContent = message;
  toast.classList.remove("visible");
  void toast.offsetWidth;
  toast.classList.add("visible");

  toastTimeoutId = window.setTimeout(() => {
    toast.classList.remove("visible");
  }, modalVisibleTime);
};
