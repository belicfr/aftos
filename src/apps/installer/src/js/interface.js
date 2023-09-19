const APP = document.querySelector("#app");

APP.innerHTML += window.$Interface.createDefaultWindow({
  hasHeader: false,
  isDraggable: true,
});