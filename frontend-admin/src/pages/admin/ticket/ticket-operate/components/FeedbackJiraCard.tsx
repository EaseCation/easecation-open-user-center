import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import MDEditor from '@uiw/react-md-editor';
import {
    Button,
    Card,
    DatePicker,
    Flex,
    Input,
    message,
    Modal,
    Select,
    Space,
    Spin,
    Tag,
    Typography,
} from 'antd';
import {
    DeleteOutlined,
    LinkOutlined,
    ReloadOutlined,
    RocketOutlined,
} from '@ant-design/icons';
import axiosInstance from '@common/axiosConfig';
import { gLang } from '@common/language';

type FeedbackJiraStatusCategory = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'UNKNOWN';

type FeedbackJiraIssueView = {
    key: string;
    url: string | null;
    summary: string | null;
    statusName: string | null;
    statusCategory: FeedbackJiraStatusCategory;
};

type FeedbackJiraResponse = {
    configured: boolean;
    issue: FeedbackJiraIssueView | null;
    syncError: string | null;
};

type AdfNode = {
    type: string;
    text?: string;
    content?: AdfNode[];
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};

type JiraComment = {
    id: string;
    author: { displayName: string };
    body: AdfNode;
    created: string;
};

type JiraIssueDetail = {
    issue: {
        key: string;
        fields: {
            summary?: string;
            status?: { name: string } | null;
            priority?: { name: string } | null;
            duedate?: string | null;
            customfield_10054?: string | null;
            description?: AdfNode | null;
        };
    };
    comments: JiraComment[];
};

type FeedbackJiraCreateResponse = FeedbackJiraResponse & {
    created: boolean;
};

type EpfWrappedResponse<T> = T & {
    EPF_code?: number;
    EPF_description?: string;
    message?: string;
};

export interface FeedbackJiraCardProps {
    tid: number;
    displayMode?: 'card' | 'embedded';
}

const JIRA_CONTACT_CACHE_KEY = 'ecuc_jira_contact_persons';
const CACHE_MAX = 50;

const getCachedContactPersons = (): string[] => {
    try {
        const raw = localStorage.getItem(JIRA_CONTACT_CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed)
            ? (parsed as string[]).filter(x => typeof x === 'string' && x.trim() !== '')
            : [];
    } catch {
        return [];
    }
};

const saveCachedContactPersons = (list: string[]) => {
    localStorage.setItem(JIRA_CONTACT_CACHE_KEY, JSON.stringify(list.slice(0, CACHE_MAX)));
};

const addContactToCache = (name: string): string[] => {
    const trimmed = name.trim();
    if (!trimmed) return getCachedContactPersons();
    const list = getCachedContactPersons();
    const next = [trimmed, ...list.filter(x => x !== trimmed)];
    saveCachedContactPersons(next);
    return next;
};

const removeContactFromCache = (name: string): string[] => {
    const list = getCachedContactPersons().filter(x => x !== name);
    saveCachedContactPersons(list);
    return list;
};

const getStatusColor = (category: FeedbackJiraStatusCategory): string => {
    switch (category) {
        case 'TODO':
            return 'default';
        case 'IN_PROGRESS':
            return 'processing';
        case 'DONE':
            return 'success';
        default:
            return 'warning';
    }
};

const getStatusLabel = (
    category: FeedbackJiraStatusCategory,
    statusName: string | null
): string => {
    if (statusName?.trim()) return statusName.trim();
    switch (category) {
        case 'TODO':
            return gLang('feedback.jira.todo');
        case 'IN_PROGRESS':
            return gLang('feedback.jira.inProgress');
        case 'DONE':
            return gLang('feedback.jira.done');
        default:
            return gLang('feedback.jira.unknown');
    }
};

const extractApiMessage = (error: any, fallback: string): string =>
    error?.response?.data?.message ||
    error?.response?.data?.EPF_description ||
    error?.message ||
    fallback;

