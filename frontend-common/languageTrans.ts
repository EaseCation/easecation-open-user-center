import { gLang } from './language';
import {
    TicketAction,
    TicketStatus,
    TicketType,
    TicketPriority,
} from '@ecuc/shared/types/ticket.types';

export const ltransTicketDetailTextColor = (type: string) => {
    switch (type) {
        case TicketAction.Reply: // Reply 普通消息
            return undefined;
        case TicketAction.Note: // Notice 提示？
            return 'gray';
        case TicketAction.Distribute: // 系统分配
            return '#0074d8';
        case TicketAction.Upgrade: // Update 升级
            return '#f36700';
        default:
            return undefined;
    }
};

export const ltransTicketDetailDotColor = (type: string) => {
    switch (type) {
        case TicketAction.Reply:
            return 'blue';
        case TicketAction.Note:
            return 'gray';
        case TicketAction.Distribute:
            return 'blue';
        case TicketAction.Upgrade:
            return '#ff6900';
        default:
            return 'blue';
    }
};

export const ltransStatusColor = (type: string) => {
    switch (type) {
        case TicketStatus.WaitingAssign:
            return 'success';
        case TicketStatus.WaitingStaffReply:
            return 'warning';
        case TicketStatus.Reject:
            return 'error';
        case 'F': // 兼容：媒体冻结状态
            return 'error';
        default:
            return 'info';
    }
};

export const ltransBanColor = (type: string) => {
    switch (type) {
        case 'UNBAN':
            return 'success';
        case 'UNHACK':
            return 'success';
        case 'BAN':
            return 'error';
        case 'HACK':
            return 'warning';
        case 'MUTE':
            return 'ban-alert-purple';
        case 'WARNING':
            return 'ban-alert-pink';
        case 'KICK':
            return 'ban-alert-cyan';
        case 'PARKOUR':
            return 'ban-alert-blue';
        case 'FREEZE_SCORE_TOP':
            return 'ban-alert-pink';
        case 'RESTRICT_NICK':
            return 'ban-alert-geekblue';
        default:
            return 'blue';
    }
};

export const ltransTicketPriority = (status: string | number) => {
    return gLang(`ticket.priority.${status}`) + ' (' + status + ')';
};

export const ltransTicketPriorityColor = (status?: string | number) => {
    switch (status) {
        case TicketPriority.Upgrade:
            return 'red';
        case TicketPriority.WeChatUnfreeze:
            return 'geekblue';
        case TicketPriority.MediaShop:
            return 'cyan';
        case TicketPriority.MediaFast:
            return 'magenta';
        case TicketPriority.MediaNormal:
            return 'volcano';
        case TicketPriority.Vip4:
            return 'orange';
        case TicketPriority.Vip3:
            return 'gold';
        case TicketPriority.Normal:
            return 'blue';
        default:
            return 'blue';
    }
};

export const ltransTicketStatusColor = (status?: string) => {
    switch (status) {
        case TicketStatus.WaitingAssign:
            return 'blue';
        case TicketStatus.WaitingReply:
            return 'purple';
        case TicketStatus.WaitingStaffReply:
            return 'blue';
        case TicketStatus.AutoAccept:
            return 'green';
        case TicketStatus.AutoReject:
            return 'red';
        case TicketStatus.Reject:
            return 'red';
        case TicketStatus.Accept:
            return 'green';
        case TicketStatus.UserCancel:
            return 'gray';
        case TicketStatus.Entrust:
            return 'orange';
        default:
            return 'blue';
    }
};

export const ltransTicketStatus = (status: string) => {
    return gLang(`ticket.status.${status}`);
};

/**
 * 反馈/裁决工单状态显示（映射后的状态）
 * 后端已经将状态映射为：
 * - O/W/X -> O (开启)
 * - B/R/D -> R (关闭)
 * - A/P -> P (结束)
 *
 * @param status 映射后的状态（O/R/P）
 * @returns 状态显示文本
 */
/**
 * 反馈状态对应的竖线颜色
 * - 开启 (O) -> 蓝色
 * - 关闭 (R) -> 红色
 * - 完成 (P) -> 绿色
 */
export const ltransFeedbackStatusBarColor = (status: string): string => {
    switch (status) {
        case TicketStatus.WaitingAssign: // O 开启
            return '#1677ff';
        case TicketStatus.Reject: // R 关闭
            return '#ff4d4f';
        case TicketStatus.Accept: // P 完成
            return '#52c41a';
        default:
            return '#1677ff';
    }
};

export const ltransFeedbackStatus = (status: string): string => {
    switch (status) {
        case TicketStatus.WaitingAssign: // O
            return gLang('feedback.status.open');
        case TicketStatus.Reject: // R
            return gLang('feedback.status.closed');
        case TicketStatus.Accept: // P
            return gLang('feedback.status.ended');
        default:
            return gLang(`ticket.status.${status}`);
    }
};

