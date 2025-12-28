import fs from 'node:fs';
import path from 'node:path';

export type EventLog = Record<string, unknown> & {
  ts: number;
  type: string;
};

export class EventLogger {
  private filePath: string;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.filePath = path.join(dataDir, 'events.jsonl');
  }

  log(event: EventLog) {
    try {
      const line = JSON.stringify(event) + '\n';
      fs.appendFileSync(this.filePath, line, 'utf-8');
    } catch {
      // ignore logging errors
    }
  }
}