const unwrapEpfResponse = <T,>(raw: EpfWrappedResponse<T>): T => {
    if (raw?.EPF_code && raw.EPF_code !== 200) {
        throw new Error(raw.message || raw.EPF_description || 'Request failed');
    }
    return raw as T;
};

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
const INITIAL_STATUS_OPTIONS = [
    { label: 'Backlog', value: 'backlog' },
    { label: gLang('feedback.jira.applyAssign'), value: 'apply' },
];

const textToAdf = (text: string) => ({
    version: 1,
    type: 'doc',
    content: text.split('\n').map(line => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
    })),
});

const PRIORITY_COLORS: Record<string, string> = {
    Highest: 'red',
    High: 'orange',
    Medium: 'blue',
    Low: 'cyan',
    Lowest: 'default',
};

const STATUS_COLORS: Record<string, string> = {
    BACKLOG: 'default',
};

const adfToMarkdown = (node: AdfNode | null | undefined): string => {
    if (!node) return '';
    switch (node.type) {
        case 'doc':
            return node.content?.map(adfToMarkdown).join('') ?? '';
        case 'paragraph':
            return (node.content?.map(adfToMarkdown).join('') ?? '') + '\n';
        case 'text': {
            let text = node.text ?? '';
            if (node.marks) {
                for (const mark of node.marks) {
                    if (mark.type === 'strong') text = `**${text}**`;
                    else if (mark.type === 'em') text = `*${text}*`;
                    else if (mark.type === 'code') text = `\`${text}\``;
                    else if (mark.type === 'strike') text = `~~${text}~~`;
                }
            }
            return text;
        }
        case 'hardBreak':
            return '\n';
        default:
            return node.content?.map(adfToMarkdown).join('') ?? node.text ?? '';
    }
};

const parseEcComment = (comment: JiraComment): { displayName: string; body: AdfNode } => {
    const content = comment.body?.content;
    if (content && content.length > 0) {
        const firstPara = content[0];
        const firstText = firstPara?.type === 'paragraph' ? firstPara.content?.[0] : undefined;
        if (firstText?.type === 'text' && firstText.text) {
            const match = /^由 (.+?) 通过 EC Kanban 提交：$/.exec(firstText.text);
            if (match) {
                return {
                    displayName: match[1],
                    body: { ...comment.body, content: content.slice(1) },
                };
            }
        }
    }
    return { displayName: comment.author.displayName, body: comment.body };
};

