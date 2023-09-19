const { contextBridge, ipcRenderer } = require("electron"),
        path = require("path"),
        fs = require("fs"),
        SystemError = require("./core/SystemError");

// PRIVATE ////////

function stringToHtml(htmlString) {
  let dom;
  dom = new DOMParser();

  return dom.parseFromString(htmlString, "text/html")
    .querySelector("body > .window");
}

// APIs ///////////

/** AftOS internal tools API. */
const INTERNAL_APP_API = {
  /**
   * Open an internal application.
   *
   * @param appName
   * @returns {SystemError} If internal app does no longer exist:
   *                        a SystemError instance
   */
  openApp(appName) {
    const APP_PATH = INTERNAL_APP_API.getAppPathByName(appName);

    if (!fs.existsSync(APP_PATH)) {
      return new SystemError(103, `"${appName} opening attempt."`);
    }

    window.location = path.join(APP_PATH, "app.html");
  },

  openError(reference) {
    const ERROR_PAGE_PATH = INTERNAL_APP_API.getAppPathByName("errors-manager");

    if (!fs.existsSync(ERROR_PAGE_PATH)) {
      console.error("FATAL: ErrorsManager does no longer exist! Critical error.\n"
                  + "REFERENCE: ERRORS_MANAGER_INTERNAL:103");
      return;
    }

    window.location = path.join(ERROR_PAGE_PATH, SystemError.getErrorPage(reference));
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

/** AftOS core API. */
const AFTOS_CORE_API = {
  /**
   * Check if host device has an AftOS correct installation.
   */
  checkAftOSInstallation() {
    Device.getUserDataPath()
        .then(data => {
          let device = new Device(data);
          device.checkAftOSInstallation();
        });
  },

  /**
   * Returns if given object is a SystemError instance.
   *
   * @param object Object to check
   * @returns {boolean} If it is a SystemError instance
   * @see SystemError
   */
  isSystemError(object) {
    return object instanceof SystemError;
  },
};

/** Interface API. */
const INTERFACE_API = {
  createDefaultWindow(givenArgs) {

    const DEFAULT_WINDOW_TEMPLATE_PATH
      = path.join(__dirname, "components/windows/default.html");

    const DEFAULT_WINDOW_TEMPLATE_STRING
      = fs.readFileSync(DEFAULT_WINDOW_TEMPLATE_PATH, {encoding: "utf-8"});

    const DEFAULT_ARGS = {
      size: {width: 800, height: 600},
      resizable: {x: false, y: false},
      hasHeader: true,
      isDraggable: true,
    };

    let defaultWindowTemplate;

    let args;

    defaultWindowTemplate = stringToHtml(DEFAULT_WINDOW_TEMPLATE_STRING);
    args = { ...DEFAULT_ARGS, ...givenArgs };

    // SIZE CSS ///////

    defaultWindowTemplate.style.width = `${args.size.width}px`;
    defaultWindowTemplate.style.height = `${args.size.height}px`;

    // RESIZE CSS /////

    if (args.resizable.x && args.resizable.y) {
      defaultWindowTemplate.style.resize = "both";
    } else if (args.resizable.x && !args.resizable.y) {
      defaultWindowTemplate.style.resize = "horizontal";
    } else if (!args.resizable.x && args.resizable.y) {
      defaultWindowTemplate.style.resize = "vertical";
    } else {
      defaultWindowTemplate.style.resize = "none";
    }

    // HAS HEADER /////

    if (!args.hasHeader) {
      defaultWindowTemplate.querySelector(".window-header").remove();
    }

    // IS DRAGGABLE ///

    if (args.isDraggable) {
      $(() => {
        let dragArguments = {};

        if (args.hasHeader) {
          dragArguments.handle = ".window-header";
        }

        $(defaultWindowTemplate).draggable(dragArguments);
      });
    }

    return defaultWindowTemplate.outerHTML;

  },
};

// EXPOSES ////////

window.$InternalApps = INTERNAL_APP_API;
window.$UserConfig = USER_CONFIG_API;
window.$AftOSCore = AFTOS_CORE_API;
window.$Interface = INTERFACE_API;

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
      const OPEN_INSTALLER = INTERNAL_APP_API.openApp("installer"),
            ERROR_REFERENCE = "INSTALLER_INTERNAL:103";

      if (AFTOS_CORE_API.isSystemError(OPEN_INSTALLER)) {
        INTERNAL_APP_API.openError(ERROR_REFERENCE);
      }
    }
  }
}