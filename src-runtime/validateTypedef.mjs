import {typedefs    } from "./registerTypedef.mjs";
import {validateType} from "./validateType.mjs";
/**
 * @param {*} value - The actual value that we need to validate.
 * @param {*} expect - The supposed type information of said value.
 * @param {string} loc - String like `BoundingBox#compute`
 * @param {string} name - Name of the argument
 * @param {boolean} critical - Only `false` for unions.
 * @returns {boolean} - Boolean indicating if a type is correct.
 */
function validateTypedef(value, expect, loc, name, critical) {
  if (expect.optional && value === undefined) {
    return true;
  }
  const typedef = typedefs[expect.type];
  // Prevent circular validation
  if (typeof typedef === 'string') {
    return false;
  }
  return validateType(value, typedef, loc, name, critical);
}
export {validateTypedef};
