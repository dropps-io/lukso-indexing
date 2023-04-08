/**
 * Converts a Permissions object to a comma-separated string of keys with a value of true.
 *
 * @param {Permissions} permissions - An object containing the permission flags.
 * @returns {string} A comma-separated string of keys with a value of true.
 * // E.g Outputs: "ENCRYPT,DECRYPT,SIGN"
 */
export const permissionsToString = (permissions: { [permission: string]: boolean }): string => {
  const trueKeys: string[] = [];

  for (const key in permissions) {
    if (permissions[key]) {
      trueKeys.push(key);
    }
  }

  return trueKeys.join(',');
};
