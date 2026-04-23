// 反馈中心Card组件 - 用于JY工单处理

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    Card,
    Button,
    Space,
    message,
    Switch,
    Form,
    Input,
    Collapse,
    Tabs,
    Skeleton,
    Tag,
    Typography,
    theme,
    Flex,
    Spin,
    Empty,
    Select,
    Upload,
    Segmented,
    Popconfirm,
    Checkbox,
    Grid,
} from 'antd';
import {
    MessageOutlined,
    PlusOutlined,
    RobotOutlined,
    CrownOutlined,
    SearchOutlined,
    ClockCircleOutlined,
    UploadOutlined,
    LinkOutlined,
} from '@ant-design/icons';
import { fetchData } from '@common/axiosConfig';
import {
    Ticket,
    TicketDetail,
    TicketAction,
    FeedbackListItemDto,
    TicketType,
} from '@ecuc/shared/types/ticket.types';
import { gLang } from '@common/language';
import useDarkMode from '@common/hooks/useDarkMode';
import MarkdownEditor from '@common/components/MarkdownEditor/MarkdownEditor';
import { convertUTCToFormat } from '@common/components/TimeConverter';
import { ltransTicketStatusColor, ltransTicketStatusForUser } from '@common/languageTrans';
import FeedbackTagGroup from '@common/components/Feedback/FeedbackTagGroup';
import FeedbackTagSelect from '@common/components/Feedback/FeedbackTagSelect';
import { getUploadProps } from '@common/utils/uploadUtils';
import {
    getFeedbackCenterActionWrapperStyle,
    getFeedbackCenterTitleBarStyle,
    getFeedbackCenterTitleMainStyle,
    getReplyHeaderLayoutStyle,
    getReplyHeaderMetaStyle,
    getReplyHeaderTimeStyle,
} from './FeedbackCenterCard.layout';

const { TextArea } = Input;
const { Text } = Typography;

// 回复内容区表格/代码块/删除线样式（仅支持 Markdown 解析后的 HTML）
const FEEDBACK_REPLY_CONTENT_STYLE = `
.feedback-reply-content table { border-collapse: collapse; width: 100%; margin: 8px 0; }
.feedback-reply-content th, .feedback-reply-content td { border: 1px solid #d9d9d9; padding: 6px 8px; text-align: left; }
.feedback-reply-content th { background: rgba(0,0,0,0.02); font-weight: 600; }
.feedback-reply-content pre { margin: 8px 0; padding: 12px; overflow-x: auto; background: rgba(0,0,0,0.04); border-radius: 6px; border: 1px solid #f0f0f0; }
.feedback-reply-content pre code { padding: 0; background: transparent; }
.feedback-reply-content code { font-family: monospace; font-size: 13px; background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; }
.feedback-reply-content pre code { background: transparent; padding: 0; }
.feedback-reply-content del { text-decoration: line-through; }
[data-theme="dark"] .feedback-reply-content th, [data-theme="dark"] .feedback-reply-content td { border-color: #434343; }
[data-theme="dark"] .feedback-reply-content th { background: rgba(255,255,255,0.04); }
[data-theme="dark"] .feedback-reply-content pre { background: rgba(0,0,0,0.25); border-color: #303030; }
[data-theme="dark"] .feedback-reply-content code { background: rgba(255,255,255,0.08); }
[data-theme="dark"] .feedback-reply-content pre code { background: transparent; }
`;

interface FeedbackCenterCardProps {
    ticket?: Ticket;
    onRefresh?: () => void;
    /** When true and ticket has no AI_MATCH, still render card with manual-open + create tabs (e.g. from card nav on non-JY ticket) */
    forceShowWithoutMatch?: boolean;
}

interface MatchedFeedback {
    tid: number;
    title: string;
    similarity: number;
}

