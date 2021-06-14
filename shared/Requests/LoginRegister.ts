import { UserView, Level } from "../User";
import { Token } from "../Token";
import * as base from './base';

export class LoginRequest extends base.Request
{
    constructor(
        public username: string,
        public password: string
    )
    {
        super();
    }

    static copy(other: LoginRequest)
    {
        if (other === undefined)
            return undefined;

        return new LoginRequest(other.username, other.password);
    }

    static isMe(x: any): x is LoginRequest
    {
        return 'username' in x
            && 'password' in x;
    }
}

export class RegisterRequest extends base.Request
{
    constructor(
        public username: string,
        public playername: string,
        public islandname: string,
        public password: string,
        public security_question_answer: string = ""
    )
    {
        super();
    }

    static copy(other: RegisterRequest)
    {
        if (other === undefined)
            return undefined;

        return new RegisterRequest(other.username,
                                   other.playername,
                                   other.islandname,
                                   other.password,
                                   other.security_question_answer,
                                  );
    }

    static isMe(x: any): x is RegisterRequest
    {
        return 'username' in x
            && 'playername' in x
            && 'islandname' in x
            && 'password' in x
            && 'security_question_answer' in x;
    }
}

export class LogoutRequest extends base.AuthenticatedRequest
{
    constructor(token: Token)
    {
        super(token);
    }

    static copy(other: LogoutRequest)
    {
        if (other === undefined)
            return undefined;

        return new LogoutRequest(Token.copy(other.token));
    }

    static isMe(x: any): x is LogoutRequest
    {
        return 'token' in x;
    }
}

export class LoginResponse extends base.Response
{
    constructor(
        public user: UserView,
        public token: Token
    )
    { super(); }

    static copy(other: LoginResponse | undefined)
    {
        if (other === undefined)
            return undefined;

        return new LoginResponse(UserView.copy(other.user),
                                 Token.copy(other.token));
    }

    static isMe(x: any): x is LoginResponse
    {
        return 'user' in x
            && 'token' in x;
    }
}

export type RegisterResponse = LoginResponse

// special
export class AdvancedRegisterRequest extends base.AuthenticatedRequest
{
    constructor(
        token: Token,
        public username: string,
        public playername: string,
        public islandname: string,
        public password: string,
        public id_prefix: string,
        public level: Level
    )
    {
        super(token);
    }

    static copy(other: AdvancedRegisterRequest)
    {
        if (other === undefined)
            return undefined;

        return new AdvancedRegisterRequest(Token.copy(other.token),
                                           other.username,
                                           other.playername,
                                           other.islandname,
                                           other.password,
                                           other.id_prefix,
                                           other.level
                                          );
    }

    static isMe(x: any): x is AdvancedRegisterRequest
    {
        return 'username' in x
            && 'playername' in x
            && 'islandname' in x
            && 'password' in x
            && 'id_prefix' in x
            && 'level' in x
            ;
    }
}

export class AdvancedRegisterResponse extends base.Response
{
    constructor(
        public user: UserView
    )
    { super(); }

    static copy(other: AdvancedRegisterResponse | undefined)
    {
        if (other === undefined)
            return undefined;

        return new AdvancedRegisterResponse(UserView.copy(other.user));
    }

    static isMe(x: any): x is AdvancedRegisterResponse
    {
        return 'user' in x;
    }
}
