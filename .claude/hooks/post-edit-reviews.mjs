#!/usr/bin/env node
// PostToolUse — emits reviewer reminders based on the edited file. Combines the
// api-invariant, caching, and legal-data reminders into a single systemMessage.
import { readPayload, filePathFrom } from './_lib.mjs';
import { readFileSync } from 'node:fs';

const path = filePathFrom(await readPayload());
const filename = path.split('/').pop() || '';
const reminders = [];

const isApiEndpoint = path.includes('/api/') && path.endsWith('.js') && !filename.startsWith('_');
if (isApiEndpoint) {
  reminders.push(`api/${filename} edited — run api-invariant-reviewer before committing.`);
  try {
    const src = readFileSync(path, 'utf8');
    const externalCallMarkers = [
      'anthropic.',
      'messages.create',
      'api.canlii.org',
      'fetch(',
      '_retrievalOrchestrator',
      '_caseLawRetrieval',
    ];
    if (externalCallMarkers.some((t) => src.includes(t))) {
      reminders.push(`api/${filename} makes an external call — run caching-reviewer before committing.`);
    }
  } catch {
    /* file may have been moved/removed since the edit */
  }
}

const legalFiles = ['criminalCodeData.js', 'civilLawData.js', 'charterData.js'];
if (legalFiles.some((f) => path.includes(f))) {
  reminders.push('Legal data file edited — run legal-data-validator before committing.');
}

if (reminders.length) {
  console.log(JSON.stringify({ systemMessage: reminders.join('\n') }));
}
