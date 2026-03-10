import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = Number(process.env.MOCK_BACKEND_PORT || process.env.PORT || 9000);
const FRONTEND_USER_URL = process.env.MOCK_FRONTEND_USER_URL || 'http://localhost:9001';
const FRONTEND_ADMIN_URL = process.env.MOCK_FRONTEND_ADMIN_URL || 'http://localhost:9002';

// 工具函数
const nowIso = () => new Date().toISOString();
const nowText = () => nowIso().slice(0, 19).replace('T', ' ');
const clone = value => JSON.parse(JSON.stringify(value));
const toInt = (value, fallback = 0) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const ok = (extra = {}) => ({
    EPF_code: 200,
    EPF_description: '成功',
    ...extra,
});

const base64UrlEncode = text =>
    Buffer.from(text, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');

const parseJsonSafely = (text, fallback = null) => {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
};

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
    // 简单请求日志，方便定位前端请求情况
    console.log(`[mock-backend] ${req.method} ${req.path}`);
    next();
});

// 基础数据定义
const MOCK_USER = {
    openid: 'easecation_mock_2015',
    userid: 2015,
    nickname: '土豆',
    permission: [
        'authorize.super',
        'authorize.normal',
        'sen.admin',
        'ticket.media',
        'ticket.WB',
        'shop',
    ],
};

// 与真实 /ec/detail 一致的完整结构，供 /ec/detail 及 list/basic 等复用
const MOCK_PLAYER = {
    ecid: 'Shirova_',
    name: 'Shirova_',
    level: 99,
    credits: 9527,
    diamonds: 1145,
    coin: 64000,
    vip: { level: 4, expiry: '长期' },
    media: { level: 2, expiry: '2099-12-31 23:59:59' },
    admin: { level: 0, expiry: '长期' },
    ban_data: null,
    is_frozen: false,
    open_id: MOCK_USER.openid,
    email: 'mock-user@example.com',
    bind_time: '2025-01-01 08:00:00',
    last_login: '2026-02-14T07:07:37.000Z',
    next_level: { need: 1000, current: 430, percentage: 43 },
};

const MOCK_PLAYER2 = {
    ecid: 'neteasefuhuahua',
    name: 'fuhua',
    level: 10,
    credits: 1200,
    diamonds: 88,
    coin: 50000,
    vip: { level: 2, expiry: '2026-06-30 23:59:59' },
    media: { level: 0, expiry: '长期' },
    admin: { level: 4, expiry: '长期' },
    ban_data: null,
    is_frozen: false,
    open_id: MOCK_USER.openid,
    email: 'fuhua@example.com',
    bind_time: '2024-06-15 10:30:00',
    last_login: '2026-03-01T12:00:00.000Z',
    next_level: { need: 500, current: 120, percentage: 24 },
};

const MOCK_MEDIA_USER = {
    id: 1,
    openID: MOCK_USER.openid,
    status: '3',
    mpa: 'B-EaseCation',
    EBalance: 888,
    QQNumber: '123456789',
    link: 'https://space.bilibili.com/10086',
    ECID: MOCK_PLAYER.ecid,
    expireDate: '2099-12-31 23:59:59',
    lastReviewed: nowText(),
    createTime: '2025-01-01 00:00:00',
};

// 初始数据定义
const initialFeedback = {
    tid: 9001,
    priority: 95,
    type: 'GU',
    title: '希望增加新手教程引导',
    creator_openid: MOCK_USER.openid,
    initiator: MOCK_PLAYER.ecid,
    target: 'feedback',
    ip: '127.0.0.1',
    status: 'O',
    create_time: nowText(),
    advisor_uid: '10086',
    tag: '建议',
    feedbackType: 'SUGGESTION',
    lastReplyTime: nowText(),
    replyCount: 2,
    details: [
        {
            id: 90010,
            tid: 9001,
            displayTitle: '玩家',
            action: 'R',
            content: '希望首页加一个新手流程卡片，减少上手门槛。',
            contentHtml: '<p>希望首页加一个新手流程卡片，减少上手门槛。</p>',
            contentHtmlUser: '<p>希望首页加一个新手流程卡片，减少上手门槛。</p>',
            attachments: [],
            ip: '127.0.0.1',
            create_time: nowText(),
            isOfficial: false,
        },
        {
            id: 90011,
            tid: 9001,
            displayTitle: '反馈客服',
            action: 'R',
            operator: '官方',
            content: '建议已记录，后续会评估排期。',
            contentHtml: '<p>建议已记录，后续会评估排期。</p>',
            contentHtmlUser: '<p>建议已记录，后续会评估排期。</p>',
            attachments: [],
            ip: '127.0.0.1',
            create_time: nowText(),
            isOfficial: true,
        },
    ],
    subscribed: {
        [MOCK_USER.openid]: true,
    },
};

const initialAnnouncements = [
    {
        id: 1,
        title: 'EaseCation 用户中心正式开源！',
        content:
            '亲爱的 EaseCation 玩家与 MC 社区的小伙伴们：\n大家期盼已久的好消息来啦——EaseCation 用户中心正式开源！ 🎉\n虽然我们之前已经为大家开源过不少服务器项目，但这可是我们第一个开源的 Web 平台项目！\n一直以来，我们都希望能给 MC 社区贡献一个稳定、易用、高鲁棒性的工单平台，同时也为热心玩家提供一个参与共建的渠道，所以这次我们决定把用户中心开放给大家。无论你是想帮忙找BUG，还是想提交代码添砖加瓦，我们都非常欢迎。\n不过，目前我们暂时只开源了前端部分。因为现有的后端逻辑和 EC 的其他 Web 服务强耦合在一起，代码实在有些不够优雅。我们决定先在内部进行重构与优化。等这部分工作顺利完成，我们一定会把清爽的后端代码也开源出来！\n我们的目标是为大家带来一个更开放、高度可定制、且完全属于玩家的现代化社区平台。感谢大家一直以来的支持与包容！\n快来我们的[开源仓库](https://github.com/EaseCation/easecation-open-user-center)逛逛吧，期待你的第一个 PR！✨',
        autoShow: true,
        startTime: '2026-01-01 00:00:00',
        endTime: '2099-12-31 23:59:59',
        dieTime: '2099-12-31 23:59:59',
        card: '用户中心已开源',
        carddesc: '用户中心开源啦',
    },
];

const defaultAiConfigs = {
    system_risk_control: {
        key: 'system_risk_control',
        name: '系统风控',
        description: 'mock 配置',
        prompt: '请评估风险并给出建议。',
        enabled: true,
        config: {
            model: 'qwen-plus',
            ticketTypes: ['AG', 'RP', 'GU'],
        },
        updatedAt: nowIso(),
        updatedBy: String(MOCK_USER.userid),
    },
    ticket_auto_entrust: {
        key: 'ticket_auto_entrust',
        name: '自动委托',
        description: 'mock 配置',
        prompt: '根据规则自动分配工单。',
        enabled: false,
        config: {
            rules: [],
        },
        updatedAt: nowIso(),
        updatedBy: String(MOCK_USER.userid),
    },
    channel_limit: {
        key: 'channel_limit',
        name: '渠道限流',
        description: 'mock 配置',
        prompt: '限制高频提交。',
        enabled: true,
        config: {
            rules: [],
        },
        updatedAt: nowIso(),
        updatedBy: String(MOCK_USER.userid),
    },
};

// 构建函数
const buildTicket = (tid, type, title, status = 'O') => ({
    tid,
    priority: type === 'GU' ? 95 : 35,
    type,
    title,
    creator_openid: MOCK_USER.openid,
    initiator: type === 'MM' ? MOCK_MEDIA_USER.id : MOCK_PLAYER.ecid,
    target: type === 'MM' ? MOCK_MEDIA_USER.ECID : type === 'RP' ? MOCK_PLAYER2.ecid : null,
    ip: '127.0.0.1',
    status,
    create_time: nowText(),
    advisor_uid: '10086',
    details: [
        {
            id: tid * 10 + 1,
            tid,
            displayTitle: '玩家',
            action: 'R',
            operator: MOCK_USER.openid,
            content: `你好啊！我碰到了一些问题~请帮我处理一下！`,
            contentHtml: `<p>你好啊！我碰到了一些问题~请帮我处理一下！</p>`,
            contentHtmlUser: `<p>你好啊！我碰到了一些问题~请帮我处理一下！</p>`,
            attachments: [],
            ip: '127.0.0.1',
            create_time: nowText(),
            isOfficial: false,
        },
        {
            id: tid * 10 + 2,
            tid,
            displayTitle: '官方回复',
            action: 'R',
            operator: 'staff',
            content: '已收到，我们会尽快处理。',
            contentHtml: '<p>已收到，我们会尽快处理。</p>',
            contentHtmlUser: '<p>已收到，我们会尽快处理。</p>',
            attachments: [],
            ip: '127.0.0.1',
            create_time: nowText(),
            isOfficial: true,
        },
    ],
});

