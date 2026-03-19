// 反馈详情页面 - 社区讨论风格

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Space, Typography, message, Grid, Skeleton } from 'antd';
import { fetchData, submitData } from '@common/axiosConfig';
import { useParams } from 'react-router-dom';
import { gLang } from '@common/language';
import Wrapper from '@common/components/Wrapper/Wrapper';
import { Feedback, TicketStatus, TicketDetail } from '@ecuc/shared/types/ticket.types';
import usePageTitle from '@common/hooks/usePageTitle';
import { useTheme } from '@common/contexts/ThemeContext';
import FeedbackContent from '@common/components/Feedback/FeedbackContent';
import { FeedbackAnchorRoute } from '@common/components/Feedback';
import { useFeedbackEligibility } from '../../contexts/FeedbackEligibilityContext';
import FeedbackSettingsModal from './components/FeedbackSettingsModal';
import { useAuth } from '@common/contexts/AuthContext';

// 淡入动画
const fadeInUpAnimation = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;

// 添加动画样式到文档头部
if (typeof document !== 'undefined' && !document.getElementById('fadeInUpAnimation')) {
    const style = document.createElement('style');
    style.id = 'fadeInUpAnimation';
    style.innerHTML = fadeInUpAnimation;
    document.head.appendChild(style);
}

const { useBreakpoint } = Grid;
const { Text } = Typography;

