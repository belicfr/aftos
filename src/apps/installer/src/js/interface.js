const APP = document.querySelector("#app"),
      SECTIONS = [
        "src/windows/setup/hello-world.html",
        "src/windows/setup/terms.html",
        "src/windows/setup/aftos-storage-creation.html",
      ];

let currentSectionIndex = 0;

$(document).on("click", "button#previous_section", () => {
  if (currentSectionIndex > 0) {
    currentSectionIndex--;
    installerWindow.setContentPath(SECTIONS[currentSectionIndex]);
    installerWindow.addContent();
  }
});

$(document).on("click", "button#next_section", () => {
  if (currentSectionIndex < SECTIONS.length) {
    currentSectionIndex++;
    installerWindow.setContentPath(SECTIONS[currentSectionIndex]);
    installerWindow.addContent();
  }
});

let args = {
  hasHeader: false,
  resizable: {x: false, y: false},
  isDraggable: false,
};

let installerWindow
  = $Interface.createDefaultWindow("Hello, AftOS!", args, SECTIONS[currentSectionIndex]);