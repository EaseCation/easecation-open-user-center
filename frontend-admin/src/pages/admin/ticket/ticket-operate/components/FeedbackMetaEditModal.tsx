/**
 * Modal for editing feedback ticket meta only: subscriptions, public/internal tags, type, status.
 * Status/type/subscriptions auto-save; tag assignments keep a dedicated save action.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Modal, Card, Space, Input, Button, message, Spin, Segmented, Typography } from 'antd';
import { MinusOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchData, submitData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import { FeedbackTagSummary, TicketStatus } from '@ecuc/shared/types/ticket.types';
import FeedbackTagSelect from '@common/components/Feedback/FeedbackTagSelect';
import FeedbackProgressSelect from '@common/components/Feedback/FeedbackProgressSelect';

const SUBS_DEBOUNCE_MS = 800;

function getStatusOptions() {
    return [
        { value: TicketStatus.WaitingAssign, label: gLang('admin.feedbackMetaOpen') },
        { value: TicketStatus.Reject, label: gLang('admin.feedbackMetaClose') },
        { value: TicketStatus.Accept, label: gLang('admin.feedbackMetaEnd') },
    ];
}

function getTypeOptions() {
    return [
        { value: 'SUGGESTION', label: gLang('admin.feedbackMetaSuggestion') },
        { value: 'BUG', label: gLang('admin.feedbackMetaBug') },
    ];
}

export interface FeedbackMetaEditModalProps {
    open: boolean;
    tid: number;
    currentStatus?: TicketStatus;
    onClose: () => void;
    onSaved?: () => void;
    onProgressChanged?: (newTag: FeedbackTagSummary | null, oldTag: FeedbackTagSummary | null) => void;
}

export const FeedbackMetaEditModal: React.FC<FeedbackMetaEditModalProps> = ({
    open,
    tid,
    currentStatus,
    onClose,
    onSaved,
    onProgressChanged,
}) => {
    const [loading, setLoading] = useState(false);
    const [tagSaving, setTagSaving] = useState(false);
    const [typeValue, setTypeValue] = useState<'SUGGESTION' | 'BUG'>('SUGGESTION');
    const [typeSaving, setTypeSaving] = useState(false);
    const [statusValue, setStatusValue] = useState<TicketStatus>(TicketStatus.WaitingAssign);
    const [statusSaving, setStatusSaving] = useState(false);
    const [subscriptionsList, setSubscriptionsList] = useState<string[]>([]);
    const [newSubInput, setNewSubInput] = useState('');
    const [subsSaving, setSubsSaving] = useState(false);
    const subsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedSubsRef = useRef<string>('');
    const [modal, modalContextHolder] = Modal.useModal();
    const [messageApi, contextHolder] = message.useMessage();
    const [publicTagIds, setPublicTagIds] = useState<number[]>([]);
    const [internalTagIds, setInternalTagIds] = useState<number[]>([]);
    const [developerTagIds, setDeveloperTagIds] = useState<number[]>([]);
    const [publicTags, setPublicTags] = useState<FeedbackTagSummary[]>([]);
    const [internalTags, setInternalTags] = useState<FeedbackTagSummary[]>([]);
    const [developerTags, setDeveloperTags] = useState<FeedbackTagSummary[]>([]);
    const [progressTag, setProgressTag] = useState<FeedbackTagSummary | null>(null);

    const loadMeta = () => {
        if (!open || !tid) return;
        setLoading(true);
        fetchData({
            url: '/feedback/meta',
            method: 'GET',
            data: { tid },
            setData: (data: {
                type?: 'SUGGESTION' | 'BUG';
                subscriptions?: string[];
                publicTags?: FeedbackTagSummary[];
                internalTags?: FeedbackTagSummary[];
                developerTags?: FeedbackTagSummary[];
                progressTag?: FeedbackTagSummary | null;
            }) => {
                setTypeValue(data?.type ?? 'SUGGESTION');
                const list = data?.subscriptions ?? [];
                setSubscriptionsList(list);
                lastSavedSubsRef.current = JSON.stringify(list);
                const nextPublicTags = data?.publicTags ?? [];
                const nextInternalTags = data?.internalTags ?? [];
                const nextDeveloperTags = data?.developerTags ?? [];
                setPublicTags(nextPublicTags);
                setInternalTags(nextInternalTags);
                setDeveloperTags(nextDeveloperTags);
                setPublicTagIds(nextPublicTags.map(tag => tag.id));
                setInternalTagIds(nextInternalTags.map(tag => tag.id));
                setDeveloperTagIds(nextDeveloperTags.map(tag => tag.id));
                setProgressTag(data?.progressTag ?? null);
            },
        })
            .catch(() => messageApi.error(gLang('admin.feedbackMetaLoadFailed')))
            .finally(() => setLoading(false));
    };

    const statusToDisplay = (s: TicketStatus | undefined): TicketStatus => {
        if (s === TicketStatus.Accept || s === TicketStatus.AutoAccept) return TicketStatus.Accept;
        if (
            s === TicketStatus.Reject ||
            s === TicketStatus.AutoReject ||
            s === TicketStatus.UserCancel
        )
            return TicketStatus.Reject;
        return TicketStatus.WaitingAssign;
    };

    const saveType = useCallback(
        async (type: 'SUGGESTION' | 'BUG') => {
            setTypeSaving(true);
            try {
                await submitData({
                    url: '/feedback/type',
                    method: 'POST',
                    data: { tid, type },
                    successMessage: 'feedback.typeSaved',
                    setIsFormDisabled: () => {},
                    setIsModalOpen: () => {},
                });
                onSaved?.();
            } finally {
                setTypeSaving(false);
            }
        },
        [tid, onSaved]
    );

    const saveStatus = useCallback(
        async (status: TicketStatus) => {
            setStatusSaving(true);
            try {
                await submitData({
                    url: '/feedback/mark-status',
                    method: 'POST',
                    data: { tid, status },
                    successMessage: 'feedback.markStatusSuccess',
                    setIsFormDisabled: () => {},
                    setIsModalOpen: () => {},
                });
                onSaved?.();
            } finally {
                setStatusSaving(false);
            }
        },
        [tid, onSaved]
    );

    const saveSubscriptions = useCallback(
        async (list: string[]) => {
            setSubsSaving(true);
            try {
                await submitData({
                    url: '/feedback/subscriptions/set',
                    method: 'POST',
                    data: { tid, subscriptions: list },
                    successMessage: 'feedback.subscriptionsUpdated',
                    setIsFormDisabled: () => {},
                    setIsModalOpen: () => {},
                });
                setSubscriptionsList(list);
                lastSavedSubsRef.current = JSON.stringify(list);
                onSaved?.();
            } finally {
                setSubsSaving(false);
            }
        },
        [tid, onSaved]
    );

    useEffect(() => {
        if (open && tid) {
            loadMeta();
            if (currentStatus !== undefined) setStatusValue(statusToDisplay(currentStatus));
        }
    }, [open, tid, currentStatus]);

    // Auto-save subscriptions with debounce (skip when unchanged from last save or load)
    useEffect(() => {
        const serialized = JSON.stringify(subscriptionsList);
        if (!open || !tid || serialized === lastSavedSubsRef.current) return;
        if (subsDebounceRef.current) clearTimeout(subsDebounceRef.current);
        subsDebounceRef.current = setTimeout(() => {
            subsDebounceRef.current = null;
            saveSubscriptions(subscriptionsList);
        }, SUBS_DEBOUNCE_MS);
        return () => {
            if (subsDebounceRef.current) clearTimeout(subsDebounceRef.current);
        };
    }, [subscriptionsList, open, tid, saveSubscriptions]);

    const handleSaveTag = async () => {
        setTagSaving(true);
        try {
            await fetchData({
                url: '/feedback/admin/tags/set',
                method: 'POST',
                data: { tid, publicTagIds, internalTagIds, developerTagIds },
                setData: (data: {
                    publicTags?: FeedbackTagSummary[];
                    internalTags?: FeedbackTagSummary[];
                    developerTags?: FeedbackTagSummary[];
                    progressTag?: FeedbackTagSummary | null;
                }) => {
                    const nextPublicTags = data?.publicTags ?? [];
                    const nextInternalTags = data?.internalTags ?? [];
                    const nextDeveloperTags = data?.developerTags ?? [];
                    setPublicTags(nextPublicTags);
                    setInternalTags(nextInternalTags);
                    setDeveloperTags(nextDeveloperTags);
                    setPublicTagIds(nextPublicTags.map(tag => tag.id));
                    setInternalTagIds(nextInternalTags.map(tag => tag.id));
                    setDeveloperTagIds(nextDeveloperTags.map(tag => tag.id));
                    setProgressTag(data?.progressTag ?? null);
                },
            });
            onSaved?.();
        } finally {
            setTagSaving(false);
        }
    };

    const handleRemoveFromFeedback = () => {
        modal.confirm({
            title: gLang('feedback.removeFromListConfirm'),
            okText: gLang('common.confirm'),
            cancelText: gLang('feedback.cancel'),
            okButtonProps: { danger: true },
            onOk: async () => {
                await submitData({
                    url: '/feedback/remove',
                    method: 'POST',
                    data: { tid },
                    successMessage: 'feedback.removeFromListSuccess',
                    setIsFormDisabled: () => {},
                    setIsModalOpen: () => {},
                });
                onSaved?.();
                onClose();
            },
        });
    };

    return (
        <>
            {contextHolder}
            <Modal
                title={gLang('ticketOperate.feedbackFormat.ManagePanel')}
                open={open}
                onCancel={onClose}
                footer={null}
                width={520}
                destroyOnHidden
            >
                <Spin spinning={loading}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <Card
                            size="small"
                            title={gLang('feedback.statusLabel')}
                            extra={
                                <Segmented
                                    value={statusValue}
                                    onChange={v => {
                                        setStatusValue(v);
                                        saveStatus(v);
                                    }}
                                    options={getStatusOptions()}
                                    disabled={statusSaving}
                                />
                            }
                            style={{ boxShadow: 'none' }}
                            headStyle={{ borderBottom: 'none' }}
                            bodyStyle={{ padding: 0, height: 0 }}
                        />
                        <Card
                            size="small"
                            title={gLang('feedback.typeLabel')}
                            extra={
                                <Segmented
                                    value={typeValue}
                                    onChange={v => {
                                        setTypeValue(v as 'SUGGESTION' | 'BUG');
                                        saveType(v as 'SUGGESTION' | 'BUG');
                                    }}
                                    options={getTypeOptions()}
                                    disabled={typeSaving}
                                />
                            }
                            style={{ boxShadow: 'none' }}
                            headStyle={{ borderBottom: 'none' }}
                            bodyStyle={{ padding: 0, height: 0 }}
                        />
                        <Card
                            size="small"
                            title={gLang('feedback.tag')}
                            extra={
                                <Button
                                    type="primary"
                                    loading={tagSaving}
                                    onClick={handleSaveTag}
                                    style={{ boxShadow: 'none' }}
                                >
                                    {gLang('feedback.saveTag')}
                                </Button>
                            }
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <div>
                                    <Typography.Text
                                        strong
                                        style={{ display: 'block', marginBottom: 8 }}
                                    >
                                        {gLang('feedback.publicTag')}
                                    </Typography.Text>
                                    <FeedbackTagSelect
                                        admin
                                        allowCreate
                                        scope="PUBLIC"
                                        value={publicTagIds}
                                        onChange={setPublicTagIds}
                                        selectedTags={publicTags}
                                        placeholder={gLang('feedback.selectOrCreatePublicTag')}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <Typography.Text
                                        strong
                                        style={{ display: 'block', marginBottom: 8 }}
                                    >
                                        {gLang('feedback.internalTag')}
                                    </Typography.Text>
                                    <FeedbackTagSelect
                                        admin
                                        allowCreate
                                        scope="INTERNAL"
                                        value={internalTagIds}
                                        onChange={setInternalTagIds}
                                        selectedTags={internalTags}
                                        placeholder={gLang('feedback.selectOrCreateInternalTag')}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <Typography.Text
                                        strong
                                        style={{ display: 'block', marginBottom: 8 }}
                                    >
                                        {gLang('feedback.developerTag')}
                                    </Typography.Text>
                                    <FeedbackTagSelect
                                        admin
                                        allowCreate
                                        scope="DEVELOPER"
                                        value={developerTagIds}
                                        onChange={setDeveloperTagIds}
                                        selectedTags={developerTags}
                                        placeholder={gLang('feedback.selectOrCreateDeveloperTag')}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </Space>
                        </Card>
                        <Card size="small" title={gLang('admin.feedbackDevProgress')}>
                            <FeedbackProgressSelect
                                tid={tid}
                                value={progressTag}
                                onChanged={(newTag, oldTag) => {
                                    setProgressTag(newTag);
                                    onSaved?.();
                                    onProgressChanged?.(newTag, oldTag);
                                }}
                            />
                        </Card>
                        <Card size="small" title={gLang('feedback.subscriptions')}>
                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        value={newSubInput}
                                        onChange={e => setNewSubInput(e.target.value)}
                                        placeholder={gLang('feedback.subscriptionsPlaceholder')}
                                        onPressEnter={() => {
                                            const v = newSubInput.trim();
                                            if (v) {
                                                setSubscriptionsList(prev => {
                                                    if (prev.includes(v)) return prev;
                                                    return [...prev, v];
                                                });
                                                setNewSubInput('');
                                            }
                                        }}
                                    />
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => {
                                            const v = newSubInput.trim();
                                            if (v) {
                                                setSubscriptionsList(prev => {
                                                    if (prev.includes(v)) return prev;
                                                    return [...prev, v];
                                                });
                                                setNewSubInput('');
                                            }
                                        }}
                                    />
                                </Space.Compact>
                                {subscriptionsList.map((item, index) => (
                                    <Space
                                        key={index}
                                        style={{
                                            width: '100%',
                                            justifyContent: 'space-between',
                                            padding: '4px 0',
                                        }}
                                    >
                                        <span
                                            style={{
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {item}
                                        </span>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<MinusOutlined />}
                                            onClick={() =>
                                                setSubscriptionsList(prev =>
                                                    prev.filter((_, i) => i !== index)
                                                )
                                            }
                                        />
                                    </Space>
                                ))}

                                {subsSaving && (
                                    <span style={{ fontSize: 12, color: '#888' }}>
                                        {gLang('admin.feedbackMetaSaving')}
                                    </span>
                                )}
                            </Space>
                        </Card>
                        <Button
                            type="primary"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={handleRemoveFromFeedback}
                        >
                            {gLang('feedback.delete')}
                        </Button>
                    </Space>
                </Spin>
            </Modal>
            {modalContextHolder}
        </>
    );
};
