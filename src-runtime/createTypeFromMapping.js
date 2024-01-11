import {replaceType } from "./replaceType.js";
import {getTypeKeys } from "./validateKeyof.mjs";
/**
 * @param {import('./validateMapping.mjs').Mapping} expect - The supposed type information of said value.
 * @param {console["warn"]} warn - Function to warn with.
 * @returns {import('./validateType.mjs').TypeObject|undefined} - New type that can be used for validatoin
 */
function createTypeFromMapping(expect, warn) {
  const {iterable, element, result} = expect;
  const typeKeys = getTypeKeys(iterable, warn);
  if (!typeKeys) {
    warn('validateMapping: missing typeKeys');
    return;
  }
  /** @type {Record<string, import('./validateType.mjs').Type>} */
  const properties = {};
  for (const typeKey of typeKeys) {
    const cloneResult = structuredClone(result);
    replaceType(cloneResult, element, typeKey, warn);
    properties[typeKey] = cloneResult;
  }
  return {type: 'object', properties, optional: false};
}
export {createTypeFromMapping};
