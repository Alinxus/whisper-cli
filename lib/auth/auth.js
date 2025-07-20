// AuthManager stub for standalone CLI mode (no backend, no auth)
export class AuthManager {
  async login() {
    console.log('Authentication is disabled in standalone CLI mode.');
  }
  async logout() {
    console.log('Authentication is disabled in standalone CLI mode.');
  }
  async status() {
    console.log('Authentication is disabled in standalone CLI mode.');
  }
  async check() {
    return false;
  }
  async getToken() {
    return null;
  }
  async getUser() {
    return null;
  }
  async refreshToken() {
    return null;
  }
}
