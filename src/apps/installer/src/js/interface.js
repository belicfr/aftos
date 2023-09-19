const APP = document.querySelector("#app");

window.$Interface.createDefaultWindow("Hello!");

const DRAGGABLE_WINDOWS
  = document.querySelectorAll(".window-draggable");

DRAGGABLE_WINDOWS.forEach(window => {
  window.$Interface.enableDrag(window, )
});