const state = {
    tickets: [
        buildTicket(1001, 'AG', '误判申诉：封禁复核', 'W'),
        buildTicket(1002, 'RP', '举报违规玩家', 'O'),
        buildTicket(1003, 'MM', '媒体月审申请', 'X'),
        buildTicket(1004, 'WB', 'WIKI 绑定问题', 'P'),
    ],
    feedbacks: [clone(initialFeedback)],
    feedbackSettings: {
        account: MOCK_PLAYER.ecid,
        notifications: ['wechat', 'inGame'],
        inGameAccounts: [MOCK_PLAYER.ecid],
        openid: MOCK_USER.openid,
        wechatOpenIdPrefix: 'oWac56',
    },
    announcements: clone(initialAnnouncements),
    scripts: [
        {
            id: 1,
            title: '示例脚本',
            description: '自动回复模板',
            isPublic: true,
            content:
                'function runTicketScript(ticket){ return [{url:"/ticket/admin",data:{tid:ticket.tid,action:"note",details:"mock quick op"}}]; }',
            ownerId: String(MOCK_USER.userid),
            createdAt: nowIso(),
        },
    ],
    staffAliases: [
        {
            id: 1,
            uid: String(MOCK_USER.userid),
            alias: `${MOCK_USER.nickname} #${MOCK_USER.userid}`,
            is_default: true,
            in_random_pool: true,
            updated_at: nowText(),
            updated_by: String(MOCK_USER.userid),
        },
    ],
    staffRandomSetting: {
        enabled: true,
        selected_alias_ids: [1],
    },
    tlgift: {
        balances: {
            [MOCK_USER.openid]: 1200,
        },
        aliases: [
            { alias: 'me', openid: MOCK_USER.openid },
            { alias: 'test', openid: 'mock_openid_20001' },
        ],
        items: [
            {
                id: 'mock-item-1',
                title: '原石礼包 A',
                price: 30,
                total_limit: 1000,
                person_limit: 10,
                user_limit: 30,
                total_remaining: 1000,
                user_remaining: 30,
                sales: 0,
                json: '[{"category":"tlgift","idItem":"gift_a","data":1}]',
            },
            {
                id: 'mock-item-2',
                title: '原石礼包 B',
                price: 68,
                total_limit: 500,
                person_limit: 5,
                user_limit: 10,
                total_remaining: 500,
                user_remaining: 10,
                sales: 0,
                json: '[{"category":"tlgift","idItem":"gift_b","data":1}]',
            },
        ],
        logs: [
            {
                id: 1,
                openid: MOCK_USER.openid,
                type: 'adjust',
                amount: 1200,
                product_id: null,
                ecid: null,
                operator: 'system',
                quantity: null,
                created_at: nowText(),
            },
        ],
    },
    riskApprovals: [
        {
            id: 1,
            submitTime: nowIso(),
            createdBy: MOCK_USER.openid,
            playerNickname: '违规玩家A',
            playerECID: 'EC2333',
            operation: 'ban',
            hours: 24,
            attachments: ['user-center-upload/mock-proof.png'],
            reason: '疑似外挂',
            adminNote: '命中风控规则，建议封禁 24 小时。',
            operationType: 'internal',
            communityNickname: null,
            targetLocation: null,
            agrees: 1,
            rejects: 0,
            status: 'Pending',
            votesNeeded: 3,
            requiredAgrees: 2,
            senAdminCount: 3,
            hasVoted: false,
            votes: [
                {
                    user: '10001',
                    decision: 'agree',
                    reason: '证据充分',
                    at: nowIso(),
                },
            ],
        },
    ],
    entrusts: [
        {
            id: 1,
            tid: 1002,
            advisor_uid: 20001,
            status: '0',
            target: String(MOCK_USER.userid),
            origin_status: 'O',
            introduce: '请你帮忙先看一下这个举报单',
            create_time: nowText(),
        },
    ],
    shortcuts: [
        {
            id: 1,
            type: 'A',
            title: '标准回复',
            uid: String(MOCK_USER.userid),
            content: '您好，我们已收到您的反馈，请稍候。',
        },
    ],
    wikiBindings: [
        {
            ecid: MOCK_PLAYER.ecid,
            user_id: 233,
            user_name: 'Wikii',
            bind_status: 'O',
            bound_at: nowText(),
            unbound_at: null,
            openid: MOCK_USER.openid,
        },
    ],
    mediaEpointLogs: [
        {
            id: 1,
            media_id: 1,
            request_id: 'mock-req-1',
            source: 'admin',
            change_type: 'grant',
            amount: 100,
            balance_after: 888,
            target_openid: MOCK_USER.openid,
            operator_openid: 'staff_10086',
            operator: 'staff_10086',
            extra: {
                reason: '补偿发放',
                tid: 1003,
            },
            created_at: nowText(),
        },
    ],
    aiConfigs: clone(defaultAiConfigs),
};

const findTicketByTid = tid =>
    state.tickets.find(ticket => ticket.tid === tid) ||
    state.feedbacks.find(ticket => ticket.tid === tid);

const buildFeedbackListItem = ticket => ({
    tid: ticket.tid,
    status: ticket.status,
    type: ticket.type,
    title: ticket.title,
    priority: ticket.priority,
    create_time: ticket.create_time,
    tag: ticket.tag || '建议',
    feedbackType: ticket.feedbackType || 'SUGGESTION',
    lastReplyTime: ticket.lastReplyTime || ticket.create_time,
    replyCount: ticket.replyCount || (ticket.details || []).length - 1,
});

const buildYearSummaryPayload = (ecid, year, type) => {
    const base = {
        'basic-info': {
            ecid,
            nickname: 'Shirova_',
            firstLoginDate: `${year}-01-02`,
            yearsWithEC: 3,
        },
        'login-stats': {
            totalLoginDays: 187,
            earliestOnlineTime: `${year}-01-03 10:20:00`,
            latestOnlineTime: `${year}-12-20 23:10:00`,
            totalHours: 468,
        },
        'game-stats': {
            totalGames: 520,
            totalKills: 1337,
            winRate: 0.41,
            totalVoidDeaths: 24,
            totalMisjudgments: 2,
            favoriteMode: 'bedwars',
            favoriteModeGames: 180,
            favoriteModeWinRate: 0.44,
            favoriteModeMaxKills: 17,
            favoriteModeMaxStreak: 8,
        },
        'rank-data': {
            seasonRank: '钻石 II',
            seasonScore: 2875,
        },
        'currency-data': {
            totalChestsOpened: 129,
            mostOpenedChest: '春节宝箱',
            totalExpGained: 95200,
            totalCoins: 380000,
            totalECCoins: 12345,
            totalSpent: 64000,
        },
        'social-data': {
            bestTeammate: 'TeammateA',
            mostTeammateName: 'TeammateA',
            teammateGames: 92,
            totalTeamGames: 350,
        },
        'ticket-stats': {
            totalTickets: 12,
            typeCounts: { AG: 2, RP: 5, SP: 1, GU: 4 },
            rewardCount: 2,
            unbanCount: 1,
        },
        'calculate-title': {
            title: {
                key: 'steady-player',
                name: '稳健老玩家',
                description: '你在一年中保持了稳定且高质量的活跃。',
                prefix: '[稳健]',
            },
        },
        'ai-evaluation': {
            evaluation: '你是一位稳定输出、善于协作的玩家，期待你在新的一年继续发光。',
            aiEvaluation: '你是一位稳定输出、善于协作的玩家，期待你在新的一年继续发光。',
        },
    };

    if (!type || type === 'all') {
        return {
            data: {
                ...base,
            },
            aiEvaluation: base['ai-evaluation'].aiEvaluation,
        };
    }

    return {
        data: base[type] || {},
        aiEvaluation: type === 'ai-evaluation' ? base['ai-evaluation'].aiEvaluation : undefined,
    };
};

// ---------------------------- 通用基础接口 ----------------------------

app.get('/healthz', (_req, res) => {
    res.json(ok({ service: 'easecation-user-center-mock-backend', timestamp: nowIso() }));
});

