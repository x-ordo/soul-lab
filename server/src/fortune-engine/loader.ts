import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { RulesFileSchema } from './schemas/rule.schema.js';
import { CopyFileSchema } from './schemas/copy.schema.js';
import { WeightsConfigSchema } from './schemas/weights.schema.js';
import { Rule, CopyTemplate, WeightsConfig, Theme, CopyFile } from './types.js';

export interface LoadedData {
  rules: Rule[];
  copyByTheme: Map<Theme, CopyTemplate[]>;
  weights: WeightsConfig;
}

/**
 * Load and validate a YAML file
 */
function loadYamlFile<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content) as T;
}

/**
 * Load all rules from the rules directory
 */
function loadRules(rulesDir: string): Rule[] {
  const allRules: Rule[] = [];
  const ruleIds = new Set<string>();

  if (!fs.existsSync(rulesDir)) {
    console.warn(`Rules directory not found: ${rulesDir}`);
    return allRules;
  }

  const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const file of files) {
    const filePath = path.join(rulesDir, file);
    const data = loadYamlFile<unknown>(filePath);
    const result = RulesFileSchema.safeParse(data);

    if (!result.success) {
      throw new Error(`Invalid rules file ${file}: ${JSON.stringify(result.error.errors)}`);
    }

    for (const rule of result.data.rules) {
      if (ruleIds.has(rule.id)) {
        throw new Error(`Duplicate rule ID ${rule.id} in ${file}`);
      }
      ruleIds.add(rule.id);
      allRules.push(rule as Rule);
    }
  }

  // Sort by priority (higher first)
  allRules.sort((a, b) => b.priority - a.priority);

  return allRules;
}

/**
 * Load all copy templates from the copy directory
 */
function loadCopies(copyDir: string): Map<Theme, CopyTemplate[]> {
  const copyByTheme = new Map<Theme, CopyTemplate[]>();
  const copyIds = new Set<string>();

  if (!fs.existsSync(copyDir)) {
    console.warn(`Copy directory not found: ${copyDir}`);
    return copyByTheme;
  }

  const files = fs.readdirSync(copyDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const file of files) {
    const filePath = path.join(copyDir, file);
    const data = loadYamlFile<unknown>(filePath);
    const result = CopyFileSchema.safeParse(data);

    if (!result.success) {
      throw new Error(`Invalid copy file ${file}: ${JSON.stringify(result.error.errors)}`);
    }

    const copyFile = result.data as CopyFile;
    const existing = copyByTheme.get(copyFile.theme) || [];

    for (const copy of copyFile.copies) {
      if (copyIds.has(copy.id)) {
        throw new Error(`Duplicate copy ID ${copy.id} in ${file}`);
      }
      copyIds.add(copy.id);
      existing.push(copy as CopyTemplate);
    }

    copyByTheme.set(copyFile.theme, existing);
  }

  return copyByTheme;
}

/**
 * Load weights configuration
 */
function loadWeights(weightsPath: string): WeightsConfig {
  if (!fs.existsSync(weightsPath)) {
    // Return default weights if file doesn't exist
    return getDefaultWeights();
  }

  const data = loadYamlFile<unknown>(weightsPath);
  const result = WeightsConfigSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Invalid weights file: ${JSON.stringify(result.error.errors)}`);
  }

  return result.data as WeightsConfig;
}

/**
 * Get default weights configuration
 */
function getDefaultWeights(): WeightsConfig {
  return {
    version: 1,
    themes: [
      { name: 'career', base_weight: 1.0, display_name_ko: '커리어', priority: 1 },
      { name: 'love', base_weight: 1.0, display_name_ko: '연애', priority: 2 },
      { name: 'money', base_weight: 1.0, display_name_ko: '재물', priority: 3 },
      { name: 'health', base_weight: 1.0, display_name_ko: '건강', priority: 4 },
      { name: 'relationship', base_weight: 1.0, display_name_ko: '인간관계', priority: 5 },
      { name: 'general', base_weight: 1.0, display_name_ko: '종합', priority: 6 },
    ],
    date_modifiers: [],
    fallback: {
      theme: 'general',
      copy_pool: 'general',
    },
  };
}

/**
 * Load all data from the data directory
 */
export function loadFortuneData(dataDir: string): LoadedData {
  const rulesDir = path.join(dataDir, 'rules');
  const copyDir = path.join(dataDir, 'copy', 'ko');
  const weightsPath = path.join(dataDir, 'weights.yml');

  const rules = loadRules(rulesDir);
  const copyByTheme = loadCopies(copyDir);
  const weights = loadWeights(weightsPath);

  return { rules, copyByTheme, weights };
}

// Cache for loaded data
let cachedData: LoadedData | null = null;
let cachedDataDir: string | null = null;

/**
 * Get fortune data (cached)
 */
export function getFortuneData(dataDir: string): LoadedData {
  if (cachedData && cachedDataDir === dataDir) {
    return cachedData;
  }

  cachedData = loadFortuneData(dataDir);
  cachedDataDir = dataDir;
  return cachedData;
}

/**
 * Clear cache (for testing or reloading)
 */
export function clearCache(): void {
  cachedData = null;
  cachedDataDir = null;
}
