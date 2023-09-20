import { parseJSDoc } from '../src/parseJSDoc.mjs';
import { parseSync } from '@babel/core';
import { addTypeChecks } from '../src/addTypeChecks.mjs';
import * as ti from '../src/index.mjs';
import * as rti from '../src-rti/index.mjs';
const currentAction = location.hash.slice(1).split('=')[1] || 'jsdoc';
const selectAction = document.getElementById("action");
if (!(selectAction instanceof HTMLSelectElement)) {
  throw 'This module requires a <select id="action" ...';
}
selectAction.value = currentAction;
const buttonREPL = document.getElementById('repl');
if (!(buttonREPL instanceof HTMLButtonElement)) {
  throw 'This module requires a <button id="repl" ...';
}
const inputLeft = document.getElementById('left');
if (!(inputLeft instanceof HTMLInputElement)) {
  throw 'This module requires a <input id="left" ...';
}
const inputRight = document.getElementById('right');
if (!(inputRight instanceof HTMLInputElement)) {
  throw 'This module requires a <input id="right" ...';
}
inputLeft.onchange = (event) => {
  const { checked } = event.target;
  if (checked) {
    // Unhide right editor and resize right one to half size again
    aceDivLeft.style.display = "";
    setHalfSizeLeft();
    setHalfSizeRight();
  } else {
    // Hide left editor and resize right one to full size
    aceDivLeft.style.display = "none";
    Object.assign(aceDivRight.style, {
      position: "absolute",
      left: "0vw",
      top: "40px",
      width: "100vw",
      height: "calc(100vh - 40px)",
    });
  }
}
inputRight.onchange = (event) => {
  const { checked } = event.target;
  if (checked) {
    // Unhide left editor and resize right one to half size again
    aceDivRight.style.display = "";
    setHalfSizeLeft();
    setHalfSizeRight();
  } else {
    // Hide left editor and resize right one to full size
    aceDivRight.style.display = "none";
    Object.assign(aceDivLeft.style, {
      position: "absolute",
      left: "0vw",
      top: "40px",
      width: "100vw",
      height: "calc(100vh - 40px)",
    });
  }
}
function getCodeForAction() {
  switch (getAction()) {
    case 'typechecking':
      return "const ret = addTypeChecks(jsdoc);\nsetRight(ret);";
    case 'jsdoc':
      return "const ret = parseJSDoc(jsdoc);\nsetRight(JSON.stringify(ret, null, 2));";
  }
  return '// This action has no special code';
}
/**
 * @param {string} name - The name.
 * @param {any} data - Function or object.
 * @returns {string}
 */
function data2code(name, data) {
  if (data instanceof Function) {
    return data.toString();
  } else if (data instanceof Object && data !== null) {
    return `let ${name} = ${JSON.stringify(data, null, 2)};`;
  }
  return `// data2code> unhandled type: name=${name}, type of data: ${typeof data}`;
}
function activateREPL() {
  const code = Object.entries(ti).map(([key, val]) => data2code(key, val)).join('\n');
  const leftContent = aceEditorLeft.getValue().replaceAll('`', '\\`');
  const leftContentAsCode = `const jsdoc = \`${leftContent}\`;`;
  const out = [leftContentAsCode, code, getCodeForAction()].join('\n');
  setLeft(out);
  // @ts-ignore
  selectAction.value = "eval";
}
buttonREPL.onclick = activateREPL;
Object.assign(window, {
  parseSync,
  ti, ...ti,
  rti, ...rti,
});
let lastStats = {};
function statsPrint() {
  console.table(lastStats);
}
/**
 * @param {string} value
 */
function setLeft(value) {
  if (typeof value !== 'string') {
    aceEditorRight.setValue(`Cannot set type ${typeof value}`);
    return;
  }
  aceEditorLeft.setValue(value);
  aceEditorLeft.clearSelection(); // setValue() selects everything, so unselect it now
}
/**
 * @param {string} value
 */
