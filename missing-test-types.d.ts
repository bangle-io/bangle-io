declare namespace jest {
  interface Matchers<R> {
    toEqualDocument: (value: any) => any;
    toEqualDocAndSelection: (value: any) => any;
  }
}

namespace JSX {
  export interface IntrinsicElements {
    para: any;
    doc: any;
    heading: any;
    codeBlock: any;
  }
}
