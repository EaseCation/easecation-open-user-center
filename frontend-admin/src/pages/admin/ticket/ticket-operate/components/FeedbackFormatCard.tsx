// FB (Feedback/GU) 工单工具卡：顶部保留视图切换与 Jira 入口，元信息编辑区常驻展开，反馈线程与官方回复区在下方。

import React, { useState, useRef, useMemo, useLayoutEffect, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    Button,
    Space,
    Form,
    theme,
    Spin,
    message,
    Select,
    Input,
    Segmented,
    Modal,
    Tooltip,
} from 'antd';
import {
    MessageOutlined,
    SendOutlined,
    LinkOutlined,
    SettingOutlined,
    ArrowLeftOutlined,
    LockOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import axiosInstance, { fetchData, submitData } from '@common/axiosConfig';
import { Ticket, TicketType, Feedback } from '@ecuc/shared/types/ticket.types';
import { StaffAlias } from '@ecuc/shared/types/staff.types';
import { gLang } from '@common/language';
import isPC from '@common/hooks/useIsPC';
import useDarkMode from '@common/hooks/useDarkMode';
import { useAuth } from '@common/contexts/AuthContext';
import { useUploadProps } from '@common/utils/uploadUtils';
import {
    notifyTicketStatusUpdate,
    notifyTicketCountUpdate,
} from '@common/hooks/useTicketStatusUpdate';
import { TicketStatus } from '@ecuc/shared/types/ticket.types';
import MarkdownEditor from '@common/components/MarkdownEditor/MarkdownEditor';
import Upload from 'antd/es/upload';
import { UploadOutlined } from '@ant-design/icons';
import { FeedbackDetailEditModal } from './FeedbackDetailEditModal';
import FeedbackContent from '@common/components/Feedback/FeedbackContent';
import FeedbackJiraCard from './FeedbackJiraCard';
import { AIPolishButton, type AIPolishButtonRef } from './AIPolishButton';
import FeedbackMetaPanel from './FeedbackMetaPanel';
import FeedbackAdvancedSettingsModal from './FeedbackAdvancedSettingsModal';

const STORAGE_KEY_REPLY_IDENTITY = 'feedback_official_reply_identity';
const STORAGE_KEY_REPLY_IDENTITY_OTHER = 'feedback_official_reply_identity_other';
const REPLY_IDENTITY_KEYS = ['manage', 'service', 'dev', 'other'] as const;
type ReplyIdentityType = (typeof REPLY_IDENTITY_KEYS)[number];

function getReplyIdentityLabel(key: ReplyIdentityType): string {
    const map = {
        manage: 'admin.feedbackFormatManage',
        service: 'admin.feedbackFormatService',
        dev: 'admin.feedbackFormatDev',
        other: 'admin.feedbackFormatOther',
    } as const;
    return gLang(map[key]);
}

function loadStoredReplyIdentity(): ReplyIdentityType {
    const v = localStorage.getItem(STORAGE_KEY_REPLY_IDENTITY);
    if (v && REPLY_IDENTITY_KEYS.includes(v as ReplyIdentityType)) return v as ReplyIdentityType;
    return 'manage';
}

function loadStoredReplyIdentityOther(): string {
    const v = localStorage.getItem(STORAGE_KEY_REPLY_IDENTITY_OTHER);
    return typeof v === 'string' ? v : '';
}

// FeedbackContent uses fadeInUp animation; inject keyframes so content is visible in admin (no global style there)
const FADE_IN_UP_STYLE_ID = 'feedbackFormatFadeInUp';
if (typeof document !== 'undefined' && !document.getElementById(FADE_IN_UP_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = FADE_IN_UP_STYLE_ID;
    style.innerHTML = `@keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(style);
}

interface FeedbackFormatCardProps {
    ticket?: Ticket;
    onRefresh?: () => void;
    /** When true, show feedback-format thread + reply in this card and parent hides TicketDetailComponent */
    feedbackFormatEnabled: boolean;
    setFeedbackFormatEnabled: (v: boolean) => void;
    forceShow?: boolean;
    onFeedbackDetailLoaded?: (feedback: Feedback) => void;
}

export const FeedbackFormatCard: React.FC<FeedbackFormatCardProps> = ({
    ticket,
    onRefresh,
    feedbackFormatEnabled,
    setFeedbackFormatEnabled,
    onFeedbackDetailLoaded,
}) => {
    const isDesktop = isPC();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isDarkMode = useDarkMode();
    const { useToken } = theme;
    const { token } = useToken();
    const [form] = Form.useForm();
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [replyingToDetailId, setReplyingToDetailId] = useState<number | null>(null);
    const [jiraModalOpen, setJiraModalOpen] = useState(false);
    const [advancedModalOpen, setAdvancedModalOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [metaRefreshSignal, setMetaRefreshSignal] = useState(0);
    const [filterType, setFilterType] = useState<'all' | 'official'>('all');
    const [replyAsNote, setReplyAsNote] = useState(false);
    const [replyIdentity, setReplyIdentityState] =
        useState<ReplyIdentityType>(loadStoredReplyIdentity);
    const [replyIdentityOther, setReplyIdentityOtherState] = useState(loadStoredReplyIdentityOther);
    const [messageApi, contextHolder] = message.useMessage();
    const replyFormRef = useRef<HTMLDivElement>(null);
    const aiPolishRef = useRef<AIPolishButtonRef>(null);
    const [placeholderOverride, setPlaceholderOverride] = useState<string | null>(null);

    const setReplyIdentity = useCallback((v: ReplyIdentityType) => {
        setReplyIdentityState(v);
        localStorage.setItem(STORAGE_KEY_REPLY_IDENTITY, v);
    }, []);

    const setReplyIdentityOther = useCallback((v: string) => {
        setReplyIdentityOtherState(v);
        localStorage.setItem(STORAGE_KEY_REPLY_IDENTITY_OTHER, v);
    }, []);
    const [aliases, setAliases] = useState<StaffAlias[]>([]);
    const [currentAliasId, setCurrentAliasId] = useState<number | null>(null);
    const [loadingAliases, setLoadingAliases] = useState(false);
    const cardIndexRef = useRef(0);
    /** Fetched from GET /feedback/detail for 楼中楼 + markdown (same as user side) */
    const [feedbackDetail, setFeedbackDetail] = useState<Feedback | null>(null);
    const [feedbackDetailLoading, setFeedbackDetailLoading] = useState(false);
    const [detailEditModalOpen, setDetailEditModalOpen] = useState(false);
    const [detailEditId, setDetailEditId] = useState<number | null>(null);

    const { uploadProps, contextHolder: uploadContextHolder } = useUploadProps(
        10,
        uploadedFiles,
        setUploadedFiles,
        setIsUploading
    );

    const loadFeedbackDetail = useCallback(() => {
        if (!ticket?.tid || ticket.type !== TicketType.Feedback) return;
        setFeedbackDetailLoading(true);
        fetchData({
            url: '/feedback/detail',
            method: 'GET',
            data: { tid: ticket.tid },
            setData: (data: Feedback) => {
                setFeedbackDetail(data);
                onFeedbackDetailLoaded?.(data);
            },
        })
            .catch(err => {
                messageApi.error(err?.message || gLang('admin.feedbackFormatLoadFailed'));
            })
            .finally(() => setFeedbackDetailLoading(false));
    }, [ticket?.tid, ticket?.type]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await (onRefresh?.() as unknown as Promise<void>);
            loadFeedbackDetail();
            setMetaRefreshSignal(prev => prev + 1);
        } finally {
            setRefreshing(false);
        }
    }, [onRefresh, loadFeedbackDetail]);

    useEffect(() => {
        if (feedbackFormatEnabled && ticket?.tid && ticket?.type === TicketType.Feedback) {
            loadFeedbackDetail();
        } else {
            setFeedbackDetail(null);
        }
    }, [feedbackFormatEnabled, ticket?.tid, ticket?.type, loadFeedbackDetail]);

    // Alias list and current alias (same as TicketReplyForm)
    useEffect(() => {
        const fetchAliases = async () => {
            if (!user?.userid || !ticket?.tid) return;
            setLoadingAliases(true);
            try {
                const response = await axiosInstance.get('/staff/alias');
                const aliasesList: StaffAlias[] = response.data?.aliases ?? [];
                setAliases(aliasesList);
                if (ticket?.staff_alias) {
                    try {
                        const staffAliasDict =
                            typeof ticket.staff_alias === 'string'
                                ? JSON.parse(ticket.staff_alias)
                                : ticket.staff_alias;
                        const currentUid = String(user.userid);
                        const aliasIdInDict = staffAliasDict[currentUid];
                        if (aliasIdInDict !== undefined) {
                            if (aliasIdInDict === 0) {
                                setCurrentAliasId(0);
                            } else {
                                const aliasExists = aliasesList.find(a => a.id === aliasIdInDict);
                                if (aliasExists) setCurrentAliasId(aliasIdInDict);
                                else {
                                    const defaultAlias = aliasesList.find(a => a.is_default);
                                    if (defaultAlias) setCurrentAliasId(defaultAlias.id);
                                }
                            }
                        } else {
                            const defaultAlias = aliasesList.find(a => a.is_default);
                            if (defaultAlias) setCurrentAliasId(defaultAlias.id);
                        }
                    } catch {
                        const defaultAlias = aliasesList.find(a => a.is_default);
                        if (defaultAlias) setCurrentAliasId(defaultAlias.id);
                    }
                } else {
                    const defaultAlias = aliasesList.find(a => a.is_default);
                    if (defaultAlias) setCurrentAliasId(defaultAlias.id);
                }
            } finally {
                setLoadingAliases(false);
            }
        };
        fetchAliases();
    }, [ticket?.tid, ticket?.staff_alias, user?.userid]);

    if (!ticket || ticket.type !== TicketType.Feedback) return null;

    const detailsForFloor = (feedbackDetail ?? ticket).details ?? [];
    const detailIdToFloor: Record<number, number> = {};
    if (detailsForFloor.length > 0) detailIdToFloor[detailsForFloor[0].id] = 1;
    const topLevelReplies = detailsForFloor
        .slice(1)
        .filter((d: { parentDetailId?: number }) => d.parentDetailId == null);
    topLevelReplies.forEach((r: { id: number }, i: number) => {
        detailIdToFloor[r.id] = i + 2;
    });

    // Use feedbackDetail when available so details include operator (e.g. 优雅) from GET /feedback/detail; parent ticket may come from another API without it.
    const feedbackTicket: Feedback = useMemo(() => {
        const src = feedbackDetail ?? ticket;
        const t = src as Ticket & {
            publicTags?: Feedback['publicTags'];
            internalTags?: Feedback['internalTags'];
            progressTag?: Feedback['progressTag'];
            feedbackType?: 'SUGGESTION' | 'BUG';
            lastReplyTime?: string | null;
            replyCount?: number;
        };
        const details = feedbackDetail?.details ?? t.details;
        return {
            ...t,
            details,
            publicTags: t.publicTags ?? [],
            internalTags: t.internalTags ?? [],
            progressTag: t.progressTag ?? null,
            feedbackType: t.feedbackType ?? 'SUGGESTION',
            lastReplyTime: t.lastReplyTime ?? null,
            replyCount: t.replyCount ?? t.details?.length ?? 0,
        } as Feedback;
    }, [feedbackDetail, ticket]);

    useLayoutEffect(() => {
        if (feedbackFormatEnabled) cardIndexRef.current = 0;
    }, [feedbackFormatEnabled, ticket?.tid]);

    const handleReply = async (values: { details?: string }) => {
        const tid = ticket?.tid;
        if (!tid || !values.details?.trim()) return;

        const identityStr =
            replyIdentity === 'other'
                ? replyIdentityOther.trim() || getReplyIdentityLabel('other')
                : getReplyIdentityLabel(replyIdentity);
        const body: {
            tid: number;
            details: string;
            files: string[];
            parent_detail_id?: number;
            identity: string;
            type?: 'note';
        } = {
            tid,
            details: values.details.trim(),
            files: uploadedFiles,
            identity: identityStr,
        };
        if (replyingToDetailId != null) body.parent_detail_id = replyingToDetailId;
        if (replyAsNote) body.type = 'note';
        await submitData({
            data: body,
            url: '/feedback/admin/reply',
            method: 'POST',
            successMessage: 'ticketOperate.success',
            setIsFormDisabled,
            setIsModalOpen: () => {},
        });
        setUploadedFiles([]);
        form.resetFields();
        setReplyingToDetailId(null);
        notifyTicketStatusUpdate(Number(tid), TicketStatus.WaitingReply);
        notifyTicketCountUpdate();
        await onRefresh?.();
        loadFeedbackDetail();
    };

    const handleSetFeatured = async (detailId: number) => {
        if (!ticket?.tid) return;
        await submitData({
            data: { tid: ticket.tid, detail_id: detailId },
            url: '/feedback/admin/set-featured',
            method: 'POST',
            successMessage: 'feedback.setFeaturedSuccess',
            setIsFormDisabled: () => {},
            setIsModalOpen: () => {},
        });
        loadFeedbackDetail();
        onRefresh?.();
    };

    const handleEditDetail = (detailId: number) => {
        setDetailEditId(detailId);
        setDetailEditModalOpen(true);
    };

    const handleProgressChanged = useCallback(
        (newTag: { name: string } | null, oldTag: { name: string } | null) => {
            onRefresh?.();
            loadFeedbackDetail();
            // 滚动到回复区域并自动触发 AI 润色
            const noneLabel = gLang('admin.feedbackProgressNone');
            const oldName = oldTag?.name ?? noneLabel;
            const newName = newTag?.name ?? noneLabel;
            const text = gLang('admin.feedbackProgressNotice', { oldName, newName });
            setTimeout(() => {
                replyFormRef.current?.scrollIntoView({ behavior: 'auto' });
                setTimeout(() => {
                    aiPolishRef.current?.polishText(text);
                }, 400);
            }, 100);
        },
        [onRefresh]
    );

    const mobileContainerStyle: React.CSSProperties = {};

    return (
        <div style={mobileContainerStyle}>
            {uploadContextHolder}
            {contextHolder}
            <FeedbackDetailEditModal
                open={detailEditModalOpen}
                detailId={detailEditId}
                onClose={() => {
                    setDetailEditModalOpen(false);
                    setDetailEditId(null);
                }}
                onSaved={() => {
                    loadFeedbackDetail();
                    onRefresh?.();
                }}
            />
            <Card
                size="small"
                title={
                    !isDesktop ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Button
                                size="small"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate('/feedback')}
                                style={{
                                    height: 24,
                                    paddingInline: 8,
                                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                                    borderRadius: 8,
                                }}
                                type="default"
                            >
                                {gLang('common.back')}
                            </Button>
                            <Button
                                size="small"
                                icon={<LinkOutlined />}
                                onClick={() => setJiraModalOpen(true)}
                                style={{
                                    height: 24,
                                    paddingInline: 8,
                                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                                    borderRadius: 8,
                                }}
                                type="default"
                            >
                                {gLang('feedback.jira.button')}
                            </Button>
                            <Button
                                size="small"
                                icon={<SettingOutlined />}
                                onClick={() => setAdvancedModalOpen(true)}
                                style={{
                                    height: 24,
                                    paddingInline: 8,
                                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                                    borderRadius: 8,
                                }}
                                type="default"
                            >
                                {gLang('feedback.settings')}
                            </Button>
                            <Button
                                size="small"
                                icon={<ReloadOutlined />}
                                loading={refreshing}
                                onClick={handleRefresh}
                                style={{
                                    height: 24,
                                    paddingInline: 8,
                                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                                    borderRadius: 8,
                                }}
                                type="default"
                            />
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Button
                                size="small"
                                icon={<LinkOutlined />}
                                onClick={() => setJiraModalOpen(true)}
                                style={{
                                    height: 28,
                                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                                    borderRadius: 8,
                                }}
                                type="default"
                            >
                                {gLang('feedback.jira.button')}
                            </Button>
                            <Button
                                size="small"
                                icon={<SettingOutlined />}
                                onClick={() => setAdvancedModalOpen(true)}
                                style={{
                                    height: 28,
                                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                                    borderRadius: 8,
                                }}
                                type="default"
                            >
                                {gLang('feedback.settings')}
                            </Button>
                            <Button
                                size="small"
                                icon={<ReloadOutlined />}
                                loading={refreshing}
                                onClick={handleRefresh}
                                style={{
                                    height: 28,
                                    border: `1px solid ${isDarkMode ? '#303030' : '#d9d9d9'}`,
                                    borderRadius: 8,
                                }}
                                type="default"
                            />
                        </div>
                    )
                }
                extra={
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0,
                            maxWidth: isDesktop ? undefined : 150,
                            overflowX: 'auto',
                        }}
                    >
                        <Segmented
                            value={feedbackFormatEnabled}
                            onChange={setFeedbackFormatEnabled}
                            options={[
                                {
                                    label: gLang('ticketOperate.feedbackFormat.normalStyle'),
                                    value: false,
                                },
                                {
                                    label: gLang('ticketOperate.feedbackFormat.feedbackStyle'),
                                    value: true,
                                },
                            ]}
                            size="small"
                            style={{ borderRadius: 6 }}
                        />
                    </div>
                }
                style={{
                    background: isDarkMode ? '#141414' : '#ffffff',
                    borderRadius: 8,
                    border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                    marginBottom: 8,
                    boxShadow: 'none',
                }}
                styles={{
                    header: {
                        padding: isDesktop ? '10px 16px' : '8px 12px',
                        borderBottom: 'none',
                    },
                    body: {
                        padding: isDesktop ? '12px 16px 14px' : '12px',
                    },
                }}
            >
                <Space direction="vertical" style={{ width: '100%' }} size={isDesktop ? 2 : 0}>
                    <FeedbackMetaPanel
                        tid={ticket.tid}
                        currentStatus={ticket.status}
                        refreshSignal={metaRefreshSignal}
                        onSaved={() => {
                            onRefresh?.();
                            loadFeedbackDetail();
                        }}
                        onProgressChanged={handleProgressChanged}
                        compact
                    />
                </Space>
            </Card>
            <Modal
                open={jiraModalOpen}
                title={gLang('feedback.jira.title')}
                onCancel={() => setJiraModalOpen(false)}
                footer={null}
                width={900}
                destroyOnClose
            >
                <FeedbackJiraCard tid={ticket.tid} displayMode="embedded" />
            </Modal>
            <FeedbackAdvancedSettingsModal
                open={advancedModalOpen}
                tid={ticket.tid}
                onClose={() => setAdvancedModalOpen(false)}
                onSaved={() => {
                    onRefresh?.();
                    loadFeedbackDetail();
                }}
            />
            {feedbackFormatEnabled && (
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <Spin spinning={feedbackDetailLoading}>
                        {feedbackDetail != null ? (
                            <FeedbackContent
                                ticket={feedbackTicket}
                                isSpinning={feedbackDetailLoading}
                                filterType={filterType}
                                onFilterChange={setFilterType}
                                canReply={true}
                                onReplyTo={detailId => setReplyingToDetailId(detailId)}
                                onReply={handleReply}
                                onCancelReply={() => setReplyingToDetailId(null)}
                                replyingToDetailId={replyingToDetailId}
                                isFormDisabled={isFormDisabled}
                                onSetFeatured={handleSetFeatured}
                                onEditDetail={handleEditDetail}
                                animationDelay={0}
                                cardIndex={cardIndexRef}
                                subscribed={undefined}
                                primaryOpenid={undefined}
                                isUpdatingSubscription={false}
                                onSubscriptionChange={(_openid: string, _checked: boolean) => {}}
                                useAdminHtml
                            />
                        ) : (
                            <div
                                style={{
                                    minHeight: 120,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: token.colorTextSecondary,
                                }}
                            >
                                {feedbackDetailLoading
                                    ? gLang('admin.feedbackFormatLoading')
                                    : gLang('feedback.noContent')}
                            </div>
                        )}
                    </Spin>
                    <Card
                        ref={replyFormRef as any}
                        size="small"
                        style={{
                            background: isDarkMode ? '#141414' : '#ffffff',
                            borderRadius: 8,
                            border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                        }}
                        title={
                            <Space>
                                <MessageOutlined />
                                <span>{gLang('feedback.officialReply')}</span>
                                {replyingToDetailId != null && (
                                    <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
                                        {(() => {
                                            const allDetails = [...(feedbackTicket.details || [])];
                                            const repliedComment = allDetails.find(
                                                d => d.id === replyingToDetailId
                                            );
                                            if (repliedComment) {
                                                return gLang('feedback.replyToUser').replace(
                                                    '{user}',
                                                    repliedComment.displayTitle || ''
                                                );
                                            }
                                            return '';
                                        })()}
                                        <Button
                                            type="link"
                                            size="small"
                                            onClick={() => setReplyingToDetailId(null)}
                                        >
                                            {gLang('feedback.cancelReply')}
                                        </Button>
                                    </span>
                                )}
                            </Space>
                        }
                    >
                        <Form
                            form={form}
                            onFinish={handleReply}
                            layout="vertical"
                            disabled={isFormDisabled}
                        >
                            <Form.Item noStyle shouldUpdate={() => true}>
                                <Space wrap size="small" style={{ marginBottom: 12 }}>
                                    <Select
                                        size="small"
                                        value={replyIdentity}
                                        onChange={setReplyIdentity}
                                        options={REPLY_IDENTITY_KEYS.map(k => ({
                                            value: k,
                                            label: getReplyIdentityLabel(k),
                                        }))}
                                        style={{ width: 80 }}
                                    />
                                    {replyIdentity === 'other' && (
                                        <Input
                                            size="small"
                                            value={replyIdentityOther}
                                            onChange={e => setReplyIdentityOther(e.target.value)}
                                            placeholder={gLang(
                                                'feedback.replyIdentityOtherPlaceholder'
                                            )}
                                            style={{ width: 100 }}
                                            maxLength={20}
                                        />
                                    )}
                                    {aliases.length > 0 && (
                                        <Select
                                            size="small"
                                            style={{ width: 160 }}
                                            value={currentAliasId}
                                            onChange={async (aliasId: number) => {
                                                if (!ticket?.tid) return;
                                                try {
                                                    await axiosInstance.post('/ticket/admin', {
                                                        tid: ticket.tid,
                                                        action: 'updateAlias',
                                                        details: aliasId,
                                                    });
                                                    setCurrentAliasId(aliasId);
                                                    onRefresh?.();
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                            loading={loadingAliases}
                                            options={[
                                                {
                                                    value: 0,
                                                    label: gLang('ticketOperate.hideStaffName'),
                                                },
                                                ...aliases.map(a => ({
                                                    value: a.id,
                                                    label: `${a.alias}${a.is_default ? gLang('admin.feedbackFormatDefault') : ''}`,
                                                })),
                                            ]}
                                        />
                                    )}
                                </Space>
                            </Form.Item>
                            <Form.Item
                                name="details"
                                rules={[{ required: true, message: gLang('required') }]}
                            >
                                <MarkdownEditor
                                    placeholder={placeholderOverride || gLang('ticketDetail.additionIntro')}
                                    maxLength={2000}
                                    minRows={3}
                                    maxRows={5}
                                />
                            </Form.Item>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <AIPolishButton
                                    ref={aiPolishRef}
                                    tid={ticket?.tid?.toString()}
                                    form={form}
                                    setPlaceholderOverride={setPlaceholderOverride}
                                />
                                <Tooltip title={gLang('feedback.replyAsNoteTooltip')}>
                                    <Button
                                        size="small"
                                        icon={<LockOutlined />}
                                        type={replyAsNote ? 'primary' : 'default'}
                                        onClick={() => {
                                            setReplyAsNote(v => !v);
                                            if (!replyAsNote) setReplyingToDetailId(null);
                                        }}
                                    >
                                        {gLang('feedback.replyAsNote')}
                                    </Button>
                                </Tooltip>
                            </div>
                            <Form.Item style={{ marginBottom: 0 }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'flex-start',
                                        gap: 8,
                                    }}
                                >
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        disabled={isUploading || isFormDisabled}
                                        size="small"
                                        icon={<SendOutlined />}
                                        style={{ height: 32, padding: '0 16px' }}
                                    >
                                        {replyAsNote ? gLang('feedback.replyAsNote') : gLang('feedback.sendOfficialReply')}
                                    </Button>
                                    <Form.Item
                                        name="files"
                                        valuePropName="fileList"
                                        getValueFromEvent={e =>
                                            Array.isArray(e) ? e : e?.fileList || []
                                        }
                                        noStyle
                                    >
                                        <Upload {...uploadProps}>
                                            <Button
                                                icon={<UploadOutlined />}
                                                size="small"
                                                loading={isUploading}
                                                disabled={isUploading}
                                                style={{
                                                    height: 32,
                                                }}
                                            >
                                                {gLang('feedback.attachment')}
                                            </Button>
                                        </Upload>
                                    </Form.Item>
                                </div>
                            </Form.Item>
                        </Form>
                    </Card>
                </Space>
            )}
        </div>
    );
};