const FeedbackDetail: React.FC = () => {
    usePageTitle();
    const { tid } = useParams();
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [ticket, setTicket] = useState<Feedback | undefined>();
    const [isSpinning, setIsSpinning] = useState(true);
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'official'>('all');
    const [subscribed, setSubscribed] = useState<Record<string, boolean> | undefined>(undefined);
    const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);
    const [replyingToDetailId, setReplyingToDetailId] = useState<number | null>(null);
    const { getThemeColor } = useTheme();
    // 发言资格检查（进入页面时异步完成）
    useFeedbackEligibility();
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const { user } = useAuth();

    // Animation delay
    const animationDelay = 0.02;
    const cardIndex = useRef(0);

    useEffect(() => {
        setIsSpinning(true);
        fetchData({
            url: '/feedback/detail',
            method: 'GET',
            data: { tid: tid },
            setData: data => {
                setTicket(data);
                setSubscribed((data as any).subscribed ?? {});
                setIsSpinning(false);
            },
            setSpin: setIsSpinning,
        }).catch(() => {
            setIsSpinning(false);
        });
    }, [tid]);

    const { mainPost, replies, detailIdToFloor } = useMemo((): {
        mainPost: TicketDetail | null;
        replies: TicketDetail[];
        detailIdToFloor: Record<number, number>;
    } => {
        if (!ticket?.details || ticket.details.length === 0) {
            return { mainPost: null, replies: [], detailIdToFloor: {} };
        }
        const mainPost = ticket.details[0];
        const replies = ticket.details.slice(1);
        const map: Record<number, number> = {};
        map[mainPost.id] = 1;
        // 只为顶级回复（无 parentDetailId）分配楼层号
        const topLevelReplies = replies.filter(d => d.parentDetailId == null);
        topLevelReplies.forEach((d, i) => {
            map[d.id] = i + 2;
        });
        return { mainPost, replies, detailIdToFloor: map };
    }, [ticket?.details]);

    // 如果没有主帖，显示提示
    if (!mainPost && ticket && !isSpinning) {
        return (
            <Wrapper>
                <Card style={{ textAlign: 'center', borderRadius: 8 }}>
                    <Text type="secondary">{gLang('feedback.noContent')}</Text>
                </Card>
            </Wrapper>
        );
    }

    // 官方回复列表（用于锚点）
    const officialReplies = useMemo(() => {
        if (!replies) return [];
        return replies
            .map(reply => {
                if (!reply.isOfficial) return null;

                const content = reply.content || '';
                const previewText =
                    content.length > 15 ? content.substring(0, 15) + '...' : content;

                // 计算楼层号 - 找到最顶级的父评论
                let floorNumber = 0;
                let currentId = reply.parentDetailId;

                while (currentId) {
                    if (currentId === mainPost?.id) {
                        floorNumber = 1;
                        break;
                    }
                    const parentReply = replies.find(r => r.id === currentId);
                    if (!parentReply) break;
                    if (!parentReply.parentDetailId) {
                        floorNumber = detailIdToFloor[currentId] || 0;
                        break;
                    }
                    currentId = parentReply.parentDetailId;
                }
                if (!reply.parentDetailId) {
                    floorNumber = detailIdToFloor[reply.id] || 0;
                }

                return {
                    id: reply.id,
                    title: previewText || gLang('feedback.officialReply'),
                    floor: floorNumber,
                };
            })
            .filter(item => item !== null && item.floor > 0) as Array<{
            id: number;
            title: string;
            floor: number;
        }>;
    }, [replies, detailIdToFloor, mainPost]);

    const handleReplyTo = (detailId: number) => {
        setReplyingToDetailId(detailId);
    };

    const handleReply = async (values: any, parent_detail_id?: number) => {
        const payload: {
            tid: string;
            details: string;
            files: string[];
            parent_detail_id?: number;
        } = {
            tid: tid || '',
            details: values.details,
            files: values.files || [],
        };
        if (parent_detail_id != null) payload.parent_detail_id = parent_detail_id;
        try {
            const response = await submitData({
                data: payload,
                url: '/feedback/reply',
                successMessage: 'ticketDetail.success',
                method: 'POST',
                setIsFormDisabled: setIsFormDisabled,
                setIsModalOpen: () => {},
            });
            // 回复成功后重置并刷新
            setReplyingToDetailId(null);
            setIsSpinning(true);
            fetchData({
                url: '/feedback/detail',
                method: 'GET',
                data: { tid: tid },
                setData: data => {
                    setTicket(data);
                    setSubscribed((data as any).subscribed ?? {});
                },
                setSpin: setIsSpinning,
                callback: () => {
                    // 数据刷新后，滚动到新发布的评论位置
                    setTimeout(() => {
                        const newCommentId = response?.detail_id;
                        if (newCommentId) {
                            const commentElement = document.getElementById(
                                `feedback-floor-${newCommentId}`
                            );
                            if (commentElement) {
                                commentElement.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                });
                            }
                        }
                    }, 100);
                },
            });
        } catch (error: any) {
            // EPF 2026：发言资格验证失败（未设置/已解绑/被处罚），自动弹出设置 Modal 让玩家换绑或重新选择
            if (error?.response?.data?.EPF_code === 2026) {
                setSettingsModalOpen(true);
            }
            // 其他错误由 submitData 内部已通过全局 toast 提示，无需额外处理
        }
    };

    // 处理订阅状态切换（可指定 openid，如主账号或绑定的 EC 账号）
    const handleSubscriptionChange = async (openid: string, checked: boolean) => {
        if (!tid) return;
        if (!openid) {
            messageApi.error(gLang('feedback.subscriptionUpdateFailed'));
            return;
        }

        setIsUpdatingSubscription(true);
        try {
            const res = await submitData({
                data: {
                    tid: parseInt(tid),
                    subscribe: checked,
                    openid,
                },
                url: '/feedback/subscription',
                successMessage: checked ? 'feedback.subscribed' : 'feedback.unsubscribed',
                method: 'POST',
                setIsFormDisabled: setIsUpdatingSubscription,
                setIsModalOpen: () => {},
            });
            const next = (res as any)?.subscribed;
            if (next && typeof next === 'object')
                setSubscribed(prev => ({ ...(prev ?? {}), ...next }));
        } catch {
            messageApi.error(gLang('feedback.subscriptionUpdateFailed'));
        } finally {
            setIsUpdatingSubscription(false);
        }
    };

    if (isSpinning && !ticket) {
        return (
            <Wrapper>
                <Skeleton active paragraph={{ rows: 3 }} title={false} />
            </Wrapper>
        );
    }

    if (!ticket && !isSpinning) {
        return (
            <Wrapper>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p>{gLang('feedback.noFeedback')}</p>
                    {tid && (
                        <p
                            style={{
                                color: getThemeColor({ light: '#999', dark: '#666' }),
                                fontSize: '12px',
                            }}
                        >
                            TID: {tid}
                        </p>
                    )}
                </div>
            </Wrapper>
        );
    }

    if (!ticket) {
        return null;
    }

    const canReply = ticket.status !== TicketStatus.Accept && ticket.status !== TicketStatus.Reject;

    return (
        <Wrapper>
            {contextHolder}

            <div
                style={{
                    display: 'flex',
                    gap: isMobile ? 0 : 16,
                    flexDirection: isMobile ? 'column' : 'row',
                }}
            >
                {/* 主内容区 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        <FeedbackContent
                            ticket={ticket as any}
                            isSpinning={isSpinning}
                            filterType={filterType}
                            onFilterChange={setFilterType}
                            canReply={canReply}
                            onReplyTo={handleReplyTo}
                            onReply={handleReply}
                            onCancelReply={() => setReplyingToDetailId(null)}
                            replyingToDetailId={replyingToDetailId}
                            isFormDisabled={isFormDisabled}
                            animationDelay={animationDelay}
                            cardIndex={cardIndex}
                            subscribed={subscribed}
                            primaryOpenid={user?.openid}
                            isUpdatingSubscription={isUpdatingSubscription}
                            onSubscriptionChange={handleSubscriptionChange}
                        />
                    </Space>
                </div>

                {/* 右侧锚点目录 */}
                <FeedbackAnchorRoute
                    officialReplies={officialReplies}
                    cardIndex={cardIndex}
                    animationDelay={animationDelay}
                />
            </div>

            {/* 设置 Modal */}
            <FeedbackSettingsModal
                open={settingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
            />
        </Wrapper>
    );
};

export default FeedbackDetail;
