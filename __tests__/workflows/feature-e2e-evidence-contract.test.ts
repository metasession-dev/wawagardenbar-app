/** @requirement REQ-094 — feature E2E must publish parseable AC evidence. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/feature-e2e.yml'),
  'utf8'
);

describe('feature E2E evidence publication contract', () => {
  it('requires and uploads the annotated JSON reporter result as e2e_result', () => {
    expect(workflow).toContain('Feature E2E produced no e2e-results.json');
    expect(workflow).toMatch(/wgb "\$REQ_ID" e2e_result e2e-results\.json/);
    expect(workflow).toMatch(/--category e2e_result --release "\$REQ_ID"/);
    expect(workflow).toMatch(/--meta-key "origin=feature"/);
  });

  it('keeps per-AC screenshots as required first-class evidence', () => {
    expect(workflow).toContain(
      'No evidenceShot screenshots were captured for ${REQ_ID}.'
    );
    expect(workflow).toMatch(/wgb "\$REQ_ID" screenshot "\$PNG"/);
  });
});
