import React, { useEffect, useState } from 'react';
import { Card, Button, Tag, Space, Typography, Skeleton } from 'antd';
import {
    RightOutlined,
    BulbOutlined,
    MessageOutlined,
    ClockCircleOutlined,
    SwapOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@common/axiosConfig';
import { useTheme } from '@common/contexts/ThemeContext';
import { FeedbackRecommendationCardDto } from '@ecuc/shared/types/ticket.types';
import { ltransFeedbackStatusBarColor } from '@common/languageTrans';
import { gLang } from '@common/language';
import { formatSmartTime } from '@common/components/TimeConverter';
import FeedbackTagGroup from '@common/components/Feedback/FeedbackTagGroup';

const { Text, Paragraph } = Typography;

interface FeedbackRecommendationCardProps {
    sourceTid: number;
    onDismiss?: () => void;
}

const FeedbackRecommendationCard: React.FC<FeedbackRecommendationCardProps> = ({
    sourceTid,
    onDismiss,
}) => {
    const navigate = useNavigate();
    const { getThemeColor } = useTheme();
    const [card, setCard] = useState<FeedbackRecommendationCardDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const fetchRecommendation = async () => {
            try {
                const res = await axiosInstance.get('/ticket/recommendation', {
                    params: { sourceTid },
                });
                if (!cancelled && res.data?.EPF_code === 200) {
                    setCard(res.data.card ?? null);
                }
            } catch {
                // 查询失败静默处理
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchRecommendation();
        return () => {
            cancelled = true;
        };
    }, [sourceTid]);

    if (loading) {
        return (
            <Card style={{ borderRadius: 12, overflow: 'hidden' }}>
                <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
        );
    }

    if (!card || dismissed) return null;

    const isActionableCard = card.status === 'PENDING' || card.status === 'VIEWED';
    const isMigratedCard =
        card.entryFrom === 'admin_create_feedback' && card.status === 'ACCEPTED_SUBSCRIBE_ONLY';
    if (!isActionableCard && !isMigratedCard) return null;

    const feedbackTitle = card.feedbackTitle.replace(/^反馈:\s*/, '');
    const statusBarColor = ltransFeedbackStatusBarColor(card.feedbackStatus);
    const showStatusBar = card.feedbackStatus !== 'O';

    const handleView = () => {
        navigate(
            `/feedback/${card.targetFeedbackTid}?sourceTid=${sourceTid}&recommendationId=${card.recommendationId}`
        );
    };

    const handleDismissLocal = () => {
        setDismissed(true);
        onDismiss?.();
    };

    // 管理员创建新反馈 → 醒目的迁移跳转卡片
    if (card.entryFrom === 'admin_create_feedback') {
        const migratedBg = getThemeColor({
            light: 'linear-gradient(135deg, #e6fffb 0%, #f0f5ff 50%, #e8f4fd 100%)',
            dark: 'linear-gradient(135deg, #0d2b26 0%, #0f172a 50%, #0d2338 100%)',
        });
        const migratedBorder = getThemeColor({ light: '#87e8de', dark: '#13a8a8' });
        const migratedAccent = getThemeColor({ light: '#13c2c2', dark: '#36cfc9' });

        return (
            <Card
                style={{
                    borderRadius: 12,
                    border: `1px solid ${migratedBorder}`,
                    background: migratedBg,
                    overflow: 'hidden',
                    position: 'relative',
                }}
                styles={{ body: { padding: '20px 24px' } }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: `linear-gradient(90deg, ${migratedAccent}, #1677ff)`,
                        borderRadius: '12px 12px 0 0',
                    }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <SwapOutlined style={{ fontSize: 16, color: migratedAccent }} />
                    <Text strong style={{ fontSize: 15 }}>
                        {gLang('feedback.recommendation.migratedTitle')}
                    </Text>
                </div>
                <Paragraph
                    style={{
                        color: getThemeColor({ light: '#666', dark: '#9ca3af' }),
                        fontSize: 13,
                        margin: '0 0 16px 24px',
                    }}
                >
                    {gLang('feedback.recommendation.migratedDesc')}
                </Paragraph>
                <div style={{ marginLeft: 24, marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 14 }}>
                        {feedbackTitle}
                    </Text>
                </div>
                <div style={{ marginLeft: 24 }}>
                    <Button
                        type="primary"
                        onClick={() => navigate(`/feedback/${card.targetFeedbackTid}`)}
                        icon={<RightOutlined />}
                        iconPosition="end"
                        style={{ borderRadius: 8 }}
                    >
                        {gLang('feedback.recommendation.goToFeedback')}
                    </Button>
                </div>
            </Card>
        );
    }

    const accentColor = getThemeColor({ light: '#1677ff', dark: '#3b82f6' });
    const bgGradient = getThemeColor({
        light: 'linear-gradient(135deg, #f0f5ff 0%, #e8f4fd 50%, #f6f0ff 100%)',
        dark: 'linear-gradient(135deg, #111827 0%, #0f172a 50%, #1a1033 100%)',
    });
    const borderColor = getThemeColor({ light: '#d6e4ff', dark: '#1e3a5f' });
    const subtitleColor = getThemeColor({ light: '#666', dark: '#9ca3af' });
    const metaColor = getThemeColor({ light: '#8c8c8c', dark: '#6b7280' });

    return (
        <Card
            style={{
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                background: bgGradient,
                overflow: 'hidden',
                position: 'relative',
            }}
            styles={{ body: { padding: '20px 24px' } }}
        >
            {/* 顶部装饰线 */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${accentColor}, #a855f7)`,
                    borderRadius: '12px 12px 0 0',
                }}
            />

            {/* 标题区 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <BulbOutlined style={{ fontSize: 16, color: accentColor }} />
                <Text strong style={{ fontSize: 15 }}>
                    {gLang('feedback.recommendation.cardTitle')}
                </Text>
            </div>

            <Paragraph style={{ color: subtitleColor, fontSize: 13, margin: '0 0 16px 24px' }}>
                {gLang('feedback.recommendation.cardSubtitle')}
            </Paragraph>

            {/* 反馈信息卡 */}
            <div
                style={{
                    background: getThemeColor({ light: '#fff', dark: '#1f2937' }),
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 16,
                    border: `1px solid ${getThemeColor({ light: '#e5e7eb', dark: '#374151' })}`,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    overflow: 'hidden',
                }}
                onClick={handleView}
                onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = '';
                    e.currentTarget.style.transform = '';
                }}
            >
                <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                    {showStatusBar && (
                        <div
                            style={{
                                width: 3,
                                borderRadius: 99,
                                background: statusBarColor,
                                flexShrink: 0,
                                alignSelf: 'stretch',
                            }}
                        />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 6,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Text strong style={{ fontSize: 15, lineHeight: 1.5 }}>
                                {feedbackTitle}
                            </Text>
                            <FeedbackTagGroup
                                publicTags={card.publicTags}
                                progressTag={card.progressTag}
                                showProgress
                            />
                            {card.feedbackType === 'BUG' ? (
                                <Tag color="red">{gLang('feedback.typeBug')}</Tag>
                            ) : card.feedbackType === 'SUGGESTION' ? (
                                <Tag color="green">{gLang('feedback.typeSuggestion')}</Tag>
                            ) : null}
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Space size="small" style={{ fontSize: 12 }}>
                                <Text type="secondary">
                                    <MessageOutlined style={{ marginRight: 4 }} />
                                    {gLang('feedback.recommendation.repliesCount').replace(
                                        '{count}',
                                        String(card.replyCount)
                                    )}
                                </Text>
                                {card.lastReplyTime && (
                                    <>
                                        <Text type="secondary">{'·'}</Text>
                                        <Text type="secondary">
                                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                                            {formatSmartTime(card.lastReplyTime)}
                                        </Text>
                                    </>
                                )}
                            </Space>
                            <span
                                style={{
                                    marginLeft: 'auto',
                                    padding: '1px 8px',
                                    borderRadius: 10,
                                    fontSize: 11,
                                    background: getThemeColor({
                                        light: '#f0f5ff',
                                        dark: '#1e3a5f',
                                    }),
                                    color: accentColor,
                                }}
                            >
                                {gLang('feedback.recommendation.matchScore').replace(
                                    '{score}',
                                    String(card.matchScore)
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 倒计时提示 */}
            {card.autoCloseAt &&
                (() => {
                    const daysLeft = Math.max(
                        0,
                        Math.ceil(
                            (new Date(card.autoCloseAt).getTime() - Date.now()) /
                                (1000 * 60 * 60 * 24)
                        )
                    );
                    return daysLeft > 0 ? (
                        <div style={{ marginBottom: 12 }}>
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: getThemeColor({ light: '#d48806', dark: '#d97706' }),
                                }}
                            >
                                <ClockCircleOutlined style={{ marginRight: 4 }} />
                                {gLang('feedback.recommendation.autoCloseHint').replace(
                                    '{days}',
                                    String(daysLeft)
                                )}
                            </Text>
                        </div>
                    ) : null;
                })()}

            {/* 操作区 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button
                    type="primary"
                    onClick={handleView}
                    icon={<RightOutlined />}
                    iconPosition="end"
                    style={{ borderRadius: 8 }}
                >
                    {gLang('feedback.recommendation.viewFeedback')}
                </Button>
                <Button
                    type="text"
                    onClick={handleDismissLocal}
                    style={{ color: metaColor, borderRadius: 8 }}
                >
                    {gLang('feedback.recommendation.dismissLocal')}
                </Button>
            </div>
            <div style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: metaColor }}>
                    {gLang('feedback.recommendation.openOnlyHint')}
                </Text>
            </div>
        </Card>
    );
};

export default FeedbackRecommendationCard;
