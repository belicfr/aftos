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

function aftosStorageCreation() {
  const TL = gsap.timeline({ paused: false }),
        PROGRESS_BAR = $("#aftos_storage_creation .os-progress-bar > .bar");

  TL
    .to(PROGRESS_BAR, {
      duration: 2,
      delay: 1,

      width: "50%",

      ease: Power2.easeInOut,
    })
    .add(() => {
      $AftOSCore.createAftOSStorage();
    })
    .to(PROGRESS_BAR, {
      duration: 1,
      delay: 1,

      width: "100%",

      ease: Power3.easeInOut,
    })
    .add(() => {
      const NEXT_BUTTON = $("button#next_section");
      NEXT_BUTTON
        .text("Next")
        .removeAttr("disabled");
    })
    .play();
}