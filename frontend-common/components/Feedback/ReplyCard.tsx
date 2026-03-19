// 社区风格的回复卡片组件

import React from 'react';
import Card from 'antd/es/card';
import { App } from 'antd';
import Typography from 'antd/es/typography';
import Space from 'antd/es/space';
import Tag from 'antd/es/tag';
import Image from 'antd/es/image';
import Flex from 'antd/es/flex';
import Button from 'antd/es/button';
import theme from 'antd/es/theme';
import Divider from 'antd/es/divider';
import Spin from 'antd/es/spin';
import { CrownOutlined, EllipsisOutlined, LockOutlined } from '@ant-design/icons';
import { TicketDetail, TicketAction } from '@ecuc/shared/types/ticket.types';
import { HTMLComponent, VideoPlayerComponent } from '@common/components/Common';
import { generateTemporaryUrl } from '@common/utils/uploadUtils';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { gLang } from '@common/language';
import { formatSmartTime } from '@common/components/TimeConverter';
import useIsPC from '@common/hooks/useIsPC';

const { Paragraph, Text } = Typography;

interface ReplyCardProps {
    details: TicketDetail[];
    startFloorNumber: number;
    /** 楼中楼：detail id -> 楼层号，用于显示「回复 #N楼」 */
    detailIdToFloor?: Record<number, number>;
    /** 是否允许回复（楼中楼时展示回复按钮） */
    canReply?: boolean;
    /** 点击「回复」时回调，传入被回复的 detail id */
    onReplyTo?: (detailId: number) => void;
    /** 管理端：设为精华，传入该条回复的 detail id */
    onSetFeatured?: (detailId: number) => void;
    /** 管理端：编辑该条 detail，传入该条回复的 detail id，由父组件打开编辑模态框 */
    onEditDetail?: (detailId: number) => void;
    marginBottom?: number;
    /** 使用 contentHtml（管理端 URL）代替 contentHtmlUser（用户端 URL） */
    useAdminHtml?: boolean;
}

// 附件预览组件
const AttachmentPreview: React.FC<{ attachments: string[] }> = ({ attachments }) => {
    const [urls, setUrls] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUrls = async () => {
            setLoading(true);
            const urlPromises = (attachments || []).map(async attachment => {
                try {
                    const fullUrl = attachment.startsWith('http')
                        ? attachment
                        : `https://ec-user-center.oss-cn-hangzhou.aliyuncs.com/${attachment}`;
                    const tempUrl = await generateTemporaryUrl(fullUrl);
                    return { [attachment]: tempUrl };
                } catch {
                    // 即使生成临时URL失败，也使用完整的OSS URL作为备用
                    return {
                        [attachment]: attachment.startsWith('http')
                            ? attachment
                            : `https://ec-user-center.oss-cn-hangzhou.aliyuncs.com/${attachment}`,
                    };
                }
            });

            const results = await Promise.all(urlPromises);
            const finalUrlMap = results.reduce((acc, urlObj) => ({ ...acc, ...urlObj }), {});
            setUrls(finalUrlMap);
            setLoading(false);
        };
        fetchUrls();
    }, [attachments]);

    return (
        <Flex wrap gap="small" style={{ marginTop: 16 }}>
            <Image.PreviewGroup>
                {attachments?.map(attachment => {
                    const lowerAttachment = attachment.toLowerCase();
                    const attachmentSize = 80;
                    if (loading) {
                        return <Spin key={attachment} size="small" />;
                    } else if (lowerAttachment.match(/\.(mp4|mov|webm)$/)) {
                        return (
                            <VideoPlayerComponent
                                key={attachment}
                                src={urls[attachment] || ''}
                                width={attachmentSize}
                                height={attachmentSize}
                            />
                        );
                    } else if (lowerAttachment.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) {
                        return (
                            <Image
                                key={attachment}
                                width={attachmentSize}
                                height={attachmentSize}
                                src={urls[attachment] || ''}
                                style={{ borderRadius: 4 }}
                            />
                        );
                    } else {
                        return (
                            <Button
                                type="dashed"
                                key={attachment}
                                size="small"
                                onClick={() => window.open(urls[attachment] || '', '_blank')}
                            >
                                {(() => {
                                    const fileName = attachment.substring(
                                        attachment.lastIndexOf('/') + 1
                                    );
                                    const pattern = /^(\d{14})_(.+)$/;
                                    const match = fileName.match(pattern);
                                    if (match) {
                                        const dateTime = dayjs(match[1], 'YYYYMMDDHHmmss').format(
                                            'MM-DD HH:mm'
                                        );
                                        return `[${dateTime}] ${match[2]}`;
                                    }
                                    return fileName.length > 20
                                        ? fileName.substring(0, 20) + '...'
                                        : fileName;
                                })()}
                            </Button>
                        );
                    }
                })}
            </Image.PreviewGroup>
        </Flex>
    );
};

