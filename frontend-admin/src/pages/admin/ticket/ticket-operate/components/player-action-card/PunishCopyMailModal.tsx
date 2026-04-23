import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, DatePicker, Form, Input, Modal, Select, Space, Table, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { fetchData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import { TicketAction, TicketDetail } from '@ecuc/shared/types/ticket.types';
import { PlayerChatHistory, PlayerRecordingHistory } from '@ecuc/shared/types/player.types';
import { TimeConverter } from '@common/components/TimeConverter';

interface PunishCopyMailModalProps {
    open: boolean;
    onClose: () => void;
    tid?: string;
    reportedEcid: string;
    ticketTitle?: string;
    ticketDetails?: TicketDetail[];
    currentBanData?: {
        type?: string;
        reason?: string;
        dateexpire?: string;
    };
}

interface FormValues {
    punishReason: string;
    punishMode: string;
    punishExpireAt: Dayjs;
    replayId?: string;
    ruleReference: string;
    includeEvidenceExcerpt: boolean;
    evidenceExcerpt?: string;
    includeChatExcerpt: boolean;
    chatExcerpt?: string;
}

const RULE_OPTIONS = [
    gLang('admin.punishCopyMail.ruleOption1'),
    gLang('admin.punishCopyMail.ruleOption2'),
    gLang('admin.punishCopyMail.ruleOption3'),
    gLang('admin.punishCopyMail.ruleOption4'),
    gLang('admin.punishCopyMail.ruleOption5'),
    gLang('admin.punishCopyMail.ruleOption6'),
    gLang('admin.punishCopyMail.ruleOption7'),
    gLang('admin.punishCopyMail.ruleOption8'),
    gLang('admin.punishCopyMail.ruleOption9'),
];

const matchRuleByReason = (reason?: string): string | undefined => {
    const text = (reason || '').toLowerCase().trim();
    if (!text) return undefined;

    if (/开得大|暴力外挂/.test(text)) return gLang('admin.punishCopyMail.ruleOption8');
    if (/常规外挂|外挂|透视|连点|映射|长臂/.test(text)) return gLang('admin.punishCopyMail.ruleOption7');
    if (/消极游戏/.test(text)) return gLang('admin.punishCopyMail.ruleOption9');
    if (/与作弊玩家合作|作弊合作/.test(text)) return gLang('admin.punishCopyMail.ruleOption6');
    if (/利用游戏漏洞|游戏漏洞/.test(text)) return gLang('admin.punishCopyMail.ruleOption5');
    if (/非法合作/.test(text)) return gLang('admin.punishCopyMail.ruleOption4');
    if (/隐私|威胁|违法言论/.test(text)) return gLang('admin.punishCopyMail.ruleOption3');
    if (/虚假信息/.test(text)) return gLang('admin.punishCopyMail.ruleOption2');
    if (/辱骂|言语违规|刷屏|引战|色情/.test(text)) return gLang('admin.punishCopyMail.ruleOption1');
    return undefined;
};

const PUNISH_TYPE_MAP: Record<string, string> = {
    BAN: 'ban',
    HACK: 'hack',
    MUTE: 'mute',
    WARNING: 'warn',
    OVERWATCH: 'overwatch',
    FREEZE_SCORE_TOP: 'freeze_score_top',
    RESTRICT_NICK: 'restrict_nick',
};

const normalizeModeFromTitle = (ticketTitle?: string): string => {
    if (!ticketTitle) return gLang('admin.punishCopyMail.defaultMode');
    const core = ticketTitle.replace(/^[^:：]+[:：]\s*/, '').trim();
    return core.split(/\s+/).filter(Boolean)[0] || gLang('admin.punishCopyMail.defaultMode');
};

const extractReplayFromDetails = (details?: TicketDetail[]): string => {
    if (!details || details.length === 0) return '';
    const reporterDetail =
        [...details].reverse().find(
            detail =>
                detail.action === TicketAction.Reply &&
                !detail.operator.startsWith('AUTH_UID_') &&
                !detail.operator.startsWith('AI_') &&
                detail.operator !== 'SYSTEM'
        ) || details[0];
    const text = reporterDetail?.content || '';
    const patterns = [
        /(?:游戏)?回放(?:号|ID)?\s*[：:]\s*([A-Za-z0-9_-]+)/i,
        /(?:游戏)?回放(?:号|ID)?\s*(?:是|为)?\s*([A-Za-z0-9_-]{4,})/i,
        /(?:游戏)?录像(?:号|ID)?\s*[：:]\s*([A-Za-z0-9_-]+)/i,
        /replay(?:\s*id)?\s*[：:]\s*([A-Za-z0-9_-]+)/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    return '';
};

const inferPunishTypeFromDetails = (details?: TicketDetail[]): string => {
    if (!details || details.length === 0) return 'hack';
    const text = [...details]
        .reverse()
        .map(detail => detail.content || '')
        .join('\n');
    if (/(禁言|mute)/i.test(text)) return 'mute';
    if (/(封禁|ban)/i.test(text)) return 'ban';
    if (/(警告|warning)/i.test(text)) return 'warn';
    if (/(小黑屋|hack)/i.test(text)) return 'hack';
    return 'hack';
};

const extractReasonFromDetails = (details?: TicketDetail[]): string => {
    if (!details || details.length === 0) return '';
    const systemReply = [...details]
        .reverse()
        .find(detail => detail.action === TicketAction.Reply && detail.operator === 'SYSTEM');
    const text = systemReply?.content || '';
    const match = text.match(/原因[：:]\s*([^\n\r]+)/);
    return match?.[1]?.trim() || '';
};

const extractEvidenceFromDetails = (details?: TicketDetail[]): string => {
    if (!details || details.length === 0) return '';
    const reporterDetail =
        [...details].reverse().find(
            detail =>
                detail.action === TicketAction.Reply &&
                !detail.operator.startsWith('AUTH_UID_') &&
                !detail.operator.startsWith('AI_') &&
                detail.operator !== 'SYSTEM'
        ) || details[0];
    const text = reporterDetail?.content || '';
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .filter(
            line =>
                !/^发生时间[：:]/.test(line) &&
                !/^(回放|回放号|回放ID|录像|录像号|录像ID|replay)/i.test(line)
        );
    return lines.join('，').slice(0, 200);
};

const PunishCopyMailModal: React.FC<PunishCopyMailModalProps> = ({
    open,
    onClose,
    tid,
    reportedEcid,
    ticketTitle,
    ticketDetails,
    currentBanData,
}) => {
    const [form] = Form.useForm<FormValues>();
    const [messageApi, contextHolder] = message.useMessage();
    const [recordingModalOpen, setRecordingModalOpen] = useState(false);
    const [recordingLoading, setRecordingLoading] = useState(false);
    const [recordingLogs, setRecordingLogs] = useState<PlayerRecordingHistory[]>([]);
    const [recordingModeKeyword, setRecordingModeKeyword] = useState('');
    const [recordingTimeRange, setRecordingTimeRange] = useState<[Dayjs, Dayjs]>([
        dayjs().subtract(30, 'day'),
        dayjs(),
    ]);
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatLogs, setChatLogs] = useState<PlayerChatHistory[]>([]);
    const [chatSelectedRowKeys, setChatSelectedRowKeys] = useState<React.Key[]>([]);
    const [chatKeyword, setChatKeyword] = useState('');
    const [chatTimeRange, setChatTimeRange] = useState<[Dayjs, Dayjs]>([
        dayjs().subtract(7, 'day'),
        dayjs(),
    ]);
    const [resolvedTicketDetails, setResolvedTicketDetails] = useState<TicketDetail[]>(
        ticketDetails || []
    );

    const defaultPunishType = useMemo(() => {
        const rawType = (currentBanData?.type || '').toUpperCase();
        if (PUNISH_TYPE_MAP[rawType]) return PUNISH_TYPE_MAP[rawType];
        return inferPunishTypeFromDetails(resolvedTicketDetails);
    }, [currentBanData?.type, resolvedTicketDetails]);
    const isMutePunishment = defaultPunishType === 'mute';
    const compactModalWidth = useMemo(
        () => (typeof window === 'undefined' ? 620 : Math.max(340, window.innerWidth - 24)),
        []
    );
    const selectorModalWidth = useMemo(
        () => (typeof window === 'undefined' ? 900 : Math.max(340, window.innerWidth - 24)),
        []
    );

    useEffect(() => {
        if (!open) return;
        setResolvedTicketDetails(ticketDetails || []);
    }, [open, ticketDetails]);

    useEffect(() => {
        if (!open || !tid) return;
        void fetchData({
            url: '/ticket/detail',
            method: 'GET',
            data: { tid },
            setData: detail => {
                const latestDetails = Array.isArray(detail?.details) ? detail.details : [];
                if (latestDetails.length > 0) {
                    setResolvedTicketDetails(latestDetails);
                }
            },
        }).catch(() => {});
    }, [open, tid]);

    useEffect(() => {
        if (!open) return;
        const autoReason =
            currentBanData?.reason ||
            extractReasonFromDetails(resolvedTicketDetails) ||
            gLang('admin.punishCopyMail.defaultReason');
        form.setFieldsValue({
            punishReason: autoReason,
            punishMode: normalizeModeFromTitle(ticketTitle),
            punishExpireAt: currentBanData?.dateexpire
                ? dayjs(currentBanData.dateexpire)
                : dayjs().add(7, 'day'),
            replayId: extractReplayFromDetails(resolvedTicketDetails),
            ruleReference: matchRuleByReason(autoReason) || RULE_OPTIONS[3],
            includeEvidenceExcerpt: false,
            evidenceExcerpt: extractEvidenceFromDetails(resolvedTicketDetails),
            includeChatExcerpt: false,
            chatExcerpt: '',
        });
    }, [open, form, currentBanData, resolvedTicketDetails, ticketTitle]);

    const fetchRecordings = async () => {
        setRecordingLoading(true);
        try {
            await fetchData({
                url: '/ec/recording',
                method: 'GET',
                data: {
                    ecid: reportedEcid,
                    startTime: recordingTimeRange[0].format('YYYY-MM-DD'),
                    endTime: recordingTimeRange[1].format('YYYY-MM-DD'),
                },
                setData: rep => {
                    const list = Array.isArray(rep?.data)
                        ? rep.data
                        : Array.isArray(rep)
                          ? rep
                          : [];
                    setRecordingLogs(list);
                },
            });
        } catch {
            messageApi.error(gLang('admin.punishCopyMail.recordingLoadFailed'));
        } finally {
            setRecordingLoading(false);
        }
    };

    useEffect(() => {
        if (!recordingModalOpen) return;
        void fetchRecordings();
    }, [recordingModalOpen]);

    const filteredRecordingLogs = useMemo(() => {
        const keyword = recordingModeKeyword.trim().toLowerCase();
        if (!keyword) return recordingLogs;
        return recordingLogs.filter(rec => {
            const game = (rec.game || '').toLowerCase();
            const map = (rec.map || '').toLowerCase();
            return game.includes(keyword) || map.includes(keyword);
        });
    }, [recordingLogs, recordingModeKeyword]);

    const handleSelectRecording = (recording: PlayerRecordingHistory) => {
        const currentMode = (form.getFieldValue('punishMode') || '').trim();
        form.setFieldsValue({
            replayId: String(recording.record_id),
            punishMode:
                !currentMode || currentMode === gLang('admin.punishCopyMail.defaultMode')
                    ? recording.game || currentMode
                    : currentMode,
        });
        setRecordingModalOpen(false);
        messageApi.success(gLang('admin.punishCopyMail.recordingSelected'));
    };

    const fetchChats = async () => {
        setChatLoading(true);
        try {
            await fetchData({
                url: '/ec/chat',
                method: 'GET',
                data: { ecid: reportedEcid },
                setData: rep => {
                    const list = Array.isArray(rep?.data)
                        ? rep.data
                        : Array.isArray(rep)
                          ? rep
                          : [];
                    setChatLogs(list);
                },
            });
        } catch {
            messageApi.error(gLang('admin.punishCopyMail.chatLoadFailed'));
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        if (!chatModalOpen) return;
        setChatSelectedRowKeys([]);
        void fetchChats();
    }, [chatModalOpen]);

    const filteredChatLogs = useMemo(() => {
        const keyword = chatKeyword.trim().toLowerCase();
        const start = chatTimeRange[0].startOf('day');
        const end = chatTimeRange[1].endOf('day');
        return chatLogs.filter(chat => {
            const t = dayjs(chat.time);
            const inRange = t.isValid() ? t.isAfter(start) && t.isBefore(end) : true;
            if (!inRange) return false;
            if (!keyword) return true;
            const haystack = `${chat.type} ${chat.message}`.toLowerCase();
            return haystack.includes(keyword);
        });
    }, [chatLogs, chatKeyword, chatTimeRange]);

    const handleApplySelectedChats = () => {
        const selectedRows = filteredChatLogs.filter(chat =>
            chatSelectedRowKeys.includes(chat.logid)
        );
        if (selectedRows.length === 0) {
            messageApi.warning(gLang('admin.punishCopyMail.chatSelectRequired'));
            return;
        }
        const lines = selectedRows.map(
            chat => `[${chat.type}] ${dayjs(chat.time).format('YYYY-MM-DD HH:mm:ss')} ${chat.message}`
        );
        const existing = (form.getFieldValue('chatExcerpt') || '').trim();
        const text = `${existing ? `${existing}\n` : ''}${lines.join('\n')}`.slice(0, 1200);
        form.setFieldsValue({
            includeChatExcerpt: true,
            chatExcerpt: text,
        });
        setChatModalOpen(false);
        messageApi.success(gLang('admin.punishCopyMail.chatSelected'));
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (!tid) {
                messageApi.error(gLang('admin.punishCopyMail.tidMissing'));
                return;
            }
            await fetchData({
                url: '/ec/punish-copy-mail',
                method: 'POST',
                data: {
                    tid: Number(tid),
                    reportedEcid,
                    punishType: defaultPunishType,
                    punishReason: values.punishReason,
                    punishMode: values.punishMode,
                    punishExpireAt: values.punishExpireAt.format('YYYY-MM-DD HH:mm:ss'),
                    replayId: (values.replayId || '').trim(),
                    ruleReference: values.ruleReference,
                    includeEvidenceExcerpt: values.includeEvidenceExcerpt,
                    evidenceExcerpt: (values.evidenceExcerpt || '').trim(),
                    includeChatExcerpt: values.includeChatExcerpt,
                    chatExcerpt: (values.chatExcerpt || '').trim(),
                },
                setData: () => {
                    messageApi.success(gLang('admin.punishCopyMail.sendSuccess'));
                    onClose();
                },
            });
        } catch {
            messageApi.error(gLang('admin.punishCopyMail.sendFailed'));
        }
    };

    return (
        <>
            {contextHolder}
            <Modal
                title={gLang('admin.punishCopyMail.title')}
                open={open}
                onCancel={onClose}
                onOk={handleSubmit}
                okText={gLang('admin.punishCopyMail.send')}
                cancelText={gLang('cancel')}
                destroyOnClose
                width={Math.min(620, compactModalWidth)}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onValuesChange={(changedValues, allValues) => {
                        if (typeof changedValues.punishReason === 'string') {
                            const matchedRule = matchRuleByReason(changedValues.punishReason);
                            if (matchedRule && matchedRule !== allValues.ruleReference) {
                                form.setFieldValue('ruleReference', matchedRule);
                            }
                        }
                    }}
                >
                    <Form.Item
                        name="punishReason"
                        label={gLang('admin.punishCopyMail.reason')}
                        rules={[
                            { required: true, message: gLang('admin.punishCopyMail.reasonRequired') },
                        ]}
                    >
                        <Input.TextArea rows={3} maxLength={200} showCount />
                    </Form.Item>

                    <Form.Item
                        name="punishMode"
                        label={gLang('admin.punishCopyMail.mode')}
                        rules={[
                            { required: true, message: gLang('admin.punishCopyMail.modeRequired') },
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="punishExpireAt"
                        label={gLang('admin.punishCopyMail.expireAt')}
                        rules={[
                            {
                                required: true,
                                message: gLang('admin.punishCopyMail.expireAtRequired'),
                            },
                        ]}
                    >
                        <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="replayId" label={gLang('admin.punishCopyMail.replayId')}>
                        <Input
                            addonAfter={
                                <Space size={8}>
                                    <Button
                                        size="small"
                                        type="link"
                                        onClick={() =>
                                            form.setFieldValue(
                                                'replayId',
                                                extractReplayFromDetails(resolvedTicketDetails)
                                            )
                                        }
                                    >
                                        {gLang('admin.punishCopyMail.extractFromTicket')}
                                    </Button>
                                    <Button
                                        size="small"
                                        type="link"
                                        onClick={() => setRecordingModalOpen(true)}
                                    >
                                        {gLang('admin.punishCopyMail.openRecordingPicker')}
                                    </Button>
                                </Space>
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="ruleReference"
                        label={gLang('admin.punishCopyMail.ruleReference')}
                        rules={[
                            {
                                required: true,
                                message: gLang('admin.punishCopyMail.ruleReferenceRequired'),
                            },
                        ]}
                    >
                        <Select
                            options={RULE_OPTIONS.map(rule => ({ label: rule, value: rule }))}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>

                    <Form.Item name="includeEvidenceExcerpt" valuePropName="checked">
                        <Checkbox>{gLang('admin.punishCopyMail.includeEvidence')}</Checkbox>
                    </Form.Item>

                    <Form.Item shouldUpdate noStyle>
                        {({ getFieldValue }) =>
                            getFieldValue('includeEvidenceExcerpt') ? (
                                <Form.Item
                                    name="evidenceExcerpt"
                                    label={gLang('admin.punishCopyMail.evidenceExcerpt')}
                                >
                                    <Input.TextArea rows={4} maxLength={300} showCount />
                                </Form.Item>
                            ) : null
                        }
                    </Form.Item>

                    {isMutePunishment && (
                        <>
                            <Form.Item name="includeChatExcerpt" valuePropName="checked">
                                <Checkbox>{gLang('admin.punishCopyMail.includeChatExcerpt')}</Checkbox>
                            </Form.Item>
                            <Form.Item shouldUpdate noStyle>
                                {({ getFieldValue }) =>
                                    getFieldValue('includeChatExcerpt') ? (
                                        <>
                                            <Form.Item
                                                label={gLang('admin.punishCopyMail.chatExcerpt')}
                                                style={{ marginBottom: 8 }}
                                            >
                                                <Button
                                                    size="small"
                                                    type="link"
                                                    style={{ paddingInline: 0 }}
                                                    onClick={() => setChatModalOpen(true)}
                                                >
                                                    {gLang('admin.punishCopyMail.openChatPicker')}
                                                </Button>
                                            </Form.Item>
                                            <Form.Item name="chatExcerpt">
                                                <Input.TextArea rows={4} maxLength={1200} showCount />
                                            </Form.Item>
                                        </>
                                    ) : null
                                }
                            </Form.Item>
                        </>
                    )}
                </Form>
            </Modal>
            <Modal
                title={gLang('admin.punishCopyMail.recordingPickerTitle')}
                open={recordingModalOpen}
                onCancel={() => setRecordingModalOpen(false)}
                footer={null}
                width={selectorModalWidth}
                destroyOnClose
            >
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Space wrap>
                        <DatePicker.RangePicker
                            value={recordingTimeRange}
                            onChange={dates => {
                                if (dates && dates[0] && dates[1]) {
                                    setRecordingTimeRange([dates[0], dates[1]]);
                                }
                            }}
                            format="YYYY-MM-DD"
                        />
                        <Input
                            value={recordingModeKeyword}
                            placeholder={gLang('admin.punishCopyMail.modeSearchPlaceholder')}
                            onChange={e => setRecordingModeKeyword(e.target.value)}
                            style={{ width: 220 }}
                            allowClear
                        />
                        <Button type="primary" onClick={() => void fetchRecordings()}>
                            {gLang('admin.punishCopyMail.recordingQuery')}
                        </Button>
                    </Space>

                    <Table<PlayerRecordingHistory>
                        size="small"
                        rowKey={item => item.id}
                        loading={recordingLoading}
                        dataSource={filteredRecordingLogs}
                        locale={{ emptyText: gLang('admin.punishCopyMail.recordingEmpty') }}
                        pagination={{ pageSize: 8, showSizeChanger: false }}
                        scroll={{ x: 760 }}
                        columns={[
                            {
                                title: gLang('admin.punishCopyMail.replayId'),
                                dataIndex: 'record_id',
                                width: 130,
                            },
                            {
                                title: gLang('admin.punishCopyMail.recordingTime'),
                                dataIndex: 'create_time',
                                width: 190,
                                render: value => <TimeConverter utcTime={value} />,
                            },
                            {
                                title: gLang('admin.punishCopyMail.mode'),
                                dataIndex: 'game',
                                width: 160,
                                render: value => value || '-',
                            },
                            {
                                title: gLang('admin.punishCopyMail.recordingMap'),
                                dataIndex: 'map',
                                width: 180,
                                render: value => value || '-',
                            },
                            {
                                title: gLang('admin.punishCopyMail.recordingAction'),
                                key: 'action',
                                width: 110,
                                render: (_, record) => (
                                    <Button
                                        size="small"
                                        type="link"
                                        onClick={() => handleSelectRecording(record)}
                                    >
                                        {gLang('admin.punishCopyMail.selectRecording')}
                                    </Button>
                                ),
                            },
                        ]}
                    />
                </Space>
            </Modal>
            <Modal
                title={gLang('admin.punishCopyMail.chatPickerTitle')}
                open={chatModalOpen}
                onCancel={() => setChatModalOpen(false)}
                footer={
                    <Space>
                        <span>{gLang('admin.punishCopyMail.chatSelectedCount', { count: chatSelectedRowKeys.length })}</span>
                        <Button onClick={() => setChatModalOpen(false)}>{gLang('cancel')}</Button>
                        <Button type="primary" onClick={handleApplySelectedChats}>
                            {gLang('admin.punishCopyMail.applySelectedChats')}
                        </Button>
                    </Space>
                }
                width={selectorModalWidth}
                destroyOnClose
            >
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Space wrap>
                        <DatePicker.RangePicker
                            value={chatTimeRange}
                            onChange={dates => {
                                if (dates && dates[0] && dates[1]) {
                                    setChatTimeRange([dates[0], dates[1]]);
                                }
                            }}
                            format="YYYY-MM-DD"
                        />
                        <Input
                            value={chatKeyword}
                            placeholder={gLang('admin.punishCopyMail.chatSearchPlaceholder')}
                            onChange={e => setChatKeyword(e.target.value)}
                            style={{ width: 260 }}
                            allowClear
                        />
                        <Button type="primary" onClick={() => void fetchChats()}>
                            {gLang('admin.punishCopyMail.chatQuery')}
                        </Button>
                    </Space>

                    <Table<PlayerChatHistory>
                        size="small"
                        rowKey={item => item.logid}
                        loading={chatLoading}
                        dataSource={filteredChatLogs}
                        locale={{ emptyText: gLang('admin.punishCopyMail.chatEmpty') }}
                        pagination={{ pageSize: 8, showSizeChanger: false }}
                        scroll={{ x: 760 }}
                        rowSelection={{
                            selectedRowKeys: chatSelectedRowKeys,
                            onChange: keys => setChatSelectedRowKeys(keys),
                        }}
                        columns={[
                            {
                                title: gLang('admin.punishCopyMail.recordingTime'),
                                dataIndex: 'time',
                                width: 190,
                                render: value => <TimeConverter utcTime={value} />,
                            },
                            {
                                title: gLang('admin.punishCopyMail.chatChannel'),
                                dataIndex: 'type',
                                width: 120,
                            },
                            {
                                title: gLang('admin.punishCopyMail.chatContent'),
                                dataIndex: 'message',
                                ellipsis: true,
                            },
                            {
                                title: gLang('admin.punishCopyMail.chatAction'),
                                key: 'action',
                                width: 90,
                                render: () => '-',
                            },
                        ]}
                    />
                </Space>
            </Modal>
        </>
    );
};

export default PunishCopyMailModal;

