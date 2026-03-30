// 社区风格的反馈列表项组件（支持 /feedback/list 与 /feedback/subscriptions 统一返回的 FeedbackListItemDto）

import React from 'react';
import { Card, Typography, Space, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { FeedbackListItemDto } from '@ecuc/shared/types/ticket.types';
import { useTheme } from '@common/contexts/ThemeContext';
import { ltransFeedbackStatusBarColor } from '@common/languageTrans';
import { formatSmartTime } from '@common/components/TimeConverter';
import { gLang } from '@common/language';
import FeedbackTagGroup from '@common/components/Feedback/FeedbackTagGroup';

const { Text } = Typography;

interface FeedbackListItemProps {
    ticket: FeedbackListItemDto;
    to: string;
    /** 是否展示解决时间（近期解决 tab 使用） */
    showCompleteTime?: boolean;
}

const FeedbackListItem: React.FC<FeedbackListItemProps> = ({ ticket, to, showCompleteTime }) => {
    const { getThemeColor } = useTheme();
    const title = ticket.title.replace(/^反馈:\s*/, '');
    const lastReplyTime = ticket.lastReplyTime ?? ticket.create_time;
    const hasReply = lastReplyTime !== ticket.create_time;
    const replyCount = hasReply ? (ticket.replyCount ?? 0) : 0;
    const statusColor = ltransFeedbackStatusBarColor(ticket.status);
    // 开启状态不显示竖线
    const showBar = ticket.status !== 'O';

    return (
        <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>
            <Card
                hoverable
                style={{
                    borderRadius: 8,
                    transition: 'all 0.3s ease',
                    border: `1px solid ${getThemeColor({ light: '#f0f0f0', dark: '#303030' })}`,
                    overflow: 'hidden',
                }}
                bodyStyle={{ padding: '12px 16px' }}
                onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '';
                    e.currentTarget.style.transform = '';
                }}
            >
                <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                    {/* 左侧状态竖线：仅关闭/完成时显示 */}
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

                    {/* 内容区 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {/* 标题行 */}
                        <div
                            style={{
                                marginBottom: 6,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Text strong style={{ fontSize: 16, lineHeight: 1.5 }}>
                                {title}
                            </Text>
                            <FeedbackTagGroup publicTags={ticket.publicTags} />
                            {ticket.feedbackType === 'BUG' ? (
                                <Tag color="red">{gLang('feedback.typeBug')}</Tag>
                            ) : ticket.feedbackType === 'SUGGESTION' ? (
                                <Tag color="green">{gLang('feedback.typeSuggestion')}</Tag>
                            ) : null}
                        </div>

                        {/* 元信息行 */}
                        <Space wrap size="small" style={{ fontSize: 12 }}>
                            {showCompleteTime && ticket.complete_time ? (
                                <Text type="secondary">
                                    {gLang('feedback.resolvedAt')}{' '}
                                    {formatSmartTime(ticket.complete_time)}
                                </Text>
                            ) : ticket.create_time ? (
                                <Text type="secondary">
                                    {gLang('feedback.createdAt')}{' '}
                                    {formatSmartTime(ticket.create_time)}
                                </Text>
                            ) : null}
                            <>
                                {ticket.create_time && <Text type="secondary">·</Text>}
                                <Text type="secondary">
                                    {gLang('feedback.reply').replace('{count}', String(replyCount))}
                                </Text>
                            </>
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
            </Card>
        </Link>
    );
};

export default FeedbackListItem;
