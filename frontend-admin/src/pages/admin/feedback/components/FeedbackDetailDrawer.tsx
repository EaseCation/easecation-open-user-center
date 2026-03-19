import React, { useMemo } from 'react';
import { Button, Drawer, Space } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { FeedbackAdminListItemDto, Feedback } from '@ecuc/shared/types/ticket.types';
import TicketOperate from '../../ticket/ticket-operate/TicketOperate';
import { gLang } from '@common/language';

interface FeedbackDetailDrawerProps {
  visible: boolean;
  onClose: () => void;
  onActionComplete?: () => void;
  ticket: FeedbackAdminListItemDto | null;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

const FeedbackDetailDrawer: React.FC<FeedbackDetailDrawerProps> = ({
  visible,
  onClose,
  onActionComplete,
  ticket,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}) => {
  const feedbackTicket: Feedback = useMemo(() => ({
    ...ticket,
    details: [],
    publicTags: ticket?.publicTags ?? [],
    internalTags: ticket?.internalTags ?? [],
    feedbackType: ticket?.feedbackType ?? 'SUGGESTION',
    lastReplyTime: ticket?.lastReplyTime ?? null,
    replyCount: ticket?.replyCount ?? 0,
  } as unknown as Feedback), [ticket]);

  return (
    <Drawer
      title={gLang('feedback.table.drawerTitle', { tid: ticket?.tid ?? '' })}
      placement="right"
      onClose={onClose}
      open={visible}
      width={800}
      extra={
        <Space size={4}>
          <Button
            type="text"
            icon={<UpOutlined />}
            size="small"
            disabled={!hasPrev}
            onClick={onPrev}
          />
          <Button
            type="text"
            icon={<DownOutlined />}
            size="small"
            disabled={!hasNext}
            onClick={onNext}
          />
        </Space>
      }
    >
      {ticket && (
        <TicketOperate
          tid={ticket.tid.toString()}
          ticket={feedbackTicket as any}
          onActionComplete={onActionComplete ?? onClose}
        />
      )}
    </Drawer>
  );
};

export default FeedbackDetailDrawer;
