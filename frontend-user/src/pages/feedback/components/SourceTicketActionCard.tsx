import React, { useEffect, useState } from 'react';
import {
    Card,
    Button,
    Typography,
    Popconfirm,
    Skeleton,
    message,
    Image,
    Flex,
    Spin,
    Alert,
} from 'antd';
import {
    SendOutlined,
    BellOutlined,
    CloseOutlined,
    LinkOutlined,
    PaperClipOutlined,
} from '@ant-design/icons';
import axiosInstance from '@common/axiosConfig';
import { useTheme } from '@common/contexts/ThemeContext';
import { gLang } from '@common/language';
import { SourceTicketActionCardDto } from '@ecuc/shared/types/ticket.types';
import { generateTemporaryUrl } from '@common/utils/uploadUtils';
import PublishFromTicketModal from './PublishFromTicketModal';

const { Text, Paragraph } = Typography;

interface SourceTicketActionCardProps {
    recommendationId: number;
    sourceTid: number;
    feedbackTid: number;
    feedbackTitle?: string;
    onActionComplete: () => void;
}

/** 轻量附件缩略图 */
const AttachmentThumbnails: React.FC<{ files: string[] }> = ({ files }) => {
    const [urls, setUrls] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            const map: Record<string, string> = {};
            await Promise.all(
                files.map(async f => {
                    try {
                        const full = f.startsWith('http')
                            ? f
                            : `https://ec-user-center.oss-cn-hangzhou.aliyuncs.com/${f}`;
                        map[f] = await generateTemporaryUrl(full);
                    } catch {
                        map[f] = f.startsWith('http')
                            ? f
                            : `https://ec-user-center.oss-cn-hangzhou.aliyuncs.com/${f}`;
                    }
                })
            );
            if (!cancelled) {
                setUrls(map);
                setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [files]);

    if (loading) return <Spin size="small" />;

    return (
        <Flex wrap gap="small">
            <Image.PreviewGroup>
                {files.map(f => {
                    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(f);
                    if (isImage) {
                        return (
                            <Image
                                key={f}
                                width={56}
                                height={56}
                                src={urls[f] || ''}
                                style={{ borderRadius: 4, objectFit: 'cover' }}
                            />
                        );
                    }
                    return (
                        <a key={f} href={urls[f] || '#'} target="_blank" rel="noreferrer">
                            <Button type="dashed" size="small" icon={<PaperClipOutlined />}>
                                {gLang('feedback.recommendation.modalAttachmentLabel')}
                            </Button>
                        </a>
                    );
                })}
            </Image.PreviewGroup>
        </Flex>
    );
};