export const FeedbackJiraCard: React.FC<FeedbackJiraCardProps> = ({
    tid,
    displayMode = 'card',
}) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewFields, setPreviewFields] = useState<any | null>(null);
    const [summary, setSummary] = useState<string>('');
    const [issueTypeName, setIssueTypeName] = useState<string>('Bug');
    const [priorityName, setPriorityName] = useState<string>('Medium');
    const [assignee, setAssignee] = useState<string>('');
    const [cachedContacts, setCachedContacts] = useState<string[]>([]);
    const [initialStatus, setInitialStatus] = useState<'backlog' | 'apply'>('backlog');
    const [deadline, setDeadline] = useState<string | null>(null);
    const [description, setDescription] = useState<string>('');
    const [data, setData] = useState<FeedbackJiraResponse>({
        configured: true,
        issue: null,
        syncError: null,
    });
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailIssue, setDetailIssue] = useState<JiraIssueDetail | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get<EpfWrappedResponse<FeedbackJiraResponse>>(
                '/feedback/jira',
                { params: { tid } }
            );
            const payload = unwrapEpfResponse<FeedbackJiraResponse>(response.data);
            setData({
                configured: payload.configured !== false,
                issue: payload.issue ?? null,
                syncError: payload.syncError ?? null,
            });
        } catch (error: any) {
            messageApi.error(extractApiMessage(error, gLang('feedback.jira.loadFailed')));
        } finally {
            setLoading(false);
        }
    }, [messageApi, tid]);

    const openDetail = useCallback(async () => {
        if (!data.issue?.key) return;
        setDetailOpen(true);
        setDetailLoading(true);
        try {
            const response = await axiosInstance.get<EpfWrappedResponse<JiraIssueDetail>>(
                '/feedback/jira/issue-detail',
                { params: { issueKey: data.issue.key } }
            );
            const payload = unwrapEpfResponse<JiraIssueDetail>(response.data);
            setDetailIssue(payload);
        } catch (error: any) {
            messageApi.error(extractApiMessage(error, gLang('feedback.jira.loadFailed')));
        } finally {
            setDetailLoading(false);
        }
    }, [data.issue, messageApi]);

    useEffect(() => {
        load();
    }, [load]);

    const loadPreview = useCallback(async () => {
        setPreviewLoading(true);
        try {
            const response = await axiosInstance.get<EpfWrappedResponse<{ fields: any }>>(
                '/feedback/jira/preview',
                { params: { tid } }
            );
            const payload = unwrapEpfResponse<{ fields: any }>(response.data);
            const fields = payload.fields || {};
            setPreviewFields(fields);
            setSummary(fields.summary || '');
            const defaultType =
                typeof fields.issuetype?.name === 'string' && fields.issuetype.name.trim()
                    ? fields.issuetype.name.trim()
                    : 'Bug';
            setIssueTypeName(defaultType);
            const defaultPriority =
                typeof fields.priority?.name === 'string' && fields.priority.name.trim()
                    ? fields.priority.name.trim()
                    : 'Medium';
            setPriorityName(defaultPriority);
            const assigneeVal =
                typeof fields.customfield_10054 === 'string' ? fields.customfield_10054 : '';
            setAssignee(assigneeVal);
            setCachedContacts(
                assigneeVal.trim() ? addContactToCache(assigneeVal) : getCachedContactPersons()
            );
            const existingDeadline =
                typeof fields.deadline === 'string' && fields.deadline.trim()
                    ? fields.deadline.trim()
                    : null;
            setDeadline(existingDeadline);
            const existingDescription =
                typeof fields.descriptionText === 'string' && fields.descriptionText.trim()
                    ? fields.descriptionText
                    : '';
            setDescription(existingDescription);
        } catch (error: any) {
            messageApi.error(extractApiMessage(error, gLang('feedback.jira.loadFailed')));
        } finally {
            setPreviewLoading(false);
        }
    }, [messageApi, tid]);

    const doCreate = async () => {
        setCreating(true);
        try {
            const extraDescription = description.trim();
            const fields = {
                ...(previewFields || {}),
                summary,
                issuetype: { name: issueTypeName },
                priority: priorityName ? { name: priorityName } : undefined,
                customfield_10054: assignee || undefined,
                ...(deadline ? { deadline } : {}),
                ...(extraDescription ? { description: textToAdf(extraDescription) } : {}),
            };
            const response = await axiosInstance.post<
                EpfWrappedResponse<FeedbackJiraCreateResponse>
            >('/feedback/jira/create', { tid, fields });
            const nextData = unwrapEpfResponse<FeedbackJiraCreateResponse>(response.data);
            setData({
                configured: nextData.configured !== false,
                issue: nextData.issue ?? null,
                syncError: nextData.syncError ?? null,
            });
            messageApi.success(
                gLang(nextData.created ? 'feedback.jira.createSuccess' : 'feedback.jira.exists')
            );
        } catch (error: any) {
            messageApi.error(extractApiMessage(error, gLang('feedback.jira.createFailed')));
        } finally {
            setCreating(false);
        }
    };

    const actionButtons = (
        <Space size="small">
            <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={load}
                loading={loading}
                disabled={creating}
            >
                {gLang('feedback.jira.refresh')}
            </Button>
            {data.issue?.key ? (
                <Button size="small" icon={<LinkOutlined />} onClick={() => void openDetail()}>
                    {gLang('feedback.jira.open')}
                </Button>
            ) : null}
            <Button
                type="primary"
                size="small"
                icon={<RocketOutlined />}
                onClick={() => {
                    setCreateModalOpen(true);
                    setCachedContacts(getCachedContactPersons());
                    void loadPreview();
                }}
                loading={creating}
                disabled={data.issue != null}
            >
                {gLang('feedback.jira.create')}
            </Button>
        </Space>
    );

    const jiraContent = (
        <Spin spinning={loading}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {data.issue ? (
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Flex align="center" gap={8} wrap="wrap">
                            <Typography.Text strong>{data.issue.key}</Typography.Text>
                            <Tag color={getStatusColor(data.issue.statusCategory)}>
                                {getStatusLabel(data.issue.statusCategory, data.issue.statusName)}
                            </Tag>
                        </Flex>
                        {data.issue.summary ? (
                            <Typography.Text type="secondary">{data.issue.summary}</Typography.Text>
                        ) : null}
                    </Space>
                ) : (
                    <Typography.Text type="secondary">
                        {gLang('feedback.jira.notLinked')}
                    </Typography.Text>
                )}

                {data.syncError ? (
                    <Typography.Text type="warning">{data.syncError}</Typography.Text>
                ) : null}
            </Space>
        </Spin>
    );

    return (
        <>
            {contextHolder}
            {displayMode === 'embedded' ? (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Flex justify="flex-end" wrap="wrap" gap={8}>
                        {actionButtons}
                    </Flex>
                    {jiraContent}
                </Space>
            ) : (
                <Card
                    size="small"
                    title={gLang('feedback.jira.title')}
                    extra={actionButtons}
                    style={{ boxShadow: 'none', marginBottom: 8 }}
                >
                    {jiraContent}
                </Card>
            )}
            <Modal
                open={detailOpen}
                title={
                    detailIssue
                        ? `${gLang('feedback.jira.detailModalTitlePrefix')} - ${detailIssue.issue.key}`
                        : gLang('feedback.jira.detailModalTitlePrefix')
                }
                onCancel={() => setDetailOpen(false)}
                footer={null}
                width={900}
                destroyOnClose
            >
                <Spin spinning={detailLoading}>
                    {detailIssue ? (
                        (() => {
                            const f = detailIssue.issue.fields;
                            return (
                                <div>
                                    <div style={{ marginBottom: 12 }}>
                                        <Typography.Title level={5} style={{ marginBottom: 4 }}>
                                            {f.summary || detailIssue.issue.key}
                                        </Typography.Title>
                                        <Space wrap>
                                            {f.status?.name && (
                                                <Tag
                                                    color={
                                                        STATUS_COLORS[f.status.name] ?? 'default'
                                                    }
                                                >
                                                    {f.status.name}
                                                </Tag>
                                            )}
                                            {f.priority && (
                                                <Tag
                                                    color={
                                                        PRIORITY_COLORS[f.priority.name] ??
                                                        'default'
                                                    }
                                                >
                                                    {f.priority.name}
                                                </Tag>
                                            )}
                                        </Space>
                                    </div>
                                    <Space
                                        direction="vertical"
                                        size="small"
                                        style={{ width: '100%', marginBottom: 16 }}
                                    >
                                        <div>
                                            <Typography.Text type="secondary">
                                                {gLang('feedback.jira.dueDateLabel')}
                                            </Typography.Text>
                                            <Typography.Text>{f.duedate || '—'}</Typography.Text>
                                        </div>
                                        <div>
                                            <Typography.Text type="secondary">
                                                {gLang('feedback.jira.assigneeLabel')}
                                            </Typography.Text>
                                            <Typography.Text>
                                                {f.customfield_10054 || '—'}
                                            </Typography.Text>
                                        </div>
                                    </Space>
                                    <Typography.Text strong>
                                        {gLang('feedback.jira.descriptionFormLabel')}
                                    </Typography.Text>
                                    <div
                                        style={{ marginTop: 8, marginBottom: 16 }}
                                        data-color-mode="light"
                                    >
                                        {f.description ? (
                                            <MDEditor.Markdown
                                                source={adfToMarkdown(f.description).trimEnd()}
                                                style={{
                                                    background: 'transparent',
                                                    fontSize: 14,
                                                    lineHeight: 1.6,
                                                }}
                                            />
                                        ) : (
                                            <Typography.Text type="secondary">
                                                {gLang('feedback.jira.noDescription')}
                                            </Typography.Text>
                                        )}
                                    </div>

                                    <Typography.Text strong>
                                        {gLang('feedback.jira.commentsLabel')}
                                    </Typography.Text>
                                    {detailIssue.comments.length === 0 ? (
                                        <div
                                            style={{
                                                color: '#bbb',
                                                textAlign: 'center',
                                                padding: '12px 0',
                                            }}
                                        >
                                            {gLang('feedback.jira.noComments')}
                                        </div>
                                    ) : (
                                        <Space
                                            direction="vertical"
                                            size="small"
                                            style={{ width: '100%', marginTop: 8 }}
                                        >
                                            {detailIssue.comments.map(comment => {
                                                const { displayName, body } =
                                                    parseEcComment(comment);
                                                const mdText = adfToMarkdown(body).trimEnd();
                                                return (
                                                    <div
                                                        key={comment.id}
                                                        style={{
                                                            background: '#fafafa',
                                                            border: '1px solid #f0f0f0',
                                                            borderRadius: 8,
                                                            padding: '8px 12px',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 8,
                                                                alignItems: 'baseline',
                                                                marginBottom: 6,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontWeight: 600,
                                                                    fontSize: 13,
                                                                }}
                                                            >
                                                                {displayName}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: '#aaa',
                                                                }}
                                                            >
                                                                {new Date(
                                                                    comment.created
                                                                ).toLocaleString('zh-CN')}
                                                            </span>
                                                        </div>
                                                        <div data-color-mode="light">
                                                            <MDEditor.Markdown
                                                                source={mdText}
                                                                style={{
                                                                    background: 'transparent',
                                                                    fontSize: 14,
                                                                    lineHeight: 1.6,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </Space>
                                    )}
                                </div>
                            );
                        })()
                    ) : (
                        <Typography.Text type="secondary">
                            {gLang('feedback.jira.noIssueDetail')}
                        </Typography.Text>
                    )}
                </Spin>
            </Modal>
            <Modal
                open={createModalOpen}
                title={gLang('feedback.jira.title')}
                onCancel={() => setCreateModalOpen(false)}
                onOk={async () => {
                    await doCreate();
                    setCreateModalOpen(false);
                }}
                confirmLoading={creating}
                okText={gLang('feedback.jira.create')}
                cancelText={gLang('feedback.cancel')}
                destroyOnClose
            >
                <Spin spinning={previewLoading}>
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <div>
                            <Typography.Text strong>
                                {gLang('feedback.jira.jiraTypeLabel')}
                            </Typography.Text>
                            <Select
                                style={{ width: '100%', marginTop: 4 }}
                                value={issueTypeName}
                                onChange={value => setIssueTypeName(value)}
                                options={[
                                    {
                                        label: gLang('feedback.jira.typeFeature'),
                                        value: gLang('feedback.jira.issueTypeValueFeature'),
                                    },
                                    {
                                        label: gLang('feedback.jira.typeTask'),
                                        value: gLang('feedback.jira.issueTypeValueTask'),
                                    },
                                    { label: 'Bug', value: 'Bug' },
                                ]}
                            />
                        </div>
                        <div>
                            <Typography.Text strong>
                                {gLang('feedback.jira.titleLabel')}
                            </Typography.Text>
                            <Input
                                style={{ width: '100%', marginTop: 4 }}
                                value={summary}
                                onChange={e => setSummary(e.target.value)}
                            />
                        </div>
                        <div>
                            <Typography.Text strong>
                                {gLang('feedback.jira.initialStatusLabel')}
                            </Typography.Text>
                            <Select
                                style={{ width: '100%', marginTop: 4 }}
                                value={initialStatus}
                                onChange={value => setInitialStatus(value as 'backlog' | 'apply')}
                                options={INITIAL_STATUS_OPTIONS}
                            />
                        </div>
                        <div>
                            <Typography.Text strong>
                                {gLang('feedback.jira.priorityFormLabel')}
                            </Typography.Text>
                            <Select
                                style={{ width: '100%', marginTop: 4 }}
                                value={priorityName}
                                onChange={value => setPriorityName(value)}
                                options={PRIORITIES.map(p => ({ label: p, value: p }))}
                            />
                        </div>
                        <div>
                            <Typography.Text strong>
                                {gLang('feedback.jira.assigneeFormLabel')}
                            </Typography.Text>
                            <Flex gap={8} align="center" style={{ marginTop: 4 }} wrap="wrap">
                                <Input
                                    style={{ width: 140, flex: '0 0 auto' }}
                                    value={assignee}
                                    onChange={e => setAssignee(e.target.value)}
                                    onBlur={() => {
                                        const v = assignee.trim();
                                        if (v) setCachedContacts(addContactToCache(v));
                                    }}
                                    placeholder={gLang('feedback.jira.assigneeInputPlaceholder')}
                                />
                                <Select
                                    placeholder={gLang('feedback.jira.assigneeHistoryPlaceholder')}
                                    value={
                                        assignee && cachedContacts.includes(assignee)
                                            ? assignee
                                            : undefined
                                    }
                                    onChange={v => v != null && setAssignee(v)}
                                    options={cachedContacts.map(c => ({ label: c, value: c }))}
                                    allowClear
                                    disabled={cachedContacts.length === 0}
                                    style={{ width: 140, flex: '0 0 auto' }}
                                    getPopupContainer={() => document.body}
                                    notFoundContent={
                                        cachedContacts.length === 0
                                            ? gLang('feedback.jira.noAssigneeHistory')
                                            : undefined
                                    }
                                />
                                <Button
                                    type="default"
                                    size="middle"
                                    icon={<DeleteOutlined />}
                                    title={gLang('feedback.jira.assigneeRemoveTitle')}
                                    onClick={() => {
                                        const v = assignee.trim();
                                        if (v) {
                                            setCachedContacts(removeContactFromCache(v));
                                            messageApi.success(
                                                gLang('feedback.jira.assigneeRemovedFromHistory')
                                            );
                                        }
                                    }}
                                />
                            </Flex>
                        </div>
                        <div>
                            <Typography.Text strong>
                                {gLang('feedback.jira.dueDateFormLabel')}
                            </Typography.Text>
                            <DatePicker
                                style={{ width: '100%', marginTop: 4 }}
                                value={deadline ? dayjs(deadline) : null}
                                onChange={value =>
                                    setDeadline(value ? value.format('YYYY-MM-DD') : null)
                                }
                            />
                        </div>
                        <div>
                            <Typography.Text strong>
                                {gLang('feedback.jira.descriptionFormLabel')}
                            </Typography.Text>
                            <div style={{ width: '100%', marginTop: 4 }} data-color-mode="light">
                                <MDEditor
                                    value={description}
                                    onChange={(v: string | undefined) => setDescription(v ?? '')}
                                    height={180}
                                    preview="edit"
                                    textareaProps={{
                                        placeholder: gLang('feedback.jira.descriptionPlaceholder'),
                                    }}
                                />
                            </div>
                        </div>
                    </Space>
                </Spin>
            </Modal>
        </>
    );
};

export default FeedbackJiraCard;
