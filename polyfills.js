// Polyfill for styled-components that tries to access document
if (typeof document === 'undefined') {
  global.document = {
    createElement: () => ({
      setAttribute: () => {},
      appendChild: () => {},
      style: {},
    }),
    createElementNS: () => ({
      setAttribute: () => {},
      appendChild: () => {},
      style: {},
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    head: {
      appendChild: () => {},
    },
  };
}

if (typeof window === 'undefined') {
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
