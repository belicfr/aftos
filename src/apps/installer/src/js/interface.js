const APP = document.querySelector("#app");

let args = {
  hasHeader: false,
  resizable: {x: false, y: false},
  isDraggable: false,
};
window.$Interface.createDefaultWindow("Hello!", args, "windows/setup/window.html");

const DRAGGABLE_WINDOWS
  = document.querySelectorAll(".window-draggable");
