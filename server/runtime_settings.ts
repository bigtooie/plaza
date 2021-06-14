 
import * as Settings from '../shared/RuntimeSettings';

const runtime_setting_values = new Map<string, any>();

for (const s of Settings.all)
    runtime_setting_values.set(s.key, s.default_value);

export function get(key: string): any
{
    return runtime_setting_values.get(key);
}

export function set(key: string, value: any)
{
    runtime_setting_values.set(key, value);
}
