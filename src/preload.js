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

/** Internal API: path management. */
const PATH_API = {
  PREFIXES: {
    '@': path.join(__dirname),
  },

  HTML_ATTRIBUTES: [
    "href",
    "src",
  ],

  usePathPrefix(givenPath) {
    for (let prefix in PATH_API.PREFIXES) {
      givenPath = givenPath.replaceAll(prefix, PATH_API.PREFIXES[prefix]);
    }

    return givenPath;
  },

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

        console.log("TEST", device.getUserSystemPath(userCode))

        const WALLPAPER_FOLDER_PATH
          = path.join(device.getUserSystemPath(userCode), "Wallpaper");

        USER_CONFIG_API.getUserConfig(userCode)
          .then(data => {
            console.log("DATA", data);
          });

        return "";
      });
  },

  getUserConfig(userCode) {
    return Device.getUserDataPath()
      .then(data => {
        let device = new Device(data);

        const CONFIG_FILE_PATH
          = path.join(device.getUserSystemPath(userCode), "config.json");

        const CONFIG_FILE_CONTENT
          = fs.readFileSync(CONFIG_FILE_PATH, { encoding: "utf-8" });

        return JSON.parse(CONFIG_FILE_CONTENT);
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
  createDefaultWindow(title, args = {}, contentPath = null) {
    let window = new Window(title, args, contentPath);
    window.createDefaultWindow();
    return window;
  },

  getComponent(name) {
    const COMPONENT_PATH = path.join(__dirname, "components", name);
  },
};

// EXPOSES ////////

$InternalApps = INTERNAL_APP_API;
$UserConfig = USER_CONFIG_API;
$AftOSCore = AFTOS_CORE_API;
$Interface = INTERFACE_API;

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
   * @returns {string|SystemError} If user is not corrupt: user system folder path ;
   *                               else: SystemError object
   */
  getUserSystemPath(userCode) {
    const USER_SYSTEM_PATH = path.join(this.getUserPath(userCode), "system");

    return fs.existsSync(USER_SYSTEM_PATH)
      ? USER_SYSTEM_PATH
      : new SystemError(102);
  };

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

  /**
   * @param title Window title
   * @param args Given window arguments
   * @param contentPath Path to HTML content file
   */
  constructor(title = "New window", args = {}, contentPath = null) {
    this.#title = title;
    this.#args = { ...Window.#defaultArgs, ...args };
    this.#contentPath = contentPath;
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
        internalAppRootPath = path.dirname(decodeURIComponent(window.location.pathname)),
        contentFilePath = path.join(internalAppRootPath, this.#contentPath);

    if (!fs.existsSync(contentFilePath)) {
      return new SystemError(201, `${this.#title} window content loading`);
    }

    let content = fs.readFileSync(contentFilePath, {encoding: "utf-8"});

    createdWindow
        .children(".window-body")
        .html(content);
    
    console.log(this.#contentPath);

    this.loadComponents();
  };

  loadComponents() {
    let createdWindow = $(this.#window),
        componentTags = createdWindow.find("div[os-component]");

    componentTags.each((componentCallerIndex, componentCaller) => {
      let currentComponentFilename = $(componentCaller).attr("os-component"),
          currentComponentPath = path.join(__dirname, "components", currentComponentFilename);

      if (fs.existsSync(currentComponentPath)) {
        $.get(currentComponentPath, (data, status) => {
          data = PATH_API.loadPaths(data);
          $(componentCaller).replaceWith(data.head.innerHTML + data.body.innerHTML);
        });
      }
    });
  };
}
