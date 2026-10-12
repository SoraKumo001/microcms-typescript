import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { main, parseCliArgs } from '../src/index';

describe('parseCliArgs', () => {
  it('parses positional arguments and flags', () => {
    const args = parseCliArgs(['./schemas', './out.ts', '--pascal-case', '--check']);
    expect(args.input).toBe('./schemas');
    expect(args.output).toBe('./out.ts');
    expect(args.pascalCase).toBe(true);
    expect(args.check).toBe(true);
  });

  it('parses short options', () => {
    const args = parseCliArgs(['-s', 'dom', '-k', 'key', '-o', 'out.ts', '-h']);
    expect(args).toMatchObject({
      serviceDomain: 'dom',
      apiKey: 'key',
      output: 'out.ts',
      help: true,
    });
  });

  it('rejects unknown options and missing values', () => {
    expect(() => parseCliArgs(['--bogus'])).toThrow();
    expect(() => parseCliArgs(['-s'])).toThrow();
  });
});

describe('main --check', () => {
  const fixtures = path.resolve(__dirname, './fixtures');

  it('passes when the output is up to date and fails otherwise', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'microcms-check-'));
    const dest = path.join(dir, 'out.ts');
    try {
      await expect(main(fixtures, dest, { check: true })).rejects.toThrow(/missing/);
      await main(fixtures, dest);
      await expect(main(fixtures, dest, { check: true })).resolves.toBeUndefined();
      fs.appendFileSync(dest, '// changed\n');
      await expect(main(fixtures, dest, { check: true })).rejects.toThrow(/out of date/);
      await expect(main(fixtures, undefined, { check: true })).rejects.toThrow(/requires/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