/**
 * Get ticket status for user-side display
 * For tickets with priority 15 (Upgrade), always show "等待客服回复" (WaitingStaffReply) to users
 * Only applies to non-terminal statuses (not Accept, Reject, AutoAccept, AutoReject, UserCancel)
 * @param status - Ticket status
 * @param priority - Ticket priority
 * @param isAdmin - Whether the viewer is admin
 * @returns Status text for display
 */
export const ltransTicketStatusForUser = (
    status: string,
    priority?: number,
    isAdmin: boolean = false,
    ticketType?: TicketType
): string => {
    // 对于反馈/裁决工单，使用映射后的状态显示
    if (ticketType === TicketType.Feedback) {
        return ltransFeedbackStatus(status);
    }

    // If admin or priority is not 15, use normal status display
    if (isAdmin || priority !== TicketPriority.Upgrade) {
        return ltransTicketStatus(status);
    }

    // Terminal statuses should not be overridden
    const terminalStatuses = [
        TicketStatus.Accept,
        TicketStatus.Reject,
        TicketStatus.AutoAccept,
        TicketStatus.AutoReject,
        TicketStatus.UserCancel,
    ];
    if (terminalStatuses.includes(status as TicketStatus)) {
        return ltransTicketStatus(status);
    }

    // For user-side display of upgrade tickets (priority 15) with non-terminal status,
    // always show "等待客服回复"
    return gLang(`ticket.status.${TicketStatus.WaitingStaffReply}`);
};

export const ltransTicketType = (typeCode: string | TicketType) => {
    switch (typeCode) {
        case TicketType.Application:
            return gLang('ticket.type.AP');
        case TicketType.Argument:
            return gLang('ticket.type.AG');
        case TicketType.ReportPlayer:
            return gLang('ticket.type.RP');
        case TicketType.ResendProduct:
            return gLang('ticket.type.SP');
        case TicketType.WeChatUnfreeze:
            return gLang('ticket.type.AW');
        case TicketType.Consultation:
            return gLang('ticket.type.OP');
        case TicketType.Suggestion:
            return gLang('ticket.type.JY');
        case TicketType.ReportStaff:
            return gLang('ticket.type.RS');
        case TicketType.MediaBinding:
            return gLang('ticket.type.MB');
        case TicketType.MediaAudit:
            return gLang('ticket.type.MA');
        case TicketType.MediaMonthlyReport:
            return gLang('ticket.type.MM');
        case TicketType.Others:
            return gLang('ticket.type.OT');
        case TicketType.MediaApplyBinding:
            return gLang('ticket.type.AB');
        case TicketType.MediaUpdate:
            return gLang('ticket.type.MU');
        case TicketType.MediaEvents:
            return gLang('ticket.type.ME');
        case TicketType.WikiBinding:
            return gLang('ticket.type.WB');
        case TicketType.Feedback:
            return gLang('ticket.type.GU');
        case TicketType.Judgement:
            return gLang('ticket.type.JG');
        default:
            return gLang('notFound.title'); // Assuming there's a generic "Not Found" message for unmatched cases
    }
};

export const ltransMediaStatusColor = (status: string) => {
    switch (status) {
        case '1':
            return 'blue';
        case '2':
            return 'purple';
        case '3':
            return 'gold';
        case 'F':
            return 'red';
        case 'W':
            return 'gray';
        default:
            return 'blue';
    }
};

export const ltransMediaStatus = (status: string, displayNormal: boolean) => {
    switch (status) {
        case '1':
            return gLang('media1');
        case '2':
            return gLang('media2');
        case '3':
            return gLang('media3');
        case 'F':
            return gLang('frozen');
        case 'W':
            return gLang('mediaList.underReview');
        case gLang('loading'):
            return gLang('loading');
        default:
            return displayNormal ? gLang('normalPlayer') : '';
    }
};

export const ltransMedia = (media: number) => {
    switch (media) {
        case 1:
            return gLang('media1');
        case 2:
            return gLang('media2');
        case 3:
            return gLang('media3');
        default:
            return gLang('normalPlayer');
    }
};

export const ltransAdmin = (vip: number) => {
    switch (vip) {
        case 1:
            return gLang('admin1');
        case 2:
            return gLang('admin2');
        case 3:
            return gLang('admin3');
        case 4:
            return gLang('admin4');
        case 5:
            return gLang('admin5');
        default:
            return gLang('normalPlayer');
    }
};

export const ltransVip = (vip: number) => {
    switch (vip) {
        case 1:
            return gLang('vip1');
        case 2:
            return gLang('vip2');
        case 3:
            return gLang('vip3');
        case 4:
            return gLang('vip4');
        case 888:
            return gLang('loading');
        case 999:
            return gLang('frozen');
        default:
            return gLang('normalPlayer');
    }
};

export const ltransVipColor = (vip: number) => {
    switch (vip) {
        case 1:
            return 'green';
        case 2:
            return 'blue';
        case 3:
            return 'purple';
        case 4:
            return 'gold';
        case 888:
            return 'gray';
        default:
            return 'red';
    }
};
