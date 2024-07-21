import {crossContextPostMessage  } from './crossContextPostMessage.js';
import {options                  } from './options.js';
import {validateType             } from './validateType.js';
import {partition                } from './partition.js';
import {typePanel                } from './TypePanel.js';
import {importNamespaceSpecifiers} from './registerImportNamespaceSpecifier.js';
const breakpoints = new Set();
let enabled = true;
// Handle events for either window or worker/iframe
(globalThis.window || self).addEventListener('message', (e) => {
  const {data} = e;
  const {type, action, destination} = data;
  // console.log("Message event", e);
  // console.log("Message data", data);
  if (type !== 'rti') {
    return;
  }
  if (destination === 'ui') {
    typePanel?.handleEvent(e);
    return;
  }
  if (action === 'addError') {
    if (destination === 'worker') {
      console.warn('We are not keeping track of errors in workers at all.');
      return;
    }

  }
  // Messages come from Worker/IFrame/window to update UI state
  if (destination === 'worker') {
    if (action === 'deleteBreakpoint') {
      const {key} = data;
      breakpoints.delete(key);
      return;
    }
    if (action === 'addBreakpoint') {
      const {key} = data;
      breakpoints.add(key);
      return;
    }
    if (action === 'enable') {
      enabled = true;
      return;
    }
    if (action === 'disable') {
      enabled = false;
      return;
    }
  }
  console.log('Unhandled action destination combo', {action, destination, e, data});
});
/**
 * @param {*} value - The actual value that we need to validate.
 * @param {*} expect - The supposed type information of said value.
 * @param {string} loc - String like `BoundingBox#compute`
 * @param {string} name - Name of the argument
 * @param {boolean} critical - Only `false` for unions.
 * @returns {boolean} Boolean indicating if a type is correct.
 */
function inspectType(value, expect, loc, name, critical = true) {
  if (!enabled) {
    return true;
  }
  if (!expect) {
    console.warn("inspectType> 'expect' always should be set");
    return false;
  }
  if (typeof expect === 'string' && expect.includes('.')) {
      // E.g. ['MathUtils', 'Quaternion']
    const parts = expect.split('.');
    if (parts.length === 2) {
      const [a, b] = parts;
      if (importNamespaceSpecifiers[a]) {
        const ns = importNamespaceSpecifiers[a][b];
        const expectWhat = typeof ns;
        // console.log("expectWhat", expectWhat);
        if (value?.constructor === ns) {
          return true;
        }
        expect = expectWhat;
      }
    } else {
      console.log("import namespace specifier rewrite unhandled", {expect, parts});
    }
  }
  /** @type {any[]} */
  const warnings = [];
  /** @type {console["warn"]} */
  const innerWarn = (...args) => {
    warnings.push(...args);
  };
  const ret = validateType(value, expect, loc, name, critical, innerWarn, 0);
  if (!ret && critical) {
    options.count++;
    // let expectStr = ', expected: ' + JSON.stringify(expect);
    // if (expectStr.length < 40) {
    //   //expectStr = ', expected: ';
    //   expectStr = '';
    // }
    const [strings, extras] = partition(warnings, _ => typeof _ === 'string');
    // String form allows us to see more about certain values, like a vector with a NaN component.
    // Since `value` will "only" be the actual reference and might be "repaired" after further calculations.
    const valueToString = value?.toString?.();
    const key = `${loc}-${name}`;
    if (breakpoints.has(key)) {
      console.log("breakpoints", breakpoints);
      debugger;
      breakpoints.delete(key); // trigger only once to quickly get app running again
      crossContextPostMessage({type: 'rti', action: 'deleteBreakpoint', destination: 'ui', key});
    }
    // Nytaralyxe: options.warns where each warn callback supports one system (node, div/dom etc.)
    crossContextPostMessage({type: 'rti', action: 'addError', destination: 'ui', value, expect, loc, name, valueToString, strings, extras, key});
  }
  return ret;
}
export {inspectType};
