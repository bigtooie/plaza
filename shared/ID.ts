
// uuid v4 is a random uuid
import { v4 as uuidv4 } from 'uuid';
import { string_to_color, complementary_text_color } from './utils';
import { g } from './globals';

import base from 'base-x';
export const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
export const BASE58pattern = new RegExp(`^[${BASE58}]*$`);
export const base58 = base(BASE58);

export function uuid_to_number_array(uuid: string): number[]
{
    const ds: number[] = uuid.split("-")
                             .join("")
                             .match(/.{1,2}/g)
                             .map(s => parseInt(s, 16))

    return ds;
}

const int_to_hexstr = (x: number) => Number(x).toString(16).padStart(2, '0');

export function number_array_to_uuid(uuidn: number[]): string
{
    const uuidns = uuidn.map(int_to_hexstr);

    var uuid: string = "";

    for (var i = 0; i < 4; ++i)
        uuid += uuidns[i];

    uuid += "-";

    for (var i = 4; i < 6; ++i)
        uuid += uuidns[i];

    uuid += "-";

    for (var i = 6; i < 8; ++i)
        uuid += uuidns[i];

    uuid += "-";

    for (var i = 8; i < 10; ++i)
        uuid += uuidns[i];

    uuid += "-";

    for (var i = 10; i < 16; ++i)
        uuid += uuidns[i];

    return uuid;
}

export function readable_ID(uuid: string, prefix: string) : string
{
    var uuidn = uuid_to_number_array(uuid);
    uuidn = uuidn.slice(uuidn.length - g.id_length, uuidn.length);

    var b58 = base58.encode(uuidn);
    return prefix + b58;
}

//80964785-4dd4-4f7a-9e06-44e53c12e690
export function prefix_uuid(uuid: string, prefix: string)
{
    if (prefix === null || prefix === undefined || prefix.length <= 0)
        return uuid;

    const bts = base58.decode(prefix);
    var uuidn = uuid_to_number_array(uuid);
    const plength = Math.min(bts.length, uuidn.length);

    for (var i = 0; i < plength; ++i)
        uuidn[uuidn.length - plength + i] = bts[i];

    for (var i = uuidn.length - plength - 1; i > uuidn.length - g.id_length - 1; --i)
        uuidn[i] = 0;

    return number_array_to_uuid(uuidn);
}

export abstract class ID
{
    constructor(readonly value: string, // a uuid, only used internally
                readonly readable: string // a human readable representation of the UUID
               )
    {
    }

    get color()
    {
        return string_to_color(this.value);
    }

    get textcolor()
    {
        return complementary_text_color(this.color);
    }
}

export class UserID extends ID
{
    constructor(nid?: string, rid?: string)
    {
        if (nid === null || nid === undefined)
            nid = uuidv4();

        if (rid === null || rid === undefined)
            rid = readable_ID(nid, "p");

        super(nid, rid);
    }

    static copy(other: UserID | undefined)
    {
        if (other === undefined)
            return undefined;

        return new UserID(other.value, other.readable);
    }
}

export class SessionID extends ID
{
    constructor(nid?: string, rid?: string)
    {
        if (nid === null || nid === undefined)
            nid = uuidv4();

        if (rid === null || rid === undefined)
            rid = readable_ID(nid, "s");

        super(nid, rid);
    }

    static copy(other: SessionID | undefined)
    {
        if (other === undefined)
            return undefined;

        return new SessionID(other.value, other.readable);
    }
}

//80964785-4dd4-4f7a-9e06-44e53c12e690
export function is_valid_uuid(uuid: string): boolean
{
    if (uuid.length !== 36)
        return false;

    const parts = uuid.split('-');

    if (parts.length !== 5)
        return false;

    for (const part of parts)
        for (const chr of part)
            if (chr.match(/[0-9a-fA-F]/) === null)
                return false;

    return true;
}

export function is_valid_base58(str: string): boolean
{
    if (str.length <= 0)
        return true;

    for (const chr of str)
        if (!BASE58.includes(chr))
            return false;

    return true;
}

export function is_valid_readable_id(id: string): boolean
{
    if (id.length < 1)
        return false;

    return is_valid_base58(id.slice(1));
}

export function is_valid_id(id: ID): boolean
{
    return is_valid_uuid(id.value) && is_valid_readable_id(id.readable);
}
