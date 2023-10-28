declare namespace jest {
  interface Matchers {
    toEqualDocument: (value: any) => any;
    toEqualDocAndSelection: (value: any) => any;
  }
}

declare namespace JSX {
  export interface IntrinsicElements {
    para: any;
    doc: any;
    heading: any;
    codeBlock: any;
  }
}
