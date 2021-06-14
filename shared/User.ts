
import { UserID } from "./ID";

export const MAX_USERNAME_LENGTH = 50;
export const MAX_PASSWORD_LENGTH = 100;
export const PASSWORD_HASH_LENGTH = 64; // SHA3(256) hex length
export const MAX_PLAYERNAME_LENGTH = 30;
export const MAX_ISLANDNAME_LENGTH = 30;
export const MAX_VERIFICATION_POST_LENGTH = 30;
export const USERNAME_REGEX: RegExp = /^[a-z0-9_]+$/i;
export const PLAYERNAME_REGEX: RegExp = /^[a-z0-9 \-_\/´`'"!\$§%&\.:,;#\+=~\[\]\(\)]+$/i;
export const ISLANDNAME_REGEX: RegExp = PLAYERNAME_REGEX;
export const VERIFICATION_POST_REGEX: RegExp = /^[0-9]*$/i;

export enum Level
{
    Normal,
    Verifier,
    Moderator,
    Admin
}

export const LevelValues: number[] = <number[]>Object.values(Level).filter((x: any) => typeof x === 'number');
export const LevelNames: string[] = ["Normal Player", "Verifier", "Moderator", "Admin"];

export class User
{
    id: UserID = new UserID();
    username: string = "";
    playername: string = "";
    playername_hidden: boolean = false;
    islandname: string = "";
    islandname_hidden: boolean = false;

    password: string = ""; // only hash is stored
    registered: Date = new Date();
    level: Level = Level.Normal;
    banned: boolean = false;
    starred: UserID[] = [];
    blocked: UserID[] = [];

    verification_post: string = "";
    verifier: UserID = undefined;

    static copy(other: User): User
    {
        if (other === undefined)
            return undefined;

        var ret = new User();
        ret.id = UserID.copy(other.id);
        ret.username = other.username;
        ret.playername = other.playername;
        ret.playername_hidden = other.playername_hidden;
        ret.islandname = other.islandname;
        ret.islandname_hidden = other.islandname_hidden;
        ret.password = other.password;
        ret.registered = new Date(other.registered);
        ret.level = other.level;
        ret.banned = other.banned;
        ret.starred = other.starred.map(x => UserID.copy(x));
        ret.blocked = other.blocked.map(x => UserID.copy(x));

        ret.verification_post = other.verification_post;
        ret.verifier = UserID.copy(other.verifier);

        return ret;
    }
}

// settings about a user, e.g. block
export class UserViewSettings
{
    level: Level = Level.Normal;
    banned: boolean = false;
    starred: boolean = false;
    blocked: boolean = false;
    playername_hidden: boolean = false;
    islandname_hidden: boolean = false;
}

// the view of another user by a user, including self
export class UserView
{
    id: UserID;
    username: string;
    playername: string;
    islandname: string;
    registered: Date;

    verification_post: string = "";
    verifier: UserID = undefined;
    settings: UserViewSettings;

    static copy(other: UserView | undefined)
    {
        if (other === undefined)
            return undefined;

        var ret = new UserView();
        ret.id = UserID.copy(other.id);
        ret.username = other.username;
        ret.playername = other.playername;
        ret.islandname = other.islandname;
        ret.registered = new Date(other.registered);
        ret.verification_post = other.verification_post;
        ret.verifier = UserID.copy(other.verifier);
        ret.settings = other.settings;

        return ret;
    }
}

export function validate_username(str: string): void
{
    if (str.length <= 0)
        throw new Error("username cannot be empty");

    if (str.length > MAX_USERNAME_LENGTH)
        throw new Error(`max username length is ${MAX_USERNAME_LENGTH} characters`); 

    const reg = USERNAME_REGEX.exec(str);

    if (reg === null || reg[0].length < str.length)
        throw new Error("username contains illegal characters");
}

export function validate_password(str: string): void
{
    if (str.length <= 0)
        throw new Error("password cannot be empty");

    if (str.length > MAX_PASSWORD_LENGTH)
        throw new Error(`max password length is ${MAX_PASSWORD_LENGTH} characters`); 
}

export function validate_password_hash(str: string): void
{
    if (str.length != PASSWORD_HASH_LENGTH)
        throw new Error(`illegal password hash length`); 

    if (str.match(/^[a-f0-9]+$/i) === null)
        throw new Error(`illegal password hash`); 
}

export function validate_playername(str: string): void
{
    if (str.length <= 0)
        throw new Error("player cannot be empty");

    if (str.length > MAX_PLAYERNAME_LENGTH)
        throw new Error(`max playername length is ${MAX_PLAYERNAME_LENGTH} characters`); 

    const reg = PLAYERNAME_REGEX.exec(str);

    if (reg === null || reg[0].length < str.length)
        throw new Error("playername contains illegal characters");
}

export function validate_islandname(str: string): void
{
    if (str.length <= 0)
        throw new Error("island cannot be empty");

    if (str.length > MAX_ISLANDNAME_LENGTH)
        throw new Error(`max islandname length is ${MAX_ISLANDNAME_LENGTH} characters`); 

    const reg = ISLANDNAME_REGEX.exec(str);

    if (reg === null || reg[0].length < str.length)
        throw new Error("islandname contains illegal characters");
}

export function validate_level(level: Level): void
{
    if (level < 0 || level > Level.Admin)
        throw new Error("illegal user level");
}

export function validate_verification_post(str: string): void
{
    if (str.length <= 0)
        return;

    if (str.length > MAX_VERIFICATION_POST_LENGTH)
        throw new Error(`max verification post length is ${MAX_VERIFICATION_POST_LENGTH} characters`); 

    const reg = VERIFICATION_POST_REGEX.exec(str);

    if (reg === null || reg[0].length < str.length)
        throw new Error("verification post contains illegal characters");
}
