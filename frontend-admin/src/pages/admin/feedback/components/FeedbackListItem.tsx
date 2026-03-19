import React, { useState } from 'react';
import { Button, Card, Checkbox, Modal, Space, Tag, Typography } from 'antd';
import { DeleteOutlined, TagsOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { FeedbackAdminListItemDto } from '@ecuc/shared/types/ticket.types';
import { ltransFeedbackStatusBarColor } from '@common/languageTrans';
import { formatSmartTime } from '@common/components/TimeConverter';
import { gLang } from '@common/language';
import useDarkMode from '@common/hooks/useDarkMode';
import FeedbackTagGroup from '@common/components/Feedback/FeedbackTagGroup';

const { Text } = Typography;

interface FeedbackListItemProps {
    ticket: FeedbackAdminListItemDto;
    to: string;
    selected?: boolean;
    checked?: boolean;
    highlightColor?: string;
    onCheckedChange?: (tid: number, checked: boolean) => void;
    onEditTags?: (ticket: FeedbackAdminListItemDto) => void;
    onRemove?: (tid: number) => void | Promise<void>;
}

const FeedbackListItem: React.FC<FeedbackListItemProps> = ({
    ticket,
    to,
    selected,
    checked = false,
    highlightColor,
    onCheckedChange,
    onEditTags,
    onRemove,
}) => {
    const [removing, setRemoving] = useState(false);
    const [modal, modalContextHolder] = Modal.useModal();
    const isDarkMode = useDarkMode();
    const title = ticket.title.replace(/^反馈:\s*/, '');
    const replyCount = ticket.replyCount ?? 0;
    const lastReplyTime = ticket.lastReplyTime ?? ticket.create_time;
    const statusColor = ltransFeedbackStatusBarColor(ticket.status);
    const showBar = ticket.status !== 'O';

    const handleRemove = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!onRemove) return;
        modal.confirm({
            title: gLang('feedback.delete'),
            content: gLang('feedback.removeFromListConfirm'),
            okText: gLang('confirm'),
            cancelText: gLang('cancel'),
            onOk: async () => {
                setRemoving(true);
                try {
                    await onRemove(ticket.tid);
                } finally {
                    setRemoving(false);
                }
            },
        });
    };

    return (
        <>
            {modalContextHolder}
            <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>
                <Card
                    hoverable
                    style={{
                        borderRadius: 8,
                        transition: 'all 0.3s ease',
                        border: selected
                            ? `2px solid ${highlightColor || '#1677ff'}`
                            : `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                        boxShadow: selected
                            ? `0 0 0 2px ${highlightColor || '#1677ff'}30`
                            : undefined,
                        overflow: 'hidden',
                    }}
                    bodyStyle={{ padding: '10px 12px' }}
                    onMouseEnter={event => {
                        if (!selected) {
                            event.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                            event.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={event => {
                        if (!selected) {
                            event.currentTarget.style.boxShadow = '';
                            event.currentTarget.style.transform = '';
                        }
                    }}
                >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                        {showBar && (
                            <div
                                style={{
                                    width: 3,
                                    borderRadius: 99,
                                    background: statusColor,
                                    flexShrink: 0,
                                    alignSelf: 'stretch',
                                }}
                            />
                        )}

                        <div style={{ display: 'flex', flex: 1, gap: 10, minWidth: 0 }}>
                            {onCheckedChange && (
                                <div
                                    onClick={event => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                    }}
                                    style={{ paddingTop: 2 }}
                                >
                                    <Checkbox
                                        checked={checked}
                                        onChange={event =>
                                            onCheckedChange(ticket.tid, event.target.checked)
                                        }
                                    />
                                </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ marginBottom: 4, lineHeight: 1.5 }}>
                                    <Text strong style={{ fontSize: 14 }}>
                                        {title}
                                    </Text>
                                </div>

                                <div style={{ marginBottom: 4 }}>
                                    <Space size={[4, 4]} wrap>
                                        <FeedbackTagGroup
                                            publicTags={ticket.publicTags}
                                            internalTags={ticket.internalTags}
                                            showInternal
                                        />
                                        {ticket.feedbackType === 'BUG' ? (
                                            <Tag color="red">{gLang('feedback.typeBug')}</Tag>
                                        ) : (
                                            <Tag color="green">{gLang('feedback.typeSuggestion')}</Tag>
                                        )}
                                    </Space>
                                </div>
                                {(ticket.developerTags?.length > 0 || ticket.progressTag) && (
                                    <div style={{ marginBottom: 4 }}>
                                        <FeedbackTagGroup
                                            developerTags={ticket.developerTags}
                                            progressTag={ticket.progressTag}
                                            showDeveloper
                                            showProgress
                                        />
                                    </div>
                                )}

                                <Space wrap size="small" style={{ fontSize: 12 }}>
                                    {ticket.create_time && (
                                        <Text type="secondary">
                                            {gLang('feedback.createdAt')}{' '}
                                            {formatSmartTime(ticket.create_time)}
                                        </Text>
                                    )}
                                    {replyCount > 0 && (
                                        <>
                                            {ticket.create_time && <Text type="secondary">·</Text>}
                                            <Text type="secondary">
                                                {gLang('feedback.reply').replace(
                                                    '{count}',
                                                    String(replyCount)
                                                )}
                                            </Text>
                                        </>
                                    )}
                                    {lastReplyTime && lastReplyTime !== ticket.create_time && (
                                        <>
                                            <Text type="secondary">·</Text>
                                            <Text type="secondary">
                                                {gLang('feedback.lastReplyAt')}{' '}
                                                {formatSmartTime(lastReplyTime)}
                                            </Text>
                                        </>
                                    )}
                                </Space>
                            </div>
                        </div>

                        <Space
                            size={4}
                            onClick={event => {
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                        >
                            {onEditTags && (
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<TagsOutlined />}
                                    onClick={() => onEditTags(ticket)}
                                    title={gLang('feedback.editTag')}
                                />
                            )}
                            {onRemove && (
                                <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    loading={removing}
                                    onClick={handleRemove}
                                    title={gLang('feedback.delete')}
                                />
                            )}
                        </Space>
                    </div>
                </Card>
            </Link>
        </>
    );
};

export default FeedbackListItem;
