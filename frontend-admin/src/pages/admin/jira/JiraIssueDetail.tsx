import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AutoComplete, Button, Card, Divider, message, Space, Spin, Tag, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import axiosInstance from '@common/axiosConfig';
import { gLang } from '@common/language';

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

type AdfNode = {
    type: string;
    text?: string;
    content?: AdfNode[];
    attrs?: Record<string, unknown>;
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};

type JiraIssue = {
    key: string;
    fields: {
        summary: string;
        description: AdfNode | null;
        status?: { name: string } | null;
        priority?: { name: string } | null;
        duedate?: string | null;
        customfield_10054?: string | null;
    };
};

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

const adfToMarkdown = (node: AdfNode | null): string => {
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

const JiraIssueDetail: React.FC = () => {
    const { issueKey } = useParams<{ issueKey: string }>();
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [issue, setIssue] = useState<JiraIssue | null>(null);
    const [contactPerson, setContactPerson] = useState('');
    const [cachedContacts, setCachedContacts] = useState<string[]>([]);

    useEffect(() => {
        if (!issueKey) {
            setLoading(false);
            return;
        }
        const fetchIssue = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get<{
                    code: number;
                    data: JiraIssue;
                    message?: string;
                }>('/feedback/jira/issue-detail', {
                    params: { issueKey },
                });
                if (res.data.code !== 0 || !res.data.data) {
                    throw new Error(res.data.message || gLang('feedback.jira.loadFailed'));
                }
                setIssue(res.data.data);
            } catch (e: any) {
                const msg =
                    e?.response?.data?.message || e?.message || gLang('feedback.jira.loadFailed');
                messageApi.error(msg);
            } finally {
                setLoading(false);
            }
        };
        void fetchIssue();
    }, [issueKey]);

    useEffect(() => {
        const apiValue = issue?.fields?.customfield_10054 ?? '';
        const value = typeof apiValue === 'string' ? apiValue : '';
        setContactPerson(value);
        setCachedContacts(() => {
            const list = getCachedContactPersons();
            if (value.trim()) {
                return addContactToCache(value);
            }
            return list;
        });
    }, [issue]);

    const handleContactBlur = useCallback(() => {
        const v = contactPerson.trim();
        if (v) {
            setCachedContacts(addContactToCache(v));
        }
    }, [contactPerson]);

    const handleRemoveFromCache = useCallback(() => {
        const v = contactPerson.trim();
        if (v) {
            setCachedContacts(removeContactFromCache(v));
            messageApi.success(gLang('feedback.jira.assigneeRemovedFromHistory'));
        }
    }, [contactPerson, messageApi]);

    if (!issueKey) {
        return <div style={{ padding: 24 }}>{gLang('feedback.jira.missingIssueKey')}</div>;
    }

    if (loading || !issue) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <Spin size="large" />
            </div>
        );
    }

    const f = issue.fields;
    const md = adfToMarkdown(f.description).trimEnd();

    return (
        <div style={{ padding: 24 }}>
            {contextHolder}
            <Card
                title={
                    <span>
                        {issue.key} - {f.summary}
                    </span>
                }
            >
                <div style={{ marginBottom: 12 }}>
                    <Typography.Text type="secondary">
                        {gLang('feedback.jira.statusLabel')}
                    </Typography.Text>
                    <Tag color={STATUS_COLORS[f.status?.name ?? ''] ?? 'default'}>
                        {f.status?.name ?? gLang('feedback.jira.unknown')}
                    </Tag>
                </div>
                <div style={{ marginBottom: 12 }}>
                    <Typography.Text type="secondary">
                        {gLang('feedback.jira.priorityLabel')}
                    </Typography.Text>
                    {f.priority ? (
                        <Tag color={PRIORITY_COLORS[f.priority.name] ?? 'default'}>
                            {f.priority.name}
                        </Tag>
                    ) : (
                        <span>—</span>
                    )}
                </div>
                <div style={{ marginBottom: 12 }}>
                    <Typography.Text type="secondary">
                        {gLang('feedback.jira.dueDateLabel')}
                    </Typography.Text>
                    <span>{f.duedate || '—'}</span>
                </div>
                <div style={{ marginBottom: 12 }}>
                    <Typography.Text type="secondary">
                        {gLang('feedback.jira.assigneeLabel')}
                    </Typography.Text>
                    <Space style={{ marginLeft: 8 }} size="small" wrap align="center">
                        <AutoComplete
                            value={contactPerson}
                            options={cachedContacts.map(c => ({ value: c }))}
                            onChange={setContactPerson}
                            onSelect={v => setContactPerson(v)}
                            onBlur={handleContactBlur}
                            placeholder={gLang('feedback.jira.assigneePlaceholder')}
                            style={{ width: 260 }}
                            allowClear
                            getPopupContainer={() => document.body}
                            filterOption={(inputValue, option) =>
                                (option?.value ?? '')
                                    .toLowerCase()
                                    .includes((inputValue || '').toLowerCase())
                            }
                        />
                        <Button
                            type="default"
                            icon={<DeleteOutlined />}
                            onClick={handleRemoveFromCache}
                            title={gLang('feedback.jira.assigneeRemoveTitle')}
                        />
                    </Space>
                </div>

                <Divider />

                <Typography.Title level={5}>
                    {gLang('feedback.jira.descriptionFormLabel')}
                </Typography.Title>
                <div data-color-mode="light">
                    {md ? (
                        <MDEditor.Markdown
                            source={md}
                            style={{ background: 'transparent', fontSize: 14, lineHeight: 1.6 }}
                        />
                    ) : (
                        <Typography.Text type="secondary">
                            {gLang('feedback.jira.noDescription')}
                        </Typography.Text>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default JiraIssueDetail;
