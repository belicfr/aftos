const TL = gsap.timeline({ paused: false }),
      LOCK_SCREEN = document.querySelector(".lock-screen");

$UserConfig.getUserLockScreenWallpaper("dev");

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