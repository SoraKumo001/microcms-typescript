import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  const testConfigPath = path.resolve('test-config.json');

  afterEach(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  it('returns empty object when config file does not exist', () => {
    const config = loadConfig('non-existent.json');
    expect(config).toEqual({});
  });

  it('loads options from a JSON config file', () => {
    fs.writeFileSync(
      testConfigPath,
      JSON.stringify({
        input: './my-schemas',
        output: './types/output.ts',
        serviceDomain: 'my-domain',
        apiKey: 'my-key',
        pascalCase: true,
      })
    );

    const config = loadConfig(testConfigPath);
    expect(config).toEqual({
      input: './my-schemas',
      output: './types/output.ts',
      serviceDomain: 'my-domain',
      apiKey: 'my-key',
      pascalCase: true,
    });
  });
});
