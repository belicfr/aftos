const TL = gsap.timeline({ paused: false }),
      LOCK_SCREEN = document.querySelector(".lock-screen"),
      OS_BATTERY
        = document.querySelector("#battery"),
      WIFI_NETWORK_ICON
        = document.querySelector("#network_wifi > i"),
      WIFI_NETWORK_NAME
        = document.querySelector("#network_wifi > span.network-name");

const INTERVAL_TIMEOUT = 1_000;

LOCK_SCREEN
  .style
  .background = "url('src/images/wallpaper.png') center / cover no-repeat";

$HostDevice.getHorizontalBatteryIcon()
  .then(battery => {
    OS_BATTERY.innerHTML = `${battery.icon}<span class="battery-level"></span>`;

    const OS_BATTERY_PROGRESS
        = document.querySelector("#battery .battery-level-progress"),
          OS_BATTERY_LABEL
        = document.querySelector("#battery span.battery-level");

    setInterval(() => {
      $HostDevice.getBattery()
        .then(data => {
          OS_BATTERY_PROGRESS
            .style
            .width = `${data.percent}%`;

          if (data.hasBattery) {
            let batteryLevelProgressColor,
              batteryLevelProgressContent;

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
            return $HostDevice.getPluggedBatteryIcon();
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
    }, INTERVAL_TIMEOUT);
  });

TL
  .to(LOCK_SCREEN, {
    delay: 1,
    duration: 0,

    display: "block",
  })
  .to(LOCK_SCREEN, {
    delay: 0,
    duration: .75,

    opacity: 1,
    scale: 1,
  })
  .play();