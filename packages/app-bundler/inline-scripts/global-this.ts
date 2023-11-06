if (typeof globalThis === 'undefined') {
  if (typeof self !== 'undefined') {
    // @ts-expect-error - globalThis is not defined in self
    self.globalThis = self;
  } else if (typeof window !== 'undefined') {
    // @ts-expect-error - globalThis is not defined in window
    window.globalThis = window;
  } else if (typeof global !== 'undefined') {
    // @ts-expect-error - globalThis is not defined in global
    // eslint-disable-next-line no-undef
    global.globalThis = global;
  }
}
