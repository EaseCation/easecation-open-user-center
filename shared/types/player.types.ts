import type { Ticket } from './ticket.types';

export type SearchedPlayer = {
    ecid: string;
    name: string;
    level: number;
    lastcheck: string;
};

export type BindPlayer = {
    ecid: string;
    openid: string;
    status: string;
    create_time: string;
    unbind_time: string | null;
};

export type ValidPlayer = {
    ecid: string;
    is_frozen: boolean;
    create_time: string;
    unbind_time: string | null;
};

export type BindPlayerResult = {
    valid: ValidPlayer[];
    invalid: Omit<ValidPlayer, 'is_frozen'>[];
};

export type LogAction = {
    log_id: number;
    uid: string;
    target: string;
    authorizer: string;
    action: string;
    create_time: string;
};

export type PlayerNote = {
    note_id: number;
    ecid: string;
    note: string;
    create_time: string;
};

export type PlayerSearchEntry = {
    ecid: string;
    name: string;
    netease: boolean;
    lastcheck?: string;
    level: number;
};

export type StaffShortcut = {
    id: number;
    type: 'A' | 'B' | 'M';
    title: string;
    uid: string;
    content: string;
};

export type UserGiftVip = {
    id: number;
    from_ecid: string;
    from_level: number;
    from_expiry: string;
    to_ecid: string;
    to_max_expiry: string;
    vip_level: number;
    vip_send_left: string;
    create_time: string;
};

export type UserGiftVipLeft = {
    v1: number;
    v2: number;
    v3: number;
    v4: number;
};
export type UserGiftVipandUnexpired = {
    v1: number;
    v2: number;
    v3: number;
    v4: number;
    canGiftUnexpired: boolean;
};

export type PlayerPermission = {
    id: number;
    ecid: string;
    permission: string;
    level: number;
    expiry?: string;
    metadata?: string;
};

export type PlayerPermissionSimple = {
    level: number;
    expiry: string;
};

export type PlayerBanInfo = {
    logid: number;
    type:
        | 'BAN'
        | 'HACK'
        | 'MUTE'
        | 'UNBAN'
        | 'UNMUTE'
        | 'UNHACK'
        | 'WARNING'
        | 'BAN_DEVICE'
        | 'KICK'
        | 'KICK_HOMELAND_PLAYER'
        | 'PARKOUR'
        | 'CLEAR_SCORE'
        | 'CLEAR_DEGREE'
        | 'OVERWATCH'
        | 'FREEZE_SCORE_TOP'
        | 'UNFREEZE_SCORE_TOP'
        | 'RESTRICT_NICK'
        | 'UNRESTRICT_NICK'
        | 'CPS_LIMIT_TRIG';
    target: string;
    source: string;
    hours: number;
    time: string;
    banuntil: string;
    reasontype: string;
    reason: string;
    kickToLobby?: string;
    // CLEAR_SCORE 类型的特殊字段
    nick?: string;
    game?: string;
    scoreType?: string;
    deadlineType?: string;
    rank?: string;
    score?: string;
    homelandId?: string;
};

export type PlayerAuthLog = {
    idlog: number;
    nick: string;
    datelog: string;
    action: 'REGISTER' | 'LOGIN_SUCCESS' | 'LOGIN_WRONG_PASSWORD' | 'LOGOUT';
    ip: string;
    uuid: string;
    device: string;
};

export type PlayerExchangeLog = {
    time: string;
    mainExchange: string;
    gain: string[];
    cost: {
        coin: number;
        diamond: number;
        credit: number;
    };
    // 扩展字段
    id?: number;
    ecid?: string;
    contents?: {
        exchangeLog: {
            date: string;
            mainExchange: string;
            gainMerchandises: string[];
            spendCoin: number;
            spendDiamond: number;
            spendPrice: Array<{ amount: number }>;
            [key: string]: any;
        };
    };
    rawData?: any;
};

export type PlayerChatHistory = {
    logid: number;
    time: string;
    type: 'LOBBY' | 'STAGE' | 'BUGLET' | 'HELPER';
    posType: string;
    posId: number;
    sourceNick: string;
    sourceName: string;
    message: string;
};

export type OriginPlayerInfo = {
    nick: string;
    coin: number;
    diamond: number;
    exp: number;
    email: string;
    lastcheck: string;
    lastip: string;
    lastlogin: string;
    lastUUID: string;
    lastdevice: string;
    name: string;
    exp_data: {
        level: number;
        need: number;
        exp: number;
    };
    is_baning: boolean;
    ban_data?: PlayerBanData;
};

export type PlayerBanData = {
    nick: string;
    type: string;
    dateperform: string;
    dateexpire: string;
    degree: number;
    reason: string;
};

export interface PlayerBindListData {
    ecid: string;
    name: string;
    vip: number;
    media: number;
}

export type BindPlayerDetail = {
    ecid: string;
    ban_data?: PlayerBanData;
    is_frozen: boolean;
    open_id: string;
    email: string;
    bind_time: string;
    name: string;
    level: number;
    credits: number;
    diamonds: number;
    coin: number;
    vip: PlayerPermissionSimple;
    media: PlayerPermissionSimple;
    admin: PlayerPermissionSimple;
    last_login: string;
    next_level: {
        need: number;
        current: number;
        percentage: number;
    };
};

export type BindPlayerDetailFull = BindPlayerDetail & {
    tickets: {
        key: Ticket[];
        regular: Ticket[];
    };
    ticket_bind_records: BindPlayer[];
    ticket_notes: PlayerNote[];
    ticket_logs: LogAction[];
    current_ban: PlayerBanInfo[];
    ban_history: PlayerBanInfo[];
    auth_history: PlayerAuthLog[];
    exchange_log: PlayerExchangeLog[];
    chat_history: PlayerChatHistory[];
};

export type BindPlayerDetailBasic = BindPlayerDetail & {
    ticket_notes: PlayerNote[];
    current_ban: PlayerBanInfo[];
};

export type BindPlayerDetailTickets = {
    ticket_bind_records: BindPlayer[];
    tickets: {
        key: Ticket[];
        regular: Ticket[];
    };
};

export type BindPlayerCode = {
    ecid: string;
    key: number;
    expire_datetime: string;
};

export type UnbindPlayer = {
    ecid: string;
    unbind: boolean;
};

export type IsBindPlayer = {
    ecid: string;
    isBind: boolean;
};

export type PublicScoreTopFullData = {
    [game: string]: {
        [type: string]: {
            [deadline: string]: PublicScoreTopEntry[];
        };
    };
};

export type PublicScoreTopEntry = {
    name: string;
    score: number;
    rank: number;
};

export type PlayerRecordingHistory = {
    id: number;
    record_id: number;
    player: string;
    game: string;
    create_time: string;
    upload_time: string;
    map: string;
    players: string[];
};

export type PublicStageDataSG = {
    time: string; // 时间戳字符串
    uuid: string;
    type: string;
    mapName: string;
    playerCount: number;
    maxPlayerCount: number;
    scoreboard: PublicStageDataSGScoreboardItem[];
};

export type PublicStageDataSGScoreboardItem = {
    player: string;
    name: string;
    kills: number; // 击杀数
    killScore: number; // 击杀积分
    survivalScore: number; // 存活积分
    totalScore: number; // 总分 = 击杀积分 + 存活积分
    winTeam: boolean; // 是否获胜（可选）
    playersRemainWhenDeath: number; // 死亡时场上剩余玩家数量（或 -1 表示未死亡/未统计）
};
