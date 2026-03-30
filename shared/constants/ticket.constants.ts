import { TicketType, TicketStatus } from '../types';

// 工单类型常量
export const TICKET_TYPE_NAME_MAP: { [key: string]: string } = {
    [TicketType.Argument]: '账号自助申诉申请',
    [TicketType.Application]: '管理招新申请',
    [TicketType.ReportPlayer]: '游戏违规举报',
    [TicketType.ResendProduct]: '物品补发申请',
    [TicketType.WeChatUnfreeze]: '工单账号解冻申请',
    [TicketType.Consultation]: '土豆百事通',
    [TicketType.Suggestion]: '策划信箱',
    [TicketType.ReportStaff]: '争议仲裁与部门复核',
    [TicketType.MediaBinding]: '媒体绑定',
    [TicketType.MediaAudit]: '旧媒体审核',
    [TicketType.MediaMonthlyReport]: 'E点申请',
    [TicketType.Others]: '其他服务',
    [TicketType.MediaApplyBinding]: '权限审核',
    [TicketType.MediaUpdate]: '更换兑奖账号申请',
    [TicketType.MediaEvents]: '媒体活动',
    [TicketType.WikiBinding]: 'WIKI绑定',
    [TicketType.Feedback]: '反馈',
    [TicketType.Judgement]: '裁决',
    [TicketType.ManualReview]: '人工复审',
};

// 工单字段标签（发起人与目标）
export const INITIATOR_LABELS: { [key in TicketType]: string } = {
    [TicketType.None]: '',
    [TicketType.Argument]: '申诉账号',
    [TicketType.Application]: '申请账号',
    [TicketType.ReportPlayer]: '举报方',
    [TicketType.ResendProduct]: '下单账号',
    [TicketType.WeChatUnfreeze]: '被冻结账号',
    [TicketType.Consultation]: '',
    [TicketType.Suggestion]: '提议人',
    [TicketType.ReportStaff]: '举报方',
    [TicketType.MediaBinding]: '媒体ID',
    [TicketType.MediaAudit]: '媒体ID',
    [TicketType.MediaApplyBinding]: '媒体ID',
    [TicketType.MediaMonthlyReport]: '媒体ID',
    [TicketType.MediaUpdate]: '旧兑奖账号',
    [TicketType.Others]: '已绑定账号',
    [TicketType.MediaEvents]: '领奖账号',
    [TicketType.WikiBinding]: '已绑定账号',
    [TicketType.Feedback]: '提交账号',
    [TicketType.Judgement]: '举报方',
    [TicketType.ManualReview]: '',
};

export const TARGET_LABELS: { [key in TicketType]: string } = {
    [TicketType.None]: '',
    [TicketType.Argument]: '',
    [TicketType.Application]: '',
    [TicketType.ReportPlayer]: '被举报玩家',
    [TicketType.ResendProduct]: '',
    [TicketType.WeChatUnfreeze]: '',
    [TicketType.Consultation]: '',
    [TicketType.Suggestion]: '',
    [TicketType.ReportStaff]: '被举报对象',
    [TicketType.MediaBinding]: '',
    [TicketType.MediaAudit]: '兑奖账号',
    [TicketType.MediaApplyBinding]: '兑奖账号',
    [TicketType.MediaMonthlyReport]: '兑奖账号',
    [TicketType.MediaUpdate]: '新兑奖账号',
    [TicketType.Others]: '未绑定的账号',
    [TicketType.MediaEvents]: '',
    [TicketType.WikiBinding]: 'WIKI用户名',
    [TicketType.Feedback]: '',
    [TicketType.Judgement]: '被裁决对象',
    [TicketType.ManualReview]: '',
};

// 工单类型有自己专属的状态流
export const TICKET_TYPES_OWN_STATUS_FLOW: TicketType[] = [
    TicketType.Feedback,
    TicketType.Judgement,
];

// 工单状态名称映射
export const TICKET_STATUS_NAME_MAP: { [key in TicketStatus]: string } = {
    [TicketStatus.WaitingAssign]: '等待分配客服',
    [TicketStatus.WaitingReply]: '等待用户回复',
    [TicketStatus.WaitingStaffReply]: '等待客服回复',
    [TicketStatus.Accept]: '已受理',
    [TicketStatus.Reject]: '已驳回',
    [TicketStatus.UserCancel]: '用户撤销',
    [TicketStatus.AutoAccept]: '自动成功',
    [TicketStatus.AutoReject]: '自动关闭',
    [TicketStatus.Entrust]: '委托处理中',
};

// 游戏模式列表（用于游戏违规举报工单）
export const GAME_MODES = [
    // 大厅
    { key: 'lobby', name: '大厅' },
    // 竞技类游戏
    { key: 'stadium', name: '激情斗球' },
    { key: 'parkour', name: '跑酷天堂' },
    { key: 'rune_legend', name: '圣符传说' },
    { key: 'bed_wars', name: '起床战争' },
    { key: 'sky_wars', name: '空岛战争' },
    { key: 'super_battle_wall', name: '超级战墙' },
    { key: 'crystal_wars', name: '水晶战争' },
    { key: 'build_uhc', name: 'BUHC' },
    { key: 'bridge_fight', name: '战桥' },
    { key: 'hunger_games', name: '饥饿游戏' },
    { key: 'battle_wall', name: '战墙' },
    { key: 'deep_chaos', name: '深井大乱斗' },
    // 休闲类游戏
    { key: 'disasters', name: '灾难' },
    { key: 'escape_room', name: '密室杀手' },
    { key: 'color_blind_party', name: '色盲派对' },
    { key: 'steve_vs_zombie', name: '史蒂夫大战僵尸' },
    { key: 'bio_escape', name: '生化大逃杀' },
    { key: 'hide_seek', name: '躲猫猫' },
    { key: 'mini_game_party', name: '小游戏派对' },
    { key: 'wow_pumpkin', name: '哇！南瓜' },
    { key: 'boom_sky', name: '爆炸吧天空' },
    { key: 'tnt_parkour', name: 'TNT跑酷' },
    { key: 'stadium_casual', name: '激情斗球' },
    { key: 'collapse_parkour', name: '塌方跑酷' },
    { key: 'catch_them', name: '快接住它们' },
    { key: 'dig_deathmatch', name: '掘一死战' },
];

// RP 工单违规类型选项
export const RP_VIOLATION_CATEGORIES = [
    { key: 'cheat', name: '使用第三方辅助程序' },
    { key: 'teaming', name: '非法合作' },
    { key: 'abuse', name: '言语违规' },
    { key: 'exploit', name: '利用游戏漏洞' },
    { key: 'griefing', name: '消极游戏/破坏体验' },
    { key: 'other', name: '其他' },
];

// RP 工单疑似作弊功能选项（仅在违规类型=使用第三方辅助程序时显示）
export const RP_CHEAT_SIGNALS = [
    { key: 'killaura', name: '杀戮光环' },
    { key: 'antiknockback', name: '防击退' },
    { key: 'flight', name: '飞行' },
    { key: 'speed', name: '移速异常' },
    { key: 'xray', name: '透视' },
    { key: 'scaffold', name: '自动搭桥' },
];

// RP 工单证据类型选项
export const RP_EVIDENCE_TYPES = [
    { key: 'replay', name: '游戏回放号' },
    { key: 'video', name: '外部视频链接' },
    { key: 'attachment', name: '下方附件' },
];
