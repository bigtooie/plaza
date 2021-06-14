function empty_or_nothing(x: any)
{
    if (x === null || x === undefined)
        return true;

    const t = typeof x;
    if (t === "object" || t === "string")
    {
        for (const _ in x)
            return false;

        return true;
    }

    return false;
}

declare global
{
    interface BooleanConstructor
    {
       copy(other: boolean): boolean;
       isMe(x: any): x is boolean;
    }

    interface NumberConstructor
    {
       copy(other: number): number;
       isMe(x: any): x is number;
    }

    interface StringConstructor
    {
       copy(other: string): string;
       isMe(x: any): x is string;
    }
}

Boolean.copy = (other: boolean) =>
{
    return other;
}

Boolean.isMe = (x: any): x is boolean =>
{
    return typeof x === 'boolean';
}

Number.copy = (other: number) =>
{
    return other;
}

Number.isMe = (x: any): x is number =>
{
    return typeof x === 'number';
}

String.copy = (other: string) =>
{
    return other;
}

String.isMe = (x: any): x is string =>
{
    return typeof x === 'string';
}

export interface Copyable<T>
{
    copy(other: T): T | undefined;
    isMe(x: any): x is T;
}

export function copy_from<T>(type: Copyable<T>, x: any): T | undefined
{
    if (empty_or_nothing(x))
        return undefined;

    if (!type.isMe(x))
        return undefined;

    return type.copy(x);
}
