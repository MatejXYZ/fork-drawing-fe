const section = document.querySelector("#drafts");

export const showDrafts = () => {
	section.style.display = "flex";
	section.classList.toggle("hidden", false);
};

export const hideDrafts = () => {
	section.style.display = "none";
	section.classList.toggle("hidden", true);
};
