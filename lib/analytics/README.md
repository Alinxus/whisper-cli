# Whisper CLI Analytics

Tracks CLI usage, scan statistics, and user engagement for:
- Usage-based billing
- Team dashboards
- Product improvement

## Usage

```
import { Analytics } from './analytics.js';
const analytics = new Analytics();
analytics.usage({ period: 'week' });
``` 