
export enum Level
{
    Trace,
    Debug,
    Info,
    Warn,
    Error,
    Fatal
}

export const LevelValues: number[] = <number[]>Object.values(Level).filter((x: any) => typeof x === 'number');
export const PinoLevelValues: number[] = [10, 20, 30, 40, 50, 60];
export const LevelNames: string[] = ["Trace", "Debug", "Info", "Warn", "Error", "Fatal"];
export function get_name_by_pino_level(pl: number)
{
    return LevelNames[(pl / 10) - 1];
}

export class Log
{

    static copy(other: Log): Log
    {
        if (other === undefined)
            return undefined;

        const ret = new Log();
        return ret;
    }
}

