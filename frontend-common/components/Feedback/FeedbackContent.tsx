// 反馈内容组件 - 包含帖子标题、状态标签、主帖内容和回复列表

import React, { useMemo, useState } from 'react';
import Card from 'antd/es/card';
import Space from 'antd/es/space';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import Segmented from 'antd/es/segmented';
import Switch from 'antd/es/switch';
import Popover from 'antd/es/popover';
import { BellOutlined, BellFilled, MoreOutlined } from '@ant-design/icons';
import { gLang } from '@common/language';
import { Feedback, FeedbackTagSummary, TicketDetail, Ticket } from '@ecuc/shared/types/ticket.types';
import { useTheme } from '@common/contexts/ThemeContext';
import { ltransTicketStatusColor, ltransTicketStatusForUser } from '@common/languageTrans';
import { formatSmartTime } from '@common/components/TimeConverter';
import ReplyCard from './ReplyCard';
import FeedbackReplyRoute from './FeedbackReplyRoute';
import FeedbackTagGroup, { ProgressTag } from './FeedbackTagGroup';

const { Text } = Typography;

interface FeedbackContentProps {
    ticket: Feedback;
    isSpinning: boolean;
    filterType: 'all' | 'official';
    onFilterChange: (value: 'all' | 'official') => void;
    canReply: boolean;
    onReplyTo?: (detailId: number) => void;
    onReply?: (values: any, parent_detail_id?: number) => void;
    onCancelReply?: () => void;
    replyingToDetailId: number | null;
    isFormDisabled: boolean;
    /** 管理端：设为精华 */
    onSetFeatured?: (detailId: number) => void;
    /** 管理端：编辑该条 detail */
    onEditDetail?: (detailId: number) => void;
    animationDelay: number;
    cardIndex: React.MutableRefObject<number>;
    /** 当前用户各 openid 的订阅状态 { [openid]: boolean } */
    subscribed: Record<string, boolean> | undefined;
    /** 主 openid（当前登录身份，如 NexaId_79），主开关只控制此项 */
    primaryOpenid: string | undefined;
    isUpdatingSubscription: boolean;
    /** (openid, checked) 切换指定 openid 的订阅状态 */
    onSubscriptionChange: (openid: string, checked: boolean) => void;
    /** 管理端专用：渲染在筛选 Segmented 旁边的额外控件（如视图切换） */
    adminFilterSlot?: React.ReactNode;
    /** 管理端专用：当提供时，替换回复列表区域（同时隐藏筛选 Segmented） */
    adminNotesOverride?: React.ReactNode;
    /** 使用 contentHtml（管理端 URL）代替 contentHtmlUser */
    useAdminHtml?: boolean;
}

