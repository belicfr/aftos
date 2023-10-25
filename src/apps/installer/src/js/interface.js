const APP = document.querySelector("#app"),
      SECTIONS = [
        "apps/installer/src/windows/setup/hello-world.html",
        "apps/installer/src/windows/setup/terms.html",
        "apps/installer/src/windows/setup/aftos-storage-creation.html",
        "apps/installer/src/windows/setup/admin-session-creation.html",
        "apps/installer/src/windows/setup/final.html",
      ];

let currentSectionIndex = 0;

function previousSection() {
  if (currentSectionIndex > 0) {
    currentSectionIndex--;
    installerWindow.setContentPath(SECTIONS[currentSectionIndex]);
    installerWindow.addContent();
  }
}

function nextSection() {
  if (currentSectionIndex < SECTIONS.length - 1) {
    currentSectionIndex++;
    installerWindow.setContentPath(SECTIONS[currentSectionIndex]);
    installerWindow.addContent();
  }
}

function finishInstaller() {
  $InternalApps.openApp("boot");
}

$(document).on("click",
               "button#previous_section",
               previousSection);

$(document).on("click",
               "button#next_section",
               nextSection);

$(document).on("click",
               "button#finish_installer",
               finishInstaller);

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

/**
 * AftOS storage creation step.
 */
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
        .add(() => {
          STEP_PRECISION
            .text("AftOS storage creation...");
        })
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

/**
 * New session form animations (logo translating, etc.).
 */
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

/**
 * New session form usage (onSubmit).
 */
function newSessionForm() {
  $(document)
    .on("submit", "form#admin_session_creation_form", e => {
      e.preventDefault();

      const DATA = $(e.currentTarget).serializeArray();

      removeFieldsErrors();

      $Session.createUser(DATA)
        .then(data => {
          if ($AftOSCore.isSystemError(data)) {
            addErrorToField(data.getLocation(), data.getMessage());
          } else {
            nextSection();
          }
        });
    });

  isNewSessionFormListenerRegistered = true;
}

function addErrorToField(fieldName, errorMessage) {
  $(`input[name="${fieldName}"]`)
    .css("border-color", "red")
    .parent("label")
    .css("color", "red")
    .children("p.error-message")
    .text(errorMessage);
}

function removeFieldsErrors() {
  $("input")
    .each((_, input) => {
      $(input)
        .css("border-color", "")
        .parent("label")
        .css("color", "")
        .children("p.error-message")
        .text("");
    });
}