import fs from 'fs';
import path from 'path';

export interface ConfigOptions {
  input?: string;
  output?: string;
  serviceDomain?: string;
  apiKey?: string;
  pascalCase?: boolean;
}

/**
 * Loads configuration from a JSON file if present.
 */
export const loadConfig = (configPath?: string): ConfigOptions => {
  const target = configPath
    ? path.resolve(configPath)
    : path.resolve('microcms-typescript.config.json');

  if (fs.existsSync(target)) {
    try {
      const content = fs.readFileSync(target, 'utf-8');
      return JSON.parse(content) as ConfigOptions;
    } catch (e) {
      console.warn(`Warning: Failed to parse config file at ${target}:`, e);
    }
  }
  return {};
};