export const FeedbackCenterCard: React.FC<FeedbackCenterCardProps> = ({
    ticket,
    onRefresh,
    forceShowWithoutMatch,
}) => {
    const { useToken } = theme;
    const { token } = useToken();
    const screens = Grid.useBreakpoint();
    const isDarkMode = useDarkMode();
    const isCompactLayout = !screens.sm;
    const isNarrowPreviewHeader = !screens.md;
    const [loading, setLoading] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [rematchLoading, setRematchLoading] = useState(false);
    const [form] = Form.useForm();
    const [previewTickets, setPreviewTickets] = useState<Map<number, Ticket>>(new Map());
    // 手动打开反馈：已加入 card 的 tid 列表
    const [manualOpenTids, setManualOpenTids] = useState<number[]>([]);
    // 手动打开反馈 tab 内的列表数据（与 /feedback/manage 同源 GET /feedback/list，无管理按钮）
    const [feedbackListItems, setFeedbackListItems] = useState<FeedbackListItemDto[]>([]);
    const [feedbackListTotal, setFeedbackListTotal] = useState(0);
    const [feedbackListSpinning, setFeedbackListSpinning] = useState(false);
    const [feedbackListPage, setFeedbackListPage] = useState(1);
    const [feedbackListLoadingMore, setFeedbackListLoadingMore] = useState(false);
    const feedbackListPageSize = 20;
    const feedbackListHasMore = feedbackListPage * feedbackListPageSize < feedbackListTotal;
    const [feedbackSearchKeyword, setFeedbackSearchKeyword] = useState('');
    const [feedbackListType, setFeedbackListType] = useState<string>('');
    const [feedbackListStatus, setFeedbackListStatus] = useState<string[]>([]);
    // 当前选中的 tab（受控），null 表示使用默认
    const [activeTabKey, setActiveTabKey] = useState<string | null>(null);

    // 创建表单附件（可删除/上传）
    const [createAttachments, setCreateAttachments] = useState<string[]>([]);
    const [createIsUploading, setCreateIsUploading] = useState(false);
    // 创建 tab：勾选的原工单回复 detail id（默认全选用户回复）
    const [selectedExcerptIds, setSelectedExcerptIds] = useState<Set<number>>(new Set());

    // 合并表单（match/manual tab 内发布新 detail）
    const [mergeFormShown, setMergeFormShown] = useState(false);
    const [mergeCreatorOpenid, setMergeCreatorOpenid] = useState('');
    const [mergeAttachments, setMergeAttachments] = useState<string[]>([]);
    const [mergeIsUploading, setMergeIsUploading] = useState(false);
    const [mergeSubmitting, setMergeSubmitting] = useState(false);
    const [mergeFeatured, setMergeFeatured] = useState(false);
    // 合并 tab：勾选的原工单回复 detail id
    const [mergeSelectedExcerptIds, setMergeSelectedExcerptIds] = useState<Set<number>>(new Set());
    // 匹配/手动 tab 操作模式：recommend（推荐迁移）| forward（直接转发）
    const [mergeMode, setMergeMode] = useState<'recommend' | 'forward'>('recommend');
    const [mergeForwardInitialized, setMergeForwardInitialized] = useState(false);

    const [adminLinkLoading, setAdminLinkLoading] = useState(false);
    const [adminLinkedTid, setAdminLinkedTid] = useState<number | null>(null);
    // 已存在的关联反馈 tid（从后端获取，用于禁用重复关联按钮）
    const [existingLinkedFeedbackTid, setExistingLinkedFeedbackTid] = useState<number | null>(null);
    const [messageApi, contextHolder] = message.useMessage();

    // 检测是否存在AI_MATCH的内容（取最新一条）
    const aiMatchDetail = useMemo(() => {
        if (!ticket?.details) return null;
        const matches = ticket.details.filter(
            (detail: TicketDetail) => detail.operator === 'AI_MATCH' && detail.action === 'N'
        );
        return matches.length > 0 ? matches[matches.length - 1] : null;
    }, [ticket?.details]);

    // 解析匹配的反馈工单列表
    const matchedFeedbacks = useMemo(() => {
        if (!aiMatchDetail?.content) return [];

        // 解析格式：TID#4: 反馈: 超级战墙303职业技能bug导致游戏体验严重受损 (相似度: 95%)
        const lines = aiMatchDetail.content.split('\n');
        const matches: MatchedFeedback[] = [];

        for (const line of lines) {
            const match = line.match(/TID#(\d+):\s*(.+?)\s*\(相似度:\s*(\d+)%\)/);
            if (match) {
                matches.push({
                    tid: parseInt(match[1]),
                    title: match[2].trim(),
                    similarity: parseInt(match[3]),
                });
            }
        }

        return matches;
    }, [aiMatchDetail]);

    // 原工单可摘录的 reply details（有文本内容或有附件的均可摘录）
    const sourceReplyDetails = useMemo(() => {
        if (!ticket?.details) return [];
        return ticket.details.filter(
            (d: TicketDetail) =>
                (d.action === TicketAction.Reply || d.action === ('R' as any)) &&
                d.operator !== 'AI_MATCH' &&
                d.operator !== 'AUTO_SOLVE' &&
                (d.content || (d.attachments && d.attachments.length > 0))
        );
    }, [ticket?.details]);

    // 获取AI生成的内容（如果存在）
    const [, setAiTitle] = useState<string>('');
    const [, setAiDetails] = useState<string>('');
    const [hasAiContent, setHasAiContent] = useState(false);
    const [createdFeedbackTid, setCreatedFeedbackTid] = useState<number | null>(null);
    const [subscribedFeedbackTid, setSubscribedFeedbackTid] = useState<number | null>(null);

    // 使用ref跟踪已加载的tid，避免useCallback依赖previewTickets
    const loadedTidsRef = useRef<Set<number>>(new Set());
    const initializedCreateFormTidRef = useRef<number | null>(null);

    const defaultUserReplyIds = useMemo(
        () =>
            sourceReplyDetails
                .filter(
                    (d: TicketDetail) =>
                        !d.operator.startsWith('AUTH_UID_') &&
                        d.operator !== 'SYSTEM' &&
                        d.operator !== 'AUTO_SOLVE'
                )
                .map((d: TicketDetail) => d.id),
        [sourceReplyDetails]
    );

    // 加载工单详情用于预览
    const loadTicketPreview = useCallback(async (tid: number) => {
        if (loadedTidsRef.current.has(tid)) {
            return; // 已经加载过
        }

        await fetchData({
            url: `/ticket/detail`,
            method: 'GET',
            data: { tid },
            setData: (response: any) => {
                // 处理epfResponse格式：{ code: 0, data: Ticket }
                const ticketData = response?.data || response;
                if (ticketData) {
                    loadedTidsRef.current.add(tid);
                    setPreviewTickets(prev => {
                        if (prev.has(tid)) return prev; // 避免重复设置
                        return new Map(prev).set(tid, ticketData);
                    });
                }
            },
        });
    }, []);

    // 与服务端一致：keyword 传后端搜索，不再在前端对当前页做过滤，否则只能看到当前页中的匹配条数
    const queryFeedbackList = useCallback(
        (pageNum: number, append: boolean, keyword?: string) => {
            setFeedbackListSpinning(pageNum === 1 && !append);
            setFeedbackListLoadingMore(append && pageNum > 1);
            const params: Record<string, string | number | string[]> = {
                page: String(pageNum),
                pageSize: String(feedbackListPageSize),
                sortBy: 'createTime',
                order: 'desc',
            };
            if (feedbackListStatus.length > 0) params.status = feedbackListStatus;
            if (feedbackListType) params.type = feedbackListType;
            const kw = keyword !== undefined ? keyword : feedbackSearchKeyword.trim() || undefined;
            if (kw != null && kw !== '') params.keyword = kw;
            fetchData({
                url: '/feedback/list',
                method: 'GET',
                data: params,
                setData: (r: { list?: FeedbackListItemDto[]; total?: number }) => {
                    const list = r?.list ?? [];
                    const total = r?.total ?? 0;
                    if (append) setFeedbackListItems(prev => [...prev, ...list]);
                    else setFeedbackListItems(list);
                    setFeedbackListTotal(total);
                },
            }).then(() => {
                setFeedbackListSpinning(false);
                setFeedbackListLoadingMore(false);
                if (!append) setFeedbackListPage(2);
            });
        },
        [feedbackListStatus, feedbackListType, feedbackSearchKeyword]
    );

    // 仅筛选状态变化时刷新列表（不依赖 keyword，避免每次输入都请求）
    useEffect(() => {
        setFeedbackListPage(1);
        queryFeedbackList(1, false);
    }, [feedbackListStatus, feedbackListType]);

    // 关键词防抖 300ms 后请求服务端搜索（跳过首次挂载，避免与上面 effect 重复）
    const feedbackSearchFirstRun = useRef(true);
    const feedbackSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (feedbackSearchFirstRun.current) {
            feedbackSearchFirstRun.current = false;
            return;
        }
        if (feedbackSearchDebounceRef.current) clearTimeout(feedbackSearchDebounceRef.current);
        feedbackSearchDebounceRef.current = setTimeout(() => {
            feedbackSearchDebounceRef.current = null;
            setFeedbackListPage(1);
            queryFeedbackList(1, false, feedbackSearchKeyword.trim() || undefined);
        }, 300);
        return () => {
            if (feedbackSearchDebounceRef.current) clearTimeout(feedbackSearchDebounceRef.current);
        };
    }, [feedbackSearchKeyword, queryFeedbackList]);

    // 组件加载时，自动加载第一个匹配工单的详情
    useEffect(() => {
        if (matchedFeedbacks.length > 0 && !loadedTidsRef.current.has(matchedFeedbacks[0].tid)) {
            loadTicketPreview(matchedFeedbacks[0].tid);
        }
    }, [matchedFeedbacks.length > 0 ? matchedFeedbacks[0].tid : null, loadTicketPreview]);

    useEffect(() => {
        form.resetFields();
        setHasAiContent(false);
        setAiTitle('');
        setAiDetails('');
        setCreatedFeedbackTid(null);
        setSubscribedFeedbackTid(null);
        setActiveTabKey(null);
        setManualOpenTids([]);
        setFeedbackListItems([]);
        setFeedbackListTotal(0);
        setFeedbackListPage(1);
        setFeedbackSearchKeyword('');
        setFeedbackListType('');
        setFeedbackListStatus([]);
        setPreviewTickets(new Map());
        loadedTidsRef.current = new Set();
        setCreateAttachments([]);
        setCreateIsUploading(false);
        setSelectedExcerptIds(new Set());
        setMergeFormShown(false);
        setMergeCreatorOpenid('');
        setMergeAttachments([]);
        setMergeIsUploading(false);
        setMergeSubmitting(false);
        setMergeSelectedExcerptIds(new Set());
        setMergeMode('recommend');
        setMergeForwardInitialized(false);
        setAdminLinkedTid(null);
        setExistingLinkedFeedbackTid(null);
    }, [ticket?.tid, form]);

    // 获取已有的关联状态（ticket 刷新后重新拉取）
    useEffect(() => {
        if (!ticket?.tid) return;
        let cancelled = false;
        setExistingLinkedFeedbackTid(null);
        fetchData({
            url: '/ticket/admin/recommendation',
            method: 'GET',
            data: { sourceTid: ticket.tid },
            setData: (res: any) => {
                if (!cancelled && res?.result?.recommendation) {
                    const rec = res.result.recommendation;
                    if (rec.status === 'PENDING' || rec.status === 'VIEWED') {
                        setExistingLinkedFeedbackTid(rec.target_feedback_tid);
                    }
                }
            },
        });
        return () => {
            cancelled = true;
        };
    }, [ticket?.tid, ticket?.details?.length]);

    // 如果没有AI_MATCH内容，且非强制展示（如从卡片导航在非JY工单打开），则不显示此Card
    // 注意：必须在所有hooks之后进行早期返回
    if (!aiMatchDetail && !forceShowWithoutMatch && ticket?.type !== TicketType.Suggestion) {
        return null;
    }

    // 当切换到标签页时加载工单详情
    const handleTabChange = (activeKey: string) => {
        // 切换 tab 时重置合并表单
        setMergeFormShown(false);
        setMergeCreatorOpenid('');
        setMergeAttachments([]);
        setMergeSelectedExcerptIds(new Set());
        setMergeForwardInitialized(false);
        if (activeKey.startsWith('match-')) {
            const tid = parseInt(activeKey.replace('match-', ''));
            if (!isNaN(tid)) loadTicketPreview(tid);
        } else if (activeKey.startsWith('manual-') && activeKey !== 'manual-picker') {
            const tid = parseInt(activeKey.replace('manual-', ''));
            if (!isNaN(tid)) loadTicketPreview(tid);
        }
    };

    // 反馈状态选项（与 manage 一致）

    const handleAddManualTab = (item: FeedbackListItemDto) => {
        const tid = item.tid;
        if (manualOpenTids.includes(tid)) {
            setActiveTabKey(`manual-${tid}`);
            return;
        }
        const alreadyMatched = matchedFeedbacks.some(m => m.tid === tid);
        if (alreadyMatched) {
            setActiveTabKey(`match-${tid}`);
            return;
        }
        setManualOpenTids(prev => [...prev, tid]);
        loadTicketPreview(tid);
        setActiveTabKey(`manual-${tid}`);
    };

    // AI总结并生成反馈
    const handleAIGenerate = async () => {
        if (!ticket) return;

        setAiGenerating(true);
        try {
            // 调用专门的AI生成反馈接口
            await fetchData({
                url: `/feedback/ai-generate`,
                method: 'GET',
                data: { tid: ticket.tid },
                setData: (response: any) => {
                    // 处理epfResponse格式：{ code: 0, data: { title, details, type?, publicTagIds? } }
                    const data = response?.data || response;
                    if (data?.title && data?.details) {
                        setAiTitle(data.title);
                        setAiDetails(data.details);
                        setHasAiContent(true);

                        // 设置表单默认值（包括AI推断的类型和公开标签）
                        form.setFieldsValue({
                            title: data.title,
                            details: data.details,
                            isPublic: true,
                            type: data.type || 'SUGGESTION',
                            subscriptions: ticket.creator_openid || '',
                            creatorOpenid: ticket.creator_openid || '',
                            publicTagIds: data.publicTagIds ?? [],
                            internalTagIds: [],
                        });

                        messageApi.success(gLang('feedback.aiGenerateComplete'));

                        // 默认只勾选玩家发的消息（排除客服和系统）
                        const userReplies = sourceReplyDetails.filter(
                            (d: TicketDetail) =>
                                !d.operator.startsWith('AUTH_UID_') &&
                                d.operator !== 'SYSTEM' &&
                                d.operator !== 'AUTO_SOLVE'
                        );
                        syncCreateAttachmentsForSelection(
                            new Set(userReplies.map((d: TicketDetail) => d.id))
                        );
                    }
                },
            });
        } catch {
            messageApi.error(gLang('feedback.aiGenerateFailed'));
        } finally {
            setAiGenerating(false);
        }
    };

    // 重新进行 AI 匹配并刷新卡片
    const handleRematchAi = async () => {
        if (!ticket?.tid || !onRefresh) return;
        setRematchLoading(true);
        try {
            await fetchData({
                url: `/ticket/jyRematch?tid=${ticket.tid}`,
                method: 'POST',
                data: {},
                setData: () => {
                    messageApi.success(gLang('feedback.rematchAiSuccess'));
                    onRefresh();
                },
            });
        } catch {
            messageApi.error(gLang('feedback.rematchAiFailed'));
        } finally {
            setRematchLoading(false);
        }
    };

    // 管理员一键发起关联
    const handleAdminLink = async (feedbackTid: number) => {
        if (!ticket?.tid) return;
        setAdminLinkLoading(true);
        try {
            await fetchData({
                url: '/ticket/admin/recommendation',
                method: 'POST',
                data: { sourceTid: ticket.tid, targetFeedbackTid: feedbackTid },
                setData: () => {
                    setAdminLinkedTid(feedbackTid);
                    messageApi.success(gLang('feedback.adminLinkSuccess'));
                    if (onRefresh) onRefresh();
                },
            });
        } catch {
            messageApi.error(gLang('feedback.adminLinkFailed'));
        } finally {
            setAdminLinkLoading(false);
        }
    };

    // 展开合并表单
    const handleMergeRevealForm = (openAdvanced = true) => {
        if (!mergeForwardInitialized) {
            setMergeCreatorOpenid(ticket?.creator_openid || '');
            // 默认只勾选玩家发的消息（排除客服和系统）
            const userReplies = sourceReplyDetails.filter(
                (d: TicketDetail) =>
                    !d.operator.startsWith('AUTH_UID_') &&
                    d.operator !== 'SYSTEM' &&
                    d.operator !== 'AUTO_SOLVE'
            );
            syncMergeAttachmentsForSelection(new Set(userReplies.map((d: TicketDetail) => d.id)));
            setMergeForwardInitialized(true);
        }
        setMergeFormShown(openAdvanced);
    };

    // 加入反馈中心
    const handleCreateFeedback = async () => {
        if (!ticket) {
            return;
        }

        try {
            // 先验证表单
            const values = await form.validateFields();

            setLoading(true);

            // 解析订阅列表
            const subscriptionsList: string[] = values.subscriptions
                ? values.subscriptions
                      .split('\n')
                      .map((line: string) => line.trim())
                      .filter((line: string) => line.length > 0)
                : [];

            // 将勾选的原工单回复追加到内容末尾
            let finalDetails = values.details || '';
            if (selectedExcerptIds.size > 0) {
                const excerpts = sourceReplyDetails
                    .filter((d: TicketDetail) => selectedExcerptIds.has(d.id))
                    .map((d: TicketDetail) => d.content || '')
                    .filter(Boolean);
                if (excerpts.length > 0) {
                    finalDetails +=
                        '\n\n---\n\n' +
                        excerpts.map((c: string) => '> ' + c.replace(/\n/g, '\n> ')).join('\n\n');
                }
            }

            // 使用新接口创建反馈（从工单创建），附件直接由 createAttachments 管理
            await fetchData({
                url: '/feedback/create-from-ticket',
                method: 'POST',
                data: {
                    sourceTid: ticket.tid,
                    title: values.title,
                    details: finalDetails,
                    isPublic: values.isPublic ?? true,
                    files: createAttachments,
                    syncAttachments: false, // 附件由 files 字段直接管理
                    subscriptions: subscriptionsList,
                    publicTagIds: values.publicTagIds ?? [],
                    internalTagIds: values.internalTagIds ?? [],
                    type: values.type || 'SUGGESTION',
                    creatorOpenid: values.creatorOpenid || undefined,
                },
                setData: (response: { tid: number; title: string }) => {
                    if (response?.tid) {
                        setCreatedFeedbackTid(response.tid);
                        messageApi.success(
                            gLang('feedback.createSuccessWithTid', { tid: response.tid })
                        );
                    }
                },
            });

            // 重置表单和状态
            form.resetFields();
            setHasAiContent(false);
            setAiTitle('');
            setAiDetails('');
            const nextSelectedIds = new Set(defaultUserReplyIds);
            setSelectedExcerptIds(nextSelectedIds);
            setCreateAttachments(getSelectedAttachmentPaths(nextSelectedIds));
            form.setFieldsValue({
                isPublic: true,
                type: 'SUGGESTION',
                subscriptions: ticket.creator_openid || '',
                creatorOpenid: ticket.creator_openid || '',
                publicTagIds: [],
                internalTagIds: [],
            });

            // 刷新工单详情（会自动显示新创建的回复）
            if (onRefresh) {
                await onRefresh();
            }
        } catch (error: any) {
            // 如果是表单验证错误，不显示"创建反馈失败"
            if (error?.errorFields) {
                messageApi.error(gLang('feedback.pleaseCheckFormInput'));
                return;
            }
            messageApi.error(gLang('feedback.createFeedbackFailed'));
        } finally {
            setLoading(false);
        }
    };

    // 合并：订阅用户 + 发布新 detail 到已有反馈
    const handleMergeJoin = async (feedbackTid: number) => {
        // 拼接勾选的原工单回复
        const excerpts = sourceReplyDetails
            .filter((d: TicketDetail) => mergeSelectedExcerptIds.has(d.id))
            .map((d: TicketDetail) => d.content || '')
            .filter(Boolean);
        const finalMergeDetails = excerpts.join('\n\n');
        if (!finalMergeDetails && mergeAttachments.length === 0) {
            messageApi.warning(gLang('feedback.contentRequired'));
            return;
        }
        setMergeSubmitting(true);
        try {
            // 1. 订阅用户到反馈
            await fetchData({
                url: '/feedback/subscribe-for-user',
                method: 'POST',
                data: {
                    tid: feedbackTid,
                    targetOpenid: mergeCreatorOpenid || ticket?.creator_openid,
                    sourceTid: ticket?.tid,
                },
                setData: () => {},
            });
            // 2. 以工单发布者身份发布新 detail
            let createdDetailId: number | null = null;
            await fetchData({
                url: '/feedback/admin/reply',
                method: 'POST',
                data: {
                    tid: feedbackTid,
                    details: finalMergeDetails,
                    files: mergeAttachments,
                    authorOpenid: mergeCreatorOpenid || undefined,
                },
                setData: (response: any) => {
                    const data = response?.data || response;
                    if (data?.detailId) {
                        createdDetailId = data.detailId;
                    }
                },
            });

            // 3. 如需要，将该条回复设为精华
            if (mergeFeatured && createdDetailId != null) {
                await fetchData({
                    url: '/feedback/admin/set-featured',
                    method: 'POST',
                    data: {
                        tid: feedbackTid,
                        detail_id: createdDetailId,
                    },
                    setData: () => {},
                });
            }
            setSubscribedFeedbackTid(feedbackTid);
            messageApi.success(gLang('feedback.forwardSuccess'));
            setMergeAttachments([]);
            setMergeFormShown(false);
            setMergeForwardInitialized(false);
            if (onRefresh) onRefresh();
        } catch {
            messageApi.error(gLang('feedback.mergeFailed'));
        } finally {
            setMergeSubmitting(false);
        }
    };

    // 从 detail 附件中提取路径字符串
    const extractAttachmentPaths = (attachments: any[]): string[] => {
        if (!attachments?.length) return [];
        return attachments
            .map(a =>
                typeof a === 'string' ? a : a && typeof a === 'object' ? (a as any).url || '' : ''
            )
            .filter(Boolean);
    };

    const getSelectedAttachmentPaths = useCallback(
        (selectedIds: Set<number>): string[] => {
            const paths = sourceReplyDetails
                .filter((d: TicketDetail) => selectedIds.has(d.id))
                .flatMap((d: TicketDetail) => extractAttachmentPaths(d.attachments || []));
            return Array.from(new Set(paths));
        },
        [sourceReplyDetails]
    );

    const syncCreateAttachmentsForSelection = useCallback(
        (nextSelectedIds: Set<number>) => {
            const previousSelectedPaths = new Set(getSelectedAttachmentPaths(selectedExcerptIds));
            const nextSelectedPaths = getSelectedAttachmentPaths(nextSelectedIds);
            setSelectedExcerptIds(new Set(nextSelectedIds));
            setCreateAttachments(prev => {
                const manualPaths = prev.filter(path => !previousSelectedPaths.has(path));
                return [
                    ...manualPaths,
                    ...nextSelectedPaths.filter(path => !manualPaths.includes(path)),
                ];
            });
        },
        [getSelectedAttachmentPaths, selectedExcerptIds]
    );

    const syncMergeAttachmentsForSelection = useCallback(
        (nextSelectedIds: Set<number>) => {
            const previousSelectedPaths = new Set(
                getSelectedAttachmentPaths(mergeSelectedExcerptIds)
            );
            const nextSelectedPaths = getSelectedAttachmentPaths(nextSelectedIds);
            setMergeSelectedExcerptIds(new Set(nextSelectedIds));
            setMergeAttachments(prev => {
                const manualPaths = prev.filter(path => !previousSelectedPaths.has(path));
                return [
                    ...manualPaths,
                    ...nextSelectedPaths.filter(path => !manualPaths.includes(path)),
                ];
            });
        },
        [getSelectedAttachmentPaths, mergeSelectedExcerptIds]
    );

    useEffect(() => {
        if (!ticket?.tid) {
            return;
        }
        if (initializedCreateFormTidRef.current === ticket.tid) {
            return;
        }

        initializedCreateFormTidRef.current = ticket.tid;
        const nextSelectedIds = new Set(defaultUserReplyIds);
        setSelectedExcerptIds(nextSelectedIds);
        setCreateAttachments(getSelectedAttachmentPaths(nextSelectedIds));
        form.setFieldsValue({
            isPublic: true,
            type: 'SUGGESTION',
            subscriptions: ticket.creator_openid || '',
            creatorOpenid: ticket.creator_openid || '',
            publicTagIds: [],
            internalTagIds: [],
        });
    }, [
        ticket?.tid,
        ticket?.creator_openid,
        defaultUserReplyIds,
        form,
        getSelectedAttachmentPaths,
    ]);

    // 渲染附件列表（可删除）
    const renderAttachmentList = (attachments: string[], setAttachments: (v: string[]) => void) => (
        <Flex wrap="wrap" gap={6} style={{ marginBottom: attachments.length > 0 ? 6 : 0 }}>
            {attachments.map(path => {
                const fileName = path.substring(path.lastIndexOf('/') + 1);
                return (
                    <Tag
                        key={path}
                        closable
                        onClose={() => setAttachments(attachments.filter(a => a !== path))}
                        style={{ margin: 0 }}
                    >
                        {fileName}
                    </Tag>
                );
            })}
        </Flex>
    );

    // 渲染 checkbox 勾选列表（合并场景复用）
    const renderMergeExcerptCheckboxes = () => {
        if (sourceReplyDetails.length === 0) return null;
        return (
            <div
                style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: `1px solid ${isDarkMode ? token.colorBorderSecondary : '#f0f0f0'}`,
                    borderRadius: 6,
                    padding: 8,
                }}
            >
                {sourceReplyDetails.map((d: TicketDetail) => {
                    const isStaff = d.operator.startsWith('AUTH_UID_');
                    const attachPaths = extractAttachmentPaths(d.attachments || []);
                    return (
                        <div
                            key={d.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 8,
                                marginBottom: 6,
                            }}
                        >
                            <Checkbox
                                checked={mergeSelectedExcerptIds.has(d.id)}
                                onChange={e => {
                                    const next = new Set(mergeSelectedExcerptIds);
                                    if (e.target.checked) next.add(d.id);
                                    else next.delete(d.id);
                                    syncMergeAttachmentsForSelection(next);
                                }}
                                style={{ marginTop: 2 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {isStaff ? (
                                    <Tag color="blue" style={{ margin: '0 0 2px', fontSize: 11 }}>
                                        {gLang('feedback.official')}
                                    </Tag>
                                ) : (
                                    <Tag style={{ margin: '0 0 2px', fontSize: 11 }}>
                                        {d.displayTitle ||
                                            gLang('feedback.recommendation.userLabel')}
                                    </Tag>
                                )}
                                <Text
                                    type="secondary"
                                    style={{
                                        fontSize: 12,
                                        display: 'block',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {(d.content || '').substring(0, 120)}
                                    {(d.content || '').length > 120 ? '...' : ''}
                                    {attachPaths.length > 0 && (
                                        <span style={{ marginLeft: 6, color: token.colorPrimary }}>
                                            (+{attachPaths.length}{' '}
                                            {gLang('feedback.recommendation.modalAttachmentLabel')})
                                        </span>
                                    )}
                                </Text>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // 渲染操作区：Segmented 二选一（推荐迁移 / 直接转发）
    const renderMergeCard = (feedbackTid: number) => {
        const mergeUploadProps = getUploadProps(
            10,
            mergeAttachments,
            setMergeAttachments,
            messageApi,
            setMergeIsUploading
        );

        // 已完成状态
        const isLinkedToThis =
            adminLinkedTid === feedbackTid || existingLinkedFeedbackTid === feedbackTid;
        const isLinkedToOther = !isLinkedToThis && existingLinkedFeedbackTid != null;

        if (isLinkedToThis) {
            return (
                <div
                    style={{
                        padding: '8px 12px',
                        background: isDarkMode ? '#162312' : '#f6ffed',
                        border: `1px solid ${isDarkMode ? '#274916' : '#b7eb8f'}`,
                        borderRadius: 4,
                        color: isDarkMode ? '#73d13d' : '#52c41a',
                    }}
                >
                    {gLang('feedback.adminLinkAlreadyLinked')}
                </div>
            );
        }

        if (subscribedFeedbackTid === feedbackTid) {
            return (
                <div
                    style={{
                        padding: '8px 12px',
                        background: isDarkMode ? '#162312' : '#f6ffed',
                        border: `1px solid ${isDarkMode ? '#274916' : '#b7eb8f'}`,
                        borderRadius: 4,
                        color: isDarkMode ? '#73d13d' : '#52c41a',
                    }}
                >
                    <Text style={{ color: 'inherit', display: 'block' }}>
                        {gLang('feedback.forwardSuccess')}
                    </Text>
                    <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                        {gLang('feedback.forwardNextStepHint')}
                    </Text>
                </div>
            );
        }

        return (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* 模式切换 */}
                <Segmented
                    value={mergeMode}
                    onChange={val => {
                        setMergeMode(val as 'recommend' | 'forward');
                        if (val === 'forward' && !mergeForwardInitialized) {
                            handleMergeRevealForm(false);
                        }
                    }}
                    options={[
                        { value: 'recommend', label: gLang('feedback.modeRecommend') },
                        { value: 'forward', label: gLang('feedback.modeForward') },
                    ]}
                    block
                    style={{ marginBottom: 4 }}
                />

                {/* 模式内容 */}
                {mergeMode === 'recommend' ? (
                    <div>
                        <div
                            style={{
                                marginBottom: 12,
                                padding: '10px 12px',
                                borderRadius: 6,
                                background: isDarkMode ? '#111a2c' : '#f0f7ff',
                                border: `1px solid ${isDarkMode ? '#15325b' : '#bae0ff'}`,
                            }}
                        >
                            <Text
                                strong
                                style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                            >
                                {gLang('feedback.modeRecommend')}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                                {gLang('feedback.adminLinkHint')}
                            </Text>
                        </div>
                        {isLinkedToOther ? (
                            <>
                                <Button type="primary" icon={<LinkOutlined />} disabled>
                                    {gLang('feedback.adminLinkAction')}
                                </Button>
                                <Text
                                    type="secondary"
                                    style={{ fontSize: 12, display: 'block', marginTop: 6 }}
                                >
                                    {gLang('feedback.adminLinkOtherLinked')}
                                </Text>
                            </>
                        ) : (
                            <Popconfirm
                                title={gLang('feedback.adminLinkConfirmTitle')}
                                description={gLang('feedback.adminLinkConfirmDesc')}
                                onConfirm={() => handleAdminLink(feedbackTid)}
                                okText={gLang('feedback.adminLinkConfirmOk')}
                                cancelText={gLang('feedback.adminLinkConfirmCancel')}
                            >
                                <Button
                                    type="primary"
                                    icon={<LinkOutlined />}
                                    loading={adminLinkLoading}
                                >
                                    {gLang('feedback.adminLinkAction')}
                                </Button>
                            </Popconfirm>
                        )}
                    </div>
                ) : (
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <div
                            style={{
                                padding: '10px 12px',
                                borderRadius: 6,
                                background: isDarkMode ? '#1f1f1f' : '#fffbe6',
                                border: `1px solid ${isDarkMode ? '#434343' : '#ffe58f'}`,
                            }}
                        >
                            <Text
                                strong
                                style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                            >
                                {gLang('feedback.modeForward')}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                                {gLang('feedback.forwardHint')}
                            </Text>
                            <Text
                                type="secondary"
                                style={{ fontSize: 12, display: 'block', marginTop: 4 }}
                            >
                                {gLang('feedback.forwardStateHint')}
                            </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {gLang('feedback.forwardSelectionSummary')
                                .replace('{count}', String(mergeSelectedExcerptIds.size))
                                .replace('{attachments}', String(mergeAttachments.length))}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {gLang('feedback.forwardDefaultHint')}
                        </Text>
                        {mergeSelectedExcerptIds.size === 0 && mergeAttachments.length === 0 && (
                            <Text type="warning" style={{ fontSize: 12 }}>
                                {gLang('feedback.forwardEmptySelectionHint')}
                            </Text>
                        )}
                        <Space>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => handleMergeJoin(feedbackTid)}
                                loading={mergeSubmitting}
                                disabled={
                                    mergeSelectedExcerptIds.size === 0 &&
                                    mergeAttachments.length === 0
                                }
                            >
                                {gLang('feedback.forwardAction')}
                            </Button>
                        </Space>
                        <Collapse
                            activeKey={mergeFormShown ? ['advanced-forward'] : []}
                            onChange={keys => {
                                const open = Array.isArray(keys)
                                    ? keys.includes('advanced-forward')
                                    : keys === 'advanced-forward';
                                if (open) {
                                    handleMergeRevealForm(true);
                                } else {
                                    setMergeFormShown(false);
                                }
                            }}
                            items={[
                                {
                                    key: 'advanced-forward',
                                    label: gLang('feedback.advancedMergeLabel'),
                                    children: (
                                        <Space
                                            direction="vertical"
                                            style={{ width: '100%' }}
                                            size="small"
                                        >
                                            <div>
                                                <Text strong style={{ fontSize: 12 }}>
                                                    {gLang('feedback.creatorOpenid')}
                                                </Text>
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 11, marginLeft: 6 }}
                                                >
                                                    {gLang('feedback.creatorOpenidMergeHelp')}
                                                </Text>
                                                <Input
                                                    value={mergeCreatorOpenid}
                                                    onChange={e =>
                                                        setMergeCreatorOpenid(e.target.value)
                                                    }
                                                    placeholder="openid"
                                                    size="small"
                                                    style={{ marginTop: 4 }}
                                                />
                                            </div>
                                            {sourceReplyDetails.length > 0 && (
                                                <div>
                                                    <Text
                                                        strong
                                                        style={{
                                                            fontSize: 12,
                                                            display: 'block',
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        {gLang('feedback.excerptFromTicketDetail')}
                                                    </Text>
                                                    {renderMergeExcerptCheckboxes()}
                                                </div>
                                            )}
                                            <div>
                                                <Text
                                                    strong
                                                    style={{ fontSize: 12, marginRight: 8 }}
                                                >
                                                    {gLang('feedback.featured')}
                                                </Text>
                                                <Switch
                                                    size="small"
                                                    checked={mergeFeatured}
                                                    onChange={setMergeFeatured}
                                                />
                                                <Text
                                                    type="secondary"
                                                    style={{ fontSize: 11, marginLeft: 6 }}
                                                >
                                                    {gLang('feedback.mergeFeaturedHelp')}
                                                </Text>
                                            </div>
                                            {mergeAttachments.length > 0 &&
                                                renderAttachmentList(
                                                    mergeAttachments,
                                                    setMergeAttachments
                                                )}
                                            <Upload {...mergeUploadProps} showUploadList={false}>
                                                <Button
                                                    icon={<UploadOutlined />}
                                                    size="small"
                                                    loading={mergeIsUploading}
                                                >
                                                    {gLang('feedback.uploadAttachments')}
                                                </Button>
                                            </Upload>
                                        </Space>
                                    ),
                                },
                            ]}
                        />
                    </Space>
                )}
            </Space>
        );
    };

    // 新建反馈标签页内容
    const renderCreateTab = () => {
        const createUploadProps = getUploadProps(
            10,
            createAttachments,
            setCreateAttachments,
            messageApi,
            setCreateIsUploading
        );
        return (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div
                    style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        background: isDarkMode ? '#111a2c' : '#f0f7ff',
                        border: `1px solid ${isDarkMode ? '#15325b' : '#bae0ff'}`,
                    }}
                >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Text strong>{gLang('feedback.createFlowTitle')}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {gLang('feedback.createFlowDesc')}
                        </Text>
                        <Space wrap>
                            <Button
                                type="default"
                                icon={<RobotOutlined />}
                                onClick={handleAIGenerate}
                                loading={aiGenerating}
                            >
                                {gLang('feedback.aiGenerateFeedback')}
                            </Button>
                            {hasAiContent && (
                                <Text type="success" style={{ fontSize: 12 }}>
                                    {gLang('feedback.aiDraftReady')}
                                </Text>
                            )}
                        </Space>
                    </Space>
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        isPublic: true,
                        type: 'SUGGESTION',
                        subscriptions: ticket?.creator_openid || '',
                        creatorOpenid: ticket?.creator_openid || '',
                        publicTagIds: [],
                        internalTagIds: [],
                    }}
                >
                    {/* 反馈类型 */}
                    <Form.Item name="type" label={gLang('feedback.feedbackTypeLabel')}>
                        <Segmented
                            options={[
                                {
                                    value: 'SUGGESTION',
                                    label: gLang('feedback.typeSuggestion'),
                                },
                                {
                                    value: 'BUG',
                                    label: gLang('feedback.typeBug'),
                                },
                            ]}
                        />
                    </Form.Item>

                    {/* 工单发布者 openid（首条 detail 的身份） */}
                    <Form.Item
                        name="creatorOpenid"
                        label={gLang('feedback.creatorOpenid')}
                        help={gLang('feedback.creatorOpenidCreateHelp')}
                    >
                        <Input placeholder="openid" />
                    </Form.Item>

                    <Form.Item
                        name="title"
                        label={gLang('feedback.formTitle')}
                        rules={[
                            {
                                required: true,
                                message: gLang('feedback.titleRequired'),
                            },
                            { max: 100, message: gLang('feedback.titleMaxLength') },
                        ]}
                    >
                        <Input placeholder={gLang('feedback.feedbackTitlePlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        name="details"
                        label={gLang('feedback.replyMessage')}
                        rules={[
                            {
                                required: true,
                                message: gLang('feedback.contentRequired'),
                            },
                        ]}
                    >
                        <MarkdownEditor
                            placeholder={gLang('feedback.feedbackDetailsPlaceholder')}
                            minRows={4}
                            maxRows={12}
                        />
                    </Form.Item>

                    {/* 原工单回复勾选（默认全选用户回复） */}
                    {sourceReplyDetails.length > 0 && (
                        <Form.Item label={gLang('feedback.excerptFromTicketDetail')}>
                            <div
                                style={{
                                    maxHeight: 240,
                                    overflowY: 'auto',
                                    border: `1px solid ${isDarkMode ? token.colorBorderSecondary : '#f0f0f0'}`,
                                    borderRadius: 6,
                                    padding: 8,
                                }}
                            >
                                {sourceReplyDetails.map((d: TicketDetail) => {
                                    const isStaff = d.operator.startsWith('AUTH_UID_');
                                    const attachPaths = extractAttachmentPaths(d.attachments || []);
                                    return (
                                        <div
                                            key={d.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 8,
                                                marginBottom: 8,
                                                padding: '4px 0',
                                            }}
                                        >
                                            <Checkbox
                                                checked={selectedExcerptIds.has(d.id)}
                                                onChange={e => {
                                                    const next = new Set(selectedExcerptIds);
                                                    if (e.target.checked) next.add(d.id);
                                                    else next.delete(d.id);
                                                    syncCreateAttachmentsForSelection(next);
                                                }}
                                                style={{ marginTop: 2 }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ marginBottom: 2 }}>
                                                    {isStaff ? (
                                                        <Tag
                                                            color="blue"
                                                            style={{
                                                                margin: 0,
                                                                fontSize: 11,
                                                            }}
                                                        >
                                                            {gLang('feedback.official')}
                                                        </Tag>
                                                    ) : (
                                                        <Tag
                                                            style={{
                                                                margin: 0,
                                                                fontSize: 11,
                                                            }}
                                                        >
                                                            {d.displayTitle ||
                                                                gLang(
                                                                    'feedback.recommendation.userLabel'
                                                                )}
                                                        </Tag>
                                                    )}
                                                </div>
                                                <Text
                                                    type="secondary"
                                                    style={{
                                                        fontSize: 12,
                                                        wordBreak: 'break-word',
                                                    }}
                                                >
                                                    {(d.content || '').substring(0, 150)}
                                                    {(d.content || '').length > 150 ? '...' : ''}
                                                    {attachPaths.length > 0 && (
                                                        <span
                                                            style={{
                                                                marginLeft: 6,
                                                                color: token.colorPrimary,
                                                            }}
                                                        >
                                                            (+{attachPaths.length}{' '}
                                                            {gLang(
                                                                'feedback.recommendation.modalAttachmentLabel'
                                                            )}
                                                            )
                                                        </span>
                                                    )}
                                                </Text>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Form.Item>
                    )}

                    {/* 更多设置（默认收起） */}
                    <Collapse
                        size="small"
                        items={[
                            {
                                key: 'more-settings',
                                label: (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {gLang('feedback.moreSettings')}
                                    </Text>
                                ),
                                children: (
                                    <>
                                        <Form.Item
                                            name="isPublic"
                                            label={gLang('feedback.isPublic')}
                                            valuePropName="checked"
                                        >
                                            <Switch
                                                checkedChildren={gLang('feedback.public')}
                                                unCheckedChildren={gLang('feedback.private')}
                                            />
                                        </Form.Item>

                                        <Form.Item label={gLang('feedback.attachmentsLabel')}>
                                            {renderAttachmentList(
                                                createAttachments,
                                                setCreateAttachments
                                            )}
                                            <Upload {...createUploadProps} showUploadList={false}>
                                                <Button
                                                    icon={<UploadOutlined />}
                                                    size="small"
                                                    loading={createIsUploading}
                                                >
                                                    {gLang('feedback.uploadAttachments')}
                                                </Button>
                                            </Upload>
                                        </Form.Item>

                                        <Form.Item
                                            name="publicTagIds"
                                            label={gLang('feedback.publicTag')}
                                            initialValue={[]}
                                        >
                                            <FeedbackTagSelect
                                                admin
                                                scope="PUBLIC"
                                                placeholder={gLang('feedback.selectPublicTag')}
                                                style={{ width: '100%' }}
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            name="internalTagIds"
                                            label={gLang('feedback.internalTag')}
                                            initialValue={[]}
                                        >
                                            <FeedbackTagSelect
                                                admin
                                                allowCreate
                                                scope="INTERNAL"
                                                placeholder={gLang(
                                                    'feedback.selectOrCreateInternalTag'
                                                )}
                                                style={{ width: '100%' }}
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            name="subscriptions"
                                            label={gLang('feedback.subscriptions')}
                                            help={gLang('feedback.subscriptionsHelp')}
                                        >
                                            <TextArea
                                                rows={3}
                                                placeholder={gLang(
                                                    'feedback.subscriptionsPlaceholder'
                                                )}
                                            />
                                        </Form.Item>
                                    </>
                                ),
                            },
                        ]}
                    />
                </Form>

                {/* 创建成功提示 */}
                {createdFeedbackTid && (
                    <div
                        style={{
                            padding: '8px 12px',
                            background: isDarkMode ? '#162312' : '#f6ffed',
                            border: `1px solid ${isDarkMode ? '#274916' : '#b7eb8f'}`,
                            borderRadius: '4px',
                            color: isDarkMode ? '#73d13d' : '#52c41a',
                        }}
                    >
                        {gLang('feedback.createSuccessWithTid', { tid: createdFeedbackTid })}
                    </div>
                )}

                {/* 加入反馈中心按钮 */}
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateFeedback}
                    loading={loading}
                >
                    {gLang('feedback.joinFeedbackCenter')}
                </Button>
            </Space>
        );
    };

    // 简化的回复卡片组件（只看 operator，有 operator 即官方）
    const SimpleReplyCard: React.FC<{ detail: TicketDetail; floorNumber: number }> = ({
        detail,
        floorNumber,
    }) => {
        const hasOperator = !!detail.operator;
        return (
            <Card
                size="small"
                style={{
                    marginBottom: 8,
                    borderRadius: 4,
                    borderLeft: hasOperator ? `3px solid ${token.colorPrimary}` : undefined,
                    background: hasOperator ? (isDarkMode ? '#111a2c' : '#f0f7ff') : undefined,
                }}
                bodyStyle={{ padding: '12px' }}
            >
                <div style={getReplyHeaderLayoutStyle(isNarrowPreviewHeader)}>
                    <div style={getReplyHeaderMetaStyle(isNarrowPreviewHeader)}>
                        <Space wrap>
                            {hasOperator && (
                                <Tag
                                    icon={<CrownOutlined />}
                                    color={token.colorPrimary}
                                    style={{ margin: 0 }}
                                >
                                    {detail.operator}
                                </Tag>
                            )}
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                #{floorNumber}
                                {gLang('feedback.floorSuffix')}
                            </Text>
                        </Space>
                    </div>
                    {detail.create_time && (
                        <Text
                            type="secondary"
                            style={getReplyHeaderTimeStyle(isNarrowPreviewHeader)}
                        >
                            {detail.create_time}
                        </Text>
                    )}
                </div>
                <div
                    style={{ lineHeight: 1.6, wordBreak: 'break-word' }}
                    className="feedback-reply-content"
                    onClick={e => {
                        const target = (e.target as HTMLElement).closest('a');
                        if (!target) return;
                        const href = target.getAttribute('href');
                        if (!href || !href.startsWith('/')) return;
                        e.preventDefault();
                        const tidMatch = href.match(/^\/ticket\/operate\/backToMy\/(\d+)$/);
                        if (tidMatch) {
                            window.dispatchEvent(
                                new CustomEvent('openTidFromDetail', {
                                    detail: { tid: Number(tidMatch[1]) },
                                })
                            );
                        } else {
                            window.history.pushState({}, '', href);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                        }
                    }}
                    {...(detail.contentHtml != null && detail.contentHtml !== ''
                        ? { dangerouslySetInnerHTML: { __html: detail.contentHtml } }
                        : {
                              children: (detail.content || '').split('\n').map((line, i) => (
                                  <React.Fragment key={i}>
                                      {line}
                                      {i < (detail.content || '').split('\n').length - 1 && <br />}
                                  </React.Fragment>
                              )),
                          })}
                ></div>
            </Card>
        );
    };

    // 反馈预览区（匹配/手动 tab 复用）
    const renderPreviewPane = (tid: number) => {
        const previewTicket = previewTickets.get(tid);
        return (
            <div
                style={{
                    maxHeight: 400,
                    overflowY: 'auto',
                    border: `1px solid ${isDarkMode ? token.colorBorderSecondary : '#f0f0f0'}`,
                    borderRadius: 4,
                    padding: 12,
                    background: isDarkMode ? token.colorFillAlter : '#fafafa',
                }}
            >
                {previewTicket ? (
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 'bold',
                                marginBottom: 8,
                                wordBreak: 'break-word',
                                color: token.colorText,
                            }}
                        >
                            {previewTicket.title.replace(/^反馈:\s*/, '')}
                        </div>
                        {previewTicket.details && previewTicket.details.length > 0 ? (
                            previewTicket.details
                                .filter(
                                    (detail: TicketDetail) => detail.action === TicketAction.Reply
                                )
                                .slice(0, 5)
                                .map((detail: TicketDetail, index: number) => (
                                    <SimpleReplyCard
                                        key={detail.id}
                                        detail={detail}
                                        floorNumber={index + 1}
                                    />
                                ))
                        ) : (
                            <Text type="secondary">{gLang('feedback.noReplies')}</Text>
                        )}
                    </Space>
                ) : (
                    <Skeleton active />
                )}
            </div>
        );
    };

    // 匹配反馈标签页内容（PC 宽屏左右布局，窄屏上下堆叠）
    const renderMatchTab = (matched: MatchedFeedback) => (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 340px', minWidth: 0 }}>{renderPreviewPane(matched.tid)}</div>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>{renderMergeCard(matched.tid)}</div>
        </div>
    );

    // 手动打开的反馈 tab 内容（与 match tab 相同布局，仅 tid）
    // 手动打开的反馈 tab 内容（复用 renderPreviewPane + renderMergeCard）
    const renderManualTab = (tid: number) => (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 340px', minWidth: 0 }}>{renderPreviewPane(tid)}</div>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>{renderMergeCard(tid)}</div>
        </div>
    );

    // 手动打开反馈：列表（无添加/删除按钮），点击项将 tid 加入 card tab
    const renderManualPickerTab = () => (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space direction="vertical" size={10} style={{ width: '100%', marginBottom: 12 }}>
                <Input
                    placeholder={gLang('feedback.manualOpenSearchPlaceholder')}
                    prefix={<SearchOutlined />}
                    value={feedbackSearchKeyword}
                    onChange={e => setFeedbackSearchKeyword(e.target.value)}
                    allowClear
                    size="small"
                    style={{ width: '100%' }}
                    onPressEnter={() => {
                        setFeedbackListPage(1);
                        queryFeedbackList(1, false);
                    }}
                />
                <Flex gap={8} style={{ width: '100%' }}>
                    <Select
                        size="small"
                        value={feedbackListType}
                        onChange={(value: string) => {
                            setFeedbackListType(value);
                        }}
                        options={[
                            { value: '', label: gLang('feedback.typeAll') },
                            { value: 'SUGGESTION', label: gLang('feedback.typeSuggestion') },
                            { value: 'BUG', label: gLang('feedback.typeBug') },
                        ]}
                        style={{ flex: 1 }}
                    />
                    <Select
                        size="small"
                        value={feedbackListStatus.length === 1 ? feedbackListStatus[0] : ''}
                        onChange={(value: string) => {
                            setFeedbackListStatus(value ? [value] : []);
                        }}
                        options={[
                            { value: '', label: gLang('feedback.allStatus') },
                            { value: 'open', label: gLang('feedback.status.open') },
                            { value: 'closed', label: gLang('feedback.status.closed') },
                            { value: 'ended', label: gLang('feedback.status.ended') },
                        ]}
                        style={{ flex: 1 }}
                    />
                </Flex>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {gLang('feedback.manualOpenFeedbackHint')}
                </Text>
            </Space>
            {feedbackListSpinning ? (
                <Spin spinning style={{ width: '100%', padding: '24px 0' }}>
                    <div style={{ minHeight: 120 }} />
                </Spin>
            ) : (
                (() => {
                    // 已改为服务端关键词搜索，直接使用接口返回的 list/total，不再前端过滤
                    return feedbackListItems.length > 0 ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                                maxHeight: 320,
                                overflowY: 'auto',
                            }}
                        >
                            {feedbackListItems.map(item => {
                                const title = (item.title || '').replace(/^反馈:\s*/, '');
                                const replyCount = item.replyCount ?? 0;
                                const lastReplyTime = item.lastReplyTime ?? item.create_time ?? '';
                                return (
                                    <Card
                                        key={item.tid}
                                        hoverable
                                        size="small"
                                        style={{
                                            borderRadius: 8,
                                            border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                                            cursor: 'pointer',
                                        }}
                                        bodyStyle={{ padding: '12px 16px' }}
                                        onClick={() => handleAddManualTab(item)}
                                    >
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        marginBottom: 4,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    <Text strong style={{ fontSize: 14 }}>
                                                        {title || `TID#${item.tid}`}
                                                    </Text>
                                                    <FeedbackTagGroup
                                                        publicTags={item.publicTags}
                                                    />
                                                    {item.feedbackType === 'BUG' ? (
                                                        <Tag color="red">
                                                            {gLang('feedback.typeBug')}
                                                        </Tag>
                                                    ) : item.feedbackType === 'SUGGESTION' ? (
                                                        <Tag color="green">
                                                            {gLang('feedback.typeSuggestion')}
                                                        </Tag>
                                                    ) : null}
                                                </div>
                                                <Space wrap size="small" style={{ fontSize: 12 }}>
                                                    {item.create_time && (
                                                        <Space size={4}>
                                                            <ClockCircleOutlined />
                                                            {convertUTCToFormat(item.create_time)}
                                                        </Space>
                                                    )}
                                                    <Tag
                                                        color={ltransTicketStatusColor(item.status)}
                                                        style={{ margin: 0 }}
                                                    >
                                                        {gLang(
                                                            ltransTicketStatusForUser(
                                                                item.status,
                                                                item.priority,
                                                                true,
                                                                item.type
                                                            )
                                                        )}
                                                    </Tag>
                                                    {replyCount > 0 && (
                                                        <>
                                                            {item.create_time && (
                                                                <Text type="secondary">·</Text>
                                                            )}
                                                            <Space size={4}>
                                                                <MessageOutlined />
                                                                <Text type="secondary">
                                                                    {gLang(
                                                                        'feedback.repliesCount'
                                                                    )?.replace?.(
                                                                        '{count}',
                                                                        String(replyCount)
                                                                    ) ??
                                                                        `${replyCount} ${gLang('feedback.replies')}`}
                                                                </Text>
                                                            </Space>
                                                            {lastReplyTime &&
                                                                lastReplyTime !==
                                                                    item.create_time && (
                                                                    <>
                                                                        <Text type="secondary">
                                                                            ·
                                                                        </Text>
                                                                        <Text type="secondary">
                                                                            {gLang(
                                                                                'feedback.lastReply'
                                                                            )}
                                                                            :{' '}
                                                                            {convertUTCToFormat(
                                                                                lastReplyTime
                                                                            )}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                        </>
                                                    )}
                                                </Space>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Empty
                            description={gLang('feedback.noFeedback')}
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    );
                })()
            )}
            {feedbackListHasMore && (
                <Button
                    block
                    type="dashed"
                    loading={feedbackListLoadingMore}
                    onClick={() => {
                        queryFeedbackList(feedbackListPage, true);
                        setFeedbackListPage(p => p + 1);
                    }}
                    size="small"
                >
                    {gLang('ticketQuery.loadMore')}
                </Button>
            )}
        </Space>
    );

    const manualPickerTabItem = {
        key: 'manual-picker',
        label: gLang('feedback.manualOpenFeedback'),
        children: renderManualPickerTab(),
    };
    const manualTabItems = manualOpenTids.map(tid => ({
        key: `manual-${tid}`,
        label: `TID#${tid}`,
        children: renderManualTab(tid),
    }));
    const createTabItem = {
        key: 'create',
        label: gLang('feedback.createNewFeedback'),
        children: renderCreateTab(),
    };

    // 手动打开反馈始终倒数第二，新建反馈始终倒数第一
    const tabItemsWithMatch = [
        ...matchedFeedbacks.map(matched => ({
            key: `match-${matched.tid}`,
            label: (
                <span title={matched.title}>{`TID#${matched.tid} (${matched.similarity}%)`}</span>
            ),
            children: renderMatchTab(matched),
        })),
        ...manualTabItems,
        manualPickerTabItem,
        createTabItem,
    ];
    const defaultKey =
        matchedFeedbacks.length > 0 ? `match-${matchedFeedbacks[0].tid}` : 'manual-picker';
    const effectiveActiveKey = activeTabKey ?? defaultKey;

    return (
        <>
            {contextHolder}
            <style>{FEEDBACK_REPLY_CONTENT_STYLE}</style>
            <Card
                title={
                    <div style={getFeedbackCenterTitleBarStyle()}>
                        <Space style={getFeedbackCenterTitleMainStyle()}>
                            <MessageOutlined />
                            <span style={{ wordBreak: 'break-word' }}>
                                {gLang('feedback.feedbackCenter')}
                            </span>
                        </Space>
                        <div style={getFeedbackCenterActionWrapperStyle(isCompactLayout)}>
                            <Button
                                type="default"
                                size="small"
                                icon={<RobotOutlined />}
                                loading={rematchLoading}
                                onClick={handleRematchAi}
                                block={isCompactLayout}
                            >
                                {gLang('feedback.rematchAi')}
                            </Button>
                        </div>
                    </div>
                }
                style={{ width: '100%' }}
                size="small"
                styles={{ body: { paddingBottom: 8 }, header: { padding: '8px 12px' } }}
            >
                {!aiMatchDetail && ticket?.type === TicketType.Suggestion && (
                    <div
                        style={{
                            marginBottom: 12,
                            padding: '10px 12px',
                            borderRadius: 6,
                            background: isDarkMode ? '#111a2c' : '#f0f7ff',
                            border: `1px solid ${isDarkMode ? '#15325b' : '#bae0ff'}`,
                        }}
                    >
                        <Text strong style={{ display: 'block', marginBottom: 4 }}>
                            {gLang('feedback.feedbackCenterManualGuideTitle')}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {gLang('feedback.feedbackCenterManualGuideDesc')}
                        </Text>
                    </div>
                )}
                {
                    <Tabs
                        activeKey={effectiveActiveKey}
                        onChange={key => {
                            setActiveTabKey(key);
                            handleTabChange(key);
                        }}
                        items={tabItemsWithMatch}
                    />
                }
            </Card>
        </>
    );
};
