const APP = document.querySelector("#app"),
      SECTIONS = [
        "src/windows/setup/hello-world.html",
        "src/windows/setup/terms.html",
        "src/windows/setup/aftos-storage-creation.html",
        "src/windows/setup/admin-session-creation.html",
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

$AftOSCore.isAftOSInstalled()
  .then(state => {
    if (state) {
      $("#hello_world > .main").append(
        `<div class="os-warn">
          <div class="warn-icon"></div>
          <div class="warn-content">
            <p>
              Attention! AftOS is already installed.
            </p>
          </div>
        </div>`);
    }
  });

installerWindow.loadComponents();

function aftosStorageCreation() {
  const TL = gsap.timeline({ paused: false }),
        PROGRESS_BAR = $("#aftos_storage_creation .os-progress-bar > .bar"),
        NEXT_BUTTON = $("button#next_section"),
        STEP_PRECISION = $("p.step-precision");

  $AftOSCore.isAftOSInstalled()
    .then(state => {
      if (state) {
        TL
          .add(() => {
            STEP_PRECISION
              .text("Old AftOS storage deleting...");

            $AftOSCore.removeAftOSStorage();
          })
          .to(PROGRESS_BAR, {
            duration: 3,
            delay: 1,

            width: "25%",

            ease: Power3.easeInOut,
          });
      }

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
          STEP_PRECISION
            .text("AftOS storage created!");

          NEXT_BUTTON
            .text("Next")
            .removeAttr("disabled");
        })
        .play();
    });
}

function newSessionAnimation() {
  const TL = gsap.timeline({ paused: false }),
        ICON_CONTAINER_ELEMENTS = $("#session_icon > *");

  TL
    .from(ICON_CONTAINER_ELEMENTS, {
      delay: .5,
      duration: 2,

      opacity: 0,
      y: 100,

      ease: Power2.easeInOut,
      stagger: .2,
    })
}