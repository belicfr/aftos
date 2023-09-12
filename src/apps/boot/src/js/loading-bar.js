const TL = gsap.timeline({ paused: false }),
      LOADING_BAR = document.querySelector(".loading-bar");

TL
  .to(LOADING_BAR, {
    delay: .5,
    duration: 3,

    width: "100%",

    ease: Power2.easeInOut,
  })
  .to(LOADING_BAR, {
    delay: 1,
    duration: .5,

    opacity: 0,
  })
  .add(() => {
    $InternalApps.openApp("lock");
  })
  .play();