const SourceTicketActionCard: React.FC<SourceTicketActionCardProps> = ({
    recommendationId,
    sourceTid,
    feedbackTid,
    feedbackTitle,
    onActionComplete,
}) => {
    const { getThemeColor } = useTheme();
    const [card, setCard] = useState<SourceTicketActionCardDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [publishModalOpen, setPublishModalOpen] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                const [actionRes] = await Promise.all([
                    axiosInstance.get('/feedback/recommendation/source-action', {
                        params: { recommendationId },
                    }),
                    axiosInstance.post('/feedback/recommendation/view', { recommendationId }),
                ]);
                if (!cancelled && actionRes.data?.EPF_code === 200) {
                    setCard(actionRes.data.card ?? null);
                }
            } catch {
                // 静默
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchData();
        return () => {
            cancelled = true;
        };
    }, [recommendationId]);

    if (loading) {
        return (
            <Card style={{ borderRadius: 12, marginBottom: 12 }}>
                <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
        );
    }

    if (!card || completed) return null;

    const handleSubscribeOnly = async () => {
        setActionLoading(true);
        try {
            const res = await axiosInstance.post('/feedback/recommendation/subscribe-only', {
                recommendationId: card.recommendationId,
            });
            if (res.data?.EPF_code === 200) {
                messageApi.success(gLang('feedback.recommendation.subscribeSuccess'));
                setCompleted(true);
                onActionComplete();
            } else {
                messageApi.error(
                    res.data?.message || gLang('feedback.recommendation.actionFailed')
                );
            }
        } catch {
            messageApi.error(gLang('feedback.recommendation.actionFailedRetry'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDismiss = async () => {
        setActionLoading(true);
        try {
            const res = await axiosInstance.post('/feedback/recommendation/dismiss', {
                recommendationId: card.recommendationId,
            });
            if (res.data?.EPF_code === 200) {
                messageApi.info(gLang('feedback.recommendation.dismissSuccess'));
                setCompleted(true);
            } else {
                messageApi.error(
                    res.data?.message || gLang('feedback.recommendation.actionFailed')
                );
            }
        } catch {
            messageApi.error(gLang('feedback.recommendation.actionFailedRetry'));
        } finally {
            setActionLoading(false);
        }
    };

    const handlePublishFromModal = () => {
        messageApi.success(gLang('feedback.recommendation.publishSuccess'));
        setCompleted(true);
        onActionComplete();
    };

    const borderColor = getThemeColor({ light: '#ffe58f', dark: '#594214' });
    const subtitleColor = getThemeColor({ light: '#666', dark: '#9ca3af' });
    const bgColor = getThemeColor({
        light: 'linear-gradient(135deg, #fffbe6 0%, #fff7e6 50%, #fff1e6 100%)',
        dark: 'linear-gradient(135deg, #1a1500 0%, #1a1200 50%, #1a0f00 100%)',
    });
    const previewBg = getThemeColor({ light: '#fffef5', dark: '#1c1a10' });
    const previewBorder = getThemeColor({ light: '#f0e6c8', dark: '#3d3520' });
    const warningColor = getThemeColor({ light: '#d48806', dark: '#b45309' });

    const hasDraftContent = Boolean(card.draftContent?.trim());
    const hasAttachments = card.draftAttachments?.length > 0;

    return (
        <>
            {contextHolder}
            <Card
                style={{
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    marginBottom: 12,
                    overflow: 'hidden',
                    position: 'relative',
                }}
                styles={{ body: { padding: '16px 20px' } }}
            >
                {/* 左侧装饰线 */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: 3,
                        background: 'linear-gradient(180deg, #faad14, #fa8c16)',
                        borderRadius: '12px 0 0 12px',
                    }}
                />

                {/* 标题行 */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                        paddingLeft: 8,
                    }}
                >
                    <LinkOutlined style={{ fontSize: 14, color: '#faad14' }} />
                    <Text strong style={{ fontSize: 14 }}>
                        {gLang('feedback.recommendation.sourceCardTitle')}
                    </Text>
                    <Text style={{ fontSize: 12, color: subtitleColor }}>
                        #{sourceTid} {card.sourceTicketTitle}
                    </Text>
                </div>

                <Paragraph
                    style={{
                        color: subtitleColor,
                        fontSize: 13,
                        margin: '0 0 10px 30px',
                        lineHeight: 1.6,
                    }}
                >
                    {gLang('feedback.recommendation.sourceCardDesc')}
                </Paragraph>

                {/* 原工单内容预览 */}
                {(hasDraftContent || hasAttachments) && (
                    <div
                        style={{
                            marginLeft: 30,
                            marginBottom: 12,
                            background: previewBg,
                            border: `1px solid ${previewBorder}`,
                            borderRadius: 8,
                            padding: '12px 16px',
                            maxHeight: 240,
                            overflowY: 'auto',
                        }}
                    >
                        {hasDraftContent && (
                            <Paragraph
                                style={{
                                    margin: 0,
                                    fontSize: 13,
                                    lineHeight: 1.7,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    color: getThemeColor({ light: '#333', dark: '#d1d5db' }),
                                }}
                            >
                                {card.draftContent}
                            </Paragraph>
                        )}

                        {hasAttachments && (
                            <div
                                style={{
                                    marginTop: 10,
                                    paddingTop: 10,
                                    borderTop: `1px dashed ${previewBorder}`,
                                }}
                            >
                                {!hasDraftContent && (
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: subtitleColor,
                                            display: 'block',
                                            marginBottom: 8,
                                        }}
                                    >
                                        {gLang('feedback.recommendation.attachmentsOnlyHint')}
                                    </Text>
                                )}
                                <Text
                                    style={{
                                        fontSize: 11,
                                        color: subtitleColor,
                                        display: 'block',
                                        marginBottom: 6,
                                    }}
                                >
                                    <PaperClipOutlined style={{ marginRight: 4 }} />
                                    {gLang('feedback.recommendation.attachmentCount').replace(
                                        '{count}',
                                        String(card.draftAttachments.length)
                                    )}
                                </Text>
                                <AttachmentThumbnails files={card.draftAttachments} />
                            </div>
                        )}
                    </div>
                )}

                <Alert
                    type="info"
                    showIcon
                    style={{ marginLeft: 30, marginBottom: 12 }}
                    message={gLang('feedback.recommendation.actionGuideTitle')}
                    description={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {card.canPublish && (
                                <Text style={{ fontSize: 12 }}>
                                    {gLang('feedback.recommendation.publishDirect')}：
                                    {gLang('feedback.recommendation.publishDirectHint')}
                                </Text>
                            )}
                            <Text style={{ fontSize: 12 }}>
                                {gLang('feedback.recommendation.subscribeOnly')}：
                                {gLang('feedback.recommendation.subscribeOnlyHint')}
                            </Text>
                            <Text style={{ fontSize: 12 }}>
                                {gLang('feedback.recommendation.dismissAction')}：
                                {gLang('feedback.recommendation.dismissActionHint')}
                            </Text>
                            {card.canPublish && (
                                <Text style={{ fontSize: 12 }} type="secondary">
                                    {gLang('feedback.recommendation.publishAdvancedHint')}
                                </Text>
                            )}
                        </div>
                    }
                />

                {/* 操作按钮 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 30 }}>
                    {card.canPublish && (
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={() => setPublishModalOpen(true)}
                            loading={actionLoading}
                            size="small"
                            style={{ borderRadius: 6 }}
                        >
                            {gLang('feedback.recommendation.publishDirect')}
                        </Button>
                    )}
                    <Popconfirm
                        title={gLang('feedback.recommendation.confirmSubscribeTitle')}
                        description={gLang('feedback.recommendation.confirmSubscribeDesc')}
                        onConfirm={handleSubscribeOnly}
                        okText={gLang('feedback.recommendation.confirmOk')}
                        cancelText={gLang('feedback.recommendation.confirmCancel')}
                    >
                        <Button
                            icon={<BellOutlined />}
                            loading={actionLoading}
                            size="small"
                            style={{ borderRadius: 6 }}
                        >
                            {gLang('feedback.recommendation.subscribeOnly')}
                        </Button>
                    </Popconfirm>
                    <Popconfirm
                        title={gLang('feedback.recommendation.confirmDismissTitle')}
                        description={gLang('feedback.recommendation.confirmDismissDesc')}
                        onConfirm={handleDismiss}
                        okText={gLang('feedback.recommendation.confirmOk')}
                        cancelText={gLang('feedback.recommendation.confirmCancel')}
                    >
                        <Button
                            type="text"
                            icon={<CloseOutlined />}
                            loading={actionLoading}
                            size="small"
                            style={{ borderRadius: 6, color: subtitleColor }}
                        >
                            {gLang('feedback.recommendation.dismissAction')}
                        </Button>
                    </Popconfirm>
                </div>

                {/* 风险提示 */}
                <div style={{ paddingLeft: 30, marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: warningColor }}>
                        {gLang('feedback.recommendation.closeWarning')}
                    </Text>
                </div>
            </Card>

            {/* 编辑后发布弹层 */}
            <PublishFromTicketModal
                open={publishModalOpen}
                onClose={() => setPublishModalOpen(false)}
                recommendationId={card.recommendationId}
                feedbackTid={feedbackTid}
                feedbackTitle={feedbackTitle || ''}
                initialContent={card.draftContent}
                initialFiles={card.draftAttachments}
                onSuccess={handlePublishFromModal}
            />
        </>
    );
};

export default SourceTicketActionCard;
