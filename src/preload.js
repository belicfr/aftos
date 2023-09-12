const { contextBridge } = require("electron"),
        path = require("path"),
        fs = require("fs");

// APIs ///////////

console.log("APP =", app);

const INTERNAL_APP_API = {
  ERROR_APP_NOT_EXISTS: {
    type: "error",
    message: "Given internal app name does not longer exist.",
  },

  openApp(appName) {
    const APP_PATH = INTERNAL_APP_API.getAppPathByName(appName);

    if (!fs.existsSync(APP_PATH)) {
      return INTERNAL_APP_API.ERROR_APP_NOT_EXISTS;
    }

    window.location = path.join(APP_PATH, "app.html");
  },

  getAppPathByName(appName) {
    return path.join(__dirname, "apps", appName);
  },
};

const USER_CONFIG_API = {
  getUserLockScreenWallpaper(userCode) {
    console.log(app.getPath("userData"));
  },
};

// EXPOSES ////////

contextBridge.exposeInMainWorld("$InternalApps", INTERNAL_APP_API);
contextBridge.exposeInMainWorld("$UserConfig", USER_CONFIG_API);