const ReplyCard: React.FC<ReplyCardProps> = ({
    details,
    startFloorNumber,
    canReply,
    onReplyTo,
    onSetFeatured,
    onEditDetail,
    marginBottom,
    useAdminHtml,
}) => {
    const { useToken } = theme;
    const { token } = useToken();
    const { modal } = App.useApp();
    const isPC = useIsPC();
    // 递归渲染评论和回复
    const renderCommentWithReplies = (
        comment: TicketDetail,
        index: number,
        isLast: boolean,
        level: number = 0
    ) => {
        const floorNumber = startFloorNumber + index;
        const hasOperator = !!comment.operator;
        const isNote = comment.action === TicketAction.Note;
        // 获取当前评论的所有回复
        const replies = details.filter(d => d.parentDetailId === comment.id);

        // 计算缩进大小 - 所有回复使用相同的缩进
        const baseIndent = startFloorNumber === 1 ? 0 : 16;
        const replyIndent = baseIndent + (isPC ? 24 : 16); // 移动端使用更小的缩进

        return (
            <React.Fragment key={comment.id}>
                <div
                    id={`feedback-floor-${comment.id}`}
                    style={{
                        paddingLeft: level === 0 ? baseIndent : replyIndent,
                        marginLeft: startFloorNumber === 1 ? 0 : -16,
                        paddingRight: startFloorNumber === 1 ? 0 : 16,
                        paddingTop:
                            level === 0
                                ? startFloorNumber === 1 || index === 0
                                    ? 0
                                    : 16
                                : isPC
                                  ? 6
                                  : 4,
                        paddingBottom:
                            level === 0
                                ? startFloorNumber === 1 || isLast
                                    ? 0
                                    : 16
                                : isPC
                                  ? 6
                                  : 4,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: level === 0 ? (isPC ? 8 : 6) : isPC ? 4 : 3,
                            flexWrap: 'wrap',
                            gap: level === 0 ? (isPC ? 8 : 6) : isPC ? 4 : 3,
                        }}
                    >
                        <Space wrap>
                            {isNote && (
                                <Tag color="default" style={{ margin: 0 }}>
                                    <LockOutlined style={{ marginRight: 4, fontSize: 11 }} />
                                    {gLang('feedback.replyAsNote')}
                                </Tag>
                            )}
                            {hasOperator && !isNote && (
                                <Tag
                                    icon={<CrownOutlined />}
                                    color={token.colorPrimary}
                                    style={{
                                        margin: 0,
                                        background: token.colorPrimary,
                                        color: token.colorTextLightSolid,
                                    }}
                                >
                                    {comment.operator}
                                </Tag>
                            )}
                            {comment.displayTitle && (
                                <Text
                                    strong={!isNote}
                                    style={{
                                        fontSize: level === 0 ? 14 : 13,
                                        color: isNote ? token.colorTextSecondary : undefined,
                                        opacity: isNote ? 0.85 : 1,
                                    }}
                                >
                                    {comment.displayTitle}
                                </Text>
                            )}
                            {/* 只有顶级评论显示楼数 */}
                            {level === 0 && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    #{floorNumber}
                                    {gLang('feedback.floorSuffix')}
                                </Text>
                            )}
                            {/* 回复显示回复对象 */}
                            {level > 0 && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {(() => {
                                        // 找到被回复的评论
                                        const repliedComment = details.find(
                                            d => d.id === comment.parentDetailId
                                        );
                                        if (!repliedComment) return '';

                                        // 只显示被回复对象的用户名
                                        return gLang('feedback.replyToUser').replace(
                                            '{user}',
                                            repliedComment.displayTitle || ''
                                        );
                                    })()}
                                </Text>
                            )}
                            {canReply && startFloorNumber > 1 && onReplyTo && (
                                <Button
                                    type="link"
                                    size="small"
                                    style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                    onClick={() => onReplyTo(comment.id)}
                                >
                                    {gLang('feedback.replyThis')}
                                </Button>
                            )}
                            {onSetFeatured &&
                                !comment.operator?.includes?.(gLang('feedbackReply.highlight')) && (
                                    <Button
                                        type="link"
                                        size="small"
                                        style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                        onClick={() => {
                                            modal.confirm({
                                                title: gLang('feedback.setFeatured'),
                                                content: gLang('feedback.setFeaturedConfirm'),
                                                okText: gLang('common.confirm'),
                                                cancelText: gLang('common.cancel'),
                                                onOk: () => onSetFeatured(comment.id),
                                            });
                                        }}
                                    >
                                        {gLang('feedback.setFeatured')}
                                    </Button>
                                )}
                            {onEditDetail && (
                                <Button
                                    type="link"
                                    size="small"
                                    icon={<EllipsisOutlined />}
                                    style={{ padding: 0, height: 'auto', fontSize: 12 }}
                                    onClick={() => onEditDetail(comment.id)}
                                />
                            )}
                        </Space>
                        {comment.create_time && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {formatSmartTime(comment.create_time)}
                            </Text>
                        )}
                    </div>

                    {/* 回复内容：优先使用后端渲染的 contentHtmlUser（markdown→HTML），否则用 content 按行渲染 */}
                    <div
                        style={{
                            marginTop: level === 0 ? (isPC ? 16 : 12) : isPC ? 8 : 6,
                            lineHeight: 1.6,
                            wordBreak: 'break-word',
                            color: isNote ? token.colorTextSecondary : undefined,
                            opacity: isNote ? 0.85 : 1,
                        }}
                    >
                        <Paragraph style={{ marginBottom: 0 }}>
                            {(() => {
                                const html = useAdminHtml ? comment.contentHtml : comment.contentHtmlUser;
                                return html != null && html !== '' ? (
                                    <HTMLComponent content={html} />
                                ) : (
                                <>
                                    {comment.content.split('\n').map((line, lineIndex) => (
                                        <React.Fragment key={lineIndex}>
                                            <HTMLComponent content={line} />
                                            {lineIndex < comment.content.split('\n').length - 1 && (
                                                <br />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </>
                                );
                            })()}
                        </Paragraph>
                    </div>

                    {/* 附件 */}
                    {comment.attachments && comment.attachments.length > 0 && (
                        <AttachmentPreview attachments={comment.attachments} />
                    )}
                </div>

                {/* 渲染回复 */}
                {replies.map((reply, replyIndex) => {
                    const replyIsLast = replyIndex === replies.length - 1 && isLast;
                    return (
                        <React.Fragment key={reply.id}>
                            {renderCommentWithReplies(reply, 0, replyIsLast, level + 1)}
                        </React.Fragment>
                    );
                })}

                {/* 顶级评论之间的分割线 */}
                {level === 0 && !isLast && <Divider style={{ margin: '0' }} />}
            </React.Fragment>
        );
    };

    const renderReplyContent = () => {
        // 只处理顶级评论
        const topLevelDetails = details.filter(detail => detail.parentDetailId == null);

        return topLevelDetails.map((detail, index) => {
            const isLast = index === topLevelDetails.length - 1;
            return renderCommentWithReplies(detail, index, isLast, 0);
        });
    };

    return (
        <Card
            style={{
                marginBottom: marginBottom ?? 16,
                borderRadius: 8,
                border: startFloorNumber === 1 ? 'none' : undefined,
                boxShadow: startFloorNumber === 1 ? 'none' : undefined,
            }}
            bodyStyle={{ padding: startFloorNumber === 1 ? '0' : '16px' }}
        >
            {renderReplyContent()}
        </Card>
    );
};

export default ReplyCard;