app.get('/callback/sts', (_req, res) => {
    res.json({
        AccessKeyId: 'mock-access-key-id',
        AccessKeySecret: 'mock-access-key-secret',
        SecurityToken: 'mock-security-token',
        Expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
});

app.get('/callback/wechat/login', (req, res) => {
    const returnTo = String(req.query.return_to || '/');
    const target = `${FRONTEND_USER_URL}/login/callback?token=${encodeURIComponent('mock-jwt-token')}&refresh_token=${encodeURIComponent('mock-refresh-token')}&return_to=${encodeURIComponent(returnTo)}`;
    res.redirect(target);
});

app.get('/callback/qq/login', (req, res) => {
    const returnTo = String(req.query.return_to || '/');
    const target = `${FRONTEND_USER_URL}/login/callback?token=${encodeURIComponent('mock-jwt-token')}&refresh_token=${encodeURIComponent('mock-refresh-token')}&return_to=${encodeURIComponent(returnTo)}`;
    res.redirect(target);
});

app.get('/callback/ec/code', (_req, res) => {
    res.redirect(`${FRONTEND_USER_URL}/account`);
});

app.get('/callback/ec/unbind', (_req, res) => {
    res.redirect(`${FRONTEND_USER_URL}/account`);
});

app.get('/callback/ec/isBind', (_req, res) => {
    res.json(ok({ isBind: true }));
});

// ---------------------------- 用户相关 ----------------------------

app.get('/user/login-page', (_req, res) => {
    res.json(ok({ redirectUrl: null }));
});

app.get('/user/login', (req, res) => {
    const state = req.query?.state ? String(req.query.state) : '';
    const target = `${FRONTEND_ADMIN_URL}/login/callback?token=${encodeURIComponent('mock-jwt-token')}&refresh_token=${encodeURIComponent('mock-refresh-token')}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
    res.redirect(target);
});

app.get('/user/info', (_req, res) => {
    res.json(clone(MOCK_USER));
});

app.post('/user/refresh', (_req, res) => {
    res.json(
        ok({
            token: 'mock-jwt-token',
            refresh_token: 'mock-refresh-token',
            data: { token: 'mock-jwt-token' },
        })
    );
});

app.post('/user/logout', (_req, res) => {
    res.json(ok({ message: '已登出(mock)' }));
});

app.post('/user/cross-domain-switch', (req, res) => {
    const type = req.body?.type === 'admin' ? 'admin' : 'user';
    const path = String(req.body?.path || '/');
    const base = type === 'admin' ? FRONTEND_ADMIN_URL : FRONTEND_USER_URL;
    const state = base64UrlEncode(JSON.stringify({ return_to: path }));
    const redirectUrl = `${base}/login/callback?token=${encodeURIComponent('mock-jwt-token')}&refresh_token=${encodeURIComponent('mock-refresh-token')}&state=${encodeURIComponent(state)}&crossDomainSwitch=true`;
    res.json(ok({ redirectUrl }));
});

app.get('/user/console-player-url', (req, res) => {
    const ecid = String(req.query?.ecid || '').trim();
    if (!ecid) {
        res.status(400).json({ EPF_code: 2001, EPF_description: '缺少参数', field: 'ecid' });
        return;
    }
    const base = 'https://example.com/console';
    const url = `${base.replace(/\/$/, '')}/player/${encodeURIComponent(ecid)}`;
    res.json(ok({ url }));
});

app.get('/user/userBindList', (req, res) => {
    const openid = String(req.query.openid || MOCK_USER.openid);
    const bindRows = [
        {
            ecid: MOCK_PLAYER.ecid,
            openid,
            status: 'O',
            create_time: '2025-01-01 08:00:00',
            unbind_time: null,
        },
        {
            ecid: 'EC20001',
            openid,
            status: 'F',
            create_time: '2025-02-01 08:00:00',
            unbind_time: null,
        },
    ];
    res.json(ok({ result: bindRows }));
});

app.post('/user/updateBindByOpenid', (_req, res) => {
    res.json(ok({ message: '已更新绑定状态(mock)' }));
});

app.post('/user/updateAllBindByOpenid', (_req, res) => {
    res.json(ok({ message: '已批量更新绑定状态(mock)' }));
});

app.get('/user/email-security', (req, res) => {
    res.json(
        ok({
            data: {
                ecid: String(req.query.ecid),
                email_enabled: String(req.query.ecid) == 'Shirova_' ? true : false,
                create_time: '2025-10-20T12:34:54.000Z',
                update_time: '2026-02-27T18:25:22.000Z',
                number: 5,
            },
        })
    );
});

app.post('/user/email-security', (_req, res) => {
    res.json(ok({ message: '安全邮箱设置成功(mock)' }));
});

app.get('/user/punishment', (_req, res) => {
    res.json(
        ok({
            records: [
                {
                    id: 1,
                    type: 'freeze',
                    status: 'inactive',
                    reason: '历史记录示例',
                    created_at: nowText(),
                },
            ],
        })
    );
});

app.post('/user/punishment', (_req, res) => {
    res.json(ok({ message: '处罚记录已更新(mock)' }));
});

app.post('/user/punishment/freeze', (_req, res) => {
    res.json(ok({ message: '冻结成功(mock)' }));
});

app.post('/user/punishment/unfreeze', (_req, res) => {
    res.json(ok({ message: '解冻成功(mock)' }));
});

app.post('/user/punishment/mute', (_req, res) => {
    res.json(ok({ message: '禁言成功(mock)' }));
});

app.post('/user/punishment/unmute', (_req, res) => {
    res.json(ok({ message: '解除禁言成功(mock)' }));
});

// ---------------------------- 玩家(ec)相关 ----------------------------

app.get('/ec/list', (_req, res) => {
    res.json([
        {
            ecid: MOCK_PLAYER.ecid,
            name: MOCK_PLAYER.name,
            vip: MOCK_PLAYER.vip.level,
            media: MOCK_PLAYER.media.level,
        },
        {
            ecid: MOCK_PLAYER2.ecid,
            name: MOCK_PLAYER2.name,
            vip: MOCK_PLAYER2.vip.level,
            media: MOCK_PLAYER2.media.level,
        },
    ]);
});

app.get('/ec/basic', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const found = EC_DETAIL_MOCKS.find(p => p.ecid === ecid);
    const detail = found
        ? { ...clone(found), ticket_notes: [], current_ban: [] }
        : {
              ecid,
              name: `Player-${ecid}`,
              level: 50,
              credits: 1000,
              diamonds: 100,
              coin: 10000,
              vip: { level: 0, expiry: '长期' },
              media: { level: 0, expiry: '长期' },
              admin: { level: 0, expiry: '长期' },
              ban_data: null,
              is_frozen: false,
              open_id: '',
              email: '',
              bind_time: '',
              last_login: nowIso(),
              next_level: { need: 1000, current: 500, percentage: 50 },
              ticket_notes: [],
              current_ban: [],
          };
    res.json(ok({ data: detail }));
});

const EC_DETAIL_MOCKS = [MOCK_PLAYER, MOCK_PLAYER2];
app.get('/ec/detail', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const found = EC_DETAIL_MOCKS.find(p => p.ecid === ecid);
    const detail = found
        ? clone(found)
        : {
              ecid,
              name: `Player-${ecid}`,
              level: 50,
              credits: 1000,
              diamonds: 100,
              coin: 10000,
              vip: { level: 0, expiry: '长期' },
              media: { level: 0, expiry: '长期' },
              admin: { level: 0, expiry: '长期' },
              ban_data: null,
              is_frozen: false,
              open_id: '',
              email: '',
              bind_time: '',
              last_login: nowIso(),
              next_level: { need: 1000, current: 500, percentage: 50 },
          };
    res.json(ok(detail));
});

app.get('/ec/search', (req, res) => {
    const keyword = String(req.query.keyword || '').trim();
    const all = [
        {
            ecid: MOCK_PLAYER.ecid,
            name: MOCK_PLAYER.name,
            netease: false,
            level: MOCK_PLAYER.level,
        },
        { ecid: 'netease_123456', name: 'NeteasePlayer', netease: true, level: 18 },
    ];
    const result = keyword
        ? all.filter(
              item =>
                  item.ecid.toLowerCase().includes(keyword.toLowerCase()) ||
                  item.name.toLowerCase().includes(keyword.toLowerCase())
          )
        : all;
    res.json(result);
});

app.get('/ec/scoretop', (_req, res) => {
    res.json(
        ok({
            data: {
                bedwars: {
                    normal: {
                        season: [
                            { name: 'Shirova_', score: 9999, rank: 1 },
                            { name: 'neteasefuhuahua', score: 8888, rank: 2 },
                        ],
                    },
                },
            },
        })
    );
});

app.get('/ec/binding-info', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    res.json(
        ok({
            data: {
                totalResults: 2,
                inputType: 'international',
                ecidToNetease: {
                    results: [
                        {
                            name: 'MockBindingUser',
                            neteaseId: 'netease_8899',
                            originalEcid: ecid,
                            xuid: 'xuid-mock-001',
                        },
                    ],
                },
                neteaseToEcid: {
                    results: [
                        {
                            internationalEcid: ecid,
                            neteaseId: 'netease_8899',
                            xuid: 'xuid-mock-001',
                            originalInput: ecid,
                        },
                    ],
                },
            },
        })
    );
});

app.post('/ec/reset-binding', (_req, res) => {
    res.json(ok({ message: '解绑成功(mock)' }));
});

app.post('/ec/update-email', (_req, res) => {
    res.json(ok({ message: '邮箱更新成功(mock)' }));
});

app.post('/ec/change-password', (_req, res) => {
    res.json(ok({ message: '密码修改成功(mock)' }));
});

app.post('/ec/reset-password', (_req, res) => {
    res.json(ok({ message: '密码重置成功(mock)' }));
});

app.post('/ec/unbind-ticket', (_req, res) => {
    res.json(ok({ message: '解绑申请已提交(mock)' }));
});

app.post('/ec/del-respack-cache', (_req, res) => {
    res.json(ok({ message: '资源包缓存清除成功(mock)' }));
});

app.get('/ec/giftVipall', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const found = EC_DETAIL_MOCKS.find(p => p.ecid === ecid);
    const data = found
        ? [
              {
                  from_ecid: ecid,
                  from_level: found.vip.level,
                  from_expiry: found.vip.expiry,
                  to_ecid: ecid,
                  to_max_expiry: '2099-12-31T16:00:00.000Z',
                  vip_level: 0,
                  vip_send_left: '{"v1":2,"v2":0,"v3":0,"v4":0}',
                  create_time: nowIso(),
                  level: found.vip.level,
              },
          ]
        : [];
    res.json(ok({ data }));
});

app.get('/ec/giftvipall', (req, res) => {
    res.json(ok({ v1: 1, v2: 1, v3: 0, v4: 0, canGiftUnexpired: true }));
});

app.get('/ec/giftvip', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const found = EC_DETAIL_MOCKS.find(p => p.ecid === ecid);
    const v1 = found ? Math.min(2, found.vip.level) : 0;
    res.json(ok({ v1, v2: 0, v3: 0, v4: 0 }));
});

app.post('/ec/giftvip', (_req, res) => {
    res.json(ok({ message: '赠送成功(mock)' }));
});

app.get('/ec/overwatch', (_req, res) => {
    res.json(ok({ data: [] }));
});

app.post('/ec/overwatch', (_req, res) => {
    res.json(ok({ message: '已提交 Overwatch 记录(mock)' }));
});

app.post('/ec/action', (_req, res) => {
    res.json(ok({ message: '玩家操作执行成功(mock)' }));
});

app.post('/ec/fast-action', (_req, res) => {
    res.json(ok({ message: '快捷操作执行成功(mock)' }));
});

app.get('/ec/ticket-logs', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const inMock = EC_DETAIL_MOCKS.some(p => p.ecid === ecid);
    const data = inMock
        ? [
              {
                  log_id: 90001,
                  uid: 18,
                  target: ecid,
                  authorizer: 'TID_1001',
                  action: [{ type: 'report_gift', reported_player: 'OtherPlayer_' }],
                  create_time: nowText(),
              },
              {
                  log_id: 90002,
                  uid: 14,
                  target: ecid,
                  authorizer: 'TID_1002',
                  action: [{ type: '解封', reason: 'mock' }],
                  create_time: nowText(),
              },
          ]
        : [];
    res.json(ok({ data }));
});

app.get('/ec/tickets', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const inMock = EC_DETAIL_MOCKS.some(p => p.ecid === ecid);
    const openid = inMock ? (ecid === MOCK_PLAYER.ecid ? MOCK_USER.openid : 'mock_openid_2') : '';
    const data = inMock
        ? {
              ticket_bind_records: [
                  { openid, status: 'O', create_time: '2025-01-01 08:00:00', unbind_time: null },
              ],
              tickets: {
                  key: [],
                  regular: state.tickets
                      .slice(0, 2)
                      .map(t => ({ ...clone(t), initiator: ecid, creator_openid: openid })),
              },
          }
        : { ticket_bind_records: [], tickets: { key: [], regular: [] } };
    res.json(ok({ data }));
});

app.get('/ec/auth', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const inMock = EC_DETAIL_MOCKS.some(p => p.ecid === ecid);
    const data = inMock
        ? [
              {
                  idlog: 900001,
                  nick: ecid,
                  datelog: nowIso(),
                  action: 'LOGIN_SUCCESS',
                  uuid: '00000000-0000-4000-8000-000000000001',
                  device: 'MockDevice',
              },
              {
                  idlog: 900002,
                  nick: ecid,
                  datelog: nowIso(),
                  action: 'LOGIN_SUCCESS',
                  uuid: '00000000-0000-4000-8000-000000000001',
                  device: 'MockDevice',
              },
          ]
        : [];
    res.json(ok({ data }));
});

app.get('/ec/chat', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const inMock = EC_DETAIL_MOCKS.some(p => p.ecid === ecid);
    const data = inMock
        ? [
              {
                  logid: 90001,
                  time: nowIso(),
                  type: 'LOBBY',
                  posType: 'lobby',
                  posId: 1,
                  sourceNick: ecid,
                  sourceName: ecid,
                  message: '[Mock] 大厅聊天示例消息',
              },
              {
                  logid: 90002,
                  time: nowIso(),
                  type: 'STAGE',
                  posType: 'bedwars',
                  posId: 2,
                  sourceNick: ecid,
                  sourceName: ecid,
                  message: '[Mock] 对局内聊天示例',
              },
          ]
        : [];
    res.json(ok({ data }));
});

app.get('/ec/mail', (req, res) => {
    const addressee = String(req.query.addressee || req.query.ecid || MOCK_PLAYER.ecid);
    const inMock = EC_DETAIL_MOCKS.some(p => p.ecid === addressee);
    const data = inMock
        ? [
              {
                  idmail: 90001,
                  addresser: 'MockSystem',
                  addressee,
                  title: 'Mock Mail Title',
                  content: 'Mock content.',
                  gift: null,
                  autoshow: 0,
                  readtime: null,
              },
              {
                  idmail: 90002,
                  addresser: '',
                  addressee,
                  title: 'Mock Notice',
                  content: 'Mock notice content.',
                  gift: null,
                  autoshow: 1,
                  readtime: nowIso(),
              },
          ]
        : [];
    res.json(ok({ data }));
});

app.get('/ec/recording', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const inMock = EC_DETAIL_MOCKS.some(p => p.ecid === ecid);
    const data = inMock
        ? [
              {
                  id: 900001,
                  record_id: 80001,
                  player: ecid,
                  game: 'bedwars-remake-solo',
                  create_time: nowIso(),
                  upload_time: nowIso(),
                  map: 'stagemaps/bedwars/mock',
                  players: [ecid, 'OtherPlayer'],
              },
              {
                  id: 900002,
                  record_id: 80002,
                  player: ecid,
                  game: 'buhc_sword',
                  create_time: nowIso(),
                  upload_time: nowIso(),
                  map: 'stagemaps/buhc/mock',
                  players: [ecid, 'AnotherPlayer'],
              },
          ]
        : [];
    res.json(ok({ data }));
});

app.get('/ec/ban', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const inMock = EC_DETAIL_MOCKS.some(p => p.ecid === ecid);
    const data = inMock
        ? [
              {
                  logid: 90001,
                  type: 'UNBAN',
                  target: ecid,
                  source: 'TID_MOCK',
                  hours: 0,
                  time: nowIso(),
                  banuntil: '',
                  reasontype: '解封操作',
                  reason: 'mock',
              },
              {
                  logid: 90002,
                  type: 'HACK',
                  target: ecid,
                  source: 'WACAuto',
                  hours: 168,
                  time: nowIso(),
                  banuntil: nowIso(),
                  reasontype: '',
                  reason: '（反作弊系统）mock',
              },
          ]
        : [];
    res.json(ok({ data }));
});

app.get('/ec/gift-send-stats', (_req, res) => {
    res.json(ok({ total: 0, today: 0 }));
});

app.get('/ec/bind', (req, res) => {
    const code = String(req.query.code || '');
    res.json(ok({ message: '绑定成功(mock)', code, ecid: MOCK_PLAYER.ecid }));
});

app.get('/ec/gift', (_req, res) => {
    res.json(ok({ v1: 1, v2: 1, v3: 0, v4: 0, canGiftUnexpired: true }));
});

app.post('/ec/gift', (_req, res) => {
    res.json(ok({ message: '赠送成功(mock)' }));
});

app.get('/public/sgmatchscore', (_req, res) => {
    res.json(
        ok({
            data: [
                {
                    time: String(Math.floor(Date.now() / 1000)),
                    uuid: 'mock-match-1',
                    type: 'SG',
                    mapName: 'MockMap',
                    playerCount: 8,
                    maxPlayerCount: 16,
                    scoreboard: [
                        {
                            player: 'player-a',
                            name: 'MockA',
                            kills: 4,
                            killScore: 40,
                            survivalScore: 60,
                            totalScore: 100,
                            winTeam: true,
                            playersRemainWhenDeath: -1,
                        },
                        {
                            player: 'player-b',
                            name: 'MockB',
                            kills: 2,
                            killScore: 20,
                            survivalScore: 30,
                            totalScore: 50,
                            winTeam: false,
                            playersRemainWhenDeath: 2,
                        },
                    ],
                },
            ],
        })
    );
});

// ---------------------------- 工单相关 ----------------------------

app.get('/ticket/list', (_req, res) => {
    res.json(clone(state.tickets));
});

app.get('/ticket/count', (_req, res) => {
    res.json(
        ok({
            count_waiting_total: 4,
            count_waiting_unassigned: 2,
            count_waiting_assigned: 2,
            count_waiting_senior_unassigned: 1,
            count_waiting_entrust: state.entrusts.filter(item => item.status === '0').length,
            next_tid_vip: 1005,
            next_tid_normal: 1006,
            count_waiting_my: {
                my: 1,
                unassigned: 2,
                upgrade: 0,
            },
        })
    );
});

app.get('/ticket/media/count', (_req, res) => {
    res.json(
        ok({
            count_waiting_audit: 1,
            count_waiting_monthly: 1,
            count_waiting_update: 0,
            count_waiting_event: 0,
            count_waiting_my: {
                my: 1,
                unassigned: 1,
                upgrade: 0,
            },
        })
    );
});

app.get('/ticket/chooseList', (req, res) => {
    const type = String(req.query.type || 'game');
    if (type === 'game') {
        res.json([
            { id: MOCK_PLAYER.ecid, display: `${MOCK_PLAYER.name} (${MOCK_PLAYER.ecid})` },
            { id: 'EC20001', display: 'SecondMock (EC20001)' },
        ]);
        return;
    }
    res.json([]);
});

app.get('/ticket/detail', (req, res) => {
    const tid = toInt(req.query.tid, 1001);
    const ticket = findTicketByTid(tid);
    if (ticket) {
        res.json(clone(ticket));
        return;
    }
    res.json(buildTicket(tid, 'OT', `工单 #${tid}`, 'W'));
});

app.post('/ticket/new', (req, res) => {
    const type = String(req.body?.type || 'OT');
    const title = String(req.body?.title || '新建工单(mock)');
    const newTid = Math.max(...state.tickets.map(ticket => ticket.tid)) + 1;
    const newTicket = buildTicket(newTid, type, title, 'O');
    state.tickets.unshift(newTicket);
    res.json(ok({ tid: newTid, ticket: newTicket }));
});

app.post('/ticket/action', (_req, res) => {
    res.json(ok({ detail_id: Date.now() % 100000, message: '工单操作成功(mock)' }));
});

app.post('/ticket/admin', (_req, res) => {
    res.json(ok({ detail_id: Date.now() % 100000, message: '管理员操作成功(mock)' }));
});

app.get('/ticket/admin', (_req, res) => {
    res.json(ok({ message: '管理员操作成功(mock)' }));
});

app.get('/ticket/aiReply', (req, res) => {
    const stream = String(req.query.stream || 'false') === 'true';
    const tid = toInt(req.query.tid, 1001);
    const prompt = String(req.query.prompt || '').trim();

    if (!stream) {
        res.json(
            ok({
                reply: `这是工单 #${tid} 的 AI mock 回复。${prompt ? `\n附加提示：${prompt}` : ''}`,
            })
        );
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
    }

    const thoughtPayload = {
        output: {
            thoughts: [
                {
                    response: JSON.stringify({
                        nodeName: '意图分析',
                        nodeStatus: 'success',
                        nodeType: 'thinking',
                        nodeExecTime: '15ms',
                        output: '已完成工单上下文分析。',
                    }),
                },
            ],
        },
    };

    const finalPayload = {
        output: {
            text: JSON.stringify({
                output: `这是工单 #${tid} 的 AI mock 回复。${prompt ? `\n附加提示：${prompt}` : ''}`,
            }),
            finish_reason: 'stop',
        },
    };

    res.write(`data: ${JSON.stringify(thoughtPayload)}\n\n`);
    res.write(`data: ${JSON.stringify(finalPayload)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
});

app.get('/ticket/adminMy', (_req, res) => {
    const notMediaTickets = state.tickets.filter(
        ticket => !['MM', 'AB', 'MU', 'ME'].includes(ticket.type)
    );
    res.json(
        ok({
            inProgress: notMediaTickets.filter(ticket => ['O', 'W', 'X'].includes(ticket.status)),
            done: notMediaTickets.filter(ticket => ['P', 'R', 'D'].includes(ticket.status)),
        })
    );
});

app.get('/ticket/media/adminMy', (_req, res) => {
    const mediaTickets = state.tickets.filter(ticket =>
        ['MM', 'AB', 'MU', 'ME'].includes(ticket.type)
    );
    res.json(
        ok({
            inProgress: mediaTickets.filter(ticket => ['O', 'W', 'X'].includes(ticket.status)),
            done: mediaTickets.filter(ticket => ['P', 'R', 'D'].includes(ticket.status)),
        })
    );
});

app.get('/ticket/query', (req, res) => {
    const page = toInt(req.query.page, 1);
    const pageSize = toInt(req.query.pageSize, 20);
    const start = (page - 1) * pageSize;
    const result = state.tickets.slice(start, start + pageSize);
    res.json(
        ok({
            result,
            total: state.tickets.length,
            hasMore: start + pageSize < state.tickets.length,
        })
    );
});

app.get('/ticket/query/media', (req, res) => {
    const page = toInt(req.query.page, 1);
    const pageSize = toInt(req.query.pageSize, 20);
    const mediaTickets = state.tickets.filter(ticket =>
        ['MM', 'AB', 'MU', 'ME'].includes(ticket.type)
    );
    const start = (page - 1) * pageSize;
    const result = mediaTickets.slice(start, start + pageSize);
    res.json(
        ok({
            result,
            total: mediaTickets.length,
            hasMore: start + pageSize < mediaTickets.length,
        })
    );
});

app.get('/ticket/assign', (req, res) => {
    const type = String(req.query.type || 'my');
    if (type === 'my' || type === 'myMedia') {
        res.json(ok({ tid: state.tickets[0]?.tid || 1001, status: 1 }));
        return;
    }
    res.json(ok({ tid: state.tickets[1]?.tid || 1002, status: 1 }));
});

app.get('/ticket/drop', (_req, res) => {
    res.json(ok({ message: '已放弃当前工单(mock)' }));
});

app.post('/ticket/jyRematch', (_req, res) => {
    res.json(ok({ message: '已触发重匹配(mock)' }));
});

app.post('/ticket/ecidTicket', (_req, res) => {
    res.json(ok({ message: 'ECID 工单已创建(mock)' }));
});

app.post('/ticket/media/monthly', (_req, res) => {
    res.json(ok({ message: '月审工单提交成功(mock)' }));
});

app.post('/ticket/listByOpenId', (req, res) => {
    const openid = String(req.body?.openid || MOCK_USER.openid);
    const list = state.tickets.map(ticket => ({ ...ticket, creator_openid: openid }));
    res.json(clone(list));
});

app.post('/ticket/listByOpenIdAndType', (req, res) => {
    const type = String(req.body?.type || 'AG');
    const list = state.tickets.filter(ticket => ticket.type === type);
    res.json(clone(list));
});

app.get('/ticket/today-stats', (_req, res) => {
    res.json(
        ok({
            total: 12,
            byType: { AG: 5, RP: 3, SP: 2, MM: 2 },
            hourly: Array.from({ length: 24 }, (_, index) => (index % 5 === 0 ? 1 : 0)),
            auto_closed: 2,
            in_game_submitted: 7,
        })
    );
});

app.get('/ticket/today-stats/hour', (_req, res) => {
    res.json(
        ok({
            hours: Array.from({ length: 24 }, (_, index) => ({ hour: index, count: index % 3 })),
        })
    );
});

app.get('/ticket/process-time-stats', (_req, res) => {
    res.json(
        ok({
            avgFirstReplyMinutes: 12,
            avgCloseMinutes: 78,
            p90CloseMinutes: 210,
        })
    );
});

app.get('/ticket/adminRecruitmentTime', (_req, res) => {
    res.json(ok({ canRecruit: true, start: '09:00', end: '23:00' }));
});

app.post('/ticket/generate-share-token', (req, res) => {
    const tid = toInt(req.body?.tid, 1001);
    const token = 'mocktoken';
    const baseUrl = process.env.MOCK_FRONTEND_USER_URL || 'http://localhost:9001';
    const url = `${baseUrl.replace(/\/$/, '')}/tksnapshot/${tid}?token=${token}`;
    res.json(ok({ token, url }));
});

// ---------------------------- 媒体相关 ----------------------------

app.get('/media/list', (_req, res) => {
    res.json(
        ok({
            is_media_member: true,
            media_group: MOCK_MEDIA_USER.status,
            media_expiry: '2099-12-31 23:59:59',
            media: clone(MOCK_MEDIA_USER),
        })
    );
});

app.get('/media/info', (_req, res) => {
    res.json(
        ok({
            is_media_member: true,
            media_group: MOCK_MEDIA_USER.status,
            media_expiry: '2099-12-31 23:59:59',
            result: clone(MOCK_MEDIA_USER),
            valid: clone(MOCK_MEDIA_USER),
        })
    );
});

app.get('/media/listAdmin', (_req, res) => {
    res.json([
        clone(MOCK_MEDIA_USER),
        {
            ...clone(MOCK_MEDIA_USER),
            id: 2,
            openID: 'mock_openid_20001',
            ECID: 'EC20001',
            status: '2',
            mpa: 'D',
            EBalance: 320,
            link: 'https://www.douyin.com/user/mock20001',
        },
    ]);
});

app.get('/media/detail', (req, res) => {
    const openid = String(req.query.openid || MOCK_USER.openid);
    res.json(
        ok({
            ...clone(MOCK_MEDIA_USER),
            openID: openid,
            tickets: {
                key: [],
                regular: clone(state.tickets.slice(0, 2)),
            },
        })
    );
});

app.post('/media/getgroup', (_req, res) => {
    res.json(
        ok({
            shopgroup1: '创作者交流群 1',
            shopgrouplink1: 'https://qm.qq.com/mock-group-1',
            shopgroup2: '创作者交流群 2',
            shopgrouplink2: 'https://qm.qq.com/mock-group-2',
            status3group: '卓越创作者群',
            status3grouplink: 'https://qm.qq.com/mock-group-3',
        })
    );
});

app.post('/media/applyBind', (_req, res) => {
    res.json(ok({ message: '媒体申请已提交(mock)' }));
});

app.post('/media/update', (_req, res) => {
    res.json(ok({ message: '媒体信息更新成功(mock)' }));
});

app.post('/media/updateECID', (_req, res) => {
    res.json(ok({ message: '媒体 ECID 更新成功(mock)' }));
});

app.get('/media/getMediaInfoByOpenId', (req, res) => {
    const openid = String(req.query.openId || req.query.openid || MOCK_USER.openid);
    const result = { ...clone(MOCK_MEDIA_USER), openID: openid };
    res.json(ok({ result }));
});

app.get('/media/getMediaInfo', (_req, res) => {
    res.json(ok(clone(MOCK_MEDIA_USER)));
});

app.post('/media/giveEpoints', (_req, res) => {
    res.json(ok({ message: 'E 点发放成功(mock)' }));
});

app.post('/media/giveMonthlyGift', (_req, res) => {
    res.json(ok({ message: '月度礼包发放成功(mock)' }));
});

app.get('/media/epoints/logs', (req, res) => {
    const page = toInt(req.query.page, 1);
    const pageSize = toInt(req.query.pageSize, 10);
    const start = (page - 1) * pageSize;
    const list = state.mediaEpointLogs.slice(start, start + pageSize);
    res.json(
        ok({
            data: {
                list,
                total: state.mediaEpointLogs.length,
                page,
                pageSize,
            },
        })
    );
});

// ---------------------------- 商品相关 ----------------------------

const shopProducts = [
    {
        id: 101,
        title: '称号：开源先锋',
        json: '[{"category":"prefix","idItem":"open_source","data":1}]',
        price: 30,
        detail: '用于展示开源参与者身份。',
        total_limit: 0,
        monthly_limit: 5,
        global_limit: 20,
        permanent_limit: 0,
        is_vip: 0,
        is_hidden: 0,
        sales_monthly: 2,
        limit_sales: 1,
        current_month_sales: 1,
        sales: 12,
    },
    {
        id: 102,
        title: '外观：星辰斗篷',
        json: '[{"category":"ornament.back","idItem":"star_cape","data":1}]',
        price: 88,
        detail: '限定外观，支持商城演示。',
        total_limit: 50,
        monthly_limit: 2,
        global_limit: 3,
        permanent_limit: 50,
        is_vip: 1,
        is_hidden: 0,
        sales_monthly: 8,
        limit_sales: 0,
        current_month_sales: 0,
        sales: 20,
    },
];

app.get('/item/search', (req, res) => {
    const keyword = String(req.query.keyword || '')
        .trim()
        .toLowerCase();
    const data = keyword
        ? shopProducts.filter(item => item.title.toLowerCase().includes(keyword))
        : shopProducts;
    res.json(ok({ data: clone(data) }));
});

app.get('/item/searchById', (req, res) => {
    const id = toInt(req.query.id, 101);
    const found = shopProducts.find(item => item.id === id) || shopProducts[0];
    res.json(ok({ data: clone(found) }));
});

app.post('/item/purchase', (req, res) => {
    const itemId = toInt(req.body?.itemId, 101);
    const quantity = toInt(req.body?.quantity, 1);
    const product = shopProducts.find(item => item.id === itemId) || shopProducts[0];
    res.json(
        ok({
            orderId: `mock-order-${Date.now()}`,
            itemId,
            quantity,
            total: quantity * Number(product.price || 0),
        })
    );
});

app.get('/item/purchase-logs/my', (req, res) => {
    const page = toInt(req.query.page, 1);
    const pageSize = toInt(req.query.pageSize, 10);
    const list = [
        {
            id: 1,
            ecid: MOCK_PLAYER.ecid,
            item_title: '称号：开源先锋',
            quantity: 1,
            total_price: 30,
            created_at: nowIso(),
        },
        {
            id: 2,
            ecid: MOCK_PLAYER.ecid,
            item_title: '外观：星辰斗篷',
            quantity: 1,
            total_price: 88,
            created_at: nowIso(),
        },
    ];
    res.json(
        ok({
            data: {
                list,
                total: list.length,
                page,
                pageSize,
            },
        })
    );
});

app.get('/item/manager/stats/weekly', (_req, res) => {
    res.json(
        ok({
            totalPurchases: 12,
            totalEBalanceSpent: 520,
            topItem: {
                itemId: 101,
                quantity: 8,
                totalSpent: 240,
                title: '称号：开源先锋',
            },
        })
    );
});

app.get('/item/manager/search', (req, res) => {
    const keyword = String(req.query.keyword || '')
        .trim()
        .toLowerCase();
    const data = keyword
        ? shopProducts.filter(item => item.title.toLowerCase().includes(keyword))
        : shopProducts;
    res.json(ok({ data: clone(data) }));
});

app.post('/item/addItem', (req, res) => {
    const payload = req.body || {};
    const newId = Math.max(...shopProducts.map(item => item.id)) + 1;
    shopProducts.push({
        id: newId,
        title: String(payload.title || `新商品-${newId}`),
        json: String(payload.json || '[]'),
        price: Number(payload.price || 1),
        detail: String(payload.detail || 'mock 新商品'),
        total_limit: Number(payload.total_limit || 0),
        monthly_limit: Number(payload.monthly_limit || 0),
        global_limit: Number(payload.global_limit || 0),
        permanent_limit: Number(payload.permanent_limit || 0),
        is_vip: Number(payload.is_vip || 0),
        is_hidden: Number(payload.is_hidden || 0),
        sales_monthly: 0,
        limit_sales: 0,
        current_month_sales: 0,
        sales: 0,
    });
    res.json(ok({ id: newId }));
});

app.put('/item/update/:id', (req, res) => {
    const id = toInt(req.params.id, 0);
    const idx = shopProducts.findIndex(item => item.id === id);
    if (idx >= 0) {
        shopProducts[idx] = { ...shopProducts[idx], ...req.body, id };
    }
    res.json(ok({ id }));
});

app.post('/item/update/:id', (req, res) => {
    const id = toInt(req.params.id, 0);
    const idx = shopProducts.findIndex(item => item.id === id);
    if (idx >= 0) {
        shopProducts[idx] = { ...shopProducts[idx], ...req.body, id };
    }
    res.json(ok({ id }));
});

app.delete('/item/delete', (req, res) => {
    const id = toInt(req.query.id, 0);
    const idx = shopProducts.findIndex(item => item.id === id);
    if (idx >= 0) {
        shopProducts.splice(idx, 1);
    }
    res.json(ok({ id }));
});

app.get('/item/delete', (req, res) => {
    const id = toInt(req.query.id, 0);
    const idx = shopProducts.findIndex(item => item.id === id);
    if (idx >= 0) {
        shopProducts.splice(idx, 1);
    }
    res.json(ok({ id }));
});

// ---------------------------- 反馈相关 ----------------------------

app.get('/feedback/check-eligibility', (_req, res) => {
    res.json(
        ok({
            canSpeak: true,
            nickname: MOCK_PLAYER.name,
            ecid: MOCK_PLAYER.ecid,
            isAdmin: true,
        })
    );
});

app.get('/feedback/experience', (_req, res) => {
    res.json(ok({ experience: 120, canCheckinToday: true }));
});

app.post('/feedback/checkin', (_req, res) => {
    res.json(ok({ experience: 125, canCheckinToday: false, awarded: true }));
});

app.get('/feedback/list', (req, res) => {
    const keyword = String(req.query.keyword || '')
        .trim()
        .toLowerCase();
    const all = state.feedbacks.map(ticket => buildFeedbackListItem(ticket));
    const list = keyword ? all.filter(item => item.title.toLowerCase().includes(keyword)) : all;
    res.json(ok({ list, total: list.length }));
});

app.get('/feedback/subscriptions', (_req, res) => {
    const list = state.feedbacks.map(ticket => buildFeedbackListItem(ticket));
    res.json(ok({ list }));
});

app.get('/feedback/subscriptions/by-openid', (_req, res) => {
    const list = state.feedbacks.map(ticket => buildFeedbackListItem(ticket));
    res.json(ok({ list }));
});

app.get('/feedback/detail', (req, res) => {
    const tid = toInt(req.query.tid, initialFeedback.tid);
    const found = state.feedbacks.find(ticket => ticket.tid === tid) || state.feedbacks[0];
    res.json(clone(found));
});

app.post('/feedback/reply', (req, res) => {
    const tid = toInt(req.body?.tid, initialFeedback.tid);
    const details = String(req.body?.details || '').trim() || 'mock 回复内容';
    const parentDetailId = req.body?.parent_detail_id
        ? toInt(req.body.parent_detail_id, 0)
        : undefined;

    const ticket = state.feedbacks.find(item => item.tid === tid);
    if (ticket) {
        const detailId = Date.now() % 1000000;
        ticket.details.push({
            id: detailId,
            tid,
            displayTitle: MOCK_PLAYER.name,
            action: 'R',
            content: details,
            contentHtml: `<p>${details}</p>`,
            contentHtmlUser: `<p>${details}</p>`,
            attachments: Array.isArray(req.body?.files) ? req.body.files : [],
            ip: '127.0.0.1',
            create_time: nowText(),
            isOfficial: false,
            parentDetailId: parentDetailId || undefined,
        });
        ticket.replyCount = ticket.details.length - 1;
        ticket.lastReplyTime = nowText();
        res.json(ok({ detail_id: detailId, subscribed: ticket.subscribed }));
        return;
    }

    res.json(ok({ detail_id: Date.now() % 1000000 }));
});

app.post('/feedback/subscription', (req, res) => {
    const tid = toInt(req.body?.tid, initialFeedback.tid);
    const openid = String(req.body?.openid || MOCK_USER.openid);
    const subscribe = Boolean(req.body?.subscribe);
    const ticket = state.feedbacks.find(item => item.tid === tid);
    if (ticket) {
        ticket.subscribed = ticket.subscribed || {};
        ticket.subscribed[openid] = subscribe;
        res.json(ok({ subscribed: ticket.subscribed }));
        return;
    }
    res.json(ok({ subscribed: { [openid]: subscribe } }));
});

app.get('/feedback/settings', (_req, res) => {
    res.json(ok(clone(state.feedbackSettings)));
});

app.post('/feedback/settings', (req, res) => {
    state.feedbackSettings = {
        ...state.feedbackSettings,
        ...req.body,
    };
    res.json(ok(clone(state.feedbackSettings)));
});

app.post('/feedback/create', (_req, res) => {
    res.json(ok({ message: '创建反馈成功(mock)' }));
});

app.post('/feedback/create-from-ticket', (_req, res) => {
    res.json(ok({ message: '已从工单创建反馈(mock)' }));
});

app.get('/feedback/ai-generate', (req, res) => {
    const tid = toInt(req.query.tid, 0);
    res.json(
        ok({
            title: tid ? `工单 #${tid} 的反馈建议` : '反馈建议标题(mock)',
            details: '这是 AI 生成的 mock 建议回复内容，可直接编辑后提交。',
        })
    );
});

