/**
 * convert to camelCase
 * @param {string} str
 * @return {string} sampleString
 */
export const camelCase = (str: string): string => {
  str = str.charAt(0).toLowerCase() + str.slice(1);
  return str.replace(/[-_]+(.)/g, function (match, group1) {
    return group1.toUpperCase();
  });
};

/**
 * convert to PascalCase
 * @param {string} str
 * @return {string} SampleString
 */
export const pascalCase = (str: string): string => {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};

/**
 * convert to a valid TypeScript identifier (invalid characters become `_`)
 */
export const toIdentifier = (str: string): string => {
  const id = str.replace(/[^\w$]/g, '_');
  return /^\d/.test(id) ? `_${id}` : id;
};

/**
 * single-quoted TypeScript string literal with escaping
 */
export const quote = (str: string): string =>
  `'${str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/[\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`)}'`;

/**
 * property key: bare when it is a valid identifier, quoted otherwise
 */
export const propertyKey = (str: string): string =>
  /^[A-Za-z_$][\w$]*$/.test(str) ? str : quote(str);

/**
 * escape text for use inside a JSDoc comment
 */
export const escapeComment = (str: string): string => str.replace(/\*\//g, '*\\/');
