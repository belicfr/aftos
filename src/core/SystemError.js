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

    // 2xx -> Windows manager error
    201: "The windows can't be loaded: its content is undefined.",
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
  }

  /**
   * @returns {string} Error message
   */
  getMessage() {
    const MESSAGE = SystemError.#messages[this.#code];

    return MESSAGE === undefined
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

module.exports = SystemError;