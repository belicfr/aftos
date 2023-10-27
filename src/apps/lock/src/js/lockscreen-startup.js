const TL = gsap.timeline({ paused: false }),
      APP = document.querySelector("#app"),
      LOCK_SCREEN = document.querySelector(".lock-screen"),
      TIME_LABEL = document.querySelector("#time"),
      OS_BATTERY
        = document.querySelector("#battery"),
      WIFI_NETWORK_ICON
        = document.querySelector("#network_wifi > i"),
      WIFI_NETWORK_NAME
        = document.querySelector("#network_wifi > span.network-name"),
      SESSION_CONTAINER
        = document.querySelector(".session-container"),
      OTHER_SESSIONS_CONTAINER
        = document.querySelector("#other_sessions"),
      WIDGETS = document.querySelector("#widgets");

const OS_INFORMATION_INTERVAL_TIMEOUT = 1_000,
      TIME_INTERVAL_TIMEOUT = 100;

/**
 * Focus a session from #other_sessions.
 * @param nameCode Session to focus name code
 */
function focusOnSession(nameCode) {
  const TL = gsap.timeline({paused: false});

  $UserConfig.getUserConfig(nameCode)
    .then(data => {
      $UserConfig.getUserPicture(nameCode)
        .then(picture => {
          const TL = gsap.timeline({paused: false}),
                FOCUSED_SESSION_PICTURE = $(".session-picture.focused");

          if (FOCUSED_SESSION_PICTURE.length) {
            TL
              .to(SESSION_CONTAINER, {
                delay: 0,
                duration: .5,

                y: 50,
                opacity: 0,

                ease: Power2.easeInOut,
              });
          }

          TL
            .add(() => {
              const CONTAINER_CONTENT = `
            <div class="session-picture" 
                 style="background: 
                          url('${picture}') center / cover no-repeat;"></div>
        
            <div class="session-display-name">
              ${data.name}
            </div>
        
            <div class="session-password-input">
              <form id="codename_login_form">
                <div class="login-input">
                  <input class="os-password-input"
                         type="password"
                         name="session_password"
                         id="session_password" />
                  
                  <button class="attempt-login" type="button">
                    <i class="fa-solid fa-angle-right"></i>
                  </button>
                </div>
              </form>
            </div>`;
              SESSION_CONTAINER.innerHTML = CONTAINER_CONTENT;
            })
            .to(SESSION_CONTAINER, {
              delay: 0,
              duration: .5,

              y: 0,
              opacity: 1,

              ease: Power2.easeInOut,
            })
            .play();
        });

      $UserConfig.getUserLockScreenWallpaper(nameCode)
        .then(wallpaper => {
          LOCK_SCREEN.style.background
            = `url("${wallpaper}") center / cover no-repeat`;
        });
    });

  if (WIDGETS.hasChildNodes()) {
    TL
      .to(WIDGETS, {
        delay: 0,
        duration: .5,

        y: 50,
        opacity: 0,
      });
  }

  TL
    .add(() => {
      $UserConfig.getUserWidgets(nameCode)
        .then(widgets => {
          WIDGETS.innerHTML = widgets;
        });
    })
    .to(WIDGETS, {
      delay: 0,
      duration: .5,

      y: 0,
      opacity: 1,
    })
    .play();
}

$Session.getAllSessions()
  .then(sessions => {
    sessions.forEach(nameCode => {
      $UserConfig.getUserPicture(nameCode)
        .then(picture => {
          const SESSION_PICTURE = `
            <div class="session-picture" 
                 session-name-code="${nameCode}"
                 style="background: 
                          url('${picture}') center / cover no-repeat;"></div>
          `;
          OTHER_SESSIONS_CONTAINER.innerHTML += SESSION_PICTURE;
        });
    })
  });

$(document).on("click",
               "#other_sessions > .session-picture:not(.focused)",
               e => {

  const FOCUSED_SESSION_PICTURE = $("#other_sessions > .session-picture.focused"),
        SESSION_PICTURE = $(e.target),
        NAME_CODE = SESSION_PICTURE.attr("session-name-code");

  FOCUSED_SESSION_PICTURE.removeClass("focused");
  SESSION_PICTURE.addClass("focused");

  focusOnSession(NAME_CODE);

});

setInterval(() => {
  TIME_LABEL.innerText = $Time.getCurrentTime();
}, TIME_INTERVAL_TIMEOUT);

$HostDevice.getHorizontalBatteryIcon()
  .then(battery => {
    setInterval(() => {
      $HostDevice.getBattery()
        .then(data => {
          if (data.hasBattery) {
            let batteryLevelProgressColor,
              batteryLevelProgressContent;

            OS_BATTERY.innerHTML = `${battery.icon}<span class="battery-level"></span>`;

            const OS_BATTERY_PROGRESS
                    = document.querySelector("#battery .battery-level-progress"),
                  OS_BATTERY_LABEL
                    = document.querySelector("#battery span.battery-level");

            OS_BATTERY_PROGRESS
              .style
              .width = `${data.percent}%`;

            if (data.acConnected) {
              batteryLevelProgressContent = `<i class="fa-solid fa-bolt"></i>`;
              batteryLevelProgressColor = "#40ce2d";
            } else {
              batteryLevelProgressContent = "";

              if (data.percent < 15) {
                batteryLevelProgressColor = "#df0000";
              } else if (data.percent < 30) {
                batteryLevelProgressColor = "#ffcd07";
              } else {
                batteryLevelProgressColor = "white";
              }
            }

            OS_BATTERY_PROGRESS
              .style
              .background = batteryLevelProgressColor;

            OS_BATTERY_PROGRESS
              .innerHTML = batteryLevelProgressContent;

            OS_BATTERY_LABEL.innerText = `${data.percent}%`;
          } else {
            OS_BATTERY.innerHTML = `<i class="fa-solid fa-plug-circle-bolt"></i>`;
          }
        });

      $HostDevice.getCurrentWifi()
        .then(data => {
          if (data !== null) {
            WIFI_NETWORK_ICON.style.color = "";
            WIFI_NETWORK_NAME.innerText = data.ssid;
          } else {
            WIFI_NETWORK_ICON.style.color = "red";
            WIFI_NETWORK_NAME.innerText = "No connected";
          }
        });
    }, OS_INFORMATION_INTERVAL_TIMEOUT);
  });

TL
  .to(APP, {
    delay: 1,
    duration: 0,

    display: "block",
  })
  .to(APP, {
    delay: 0,
    duration: .75,

    opacity: 1,
    scale: 1,
  })
  .to(OTHER_SESSIONS_CONTAINER, {
    delay: 0,
    duration: 1,

    opacity: 1,
    y: 0,

    ease: Power2.easeInOut,
  })
  .play();