function setRight(value) {
  if (typeof value !== 'string') {
    aceEditorRight.setValue(`Cannot set type ${typeof value}`);
    return;
  }
  aceEditorRight.setValue(value);
  aceEditorRight.clearSelection(); // setValue() selects everything, so unselect it now
}
function getLeft() {
  return aceEditorLeft.getValue();
}
function getRight() {
  return aceEditorRight.getValue();
}
async function actionAST() {
  const content = aceEditorLeft.getValue();
  const ast = parseSync(content);
  const out = JSON.stringify(ast, function(name, val) {
    if (name == "loc" || name == "start" || name == "end") {
      return undefined; // remove
    }
    return val; // keep
  }, 2);
  aceEditorRight.setValue(out);
  aceEditorRight.clearSelection(); // setValue() selects everything, so unselect it now
}
async function actionJSDoc() {
  const content = aceEditorLeft.getValue();
  const ret = parseJSDoc(content);
  /** @type {string} */
  let out;
  if (ret === undefined) {
    out = '// parseJSDoc returned undefined';
  } else {
    out = '// parseJSDoc output:\n' + JSON.stringify(ret, null, 2);
  }
  aceEditorRight.setValue(out);
}
async function actionTypeChecking() {
  const content = aceEditorLeft.getValue();
  const out = addTypeChecks(content);
  aceEditorRight.setValue(out);
  aceEditorRight.clearSelection(); // setValue() selects everything, so unselect it now
}
async function runAction() {
  const action = getAction();
  switch (action) {
    case 'ast':
      await actionAST();
      break;
    case 'jsdoc':
      await actionJSDoc();
      break;
    case 'typechecking':
      await actionTypeChecking();
      break;
    case 'eval':
      eval(aceEditorLeft.getValue());
      break;
    default:
      setRight(`Action ${action} not implemented`);
  }
}
async function insertTypes() {
  const ret = await postData('insertTypes', {
    file: aceEditorLeft.getValue()
  });
  ret.logs?.map(_ => console.log(..._));
  ret.warns?.map(_ => console.warn(..._));
  console.log(ret);
  if (ret.success) {
    lastStats = ret.stats;
    statsPrint();
    aceEditorRight.setValue(ret.result);
    if (ret.insertTypesAndEval) {
      eval(ret.result.replaceAll('export ', ''));
    }
  } else {
    aceEditorRight.setValue(JSON.stringify(ret, null, 2));
  }
  aceEditorRight.clearSelection(); // setValue() selects everything, so unselect it now
}
/** @returns {'typechecking'|'ast'|'jsdoc'} */
const getAction = () => selectAction.value;
/**
 * @param {string} id - The ID.
 * @returns {HTMLDivElement} - The DIV element.
 */
function createDivWithId(id) {
  let div = document.getElementById(id);
  if (!div) {
    div = document.createElement('div');
    div.id = id;
  }
  if (!(div instanceof HTMLDivElement)) {
    throw "createDivWithId> div creation failed";
  }
  return div;
}
const aceDivLeft = createDivWithId("aceDivLeft");
const aceDivRight = createDivWithId("aceDivRight");
document.body.append(aceDivLeft, aceDivRight);
function setHalfSizeLeft() {
  Object.assign(aceDivLeft.style, {
    position: "absolute",
    left: "0px",
    top: "40px",
    width: "50vw",
    height: "calc(100vh - 40px)",
  });
}
function setHalfSizeRight() {
  Object.assign(aceDivRight.style, {
    position: "absolute",
    left: "50vw",
    top: "40px",
    width: "50vw",
    height: "calc(100vh - 40px)",
  });
}
setHalfSizeLeft();
setHalfSizeRight();
/**
 * @param {string} id - ID of editor.
 * @param {string} txt - Initial text of editor.
 * @param {Function} execShiftEnter - Function for Shift+Enter
 * @param {Function} execAltEnter - Function for Alt+Enter
 * @returns {ACE.Editor} The ACE editor.
 */
function setupAce(id, txt, execShiftEnter, execAltEnter) {
  const aceEditor = ace.edit(id);
  aceEditor.setFontSize(20);
  aceEditor.setTheme('ace/theme/chrome');
  aceEditor.session.setMode('ace/mode/javascript');
  aceEditor.session.setUseWorker(false);
  aceEditor.session.setOptions({
    tabSize: 2,
    useSoftTabs: true
  });
  aceEditor.setValue(txt);
  aceEditor.clearSelection(); // setValue() selects everything, so unselect it now
  aceEditor.commands.addCommand({
    name: 'Insert types',
    bindKey: {win: 'Shift-Enter', mac: 'Shift-Enter'},
    exec: execShiftEnter
  });
  aceEditor.commands.addCommand({
    name: 'Show AST',
    bindKey: {win: 'Alt-Enter', mac: 'Alt-Enter'},
    exec: execAltEnter
  });
  return aceEditor;
}
const aceEditorLeft = setupAce(
  'aceDivLeft',
  '// Shift-Enter: convert content of left editor,\n//              write result to right editor\n// Tip: open Devtools to see warnings',
  //editor => insertTypes(),
  editor => runAction(),
  editor => actionAST()
);
const aceEditorRight = setupAce(
  'aceDivRight',
  '// Result editor',
  editor => runRightEditor(),
  editor => console.log("right alt")
);
function runRightEditor() {
  eval(aceEditorRight.getValue());
}
export {
  selectAction,
  buttonREPL,
  aceDivLeft,
  aceDivRight,
  aceEditorLeft,
  aceEditorRight,
  setLeft,
  setRight,
  getLeft,
  getRight,
};
