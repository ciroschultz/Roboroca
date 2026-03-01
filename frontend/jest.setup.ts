import '@testing-library/jest-dom';

// Polyfill APIs not available in jsdom
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(private callback: IntersectionObserverCallback) {
    // Auto-trigger with isIntersecting: true so components render visible state
    setTimeout(() => {
      this.callback(
        [{ isIntersecting: true, intersectionRatio: 1 }] as any,
        this as any
      );
    }, 0);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver (used by some chart/layout components)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});
