// Analytics stub for standalone CLI mode (no backend, no billing)
export class Analytics {
  async init() {}
  async record() {}
  async usage() {
    console.log('Analytics are disabled in standalone CLI mode.');
  }
}