app.post('/feedback/ai-generate', (_req, res) => {
    res.json(
        ok({
            title: '反馈建议标题(mock)',
            details: '这是 AI 生成的 mock 建议回复内容，可直接编辑后提交。',
            reply: '这是 AI 生成的 mock 建议回复内容，可直接编辑后提交。',
        })
    );
});

app.post('/feedback/remove', (_req, res) => {
    res.json(ok({ message: '反馈移除成功(mock)' }));
});

app.post('/feedback/delete', (_req, res) => {
    res.json(ok({ message: '反馈删除成功(mock)' }));
});

app.post('/feedback/tag', (_req, res) => {
    res.json(ok({ message: '标签更新成功(mock)' }));
});

app.post('/feedback/type', (_req, res) => {
    res.json(ok({ message: '类型更新成功(mock)' }));
});

app.post('/feedback/mark-status', (_req, res) => {
    res.json(ok({ message: '状态更新成功(mock)' }));
});

app.get('/feedback/meta', (req, res) => {
    const tid = toInt(req.query.tid, initialFeedback.tid);
    const ticket = state.feedbacks.find(item => item.tid === tid) || state.feedbacks[0];
    const subscriptions = Object.entries(ticket?.subscribed || {})
        .filter(([, enabled]) => Boolean(enabled))
        .map(([openid]) => openid);
    res.json(
        ok({
            tid,
            tag: ticket?.tag || '建议',
            type: ticket?.feedbackType || 'SUGGESTION',
            subscriptions,
        })
    );
});

