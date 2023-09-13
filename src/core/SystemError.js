/**
 * System Error class.
 * Allows to generate and return AftOS errors without generic exceptions.
 * It follows AftOS system message syntax and rules.
 *
 * @author belicfr
 */
class SystemError {
  /** Error code. */
  #code;

  /** Error trigger location. */
  #location;

  /** Messages list linked to error codes. */
  #messages = {
    101: "Given user code does not longer exist.",
    102: "Given user session is corrupted.",
  };

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
    const MESSAGE = this.#messages[this.#code];

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