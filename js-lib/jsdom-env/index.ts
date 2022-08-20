import JsdomClass from 'jest-environment-jsdom';

let originalStructuredClone = structuredClone;

export default class JSDOMEnvironment extends JsdomClass {
  async setup() {
    await super.setup();
    // for some reason structuredClone is removed or not added in the global object
    // during the JSDOM setup
    this.global.structuredClone = originalStructuredClone;
  }
}