app.post('/feedback/meta', (_req, res) => {
    res.json(ok({ message: '元数据更新成功(mock)' }));
});

app.post('/feedback/subscribe-for-user', (_req, res) => {
    res.json(ok({ message: '订阅设置成功(mock)' }));
});

app.post('/feedback/subscriptions/set', (_req, res) => {
    res.json(ok({ message: '订阅列表设置成功(mock)' }));
});

app.get('/feedback/admin/detail/:detailId', (req, res) => {
    const detailId = toInt(req.params.detailId, 0);
    const allTickets = [...state.feedbacks, ...state.tickets];
    let found = null;
    for (const ticket of allTickets) {
        const detail = (ticket.details || []).find(item => Number(item.id) === detailId);
        if (detail) {
            found = detail;
            break;
        }
    }
    const detail = found || {
        id: detailId,
        tid: initialFeedback.tid,
        displayTitle: '编辑内容',
        action: 'R',
        operator: MOCK_USER.openid,
        content: '这是用于编辑的 mock detail。',
        isOfficial: false,
        create_time: nowText(),
    };
    // 兼容两种前端读取方式：直接取字段，或从 detail 字段读取
    res.json(
        ok({
            ...clone(detail),
            detail: clone(detail),
        })
    );
});

app.put('/feedback/admin/detail/:detailId', (req, res) => {
    const detailId = toInt(req.params.detailId, 0);
    let updated = false;
    const allTickets = [...state.feedbacks, ...state.tickets];
    for (const ticket of allTickets) {
        const detail = (ticket.details || []).find(item => Number(item.id) === detailId);
        if (!detail) continue;
        detail.action = String(req.body?.action || detail.action || 'R');
        detail.displayTitle = String(req.body?.displayTitle || detail.displayTitle || '编辑内容');
        detail.content = String(req.body?.content || detail.content || '');
        detail.contentHtml = `<p>${detail.content}</p>`;
        detail.contentHtmlUser = `<p>${detail.content}</p>`;
        updated = true;
        break;
    }
    res.json(ok({ message: '详情更新成功(mock)', updated }));
});

