/**
 * Ensures that the provided value for field is a string.
 *
 * @param value - input field
 * @param message - optional message to include in the error
 * @throws {Error} - throws if field is not a string
 */
export function assertString(value: unknown, message?: string): asserts value is string {
  if (typeof value !== 'string') {
    throw Error(message || 'Input must be string');
  }
}

/**
 * Ensures that the provided value for field is a non-empty string.
 *
 * @param value - input field
 * @param message - optional message to include in the error
 * @throws {Error} - throws if field is not a string
 */
export function assertNonEmptyString(value: unknown, message?: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw Error(message || 'Input must be non-empty string');
  }
}

/**
 * Ensures that the input parameter is not undefined.
 *
 * @param input - the input param
 * @param message - optional message to include in the error
 * @throws {Error} - throws if input is not a undefined
 */
export function assertNotUndefined(input: unknown, message?: string): asserts input {
  if (input === undefined) {
    throw new Error(message || 'Input is undefined');
  }
}

/**
 * Ensures that the provided value is an array.
 *
 * @param input - input value
 * @param message - optional message to include in the error
 * @throws {Error} - throws if input is not an array
 */
export function assertArray(input: unknown, message?: string): asserts input is any[] {
  if (!Array.isArray(input)) {
    throw new Error(message || 'Input is not an array');
  }
}

/**
 * Ensures that the provided value is an object.
 *
 * @param input - input value
 * @param message - optional message to include in the error
 * @throws {Error} - throws if input is not an object
 */
export function assertObject(input: unknown, message?: string): asserts input is object {
  if (typeof input !== 'object' || Array.isArray(input) || input === null) {
    throw new Error(message || 'Input is not an object');
  }
}

/**
 * Ensures that the provided value is an array of strings.
 *
 * @param input - input value
 * @param message - optional message to include in the error
 * @throws {Error} - throws if input is not an string array
 */
export function assertStringArray(input: unknown, message?: string): asserts input is string[] {
  assertArray(input);

  if (!input.every((index) => typeof index === 'string')) {
    throw new Error(message || 'Input is not an array of strings');
  }
}

/**
 * Checks if an error of type unknown is an object with an error field.
 *
 * @param error - an unknown error
 * @returns true if an object has an 'error' field; false otherwise
 */
export function hasErrorField(error: unknown): error is { error: string } {
  return (error as { error: string }).error !== undefined && true;
}

/**
 * Checks if an error of type unknown is an object with a message field.
 *
 * @param error - an unknown error
 * @returns true if an object has a 'message' field; false otherwise
 */
export function hasMessageField(error: unknown): error is { message: string } {
  return (error as { message: string }).message !== undefined && true;
}

/**
 * Checks if an error of type unknown is an object with a string data field.
 *
 * @param error - an unknown error
 * @returns true if an object has a 'data' field; false otherwise
 */
export function hasErrorData(error: unknown): error is { data: string } {
  return (error as { data: string }).data !== undefined && true;
}

/**
 * Checks if an error of type unknown is a string data field.
 *
 * @param error - an unknown error
 * @returns true if an error is a string; false otherwise
 */
export function hasStringError(error: unknown): error is string {
  return typeof error === 'string';
}

/**
 * Checks if an error of type unknown is a string data field.
 *
 * @param error
 * @returns true if an error is a string; false otherwise
 */
export function getErrorMessage(error: unknown): string | undefined {
  if (hasMessageField(error)) {
    return error.message;
  } else if (hasStringError(error)) {
    return error;
  }
  return undefined;
}

/**
 * Checks if an error of type unknown is a string data field.
 *
 * @param error - an unknown error
 * @returns true if an error is a string; false otherwise
 */
export function getRelayerErrorMessage(error: unknown): string | undefined {
  if (hasErrorField(error)) {
    return error.error;
  } else if (hasErrorData(error)) {
    return error.data;
  }

  return getErrorMessage(error);
}
