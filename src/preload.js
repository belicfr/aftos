const { contextBridge, ipcRenderer }
          = require("electron"),
        path = require("path"),
        fs = require("fs"),
        fse = require("fs-extra"),
        bcrypt = require("bcrypt"),
        si = require("systeminformation"),
        moment = require("moment");

// PRIVATE ////////

function stringToHtml(htmlString) {
  let dom;
  dom = new DOMParser();

  return dom.parseFromString(htmlString, "text/html")
    .querySelector("body > .window");
}

// APIs ///////////

/** Internal API: path management. */
const PATH_API = {
  /** Prefixes to write short paths. */
  PREFIXES: {
    '@': path.join(__dirname),
  },

  /** HTML attributes that uses prefixes. */
  HTML_ATTRIBUTES: [
    "href",
    "src",
  ],

  /** RegEx for system element (.$). */
  REGEX_SYSTEM_ELEMENT_PREFIX: /^\.\$(.*)$/,

  /** RegEx for hidden element (.). */
  REGEX_HIDDEN_ELEMENT_PREFIX: /^\.(.*)$/,

  /**
   * Returns path with prefix translation.
   *
   * @param givenPath
   * @returns {*}
   */
  usePathPrefix(givenPath) {
    for (let prefix in PATH_API.PREFIXES) {
      givenPath = givenPath.replaceAll(prefix, PATH_API.PREFIXES[prefix]);
    }

    return givenPath;
  },

  /**
   * Open given HTML file path and returns its content.
   *
   * @param html HTML path to open
   * @returns {*}
   */
  loadPaths(html) {
    let domParser = new DOMParser();
    html = domParser.parseFromString(html, "text/html");

    let elements = $(html).find("*[href], *[src]");

    elements.each((elementIndex, element) => {
      PATH_API.HTML_ATTRIBUTES.forEach(attribute => {
        if (element.hasAttribute(attribute)) {
          let elementAttribute = element.getAttribute(attribute);
          element.setAttribute(attribute, PATH_API.usePathPrefix(elementAttribute));
        }
      });

      return html.head.innerHTML + html.body.innerHTML;
    });

    return html;
  },

  /**
   * @param elementName
   * @returns {boolean} If given file is a system one
   */
  isSystemElement(elementName) {
    console.log(elementName, PATH_API.REGEX_SYSTEM_ELEMENT_PREFIX, PATH_API.REGEX_SYSTEM_ELEMENT_PREFIX.test(elementName));
    return PATH_API.REGEX_SYSTEM_ELEMENT_PREFIX.test(elementName);
  },

  /**
   * @param elementName
   * @returns {boolean} If given file is hidden
   */
  isHiddenElement(elementName) {
    return PATH_API.REGEX_HIDDEN_ELEMENT_PREFIX.test(elementName);
  },

  scandir(path, options) {
    const DEFAULT_OPTIONS = {
      hidden: false,
      system: false,
    };

    options = {...DEFAULT_OPTIONS, ...options};

    let elements = fs.readdirSync(path);

    if (!options.system) {
      elements
        = elements.filter(element => !PATH_API.isSystemElement(element));
    }

    if (!options.hidden) {
      elements
        = elements.filter(element => !PATH_API.isHiddenElement(element));
    }

    return elements;
  },
};

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
    return Device.getUserDataPath()
      .then(data => {
        let device = new Device(data);

        const WALLPAPER_FOLDER_PATH
          = device.getUserSystemPath(userCode);

        return USER_CONFIG_API.getUserConfig(userCode)
          .then(data => {
            return path.join(WALLPAPER_FOLDER_PATH, data.wallpapers.lockscreen).replace(/\\/g, '/');
          });
      });
  },

  /**
   * Returns user desktop wallpaper.
   *
   * @param userCode
   */
  getUserDesktopWallpaper(userCode) {
    return Device.getUserDataPath()
      .then(data => {
        let device = new Device(data);

        const WALLPAPER_FOLDER_PATH
          = device.getUserSystemPath(userCode);

        return USER_CONFIG_API.getUserConfig(userCode)
          .then(data => {
            return path.join(WALLPAPER_FOLDER_PATH, data.wallpapers.desktop).replace(/\\/g, '/');
          });
      });
  },

  /**
   * Returns user session picture.
   *
   * @param userCode
   * @returns {Promise<string>}
   */
  getUserPicture(userCode) {
    return Device.getUserDataPath()
      .then(data => {
        let device = new Device(data);

        const PICTURE_FOLDER_PATH
          = device.getUserSystemPath(userCode);

        return USER_CONFIG_API.getUserConfig(userCode)
          .then(data => {
            return path.join(PICTURE_FOLDER_PATH, data.picture).replace(/\\/g, '/');
          });
      });
  },

  getUserConfig(userCode) {
    return Device.getUserDataPath()
      .then(data => {
        let device = new Device(data);

        console.log(device.getUserSystemPath(userCode))

        const CONFIG_FILE_PATH
          = path.join(device.getUserSystemPath(userCode), ".$session.json");

        if (fs.existsSync(CONFIG_FILE_PATH)) {
          const CONFIG_FILE_CONTENT
            = fs.readFileSync(CONFIG_FILE_PATH, { encoding: "utf-8" });

          return JSON.parse(CONFIG_FILE_CONTENT);
        }

        return new SystemError(106, `${userCode} configuration file opening attempt`);
      });
  },

  getUserWidgets(userCode) {
    return Session.getSessionWidgets(userCode)
      .then(widgets => {
        console.log("INSTALLED WIDGETS => ", widgets);
        let widgetsHTML = "";

        widgets.forEach(widget => {
          let widgetPath,
              widgetHTML;

          if (widget.isNative) {
            widgetPath
              = path.join(__dirname,
                          "native-widgets",
                          widget.source,
                          `${widget.size}.html`);

            widgetHTML
              = PATH_API.loadPaths(
                  fs.readFileSync(widgetPath, {encoding: "utf-8"})
              ).documentElement.innerHTML;
          } else {
            // TODO: set widget path for non native widgets.
          }

          widgetsHTML += widgetHTML;
        });

        return widgetsHTML;
      });
  },
};

