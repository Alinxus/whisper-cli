# Whisper CLI Reporter

The Reporter module generates output reports in various formats:

- **markdown**: Developer-friendly, readable summaries
- **html**: Rich, styled reports for sharing
- **json**: Machine-readable for integrations
- **csv**: For spreadsheets and analytics

## Usage

```
import { Reporter } from './index.js';
const reporter = new Reporter();
const output = reporter.generateReport(results, { format: 'markdown' });
``` 