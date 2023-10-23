const TL = gsap.timeline({ paused: false }),
      LOCK_SCREEN = document.querySelector(".lock-screen"),
      OS_BATTERY = document.querySelector(".lock-screen > .os-information > .battery");

LOCK_SCREEN
  .style
  .background = "url('src/images/wallpaper.png') center / cover no-repeat";

$HostDevice.getHorizontalBatteryIcon()
    .then(data => {  console.log(data);
        OS_BATTERY.innerHTML = `
            ${data.icon}
            <span class="battery-level">${data.level}</span>
        `;
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