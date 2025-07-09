import { WhisperCLI } from '../lib/index.js';
import { AuthManager } from '../lib/auth/auth.js';
import { ConfigManager } from '../lib/config/config.js';
import { Analytics } from '../lib/analytics/analytics.js';

test('WhisperCLI loads', () => {
  const cli = new WhisperCLI();
  expect(cli).toBeDefined();
  expect(cli.auth).toBeInstanceOf(AuthManager);
  expect(cli.config).toBeInstanceOf(ConfigManager);
  expect(cli.analytics).toBeInstanceOf(Analytics);
}); 