app.post('/feedback/admin/reply', (_req, res) => {
    res.json(ok({ message: '管理员回复成功(mock)' }));
});

app.post('/feedback/admin/set-featured', (_req, res) => {
    res.json(ok({ message: '精选状态更新成功(mock)' }));
});

// ---------------------------- 年度总结相关 ----------------------------

app.get('/year-summary', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    const year = toInt(req.query.year, 2025);
    const type = String(req.query.type || 'all');

    const payload = buildYearSummaryPayload(ecid, year, type);
    res.json(ok(payload));
});

app.post('/year-summary/ai-evaluation', (req, res) => {
    const ecid = String(req.body?.ecid || MOCK_PLAYER.ecid);
    const year = toInt(req.body?.year, 2025);
    const text = `${ecid} 在 ${year} 年表现稳定，沟通积极，值得继续保持。`;
    res.json(ok({ aiEvaluation: text, data: { aiEvaluation: text } }));
});

app.post('/year-summary/calculate-title', (req, res) => {
    const ecid = String(req.body?.ecid || MOCK_PLAYER.ecid);
    res.json(
        ok({
            data: {
                key: 'steady-player',
                name: '稳健老玩家',
                description: `${ecid} 在全年保持稳定输出。`,
                prefix: '[稳健]',
            },
        })
    );
});

app.post('/year-summary/share-link', (req, res) => {
    const ecid = String(req.body?.ecid || MOCK_PLAYER.ecid);
    const year = toInt(req.body?.year, 2025);
    const types = Array.isArray(req.body?.types) ? req.body.types : ['basic-info'];
    const tokenPayload = {
        ecid,
        year,
        types,
        exp: Date.now() + Number(req.body?.validHours || 168) * 3600 * 1000,
    };
    const token = base64UrlEncode(JSON.stringify(tokenPayload));
    const shareLink = `${FRONTEND_USER_URL}/annual-report/share?token=${token}`;
    res.json(ok({ data: { shareLink }, shareLink }));
});

app.get('/year-summary/share', (req, res) => {
    const token = String(req.query.token || '');
    const decoded = token
        ? parseJsonSafely(
              Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
              null
          )
        : null;
    const ecid = decoded?.ecid || MOCK_PLAYER.ecid;
    const year = decoded?.year || 2025;

    const summary = buildYearSummaryPayload(ecid, year, 'all');
    res.json(
        ok({
            data: summary.data,
            aiEvaluation: summary.aiEvaluation,
            type: Array.isArray(decoded?.types) ? decoded.types.join(',') : 'all',
        })
    );
});

app.post('/year-summary/share', (_req, res) => {
    res.json(ok({ message: '分享配置保存成功(mock)' }));
});

// ---------------------------- 公告相关 ----------------------------

app.get('/announcement/list', (_req, res) => {
    res.json(ok({ announcements: clone(state.announcements) }));
});

app.get('/announcement', (_req, res) => {
    res.json(ok({ announcements: clone(state.announcements) }));
});

app.get('/announcement/:id', (req, res) => {
    const id = toInt(req.params.id, 0);
    const announcement = state.announcements.find(item => item.id === id) || null;
    res.json(ok({ announcement: clone(announcement) }));
});

app.post('/announcement', (req, res) => {
    const nextId = (state.announcements[0]?.id || 0) + 1;
    const newRow = {
        id: nextId,
        title: String(req.body?.title || `新公告${nextId}`),
        content: String(req.body?.content || 'mock 公告内容'),
        autoShow: Boolean(req.body?.autoShow),
        startTime: String(req.body?.startTime || nowText()),
        endTime: String(req.body?.endTime || '2099-12-31 23:59:59'),
        dieTime: String(req.body?.dieTime || '2099-12-31 23:59:59'),
        card: String(req.body?.card || '新增公告'),
        carddesc: String(req.body?.carddesc || 'mock'),
    };
    state.announcements.unshift(newRow);
    res.json(ok({ announcement: newRow }));
});

app.put('/announcement/:id', (req, res) => {
    const id = toInt(req.params.id, 0);
    const idx = state.announcements.findIndex(row => row.id === id);
    if (idx >= 0) {
        state.announcements[idx] = {
            ...state.announcements[idx],
            ...req.body,
            id,
        };
    }
    res.json(ok({ id }));
});

app.delete('/announcement/:id', (req, res) => {
    const id = toInt(req.params.id, 0);
    state.announcements = state.announcements.filter(row => row.id !== id);
    res.json(ok({ id }));
});

// ---------------------------- 委托相关 ----------------------------

app.get('/entrust/my', (_req, res) => {
    res.json(ok({ data: clone(state.entrusts) }));
});

app.post('/entrust', (req, res) => {
    const tid = toInt(req.body?.tid, 0);
    const uid = toInt(req.body?.uid, 0);
    const introduce = String(req.body?.introduce || '');
    const nextId = (state.entrusts[0]?.id || 0) + 1;
    const row = {
        id: nextId,
        tid,
        advisor_uid: uid,
        status: '0',
        target: String(uid || MOCK_USER.userid),
        origin_status: 'O',
        introduce,
        create_time: nowText(),
    };
    state.entrusts.unshift(row);
    res.json(ok({ data: row }));
});