/** Session API. */
const SESSION_API = {
  /**
   * Attempts to create new session.
   *
   * @param data New session data
   * @returns {Promise<string>}
   */
  createUser(data) {
    let name = data.find(field => field.name === "name").value,
      nameCode = data.find(field => field.name === "name_code").value,
      password = data.find(field => field.name === "password").value,
      passwordConfirmation
        = data.find(field => field.name === "password_confirmation").value;

    return Session.createSession(name, nameCode, password, passwordConfirmation);
  },

  /**
   * Attempts to log in with given information.
   *
   * @param nameCode
   * @param password
   * @returns {Promise<string>}
   */
  attemptLogin(nameCode, password) {
    return Session.attemptLogin(nameCode, password)
      .then(attempt => {
        if (attempt) {
          Device.getUserDataPath()
            .then(data => {
              let device = new Device(data),
                currentSessionFilePath = path.join(device.getAftOSRootPath(),
                  ".$current-session.json"),
                currentSessionData = {
                  nameCode,
                };

              fs.writeFileSync(currentSessionFilePath,
                               JSON.stringify(currentSessionData),
                               { encoding: "utf-8" });
            });
        }

        return attempt;
      });
  },

  /**
   * @returns {Promise<string[]>} All sessions promise
   */
  getAllSessions() {
    return Device.getUserDataPath()
      .then(data => {
        const DEVICE = new Device(data),
          ROOT_FOLDER = DEVICE.getAftOSRootPath();

        return PATH_API.scandir(ROOT_FOLDER);
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
   * @returns {Promise<boolean>} If AftOS is properly installed
   */
  isAftOSInstalled() {
    return Device.getUserDataPath()
      .then(data => {
        let device = new Device(data);
        return device.isAftOSInstalled();
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

  createAftOSStorage() {
    Device.getUserDataPath()
      .then(data => {
        const AFTOS_STORAGE_ROOT_PATH = data,
              AFTOS_STORAGE_BACKUP_PATH = path.join(__dirname, "backup/os-root"),
              AFTOS_STORAGE_BACKUP = fs.readdirSync(AFTOS_STORAGE_BACKUP_PATH);

        if (!fs.existsSync(AFTOS_STORAGE_BACKUP_PATH)) {
          return new SystemError(104, "AftOS installer (AftOS storage creation step)");
        }

        let elementPath;

        AFTOS_STORAGE_BACKUP.forEach(element => {
          elementPath = path.join(AFTOS_STORAGE_BACKUP_PATH, element);
          fse.copySync(elementPath, path.join(AFTOS_STORAGE_ROOT_PATH, element));
        });
      });
  },

  removeAftOSStorage() {
    Device.getUserDataPath()
      .then(data => {
        const AFTOS_STORAGE_ROOT_PATH = data;

        if (!fs.existsSync(AFTOS_STORAGE_ROOT_PATH)) {
          let error = new SystemError(105, "AftOS installer (old AftOS storage deletion step)");
          error.openErrorWindow();
        } else {
          fse.removeSync(AFTOS_STORAGE_ROOT_PATH);
        }
      });
  },
};

/** Interface API. */
const INTERFACE_API = {
  createDefaultWindow(title, args = {}, contentPath = null, props = {}) {
    let window = new Window(title, args, contentPath, props);
    window.createDefaultWindow();
    return window;
  },
};

/** Host device API. */
const HOST_DEVICE_API = {
  /**
   * @returns {Promise<Systeminformation.BatteryData>} Horizontal battery object
   */
  getHorizontalBatteryIcon() {
    return HOST_DEVICE_API.getBattery()
        .then(data => {
            return {
              icon: `
                <div class="os-battery-icon-container">
                  <div class="primary-part">
                    <div class="battery-level-progress" style="width: ${data.percent}%;"></div>
                  </div>
                  
                  <div class="secondary-part"></div>
                </div>
              `,
              level: `${data.percent}%`,
            };
        });
  },

  /**
   * @returns {Promise<Systeminformation.BatteryData>} Battery object
   */
  getBattery() {
    return si.battery()
      .then(data => {
        return data;
      });
  },

  getCurrentWifi() {
    return si.wifiConnections()
      .then(data => {
        return data.length
          ? data[0]
          : null;
      });
  },
};

/** Time API. */
const TIME_API = {
  getCurrentTime() {
    return moment().format("HH:mm");
  },
};

// EXPOSES ////////

$InternalApps = INTERNAL_APP_API;
$UserConfig = USER_CONFIG_API;
$Session = SESSION_API;
$AftOSCore = AFTOS_CORE_API;
$Interface = INTERFACE_API;
$HostDevice = HOST_DEVICE_API;
$Time = TIME_API;

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
  };

  constructor(userDataPath) {
    this.#userDataPath = userDataPath;
  };

  /**
   * @returns {string} AftOS root path
   */
  getAftOSRootPath() {
    return path.join(this.#userDataPath, "AftOS_Data/root");
  };

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
  };

  /**
   * @param userCode
   * @returns {string|SystemError} If user is not corrupt: user system
   *                               folder path ;
   *                               else: SystemError object
   */
  getUserSystemPath(userCode) {
    const USER_SYSTEM_PATH = path.join(this.getUserPath(userCode), ".$internal");

    return fs.existsSync(USER_SYSTEM_PATH)
      ? USER_SYSTEM_PATH
      : new SystemError(102);
  };

  /**
   * @returns {boolean} If AftOS is properly installed
   */
  isAftOSInstalled() {
    return fs.existsSync(this.getAftOSRootPath());
  };

  /**
   * Check if AftOS is installed.
   * If not: redirection to installer.
   */
  checkAftOSInstallation() {
    if (!this.isAftOSInstalled()) {
      const OPEN_INSTALLER = INTERNAL_APP_API
          .openApp("installer"),
            ERROR_REFERENCE = "INSTALLER_INTERNAL:103";

      if (AFTOS_CORE_API.isSystemError(OPEN_INSTALLER)) {
        INTERNAL_APP_API.openError(ERROR_REFERENCE);
      }
    }
  };
}

/**
 * AftOS UI window class.
 * Allows to create windows with respect of AftOS UI rules.
 *
 * @author belicfr
 */
class Window {
  /** Default arguments on Window instantiation. */
  static #defaultArgs = {
    size: {width: 800, height: 600},
    resizable: {x: false, y: false},
    hasHeader: true,
    isDraggable: true,
  };

  /** Window title. */
  #title;

  /** Window arguments. */
  #args;

  /** Window DOM object. */
  #window;

  /** Path to content HTML file. */
  #contentPath;

  /** Properties to use on window components. */
  #props;

  /**
   * @param title Window title
   * @param args Given window arguments
   * @param contentPath Path to HTML content file
   * @param props Properties to include on the window
   */
  constructor(title = "New window", args = {}, contentPath = null, props = {}) {
    this.#title = title;
    this.#args = { ...Window.#defaultArgs, ...args };
    this.#contentPath = contentPath;
    this.#props = props;
  };

  /**
   * @returns {string} Window title
   */
  getTitle() {
    return this.#title;
  };

  /**
   * @param newTitle New window title
   */
  setTitle(newTitle) {
    this.#title = newTitle;
  };

  /**
   * @returns {Number} Window width
   */
  getWidth() {
    return this.#args.size.width;
  };

  /**
   * @returns {Number} Window height
   */
  getHeight() {
    return this.#args.size.height;
  };

  /**
   * @returns {boolean} If the window is resizable horizontally
   */
  isHorizontalResizable() {
    return this.#args.resizable.x;
  };

  /**
   * @returns {boolean} If the window is resizable vertically
   */
  isVerticalResizable() {
    return this.#args.resizable.y;
  };

  /**
   * @returns {boolean} If the window has a header
   */
  hasHeader() {
    return this.#args.hasHeader;
  };

  /**
   * @returns {boolean} If the window is draggable
   */
  isDraggable() {
    return this.#args.isDraggable;
  };

  /**
   * @returns {string} Window content file path
   */
  getContentPath() {
    return this.#contentPath;
  };

  /**
   * @param newContentPath Window new content file path
   */
  setContentPath(newContentPath) {
    this.#contentPath = newContentPath;
  };

  /**
   * @returns {Object} Current window properties object
   */
  getProps() {
    return this.#props;
  };

  /**
   * @param props New window properties object
   */
  setProps(props = {}) {
    this.#props = props;
  };

  /**
   * Create and enable a window.
   * @returns {Object} Created window DOM element
   */
  createDefaultWindow() {
    const APP = document.querySelector("#app");

    const DEFAULT_WINDOW_TEMPLATE_PATH
      = path.join(__dirname, "components/windows/default.html");

    const DEFAULT_WINDOW_TEMPLATE_STRING
      = fs.readFileSync(DEFAULT_WINDOW_TEMPLATE_PATH, {encoding: "utf-8"});

    let defaultWindowTemplate;
    defaultWindowTemplate = stringToHtml(DEFAULT_WINDOW_TEMPLATE_STRING);

    // SIZE CSS ///////

    defaultWindowTemplate.style.width = `${this.#args.size.width}px`;

    defaultWindowTemplate.style.height = `${this.#args.size.height}px`;

    // RESIZE CSS /////

    if (this.#args.resizable.x && this.#args.resizable.y) {
      defaultWindowTemplate.style.resize = "both";
    } else if (this.#args.resizable.x && !this.#args.resizable.y) {
      defaultWindowTemplate.style.resize = "horizontal";
    } else if (!this.#args.resizable.x && this.#args.resizable.y) {
      defaultWindowTemplate.style.resize = "vertical";
    } else {
      defaultWindowTemplate.style.resize = "none";
    }

    // IS DRAGGABLE ///

    if (this.#args.isDraggable) {
      defaultWindowTemplate.classList.add("window-draggable");
    }

    // WINDOW ADDING //

    APP.append(defaultWindowTemplate);

    let currentWindow = $(".window:last-of-type");

    // HAS HEADER /////

    if (this.#args.hasHeader) {
      let windowTitle
        = currentWindow
          .children(".window-header")
          .children("p.window-title");

      windowTitle.text(this.#title);
    } else {
      defaultWindowTemplate.querySelector(".window-header").remove();
    }

    // WINDOW POS /////

    let xPosition = window.innerWidth / 2
      - currentWindow.width() / 2;

    let yPosition = window.innerHeight / 2
      - currentWindow.height() / 2;

    currentWindow
      .css("position", "fixed")
      .css("left", `${xPosition}px`)
      .css("top", `${yPosition}px`);

    this.#window = defaultWindowTemplate;

    // CONTENT ADDING /

    this.addContent();

    // PROPS ADDING ///

    this.updatePropsOnWindow();

    // DRAG ENABLING //

    if (this.#args.isDraggable) {
      this.enableLastDraggableWindow();
    }

    return defaultWindowTemplate;
  };

  /** Enable jQuery UI drag on last draggable window. */
  enableLastDraggableWindow() {
    $(() => {
      let dragArguments = {};

      let currentWindow = $(".window-draggable:last-of-type");

      if (this.#args.hasHeader) {
        dragArguments.handle = ".window-header";
      }

      currentWindow
        .draggable(dragArguments);
    });
  };

  addContent() {
    let createdWindow = $(this.#window),
        contentFilePath = path.join(__dirname, this.#contentPath);

    if (!fs.existsSync(contentFilePath)) {
      let error = new SystemError(201, `${this.#title} window content loading`);
      error.openErrorWindow();
    }

    let content = fs.readFileSync(contentFilePath, {encoding: "utf-8"});
    createdWindow
        .children(".window-body")
        .html(content);
    
    this.loadComponents();
  };

  loadComponents() {
    const REGEX_OS_DATA_ATTRIBUTE = RegExp("^os-data-([a-z]+)");

    let createdWindow = $(this.#window),
        componentTags = createdWindow.find("div[os-component]");

    componentTags.each((componentCallerIndex, componentCaller) => {
      let currentComponentFilename = $(componentCaller).attr("os-component"),
          currentComponentPath = path.join(__dirname, "components", currentComponentFilename),
          dataAttributes = componentCaller
            .getAttributeNames()
            .filter(attribute => REGEX_OS_DATA_ATTRIBUTE.test(attribute));

      if (fs.existsSync(currentComponentPath)) {
        $.get(currentComponentPath, (data, status) => {
          data = PATH_API.loadPaths(data);

          dataAttributes.forEach(attribute => {
            let attributeTagName = REGEX_OS_DATA_ATTRIBUTE.exec(attribute)[1];

            data.documentElement.innerHTML = data
              .documentElement
              .innerHTML
              .replaceAll(`{{${attributeTagName}}}`, $(componentCaller).attr(attribute));
          });

          $(componentCaller).replaceWith(data.head.innerHTML + data.body.innerHTML);
        });
      }
    });
  };

  updatePropsOnWindow() {
    let prop,
        windowHtml,
        domParser;

    windowHtml = this.#window.outerHTML;

    for (let propKey in this.#props) {
      prop = this.#props[propKey];

      windowHtml = windowHtml.replaceAll(`{{${propKey}}}`, prop);
    }

    $(this.#window).html($(windowHtml).html());
  };
}

/**
 * System Error class.
 * Allows to generate and return AftOS errors without generic exceptions.
 * It follows AftOS system message syntax and rules.
 *
 * @author belicfr
 */
class SystemError {
  /** Messages list linked to error codes. */
  static #messages = {
    // 1xx -> Internal OS error
    101: "Given user code does not longer exist.",
    102: "Given user session is corrupted.",
    103: "Given internal app name does not longer exist.",
    104: "AftOS storage backup does not longer exist.",
    105: "AftOS storage does not longer exist.",
    106: "This session does not have any configuration file. Session corrupted.",

    // 2xx -> Windows manager error
    201: "The windows can't be loaded: its content is undefined.",

    // 3xx -> Session error
    301: "Session already exists.",
    302: "Your passwords must be same.",
    303: "Your password must be at least 8 characters long.",
    304: "Your name must be in lower case, with no spaces. Special" +
      " characters allowed are _ and -.",
  };

  /** Error pages list linked to error references. */
  static #references = {
    "LOCK_INTERNAL:103": "error-lock-opening.html",
    "INSTALLER_INTERNAL:103": "error-installer-opening.html",
  };

  /**
   * Returns the error page filename linked with given reference.
   *
   * @param reference
   * @returns {string} Error page filename (relative path from
   *                   errors-manager internal app)
   */
  static getErrorPage(reference) {
    return SystemError.#references[reference];
  };

  /** Error code. */
  #code;

  /** Error trigger location. */
  #location;

  /**
   * @param code Error code
   * @param location Error custom location, by default: "Internal"
   */
  constructor(code, location = "Internal") {
    this.#code = code;
    this.#location = location;
  };

  /**
   * @returns {number} Error code
   */
  getCode() {
    return this.#code;
  };

  /**
   * @returns {string} Error message
   */
  getMessage() {
    const MESSAGE = SystemError.#messages[this.#code];

    return MESSAGE !== undefined
      ? MESSAGE
      : "Unknown error";
  };

  /**
   * @returns {string} Error location
   */
  getLocation() {
    return this.#location;
  };

  /**
   * Open error instance window.
   */
  openErrorWindow() {
    const ERROR_WINDOW_COMPONENT_PATH = "components/error/error-window.html",
          ERROR_WINDOW_ARGS = {
            hasHeader: true,
            size: {width: 500, height: 300},
            resizable: {x: false, y: false},
            isDraggable: true,
          },
          ERROR_WINDOW_PROPS = {
            errorMessage: this.getMessage(),
            errorLocation: this.#location,
            errorCode: this.#code,
          };

    let errorWindow = new Window("AftOS error",
                                 ERROR_WINDOW_ARGS,
                                 ERROR_WINDOW_COMPONENT_PATH,
                                 ERROR_WINDOW_PROPS);

    $(errorWindow.createDefaultWindow())
      .find(".error-icon")
      .css("background",
           `url('${path.join(__dirname, "components/error/src/images/error.png")}') center / cover no-repeat`);
  };

  /**
   * Create and returns an error message that follows AftOS messages syntax
   * and rules.
   * @returns {string} Error detailed message
   */
  toString() {
    return `AftOS Internal Error!
            Message: ${this.getMessage()}
            Location: ${this.#location}`;
  };
}

/**
 * Session class.
 * Allows to create, manage and delete AftOS sessions.
 *
 * @author belicfr
 */
class Session {
  /** Regular Expression for name code. */
  static #REGEX_NAME_CODE = /^([a-z0-9_-]{1,25})$/;

  /**
   * Attempt to create a new session with given information.
   *
   * @param name Display name
   * @param nameCode Name code (unique)
   * @param password Password
   * @param passwordConfirmation Password confirmation
   * @returns {Promise<string>}
   */
  static createSession(name, nameCode, password, passwordConfirmation) {
    return Device.getUserDataPath()
      .then(data => {
        let device = new Device(data);
        let possibleSessionPath
          = path.join(device.getAftOSRootPath(), nameCode);

        /* Name code already used. */
        if (fs.existsSync(possibleSessionPath)) {
          return new SystemError(301, "name_code");
        }

        /* Name code syntax error. */
        if (!Session.#REGEX_NAME_CODE.test(nameCode)) {
          return new SystemError(304, "name_code");
        }

        /* Passwords don't match. */
        if (password !== passwordConfirmation) {
          return new SystemError(302, "password");
        }

        /* Password has less than 8 characters. */
        if (password.length < 8) {
          return new SystemError(303, "password");
        }

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(password, salt, (err, hash) => {
            fs.mkdirSync(possibleSessionPath);

            let sessionData = JSON.stringify({
              name,
              picture: "picture.png",
              wallpapers: {
                lockscreen: "lock-wallpaper.png",
                desktop: "wallpaper.png",
              },
            });

            let sessionSensitive = JSON.stringify({
              hash,
            });

            let sessionBackup = path.join(__dirname, "backup/os-session"),
                sessionBackupContent = fs.readdirSync(sessionBackup);

            sessionBackupContent
              .forEach(element => {
                fse.copySync(path.join(sessionBackup, element),
                             path.join(possibleSessionPath, element));
              });

            fs.writeFileSync(path.join(possibleSessionPath, ".$internal", ".$session.json"), sessionData);
            fs.writeFileSync(path.join(possibleSessionPath, ".$internal", ".$sensitive.json"), sessionSensitive);
          });
        });

        return true;
      });
  };

  /**
   * Attempt to log in with given information.
   *
   * @param nameCode Session name code
   * @param password Session password
   * @returns {Promise<string>}
   */
  static attemptLogin(nameCode, password) {
    return Device.getUserDataPath()
      .then(data => {
        const DEVICE = new Device(data),
              SESSION_SENSITIVE_FILE_PATH
                = path.join(DEVICE.getUserSystemPath(nameCode), ".$sensitive.json");

        if (fs.existsSync(SESSION_SENSITIVE_FILE_PATH)) {
          const SESSION_SENSITIVE
            = JSON.parse(fs.readFileSync(SESSION_SENSITIVE_FILE_PATH, {encoding: "utf-8"}));

          return bcrypt.compareSync(password, SESSION_SENSITIVE.hash)
            ? new Session(nameCode)
            : false;  // TODO: return SystemError
        } else {
          console.error("Session does not longer exist.");
          return false;  // TODO: error session does not exist.
        }
      });
  };

  static canShowWidgetsOnLockscreen(nameCode) {
    return Device.getUserDataPath()
      .then(data => {
        const DEVICE = new Device(data),
          WIDGETS_CONFIGURATION_PATH = path.join(
            DEVICE.getUserSystemPath(nameCode),
            "widgets.json"
          );

        let widgetsConfiguration
          = JSON.parse(fs.readFileSync(WIDGETS_CONFIGURATION_PATH,
          {encoding: "utf-8"}));

        return widgetsConfiguration.showOnLockscreen;
      });
  };

  static getSessionWidgets(nameCode) {
    return Session.canShowWidgetsOnLockscreen(nameCode)
      .then(canShow => {
        if (canShow) {
          return Device.getUserDataPath()
            .then(data => {
              const DEVICE = new Device(data),
                WIDGETS_CONFIGURATION_PATH = path.join(
                  DEVICE.getUserSystemPath(nameCode),
                  "widgets.json"
                );

              let widgetsConfiguration
                = JSON.parse(fs.readFileSync(WIDGETS_CONFIGURATION_PATH,
                {encoding: "utf-8"}));

              return widgetsConfiguration.installed;
            });
        }

        return [];
      });
  };

  /** Current session name code. */
  #currentSessionNameCode;

  constructor(nameCode) {
    this.#currentSessionNameCode = nameCode;
  };

  getCurrentSessionNameCode() {
    return this.#currentSessionNameCode;
  };
}