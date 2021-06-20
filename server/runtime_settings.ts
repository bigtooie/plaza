 
import * as fs from 'fs';
import * as Settings from '../shared/RuntimeSettings';
import { g } from '../shared/globals';

const readFile = fs.promises.readFile;
const writeFile = fs.promises.writeFile;

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

export async function load_all()
{
    if (!fs.existsSync(g.server.runtime_settings_file))
        return;

    const content = await readFile(g.server.runtime_settings_file);
    const json: any = JSON.parse(content.toString());

    for (const key in json)
    {
        if (key === undefined || json[key] === undefined)
            continue;

        runtime_setting_values.set(key, json[key]);
    }
}

export async function save_all()
{
    const json: any = {}
    
    for (const [key, val] of runtime_setting_values)
        json[key] = val;

    const content: string = JSON.stringify(json);
    return writeFile(g.server.runtime_settings_file, content);
}
