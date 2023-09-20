const APP = document.querySelector("#app");

let args = {
  hasHeader: false,
  resizable: true,
  isDraggable: false,
};
window.$Interface.createDefaultWindow("Hello!", args);

const DRAGGABLE_WINDOWS
  = document.querySelectorAll(".window-draggable");
