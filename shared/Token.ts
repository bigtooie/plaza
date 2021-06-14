// session token
import { is_valid_uuid } from './ID';
import * as jwt from 'jsonwebtoken';

// the "secret" that identifies a logged in user
export type TokenString = string;

export interface IJWTData
{
    value: TokenString; // uuid
    iat: number;
    exp: number;
}

type JWTDecoded = { [key: string]: any };

export function isJWTData(x: any): x is IJWTData
{
    return 'value' in x
        && 'iat' in x
        && 'exp' in x;
}

export class Token
{
    constructor(
        public jwt: string
    )
    {}

    get issue_date(): Date
    {
        const data: JWTDecoded = <JWTDecoded>jwt.decode(this.jwt);
        return new Date(data['iat'] * 1000);
    }

    get expire_date(): Date
    {
        const data: JWTDecoded = <JWTDecoded>jwt.decode(this.jwt);
        return new Date(data['exp'] * 1000);
    }

    get is_expired(): boolean
    {
        return Date.now() > this.expire_date.getTime();
    }

    get value(): TokenString
    {
        const data: JWTDecoded = <JWTDecoded>jwt.decode(this.jwt);
        return data.value;
    }

    static copy(other: Token | undefined)
    {
        if (other === undefined)
            return undefined;

        return new Token(other.jwt);
    }
}


export function is_valid_token(token: Token): boolean
{
    try
    {
        const data = jwt.decode(token.jwt);

        if (!isJWTData(data))
            return false;

        if (token.is_expired)
            return false;

        const tok = data['value'];

        if (!is_valid_uuid(tok))
            return false;
    }
    catch (err)
    {
        return false;
    }

    return true;
}
