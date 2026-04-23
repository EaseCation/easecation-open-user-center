/**
 * 用户绑定状态类型与枚举
 */

/**
 * 用户绑定状态枚举
 */
export enum UserBindStatus {
    /** 绑定（打开） */
    Open = 'O',
    /** 冻结 */
    Frozen = 'F',
    /** 未绑定/解绑 */
    Unbound = 'X',
}

/**
 * 用户登录时返回的数据
 */
export type UserLoginResponse = {
    openid: string;
    expire: string;
    name: string;
    permission: any;
    userid: any;
    email: any;
    status: any;
    token: string;
    refresh_token?: string;
};
export type UserKey = {
    ecid: string;
    key: number;
    expire_time: string;
    is_used: boolean;
};

/**
 * OpenID验证码
 */
export type OpenidVerificationCode = {
    openid: string;
    code: number;
    email: string;
    is_used: boolean;
    expire_time: string;
    created_at: string;
};

/**
 * 验证状态响应
 */
export type VerificationStatusResponse = {
    remainingAccounts: number;
    accountCreationLimit: number;
    accountCreatedCount: number;
    currentCode?: {
        code: number;
        email: string;
        expireTime: string;
    };
};

/**
 * 请求验证码响应
 */
export type RequestVerificationCodeResponse = {
    code: number;
    email: string;
    expireTime: string;
    remainingAccounts: number;
};

/**
 * 验证并绑定ECID请求
 */
export type VerifyAndBindRequest = {
    code: string;
    ecid: string;
};

/**
 * 验证并绑定ECID响应
 */
export type VerifyAndBindResponse = {
    success: boolean;
    openid?: string;
    email?: string;
    message?: string;
};

/**
 * 用户密保邮箱设置
 */
export type UserEmailSecurity = {
    ecid: string;
    email_enabled: boolean;
    number: number;
    create_time: string;
    update_time: string;
};

/**
 * 邮件验证操作类型枚举
 */
export enum EmailVerificationActionType {
    /** 清除密保 */
    ClearSecurity = 'clear_security',
    /** 设为密保 */
    SetSecurity = 'set_security',
    /** 重置密码 */
    ResetPassword = 'reset_password',
}

/**
 * 邮件验证JWT payload
 */
export type EmailVerificationJwtPayload = {
    ecid: string;
    openid: string;
    action: EmailVerificationActionType;
    action_data?: any; // 如新邮箱地址等
    email: string;
    number: number; // 当前操作次数
    iat: number; // 生成时间
    exp: number; // 过期时间
};

/**
 * 创建邮件验证token的请求数据
 */
export type CreateEmailVerificationTokenRequest = {
    ecid: string;
    action_type: EmailVerificationActionType;
    action_data?: any;
    email: string;
};

/**
 * 验证邮件token的请求数据
 */
export type VerifyEmailTokenRequest = {
    token: string;
};

export type PlayerBindingInfo = {
    ecid: string;
    nickname: string;
    boundIndependentAccount: boolean;
    boundNeteaseAccount: boolean;
    neteaseId?: string;
    xboxId?: string;
    lastLoginTime?: string;
    lastLoginIp?: string;
};
