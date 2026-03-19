import { TicketStatus } from '@ecuc/shared/types/ticket.types';

export enum FeedbackStatus {
    Open = 'open',
    Closed = 'closed',
    Ended = 'ended',
}

export const ticketStatusToFeedbackStatus = (status: TicketStatus): FeedbackStatus => {
    if (
        status === TicketStatus.WaitingAssign ||
        status === TicketStatus.WaitingReply ||
        status === TicketStatus.WaitingStaffReply ||
        status === TicketStatus.Entrust
    ) {
        return FeedbackStatus.Open;
    }

    if (
        status === TicketStatus.AutoReject ||
        status === TicketStatus.Reject ||
        status === TicketStatus.UserCancel
    ) {
        return FeedbackStatus.Closed;
    }

    if (status === TicketStatus.AutoAccept || status === TicketStatus.Accept) {
        return FeedbackStatus.Ended;
    }

    return FeedbackStatus.Open;
};
