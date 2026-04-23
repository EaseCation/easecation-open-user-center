import React, { useEffect, useState } from 'react';
import { Card, Button, Tag, Typography, Space, Skeleton, Popconfirm, message } from 'antd';
import { LinkOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { fetchData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import useDarkMode from '@common/hooks/useDarkMode';
import { RecommendationStatus } from '@ecuc/shared/types/ticket.types';

const { Text } = Typography;

interface LinkedRecommendationCardProps {
    tid: number;
    /** 变化时重新拉取数据（如 ticket 刷新后传入新值） */
    refreshKey?: string | number;
    onRevoke?: () => void;
}

interface AdminRecommendationResult {
    recommendation: {
        id: number;
        source_tid: number;
        target_feedback_tid: number;
        status: RecommendationStatus;
        entry_from: string;
        auto_close_at: string | null;
        created_at: string;
        match_score: number;
    };
    feedbackTitle: string;
    feedbackStatus: string;
}

const STATUS_COLOR: Record<string, string> = {
    PENDING: 'orange',
    VIEWED: 'blue',
    ACCEPTED_PUBLISH: 'green',
    ACCEPTED_SUBSCRIBE_ONLY: 'cyan',
    EXPIRED: 'default',
};

const LinkedRecommendationCard: React.FC<LinkedRecommendationCardProps> = ({
    tid,
    refreshKey,
    onRevoke,
}) => {
    const isDarkMode = useDarkMode();
    const [data, setData] = useState<AdminRecommendationResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState(false);
    const [revoked, setRevoked] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setRevoked(false);
        fetchData({
            url: '/ticket/admin/recommendation',
            method: 'GET',
            data: { sourceTid: tid },
            setData: (res: any) => {
                if (!cancelled) {
                    setData(res?.result ?? null);
                }
            },
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [tid, refreshKey]);

    if (loading) {
        return (
            <Card size="small" style={{ borderRadius: 8 }}>
                <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
        );
    }

    if (!data || revoked) return null;

    const { recommendation: rec, feedbackTitle } = data;
    const statusColor = STATUS_COLOR[rec.status] || 'default';
    const statusText = gLang(`feedback.recStatus.${rec.status}`) || rec.status;
    const entryLabel = gLang(`feedback.recEntry.${rec.entry_from}`) || rec.entry_from;
    const canRevoke = rec.status === 'PENDING' || rec.status === 'VIEWED';

    const handleRevoke = async () => {
        setRevoking(true);
        try {
            await fetchData({
                url: '/ticket/admin/recommendation/revoke',
                method: 'POST',
                data: { recommendationId: rec.id },
                setData: () => {
                    messageApi.success(gLang('feedback.adminRevokeSuccess'));
                    setRevoked(true);
                    onRevoke?.();
                },
            });
        } catch {
            messageApi.error(gLang('feedback.adminRevokeFailed'));
        } finally {
            setRevoking(false);
        }
    };

    const daysLeft = rec.auto_close_at
        ? Math.max(0, Math.ceil((new Date(rec.auto_close_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    const borderColor = isDarkMode ? '#1e3a5f' : '#d6e4ff';
    const bgColor = isDarkMode ? '#0f172a' : '#f0f5ff';

    return (
        <>
            {contextHolder}
            <Card
                size="small"
                style={{
                    borderRadius: 8,
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                }}
                styles={{ body: { padding: '12px 16px' } }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <Space size="small" wrap>
                        <LinkOutlined style={{ color: '#1677ff' }} />
                        <Text strong style={{ fontSize: 13 }}>
                            {gLang('feedback.linkedToFeedback')}
                        </Text>
                        <a
                            href={`/feedback/manage/${rec.target_feedback_tid}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 13 }}
                        >
                            {feedbackTitle} (#{rec.target_feedback_tid})
                        </a>
                        <Tag color={statusColor} style={{ margin: 0 }}>
                            {statusText}
                        </Tag>
                        <Tag style={{ margin: 0, fontSize: 11 }}>
                            {entryLabel}
                        </Tag>
                        {daysLeft != null && daysLeft > 0 && canRevoke && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                <ClockCircleOutlined style={{ marginRight: 3 }} />
                                {daysLeft}{gLang('feedback.daysToAutoClose')}
                            </Text>
                        )}
                    </Space>

                    {canRevoke && (
                        <Popconfirm
                            title={gLang('feedback.adminRevokeConfirmTitle')}
                            description={gLang('feedback.adminRevokeConfirmDesc')}
                            onConfirm={handleRevoke}
                            okText={gLang('feedback.adminRevokeConfirmOk')}
                            cancelText={gLang('feedback.adminLinkConfirmCancel')}
                        >
                            <Button
                                type="text"
                                danger
                                size="small"
                                icon={<CloseCircleOutlined />}
                                loading={revoking}
                            >
                                {gLang('feedback.adminRevokeAction')}
                            </Button>
                        </Popconfirm>
                    )}
                </div>
            </Card>
        </>
    );
};

export default LinkedRecommendationCard;
