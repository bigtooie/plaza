
import { Copyable, copy_from } from './Copyable';
// contains global (server) settings that can be changed by admins at runtime

export enum Visibility
{
    Public,
    AdminOnly
}

export class Setting<T>
{
    constructor(
        public key: string,
        public value_type: Copyable<T>,
        public default_value: T,
        public visibility: Visibility = Visibility.Public,
        public name: string = "",
        public description: string = ""
    )
    {}
}

export class StringSetting extends Setting<String>
{
    constructor(
        key: string,
        default_value: string,
        visibility: Visibility = Visibility.Public,
        name: string = "",
        description: string = "",
        public min_length: number = 0,
        public max_length: number = 100,
        public pattern: string = ""
    )
    {
        super(key, String, default_value, visibility, name, description);
    }

    static copy(other: StringSetting): StringSetting
    {
        if (other === undefined)
            return undefined;

        return new StringSetting(other.key,
                                 copy_from(String, other.default_value),
                                 other.visibility,
                                 other.name,
                                 other.description,
                                 other.min_length,
                                 other.max_length,
                                 other.pattern
                                );
    }

    static isMe(x: any): x is StringSetting
    {
        return 'key' in x && (typeof x.key === 'string')
            && 'value_type' in x && x.value_type === String
            && 'default_value' in x
            && 'visibility' in x
            && 'name' in x
            && 'description' in x
            && 'min_length' in x
            && 'max_length' in x
            && 'pattern' in x
            ;
    }
}

export class NumberSetting extends Setting<Number>
{
    constructor(
        key: string,
        default_value: number,
        visibility: Visibility = Visibility.Public,
        name: string = "",
        description: string = "",
        public min: number = 0,
        public max: number = 100,
    )
    {
        super(key, Number, default_value, visibility, name, description);
    }

    static copy(other: NumberSetting): NumberSetting
    {
        if (other === undefined)
            return undefined;

        return new NumberSetting(other.key,
                                 copy_from(Number, other.default_value),
                                 other.visibility,
                                 other.name,
                                 other.description,
                                 other.min,
                                 other.max
                                );
    }

    static isMe(x: any): x is NumberSetting
    {
        return 'key' in x && (typeof x.key === 'string')
            && 'value_type' in x && x.value_type === Number
            && 'default_value' in x
            && 'visibility' in x
            && 'name' in x
            && 'description' in x
            && 'min' in x
            && 'max' in x
            ;
    }
}

export class BoolSetting extends Setting<Boolean>
{
    constructor(
        key: string,
        default_value: boolean,
        visibility: Visibility = Visibility.Public,
        public name: string = "",
        public description: string = ""
    )
    {
        super(key, Boolean, default_value, visibility, name, description);
    }

    static copy(other: BoolSetting): BoolSetting
    {
        if (other === undefined)
            return undefined;

        return new BoolSetting(other.key,
                               copy_from(Boolean, other.default_value),
                               other.visibility,
                               other.name,
                               other.description
                              );
    }

    static isMe(x: any): x is BoolSetting
    {
        return 'key' in x && (typeof x.key === 'string')
            && 'value_type' in x && x.value_type === Boolean
            && 'default_value' in x
            && 'visibility' in x
            && 'name' in x
            && 'description' in x
            ;
    }
}

export const max_login_session_duration = new NumberSetting(
    "max_login_session_duration",
    16,
    Visibility.AdminOnly,
    "Max. Login Session Duration",
    "For how long a session token is valid (in hours).",
    1,
    999999
);

export const max_session_duration = new NumberSetting(
    "max_session_duration",
    168,
    Visibility.Public,
    "Max. Session Duration",
    "For how long hosted sessions can stay open for (in hours).",
    0,
    999999
);

export const registrations_enabled = new BoolSetting(
    "registrations_enabled",
    true,
    Visibility.Public,
    "Account Registration",
    "Whether new accounts can be registered or not. Admins can always register new accounts."
);

export const register_require_security_question = new BoolSetting(
    "register_require_security_question",
    false,
    Visibility.Public,
    "Require Register Security Question",
    "Whether a security question is required when registering a new account."
);

export const register_security_question = new StringSetting(
    "register_security_question",
    "What is the name of the website you came from? If you're not from there, you do not belong here.",
    Visibility.Public,
    "Register Security Question",
    "The security question to display when registering a new account and Require Register Security Question is enabled.",
    0,
    1000
);

export const register_security_question_answer = new StringSetting(
    "register_security_question_answer",
    "^4chan(nel)?(\\.org)?$",
    Visibility.AdminOnly,
    "Register Security Question Answer",
    "The answer to the security question as a regular expression.",
    0,
    1000
);

export const dodo_in_use_api = new BoolSetting(
    "dodo_in_use_api",
    true,
    Visibility.Public,
    "Dodo-In-Use API",
    "Whether the Dodo-In-Use API is enabled or not. Disable when the API is being abused."
);

export const all: any[] = [
    max_login_session_duration,
    max_session_duration,
    registrations_enabled,
    register_require_security_question,
    register_security_question,
    register_security_question_answer,
    dodo_in_use_api
];

export function get_setting_by_key(key: string)
{
    if (key === null || key === undefined || key.length <= 0)
        return undefined;

    for (const s of all)
        if (s.key === key)
            return s;

    return undefined;
}