const FeedbackContent: React.FC<FeedbackContentProps> = ({
    ticket,
    isSpinning,
    filterType,
    onFilterChange,
    canReply,
    onReplyTo,
    onReply,
    onCancelReply,
    replyingToDetailId,
    isFormDisabled,
    onSetFeatured,
    onEditDetail,
    animationDelay,
    cardIndex,
    subscribed,
    primaryOpenid,
    isUpdatingSubscription,
    onSubscriptionChange,
    adminFilterSlot,
    adminNotesOverride,
    useAdminHtml,
}) => {
    useTheme();
    const [boundAccountsOpen, setBoundAccountsOpen] = useState(false);
    const getFadeInStyle = (): React.CSSProperties | undefined => {
        if (animationDelay <= 0) {
            return undefined;
        }
        return {
            opacity: 0,
            animation: `fadeInUp 0.5s ease-in-out ${cardIndex.current++ * animationDelay}s forwards`,
        };
    };

    const otherOpenids = useMemo(() => {
        if (!subscribed || primaryOpenid == null) return [];
        return Object.keys(subscribed).filter(k => k !== primaryOpenid);
    }, [subscribed, primaryOpenid]);

    const hasOtherSubscribed = useMemo(
        () => otherOpenids.some(oid => subscribed?.[oid] === true),
        [otherOpenids, subscribed]
    );

    /** 仅已订阅的其他 openid（... 弹层内只展示这些） */
    const otherSubscribedOpenids = useMemo(
        () => otherOpenids.filter(oid => subscribed?.[oid] === true),
        [otherOpenids, subscribed]
    );

    const progressTag: FeedbackTagSummary | null = (ticket as any).progressTag ?? null;

    // 处理主帖和回复数据
    const { mainPost, replies, detailIdToFloor } = useMemo((): {
        mainPost: TicketDetail | null;
        replies: TicketDetail[];
        detailIdToFloor: Record<number, number>;
    } => {
        if (!ticket?.details || ticket.details.length === 0) {
            return { mainPost: null, replies: [], detailIdToFloor: {} };
        }
        const details: TicketDetail[] = ticket.details;
        const mainPost = details[0];
        const replies = details.slice(1);
        const map: Record<number, number> = {};
        map[mainPost.id] = 1;
        // 只为顶级回复（无parentDetailId）分配楼层号
        const topLevelReplies = replies.filter((d: TicketDetail) => d.parentDetailId == null);
        topLevelReplies.forEach((d: TicketDetail, i: number) => {
            map[d.id] = i + 2;
        });
        return { mainPost, replies, detailIdToFloor: map };
    }, [ticket?.details]);

    // 过滤后的回复列表
    const filteredReplies = useMemo(() => {
        if (!replies) return [];
        if (filterType === 'official') {
            return replies.filter(reply => reply.isOfficial);
        }
        return replies;
    }, [replies, filterType]);

    // 如果没有主帖，显示提示
    if (!mainPost && ticket && !isSpinning) {
        return (
            <Card style={{ textAlign: 'center', borderRadius: 8 }}>
                <Text type="secondary">{gLang('feedback.noContent')}</Text>
            </Card>
        );
    }

    return (
        <div>
            <Space orientation="vertical" style={{ width: '100%' }} size={8}>
                {/* 帖子标题和元信息 */}
                <div
                    style={getFadeInStyle()}
                >
                    <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: '16px' }}>
                        <Space orientation="vertical" style={{ width: '100%' }} size={8}>
                            {/* 标题与右上角状态标签 */}
                            <div style={{ position: 'relative' }}>
                                <div
                                    style={{
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        wordBreak: 'break-word',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {ticket.title.replace(/^反馈:\s*/, '')}
                                </div>
                                {/* 元信息：创建时间、回复数、最后回复时间 */}
                                <Space wrap size="small" style={{ fontSize: 12, marginTop: 8 }}>
                                    {ticket.create_time && (
                                        <Text type="secondary">
                                            {gLang('feedback.createdAt')}{' '}
                                            {formatSmartTime(ticket.create_time)}
                                        </Text>
                                    )}
                                    {ticket.create_time && <Text type="secondary">·</Text>}
                                    <Space size={4}>
                                        <Text type="secondary">
                                            {gLang('feedback.reply').replace(
                                                '{count}',
                                                String(replies.length)
                                            )}
                                        </Text>
                                    </Space>
                                    {replies.length > 0 && (
                                        <>
                                            <Text type="secondary">·</Text>
                                            <Text type="secondary">
                                                {gLang('feedback.lastReplyAt')}{' '}
                                                {formatSmartTime(
                                                    replies[replies.length - 1].create_time
                                                )}
                                            </Text>
                                        </>
                                    )}
                                </Space>
                            </div>
                            {progressTag && <ProgressTag tag={progressTag} />}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Space>
                                    <Tag color={ltransTicketStatusColor(ticket.status)}>
                                        {ltransTicketStatusForUser(
                                            ticket.status,
                                            ticket.priority,
                                            false,
                                            ticket.type
                                        )}
                                    </Tag>
                                    <FeedbackTagGroup publicTags={ticket.publicTags} />
                                    {ticket.feedbackType === 'BUG' ? (
                                        <Tag color="red">{gLang('feedback.typeBug')}</Tag>
                                    ) : ticket.feedbackType === 'SUGGESTION' ? (
                                        <Tag color="green">{gLang('feedback.typeSuggestion')}</Tag>
                                    ) : null}
                                </Space>
                                {subscribed !== undefined && primaryOpenid != null && (
                                    <Space size="small">
                                        <Switch
                                            checked={subscribed[primaryOpenid] === true}
                                            onChange={() =>
                                                onSubscriptionChange(
                                                    primaryOpenid,
                                                    !subscribed[primaryOpenid]
                                                )
                                            }
                                            loading={isUpdatingSubscription}
                                            checkedChildren={<BellFilled />}
                                            unCheckedChildren={<BellOutlined />}
                                            size="default"
                                        />
                                        {otherOpenids.length > 0 && hasOtherSubscribed && (
                                            <Popover
                                                open={boundAccountsOpen}
                                                onOpenChange={setBoundAccountsOpen}
                                                trigger="click"
                                                content={
                                                    <div style={{ minWidth: 200 }}>
                                                        <div
                                                            style={{
                                                                marginBottom: 8,
                                                                fontSize: 12,
                                                                color: 'var(--colorTextSecondary)',
                                                            }}
                                                        >
                                                            {gLang('feedback.boundEcAccounts')}
                                                        </div>
                                                        <Space
                                                            direction="vertical"
                                                            style={{ width: '100%' }}
                                                        >
                                                            {otherSubscribedOpenids.map(oid => (
                                                                <div
                                                                    key={oid}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent:
                                                                            'space-between',
                                                                        gap: 12,
                                                                    }}
                                                                >
                                                                    <Text style={{ fontSize: 13 }}>
                                                                        {oid.startsWith('EC-')
                                                                            ? `ecid: ${oid.slice(3)}`
                                                                            : oid}
                                                                    </Text>
                                                                    <Switch
                                                                        size="small"
                                                                        checked={
                                                                            subscribed[oid] === true
                                                                        }
                                                                        onChange={() =>
                                                                            onSubscriptionChange(
                                                                                oid,
                                                                                !subscribed[oid]
                                                                            )
                                                                        }
                                                                        loading={
                                                                            isUpdatingSubscription
                                                                        }
                                                                    />
                                                                </div>
                                                            ))}
                                                        </Space>
                                                    </div>
                                                }
                                            >
                                                <MoreOutlined
                                                    style={{
                                                        cursor: 'pointer',
                                                        fontSize: 16,
                                                        color: 'var(--colorTextSecondary)',
                                                    }}
                                                />
                                            </Popover>
                                        )}
                                    </Space>
                                )}
                            </div>

                            {/* 元信息栏 */}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                }}
                            ></div>
                            {/* 主帖内容 */}
                            {mainPost && (
                                <ReplyCard
                                    details={[mainPost]}
                                    startFloorNumber={1}
                                    detailIdToFloor={detailIdToFloor}
                                    onSetFeatured={onSetFeatured}
                                    onEditDetail={onEditDetail}
                                    marginBottom={0}
                                    useAdminHtml={useAdminHtml}
                                />
                            )}
                        </Space>

                        {/* 筛选选项 */}
                        {mainPost && (
                            <Space
                                style={{
                                    width: '100%',
                                    justifyContent: 'space-between',
                                    marginTop:
                                        mainPost.attachments && mainPost.attachments.length > 0
                                            ? 16
                                            : 0,
                                }}
                            >
                                <Space wrap size={6}>
                                    {!adminNotesOverride && (
                                        <Segmented
                                            value={filterType}
                                            onChange={value =>
                                                onFilterChange(value as 'all' | 'official')
                                            }
                                            options={[
                                                {
                                                    label: `${gLang('feedback.allReplies')} (${replies.length})`,
                                                    value: 'all',
                                                },
                                                {
                                                    label: `${gLang('feedback.showOfficialOnly')} (${replies.length > 0 ? replies.filter(reply => reply.isOfficial).length : mainPost?.isOfficial ? 1 : 0})`,
                                                    value: 'official',
                                                },
                                            ]}
                                        />
                                    )}
                                    {adminFilterSlot}
                                </Space>
                            </Space>
                        )}
                    </Card>
                </div>

                {/* 管理端：内部备注覆盖视图 */}
                {adminNotesOverride != null && adminNotesOverride}

                {/* 回复列表 */}
                {adminNotesOverride == null && (
                    filteredReplies.length > 0 ? (
                        <div style={getFadeInStyle()}>
                            <ReplyCard
                                details={filteredReplies}
                                startFloorNumber={2}
                                detailIdToFloor={detailIdToFloor}
                                canReply={canReply}
                                onReplyTo={onReplyTo}
                                onSetFeatured={onSetFeatured}
                                onEditDetail={onEditDetail}
                                useAdminHtml={useAdminHtml}
                            />
                        </div>
                    ) : replies.length > 0 ? (
                        <div style={getFadeInStyle()}>
                            <Card style={{ textAlign: 'center', borderRadius: 8 }}>
                                <Text type="secondary">{gLang('feedback.noMatchingReplies')}</Text>
                            </Card>
                        </div>
                    ) : null
                )}

                {/* 回复表单 - 使用路由分发组件，根据设备类型选择合适的回复框 */}
                {/* 管理端不显示回复框，参考设为精华工具的实现 */}
                {onReply && onCancelReply && !onSetFeatured && (
                    <FeedbackReplyRoute
                        ticket={ticket as unknown as Ticket}
                        onReply={onReply}
                        onCancelReply={onCancelReply}
                        replyingToDetailId={replyingToDetailId}
                        isFormDisabled={isFormDisabled}
                        animationDelay={animationDelay}
                        cardIndex={cardIndex}
                        mainPost={mainPost}
                        replies={replies}
                    />
                )}
            </Space>
        </div>
    );
};

export default FeedbackContent;
