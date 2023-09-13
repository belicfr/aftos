const { contextBridge, ipcRenderer } = require("electron"),
        path = require("path"),
        fs = require("fs"),
      { SystemError } = require("/src/core/SystemError");

// APIs ///////////

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
    Device.getUserDataPath()
      .then(data => {
        const WALLPAPER_FOLDER_PATH = path.join(data, "AftOS_Data/root", userCode, "system/Wallpaper");

        console.log(fs.existsSync(path.join(WALLPAPER_FOLDER_PATH, )));
      });
  },
};

// EXPOSES ////////

contextBridge.exposeInMainWorld("$InternalApps", INTERNAL_APP_API);
contextBridge.exposeInMainWorld("$UserConfig", USER_CONFIG_API);

// INTERNALS //////

// TODO: SYSTEMERROR!!

/**
 * Host device class.
 * Allows to get host OS specific information.
 *
 * @author belicfr
 */
class Device {
  /**
   * @returns {Promise<string>} Host userData path
   */
  static getUserDataPath() {
    return ipcRenderer.invoke("getDeviceUserDataPath");
  }

  /**
   * @param userDataPath
   * @returns {string} AftOS root path
   */
  static getAftOSRootPath(userDataPath) {
    return path.join(userDataPath, "AftOS_Data/root");
  }

  /**
   * @param userCode
   * @returns {string|SystemError} If user exists: user root path ;
   *                               else: SystemError object
   */
  static getUserPath(userCode) {
    const USER_PATH = path.join(Device.getAftOSRootPath(), userCode);

    return fs.existsSync(USER_PATH)
      ? USER_PATH
      : new SystemError(101);
  }

  /**
   * @param userCode
   * @returns {string|SystemError} If user is not corrupt: user system folder path ;
   *                               else: SystemError object
   */
  static getUserSystemPath(userCode) {
    const USER_SYSTEM_PATH = path.join(Device.getUserPath(userCode), "system");

    return fs.existsSync(USER_SYSTEM_PATH)
      ? USER_SYSTEM_PATH
      : new SystemError(102);
  }
}