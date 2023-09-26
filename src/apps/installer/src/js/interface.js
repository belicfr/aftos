const APP = document.querySelector("#app"),
      SECTIONS = [
        "src/windows/setup/hello-world.html",
        "src/windows/setup/terms.html",
      ];

let currentSectionIndex = 0;

$(document).on("click", "button#previous_section", () => {  console.log("prev attempt");
  if (currentSectionIndex > 0) {  console.log("PREVIOUS SECTION!");
    currentSectionIndex--;
    installerWindow.setContentPath(SECTIONS[currentSectionIndex]);
    installerWindow.addContent();
  }
});

$(document).on("click", "button#next_section", () => {  console.log("next attempt");
  if (currentSectionIndex < SECTIONS.length) {  console.log("NEXT SECTION!");
    currentSectionIndex++
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