app.post('/entrust/:id/status', (req, res) => {
    const id = toInt(req.params.id, 0);
    const status = String(req.body?.status || '0');
    const found = state.entrusts.find(item => item.id === id);
    if (found) {
        found.status = status;
    }
    res.json(ok({ id, status }));
});

app.post('/entrust/batch-status', (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(item => toInt(item, -1)) : [];
    const status = String(req.body?.status || '0');
    state.entrusts.forEach(item => {
        if (ids.includes(item.id)) {
            item.status = status;
        }
    });
    res.json(ok({ updated: ids.length, status }));
});

app.get('/entrust', (_req, res) => {
    res.json(ok({ data: clone(state.entrusts) }));
});

// ---------------------------- 风险审批相关 ----------------------------

app.get('/risk-approval', (_req, res) => {
    res.json(ok({ approvals: clone(state.riskApprovals) }));
});

app.post('/risk-approval', (req, res) => {
    const nextId = (state.riskApprovals[0]?.id || 0) + 1;
    const operationType = req.body?.operationType === 'external' ? 'external' : 'internal';
    const newRow = {
        id: nextId,
        submitTime: nowIso(),
        createdBy: MOCK_USER.openid,
        playerNickname:
            operationType === 'internal'
                ? String(req.body?.playerNickname || req.body?.targetChoose || MOCK_PLAYER.name)
                : null,
        playerECID:
            operationType === 'internal'
                ? String(req.body?.playerECID || req.body?.targetChoose || MOCK_PLAYER.ecid)
                : null,
        operation: operationType === 'internal' ? String(req.body?.operation || 'ban') : 'external',
        hours: operationType === 'internal' ? Number(req.body?.hours || 24) : null,
        attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : [],
        reason: operationType === 'internal' ? String(req.body?.reason || 'mock 原因') : '',
        adminNote: String(req.body?.adminNote || ''),
        operationType,
        communityNickname:
            operationType === 'external'
                ? String(req.body?.communityNickname || 'mock-community')
                : null,
        targetLocation:
            operationType === 'external'
                ? String(req.body?.targetLocation || 'mock-location')
                : null,
        agrees: 0,
        rejects: 0,
        status: 'Pending',
        votes: [],
        votesNeeded: 3,
        requiredAgrees: 2,
        senAdminCount: 3,
        hasVoted: false,
    };
    state.riskApprovals.unshift(newRow);
    res.json(ok({ approval: newRow }));
});

app.get('/risk-approval/:id', (req, res) => {
    const id = toInt(req.params.id, 0);
    const found = state.riskApprovals.find(item => item.id === id);
    if (!found) {
        res.json(ok({ approval: null, message: '未找到审批记录(mock)' }));
        return;
    }
    res.json(ok({ approval: clone(found) }));
});

app.post('/risk-approval/vote', (req, res) => {
    const approvalId = toInt(req.body?.approvalId, 0);
    const decision = String(req.body?.decision || 'agree');
    const reason = req.body?.reason ? String(req.body.reason) : undefined;
    const found = state.riskApprovals.find(item => item.id === approvalId);
    if (!found) {
        res.json(ok({ message: '审批不存在(mock)' }));
        return;
    }

    const voteUser = String(MOCK_USER.userid);
    const alreadyVoted = found.votes.some(vote => vote.user === voteUser);
    if (!alreadyVoted) {
        found.votes.push({ user: voteUser, decision, reason, at: nowIso() });
        if (decision === 'agree') found.agrees += 1;
        if (decision === 'reject') found.rejects += 1;
        if (found.agrees >= (found.requiredAgrees || 2)) {
            found.status = 'Approved';
        }
        if (found.rejects >= 2) {
            found.status = 'Rejected';
        }
    }

    res.json(ok({ approval: clone(found) }));
});

app.post('/risk-approval/punish', (req, res) => {
    const approvalId = toInt(req.body?.approvalId, 0);
    const found = state.riskApprovals.find(item => item.id === approvalId);
    if (found) {
        found.status = 'Punished';
    }
    res.json(ok({ approval: found ? clone(found) : null }));
});

// ---------------------------- 脚本中心相关 ----------------------------

app.get('/script/list', (_req, res) => {
    res.json(ok({ scripts: clone(state.scripts) }));
});

app.post('/script/upload', (req, res) => {
    const nextId = (state.scripts[0]?.id || 0) + 1;
    const newScript = {
        id: nextId,
        title: String(req.body?.title || `脚本-${nextId}`),
        description: String(req.body?.description || ''),
        isPublic: Boolean(req.body?.isPublic),
        content: String(req.body?.content || ''),
        ownerId: String(MOCK_USER.userid),
        createdAt: nowIso(),
    };
    state.scripts.unshift(newScript);
    res.json(ok({ script: newScript }));
});

app.delete('/script/:id', (req, res) => {
    const id = toInt(req.params.id, 0);
    state.scripts = state.scripts.filter(item => item.id !== id);
    res.json(ok({ id }));
});

// ---------------------------- 员工别名相关 ----------------------------

app.get('/staff/alias', (_req, res) => {
    res.json(ok({ aliases: clone(state.staffAliases) }));
});

app.put('/staff/alias', (req, res) => {
    const body = req.body || {};
    const number = body.number != null ? String(body.number) : null;
    if (number != null && number !== String(MOCK_USER.userid)) {
        res.status(403).json({ EPF_code: 403, EPF_description: '无权限操作该员工别名' });
        return;
    }
    const id = toInt(body.id, 0);
    const name = String(body.name || 'Mock客服');
    if (id > 0) {
        const idx = state.staffAliases.findIndex(item => item.id === id);
        if (idx >= 0) {
            const uid = state.staffAliases[idx].uid;
            state.staffAliases[idx] = {
                ...state.staffAliases[idx],
                alias: `${name} #${uid}`,
                updated_at: nowText(),
                updated_by: String(MOCK_USER.userid),
            };
        }
    } else {
        const nextId = (state.staffAliases[0]?.id || 0) + 1;
        const uid = String(MOCK_USER.userid);
        state.staffAliases.unshift({
            id: nextId,
            uid,
            alias: `${name} #${uid}`,
            is_default: false,
            in_random_pool: true,
            updated_at: nowText(),
            updated_by: String(MOCK_USER.userid),
        });
    }
    res.json(ok({ aliases: clone(state.staffAliases) }));
});

app.delete('/staff/alias', (req, res) => {
    const id = toInt(req.body?.id, 0);
    state.staffAliases = state.staffAliases.filter(item => item.id !== id);
    if (!state.staffAliases.some(item => item.is_default) && state.staffAliases[0]) {
        state.staffAliases[0].is_default = true;
    }
    res.json(ok({ aliases: clone(state.staffAliases) }));
});

app.post('/staff/alias/set-default', (req, res) => {
    const id = toInt(req.body?.id, 0);
    state.staffAliases.forEach(item => {
        item.is_default = item.id === id;
    });
    res.json(ok({ aliases: clone(state.staffAliases) }));
});

app.post('/staff/alias/clear-all-default', (_req, res) => {
    state.staffAliases.forEach(item => {
        item.is_default = false;
    });
    res.json(ok({ aliases: clone(state.staffAliases) }));
});

app.get('/staff/alias/random-setting', (_req, res) => {
    res.json(
        ok({
            enabled: state.staffRandomSetting.enabled,
            data: clone(state.staffRandomSetting),
        })
    );
});

app.put('/staff/alias/random-setting', (req, res) => {
    state.staffRandomSetting = {
        enabled: Boolean(req.body?.enabled),
        selected_alias_ids: Array.isArray(req.body?.selected_alias_ids)
            ? req.body.selected_alias_ids.map(item => toInt(item, -1)).filter(item => item > 0)
            : [],
    };
    state.staffAliases.forEach(item => {
        item.in_random_pool = state.staffRandomSetting.selected_alias_ids.includes(item.id);
    });
    res.json(ok({ data: clone(state.staffRandomSetting) }));
});

// ---------------------------- 快捷语相关 ----------------------------

app.get('/shortcut/list', (_req, res) => {
    // 保持和现有前端兼容：该接口返回数组而不是 { data: [] }
    res.json(clone(state.shortcuts));
});

app.post('/shortcut/add', (req, res) => {
    const nextId = (state.shortcuts[0]?.id || 0) + 1;
    const row = {
        id: nextId,
        type: String(req.body?.type || 'A'),
        title: String(req.body?.title || `快捷语-${nextId}`),
        uid: String(MOCK_USER.userid),
        content: String(req.body?.content || ''),
    };
    state.shortcuts.unshift(row);
    res.json(ok({ data: row }));
});

app.get('/shortcut/delete', (req, res) => {
    const id = toInt(req.query.id, 0);
    const title = String(req.query.title || '').trim();
    state.shortcuts = state.shortcuts.filter(item => {
        if (id > 0) return item.id !== id;
        if (title) return item.title !== title;
        return true;
    });
    res.json(ok({ id, title }));
});

// ---------------------------- AI 配置相关 ----------------------------

app.get('/ai-center/configs/:key', (req, res) => {
    const key = String(req.params.key || 'system_risk_control');
    const config = state.aiConfigs?.[key] ||
        defaultAiConfigs[key] || {
            key,
            name: key,
            prompt: 'mock config',
            enabled: false,
            config: {},
        };
    if (!state.aiConfigs) {
        state.aiConfigs = clone(defaultAiConfigs);
    }
    res.json(ok({ config: clone(config), data: { config: clone(config) } }));
});

app.put('/ai-center/configs/:key', (req, res) => {
    const key = String(req.params.key || 'system_risk_control');
    if (!state.aiConfigs) {
        state.aiConfigs = clone(defaultAiConfigs);
    }
    const prev = state.aiConfigs[key] || {
        key,
        name: key,
        prompt: 'mock config',
        enabled: false,
        config: {},
    };
    state.aiConfigs[key] = {
        ...prev,
        ...req.body,
        key,
        updatedAt: nowIso(),
        updatedBy: String(MOCK_USER.userid),
    };
    res.json(ok({ config: clone(state.aiConfigs[key]) }));
});

// ---------------------------- WIKI 绑定相关 ----------------------------

app.get('/wiki/userid', (req, res) => {
    const username = String(req.query.username || '').trim();
    if (!username) {
        res.json(ok({ userid: null }));
        return;
    }
    res.json(ok({ userid: 9527, username }));
});

app.get('/wiki/bindings/openid/:openid', (req, res) => {
    const openid = String(req.params.openid || MOCK_USER.openid);
    const data = state.wikiBindings.filter(item => item.openid === openid);
    res.json(ok({ data: clone(data) }));
});

