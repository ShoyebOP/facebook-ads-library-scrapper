// --- Configuration system ---

import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';

// --- Zod schema for config validation ---

const PresetSchema = z.object({
    callback: z.string().url(),
});

const ConfigSchema = z.object({
    presets: z.record(z.string(), PresetSchema),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Preset = z.infer<typeof PresetSchema>;

// --- Cosmiconfig explorer ---

const explorer = cosmiconfig('facebook-scraper', {
    searchStrategy: 'project',
});

// --- Load config from file system ---

export async function loadConfig(): Promise<Config> {
    const result = await explorer.search();

    if (!result || result.isEmpty) {
        throw new Error(
            'No config file found. Create .facebook-scraper.json or config.json in your project root.',
        );
    }

    return ConfigSchema.parse(result.config);
}

// --- Resolve a preset by name ---

export function resolvePreset(config: Config, presetName: string): Preset {
    const preset = config.presets[presetName];
    if (!preset) {
        const available = Object.keys(config.presets).join(', ');
        throw new Error(
            `Preset "${presetName}" not found. Available presets: ${available || '(none)'}`,
        );
    }
    return preset;
}
