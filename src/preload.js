const { contextBridge, ipcRenderer } = require("electron"),
        path = require("path"),
        fs = require("fs"),
        SystemError = require("./core/SystemError");

// APIs ///////////

/** AftOS internal tools API. */
const INTERNAL_APP_API = {
  /**
   * Open an internal application.
   *
   * @param appName
   * @returns {SystemError} If application can't be opened
   */
  openApp(appName) {
    const APP_PATH = INTERNAL_APP_API.getAppPathByName(appName);

    if (!fs.existsSync(APP_PATH)) {
      return new SystemError(103, `"${appName} opening attempt."`);
    }

    window.location = path.join(APP_PATH, "app.html");
  },

  /**
   * Returns application path with its name.
   *
   * @param appName
   * @returns {string} Application path
   */
  getAppPathByName(appName) {
    return path.join(__dirname, "apps", appName);
  },
};

/** User configuration API. */
const USER_CONFIG_API = {
  /**
   * Returns user lockscreen wallpaper.
   *
   * @param userCode
   */
  getUserLockScreenWallpaper(userCode) {
    Device.getUserDataPath()
      .then(data => {
        let device = new Device(data);

        const WALLPAPER_FOLDER_PATH
          = path.join(device.getUserSystemPath(userCode), "");

        console.log(fs.existsSync(path.join(WALLPAPER_FOLDER_PATH, )));
      });
  },
};

const AFTOS_CORE_API = {
  checkAftOSInstallation() {
    Device.getUserDataPath()
        .then(data => {
          let device = new Device(data);
          device.checkAftOSInstallation();
        });
  },
};

// EXPOSES ////////

contextBridge.exposeInMainWorld("$InternalApps", INTERNAL_APP_API);
contextBridge.exposeInMainWorld("$UserConfig", USER_CONFIG_API);
contextBridge.exposeInMainWorld("$AftOSCore", AFTOS_CORE_API);

// INTERNALS //////

/**
 * Host device class.
 * Allows to get host OS specific information.
 *
 * @author belicfr
 */
class Device {
  #userDataPath;

  /**
   * @returns {Promise<string>} Host userData path
   */
  static getUserDataPath() {
    return ipcRenderer.invoke("getDeviceUserDataPath");
  }

  constructor(userDataPath) {
    this.#userDataPath = userDataPath;
  }

  /**
   * @returns {string} AftOS root path
   */
  getAftOSRootPath() {
    return path.join(this.#userDataPath, "AftOS_Data/root");
  }

  /**
   * @param userCode
   * @returns {string|SystemError} If user exists: user root path ;
   *                               else: SystemError object
   */
  getUserPath(userCode) {
    const USER_PATH = path.join(this.getAftOSRootPath(), userCode);

    return fs.existsSync(USER_PATH)
      ? USER_PATH
      : new SystemError(101);
  }

  /**
   * @param userCode
   * @returns {string|SystemError} If user is not corrupt: user system folder path ;
   *                               else: SystemError object
   */
  getUserSystemPath(userCode) {
    const USER_SYSTEM_PATH = path.join(this.getUserPath(userCode), "system");

    return fs.existsSync(USER_SYSTEM_PATH)
      ? USER_SYSTEM_PATH
      : new SystemError(102);
  }

  /**
   * Check if AftOS is installed.
   * If not: redirection to installer.
   */
  checkAftOSInstallation() {
    if (!fs.existsSync(this.getAftOSRootPath())) {
      // TODO: redirect to installer!!
    }
  }
}