app.get('/wiki/bindings/ecid/:ecid', (req, res) => {
    const ecid = String(req.params.ecid || MOCK_PLAYER.ecid);
    const data = state.wikiBindings.filter(item => item.ecid === ecid);
    res.json(ok({ data: clone(data) }));
});

app.get('/wiki/bindings/list', (_req, res) => {
    res.json(ok({ data: clone(state.wikiBindings) }));
});

app.get('/wiki/bindings/vercode', (req, res) => {
    const ecid = String(req.query.ecid || MOCK_PLAYER.ecid);
    res.json(
        ok({
            ecid,
            verificationCode: '123456',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
    );
});

app.post('/wiki/quick-bind', (req, res) => {
    const ecid = String(req.body?.ecid || MOCK_PLAYER.ecid);
    const user_id = toInt(req.body?.user_id, 9527);
    const user_name = String(req.body?.user_name || 'MockWikiUser');
    state.wikiBindings = state.wikiBindings.filter(item => item.ecid !== ecid);
    state.wikiBindings.push({
        ecid,
        user_id,
        user_name,
        bind_status: 'O',
        bound_at: nowText(),
        unbound_at: null,
        openid: MOCK_USER.openid,
    });
    res.json(ok({ message: '绑定成功(mock)' }));
});

app.post('/wiki/unbind', (req, res) => {
    const ecid = String(req.body?.ecid || MOCK_PLAYER.ecid);
    state.wikiBindings = state.wikiBindings.map(item => {
        if (item.ecid === ecid) {
            return {
                ...item,
                bind_status: 'X',
                unbound_at: nowText(),
            };
        }
        return item;
    });
    res.json(ok({ message: '解绑成功(mock)' }));
});

app.post('/wiki/admin/unbind', (req, res) => {
    const ecid = String(req.body?.ecid || MOCK_PLAYER.ecid);
    state.wikiBindings = state.wikiBindings.map(item => {
        if (item.ecid === ecid) {
            return {
                ...item,
                bind_status: 'X',
                unbound_at: nowText(),
            };
        }
        return item;
    });
    res.json(ok({ message: '管理员解绑成功(mock)' }));
});

// ---------------------------- 邮件验证 / 账号恢复 ----------------------------

app.post('/email-verification/send', (_req, res) => {
    res.json(ok({ message: '验证邮件发送成功(mock)' }));
});

app.post('/email-verification/verify', (_req, res) => {
    res.json(
        ok({
            message: '邮箱验证成功(mock)',
            action: 'reset_password',
            ecid: MOCK_PLAYER.ecid,
        })
    );
});

app.post('/account/recovery', (_req, res) => {
    res.json(ok({ message: '找回请求已发送(mock)' }));
});

// ---------------------------- 代理接口 ----------------------------

app.get('/proxy/bilibili/convert-b23-link', (req, res) => {
    const url = String(req.query.url || 'https://b23.tv/mock');
    res.json(
        ok({ url: 'https://www.bilibili.com/video/BV1xx411c7mD', bv: 'BV1xx411c7mD', source: url })
    );
});

app.post('/proxy/bilibili/x/web-interface/card', (req, res) => {
    const mid = String(req.body?.mid || '10086');
    res.json(
        ok({
            data: {
                card: {
                    name: `MockUP-${mid}`,
                },
                name: `MockUP-${mid}`,
            },
        })
    );
});

app.get('/proxy/bilibili/video/:bv', (req, res) => {
    const bv = String(req.params.bv || 'BV1xx411c7mD');
    res.json(
        ok({
            bvid: bv,
            title: 'Mock 视频标题',
            up: 'MockUP',
            playCount: 12345,
            likeCount: 678,
            pubdate: nowText(),
        })
    );
});

app.get('/proxy/docs/:name', (req, res) => {
    const name = String(req.params.name || 'Document');
    const markdown = `# ${name}\n\n这是 mock 后端返回的文档内容。\n\n- 目标：让前端 demo 可直接运行\n- 数据：最小可用\n- 环境：mock backend`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.status(200).send(markdown);
});

// ---------------------------- tlgift 相关 ----------------------------

app.get('/tlgift/me', (_req, res) => {
    res.json(
        ok({
            data: {
                openid: MOCK_USER.openid,
                primogems: Number(state.tlgift.balances[MOCK_USER.openid] || 0),
            },
        })
    );
});

app.get('/tlgift/logs', (req, res) => {
    const openidOrAlias = String(req.query.openid || MOCK_USER.openid);
    const openid =
        state.tlgift.aliases.find(item => item.alias === openidOrAlias)?.openid || openidOrAlias;
    const list = state.tlgift.logs.filter(row => row.openid === openid);
    res.json(ok({ data: clone(list) }));
});

app.get('/tlgift/items', (_req, res) => {
    res.json(ok({ data: clone(state.tlgift.items) }));
});

app.get('/tlgift/alias-options', (_req, res) => {
    res.json(ok({ data: clone(state.tlgift.aliases.map(item => item.alias)) }));
});

app.get('/tlgift/aliases', (_req, res) => {
    res.json(ok({ data: clone(state.tlgift.aliases) }));
});

app.post('/tlgift/aliases', (req, res) => {
    const alias = String(req.body?.alias || '').trim();
    const openid = String(req.body?.openid || '').trim();
    if (alias && openid) {
        state.tlgift.aliases = state.tlgift.aliases.filter(item => item.alias !== alias);
        state.tlgift.aliases.push({ alias, openid });
    }
    res.json(ok({ data: clone(state.tlgift.aliases) }));
});

app.delete('/tlgift/aliases/:alias', (req, res) => {
    const alias = decodeURIComponent(String(req.params.alias || ''));
    state.tlgift.aliases = state.tlgift.aliases.filter(item => item.alias !== alias);
    res.json(ok({ alias }));
});

app.put('/tlgift/balance', (req, res) => {
    const openidOrAlias = String(req.body?.openid || '').trim();
    const openid =
        state.tlgift.aliases.find(item => item.alias === openidOrAlias)?.openid || openidOrAlias;
    const amount = Number(req.body?.amount || 0);
    state.tlgift.balances[openid] = amount;
    state.tlgift.logs.unshift({
        id: Date.now(),
        openid,
        type: 'adjust',
        amount,
        product_id: null,
        ecid: null,
        operator: String(MOCK_USER.userid),
        quantity: null,
        created_at: nowText(),
    });
    res.json(ok({ data: { openid, amount } }));
});

app.get('/tlgift/balance', (req, res) => {
    const openidOrAlias = String(req.query.openid || MOCK_USER.openid).trim();
    const openid =
        state.tlgift.aliases.find(item => item.alias === openidOrAlias)?.openid || openidOrAlias;
    res.json(
        ok({
            data: Number(state.tlgift.balances[openid] || 0),
            openid,
        })
    );
});

app.post('/tlgift/consume', (req, res) => {
    const itemId = String(req.body?.itemId || '');
    const quantity = toInt(req.body?.quantity, 1);
    const ecid = String(req.body?.ecid || MOCK_PLAYER.ecid);
    const product = state.tlgift.items.find(item => item.id === itemId);
    const price = Number(product?.price || 0);
    const cost = price * quantity;
    const current = Number(state.tlgift.balances[MOCK_USER.openid] || 0);
    state.tlgift.balances[MOCK_USER.openid] = Math.max(0, current - cost);

    state.tlgift.logs.unshift({
        id: Date.now(),
        openid: MOCK_USER.openid,
        type: 'consume',
        amount: -cost,
        product_id: itemId,
        ecid,
        operator: String(MOCK_USER.userid),
        quantity,
        created_at: nowText(),
    });

    if (product) {
        product.sales = Number(product.sales || 0) + quantity;
        product.total_remaining = Math.max(0, Number(product.total_remaining || 0) - quantity);
        product.user_remaining = Math.max(0, Number(product.user_remaining || 0) - quantity);
    }

    res.json(
        ok({
            data: {
                openid: MOCK_USER.openid,
                itemId,
                quantity,
                cost,
                balance: state.tlgift.balances[MOCK_USER.openid],
            },
        })
    );
});

app.post('/tlgift/items', (req, res) => {
    const payload = req.body || {};
    const row = {
        id: String(payload.id || `mock-item-${Date.now()}`),
        title: String(payload.title || '新原石商品'),
        price: Number(payload.price || 1),
        total_limit: Number(payload.total_limit || 0),
        person_limit: Number(payload.person_limit || 0),
        user_limit: Number(payload.user_limit || 0),
        total_remaining: Number(payload.total_limit || 0),
        user_remaining: Number(payload.user_limit || 0),
        sales: Number(payload.sales || 0),
        json: payload.json ? String(payload.json) : null,
    };
    state.tlgift.items.push(row);
    res.json(ok({ data: row }));
});

app.put('/tlgift/items/:id', (req, res) => {
    const id = decodeURIComponent(String(req.params.id || ''));
    const idx = state.tlgift.items.findIndex(item => item.id === id);
    if (idx >= 0) {
        state.tlgift.items[idx] = {
            ...state.tlgift.items[idx],
            ...req.body,
            id,
        };
    }
    res.json(ok({ id }));
});

app.delete('/tlgift/items/:id', (req, res) => {
    const id = decodeURIComponent(String(req.params.id || ''));
    state.tlgift.items = state.tlgift.items.filter(item => item.id !== id);
    res.json(ok({ id }));
});

app.get('/tlgift/items/:id/person-remaining', (req, res) => {
    const id = String(req.params.id || '');
    const item = state.tlgift.items.find(row => row.id === id);
    const value = item ? Number(item.person_limit || 0) : 0;
    res.json(ok({ data: value }));
});

app.post('/tlgift/items/load-from-csv', (_req, res) => {
    res.json(ok({ message: 'CSV 模板数据已加载(mock)' }));
});

app.post('/tlgift/items/upload-csv', (_req, res) => {
    res.json(ok({ message: 'CSV 上传解析成功(mock)' }));
});

// ---------------------------- 图片辅助接口 ----------------------------

app.post('/utils/image/fetch-to-public', (_req, res) => {
    res.json(ok({ url: `${FRONTEND_USER_URL}/image/notFound.png` }));
});

app.post('/utils/image/upload-local', (_req, res) => {
    res.json(ok({ url: `${FRONTEND_USER_URL}/image/notFound.png` }));
});

// ---------------------------- 兜底路由 ----------------------------

const buildFallbackData = (path, method) => {
    if (path.includes('/list')) return [];
    if (path.includes('/count')) return { count: 0 };
    if (path.includes('/detail')) return {};
    if (method === 'GET') return {};
    return { message: 'mock success' };
};

app.use((req, res) => {
    res.json(
        ok({
            mock: true,
            path: req.path,
            method: req.method,
            data: buildFallbackData(req.path, req.method),
        })
    );
});

app.listen(PORT, () => {
    console.log(`[mock-backend] running at http://localhost:${PORT}`);
});
