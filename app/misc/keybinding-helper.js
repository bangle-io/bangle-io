import { keyName } from 'w3c-keyname';

const mac =
  typeof navigator != 'undefined' ? /Mac/.test(navigator.platform) : false;

function normalizeKeyName(name) {
  let parts = name.split(/-(?!$)/),
    result = parts[parts.length - 1];
  if (result === 'Space') {
    result = ' ';
  }
  let alt, ctrl, shift, meta;
  for (let i = 0; i < parts.length - 1; i++) {
    let mod = parts[i];
    if (/^(cmd|meta|m)$/i.test(mod)) {
      meta = true;
    } else if (/^a(lt)?$/i.test(mod)) {
      alt = true;
    } else if (/^(c|ctrl|control)$/i.test(mod)) {
      ctrl = true;
    } else if (/^s(hift)?$/i.test(mod)) {
      shift = true;
    } else if (/^mod$/i.test(mod)) {
      if (mac) {
        meta = true;
      } else {
        ctrl = true;
      }
    } else {
      throw new Error('Unrecognized modifier name: ' + mod);
    }
  }
  if (alt) {
    result = 'Alt-' + result;
  }
  if (ctrl) {
    result = 'Ctrl-' + result;
  }
  if (meta) {
    result = 'Meta-' + result;
  }
  if (shift) {
    result = 'Shift-' + result;
  }
  return result;
}

function normalize(map) {
  let copy = Object.create(null);
  for (let prop in map) {
    copy[normalizeKeyName(prop)] = map[prop];
  }
  return copy;
}

function modifiers(name, event, shift) {
  if (event.altKey) {
    name = 'Alt-' + name;
  }
  if (event.ctrlKey) {
    name = 'Ctrl-' + name;
  }
  if (event.metaKey) {
    name = 'Meta-' + name;
  }
  if (shift !== false && event.shiftKey) {
    name = 'Shift-' + name;
  }
  return name;
}

// :: (Object) → (view: EditorView, event: dom.Event) → bool
// Given a set of bindings (using the same format as
// [`keymap`](#keymap.keymap), return a [keydown
// handler](#view.EditorProps.handleKeyDown) that handles them.
export function keybindingsHelper(bindings) {
  let map = normalize(bindings);
  return function (event) {
    let name = keyName(event),
      isChar = name.length === 1 && name !== ' ';
    const direct = map[modifiers(name, event, !isChar)];
    // if the handler returns true prevent default it
    if (direct && direct()) {
      event.preventDefault();
      return;
    }
  };
}
