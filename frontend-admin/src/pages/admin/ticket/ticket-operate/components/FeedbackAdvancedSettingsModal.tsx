import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, Space, Spin, Typography, message, Segmented, Card } from 'antd';
import { DeleteOutlined, MinusOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { fetchData, submitData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import { FeedbackTagSummary, TicketStatus } from '@ecuc/shared/types/ticket.types';

const SUBS_DEBOUNCE_MS = 800;

interface FeedbackAdvancedSettingsModalProps {
    open: boolean;
    tid: number;
    onClose: () => void;
    onSaved?: () => void;
}

const FeedbackAdvancedSettingsModal: React.FC<FeedbackAdvancedSettingsModalProps> = ({
    open,
    tid,
    onClose,
    onSaved,
}) => {
    const [loading, setLoading] = useState(false);
    const [titleValue, setTitleValue] = useState('');
    const [initialTitleValue, setInitialTitleValue] = useState('');
    const [titleSaving, setTitleSaving] = useState(false);
    const [subsSaving, setSubsSaving] = useState(false);
    const [subscriptionsList, setSubscriptionsList] = useState<string[]>([]);
    const [newSubInput, setNewSubInput] = useState('');
    const [modal, modalContextHolder] = Modal.useModal();
    const [messageApi, contextHolder] = message.useMessage();
    const subsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedSubsRef = useRef<string>('');
    const [statusValue, setStatusValue] = useState<TicketStatus>(TicketStatus.WaitingAssign);
    const [statusSaving, setStatusSaving] = useState(false);
    const [typeValue, setTypeValue] = useState<'SUGGESTION' | 'BUG'>('SUGGESTION');
    const [typeSaving, setTypeSaving] = useState(false);

    const getStatusOptions = () => [
        { value: TicketStatus.WaitingAssign, label: gLang('admin.feedbackMetaOpen') },
        { value: TicketStatus.Reject, label: gLang('admin.feedbackMetaClose') },
        { value: TicketStatus.Accept, label: gLang('admin.feedbackMetaEnd') },
    ];

    const getTypeOptions = () => [
        { value: 'SUGGESTION', label: gLang('admin.feedbackMetaSuggestion') },
        { value: 'BUG', label: gLang('admin.feedbackMetaBug') },
    ];

    const loadSettings = useCallback(() => {
        if (!open || !tid) return;
        setLoading(true);
        fetchData({
            url: '/feedback/meta',
            method: 'GET',
            data: { tid },
            setData: (data: {
                title?: string;
                type?: 'SUGGESTION' | 'BUG';
                subscriptions?: string[];
                publicTags?: FeedbackTagSummary[];
                internalTags?: FeedbackTagSummary[];
                developerTags?: FeedbackTagSummary[];
                progressTag?: FeedbackTagSummary | null;
            }) => {
                const nextTitle = data?.title ?? '';
                setTitleValue(nextTitle);
                setInitialTitleValue(nextTitle);
                setTypeValue(data?.type ?? 'SUGGESTION');
                const list = data?.subscriptions ?? [];
                setSubscriptionsList(list);
                lastSavedSubsRef.current = JSON.stringify(list);
            },
        })
            .catch(() => messageApi.error(gLang('admin.feedbackMetaLoadFailed')))
            .finally(() => setLoading(false));
    }, [open, tid, messageApi]);

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

    const saveTitle = useCallback(async () => {
        const normalizedTitle = titleValue.trim();
        if (!normalizedTitle) {
            messageApi.error(gLang('feedback.titleRequired'));
            return;
        }
        if (normalizedTitle.length > 100) {
            messageApi.error(gLang('feedback.titleMaxLength'));
            return;
        }

        setTitleSaving(true);
        try {
            await submitData({
                url: '/feedback/title',
                method: 'POST',
                data: { tid, title: normalizedTitle },
                successMessage: 'feedback.titleSaved',
                setIsFormDisabled: () => {},
                setIsModalOpen: () => {},
            });
            setTitleValue(normalizedTitle);
            setInitialTitleValue(normalizedTitle);
            onSaved?.();
        } finally {
            setTitleSaving(false);
        }
    }, [messageApi, onSaved, tid, titleValue]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    useEffect(() => {
        const serialized = JSON.stringify(subscriptionsList);
        if (!open || !tid || serialized === lastSavedSubsRef.current) return;
        if (subsDebounceRef.current) {
            clearTimeout(subsDebounceRef.current);
        }
        subsDebounceRef.current = setTimeout(() => {
            subsDebounceRef.current = null;
            void saveSubscriptions(subscriptionsList);
        }, SUBS_DEBOUNCE_MS);
        return () => {
            if (subsDebounceRef.current) {
                clearTimeout(subsDebounceRef.current);
            }
        };
    }, [open, tid, subscriptionsList, saveSubscriptions]);

    const handleRemoveFromFeedback = useCallback(() => {
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
    }, [modal, tid, onSaved, onClose]);

    const normalizedTitle = titleValue.trim();
    const titleChanged = normalizedTitle !== initialTitleValue.trim();
    const isTitleInvalid = !normalizedTitle || normalizedTitle.length > 100;

    return (
        <>
            {contextHolder}
            {modalContextHolder}
            <Modal
                open={open}
                onCancel={onClose}
                footer={null}
                title={
                    <Space size={8}>
                        <SettingOutlined />
                        <span>{gLang('feedback.advancedSettings')}</span>
                    </Space>
                }
                width={720}
                destroyOnClose
            >
                <Spin spinning={loading}>
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Card size="small" style={{ boxShadow: 'none' }}>
                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                <Typography.Text strong>
                                    {gLang('feedback.feedbackTitle')}
                                </Typography.Text>
                                <Input
                                    value={titleValue}
                                    onChange={event => setTitleValue(event.target.value)}
                                    placeholder={gLang('feedback.titleIntro')}
                                    maxLength={100}
                                    showCount
                                />
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                    }}
                                >
                                    <Button
                                        type="primary"
                                        onClick={() => void saveTitle()}
                                        loading={titleSaving}
                                        disabled={!titleChanged || isTitleInvalid}
                                    >
                                        {gLang('common.save')}
                                    </Button>
                                </div>
                            </Space>
                        </Card>
                        <Card size="small" style={{ boxShadow: 'none' }}>
                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Typography.Text strong>
                                        {gLang('feedback.statusLabel')}
                                    </Typography.Text>
                                    <Segmented
                                        value={statusValue}
                                        onChange={value => {
                                            const v = value as TicketStatus;
                                            setStatusValue(v);
                                            void saveStatus(v);
                                        }}
                                        options={getStatusOptions()}
                                        disabled={statusSaving}
                                    />
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Typography.Text strong>
                                        {gLang('feedback.typeLabel')}
                                    </Typography.Text>
                                    <Segmented
                                        value={typeValue}
                                        onChange={value => {
                                            const v = value as 'SUGGESTION' | 'BUG';
                                            setTypeValue(v);
                                            void saveType(v);
                                        }}
                                        options={getTypeOptions()}
                                        disabled={typeSaving}
                                    />
                                </div>
                            </Space>
                        </Card>
                        <div>
                            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                                {gLang('feedback.subscriptions')}
                            </Typography.Text>
                            <Space direction="vertical" style={{ width: '100%' }} size="small">
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        value={newSubInput}
                                        onChange={event => setNewSubInput(event.target.value)}
                                        placeholder={gLang('feedback.subscriptionsPlaceholder')}
                                        onPressEnter={() => {
                                            const value = newSubInput.trim();
                                            if (!value) return;
                                            setSubscriptionsList(prev => {
                                                if (prev.includes(value)) return prev;
                                                return [...prev, value];
                                            });
                                            setNewSubInput('');
                                        }}
                                    />
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => {
                                            const value = newSubInput.trim();
                                            if (!value) return;
                                            setSubscriptionsList(prev => {
                                                if (prev.includes(value)) return prev;
                                                return [...prev, value];
                                            });
                                            setNewSubInput('');
                                        }}
                                    />
                                </Space.Compact>
                                {subscriptionsList.length > 0 ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                        }}
                                    >
                                        {subscriptionsList.map((item, index) => (
                                            <div
                                                key={`${item}-${index}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '4px 8px',
                                                    borderRadius: 999,
                                                    border: '1px solid var(--ant-color-border-secondary)',
                                                    background: 'var(--ant-color-fill-tertiary)',
                                                }}
                                            >
                                                <span>{item}</span>
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<MinusOutlined />}
                                                    onClick={() =>
                                                        setSubscriptionsList(prev =>
                                                            prev.filter((_, i) => i !== index)
                                                        )
                                                    }
                                                    style={{ width: 18, height: 18 }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                {subsSaving ? (
                                    <span style={{ fontSize: 12, color: '#888' }}>
                                        {gLang('admin.feedbackMetaSaving')}
                                    </span>
                                ) : null}
                            </Space>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                            }}
                        >
                            <Button
                                type="primary"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={handleRemoveFromFeedback}
                            >
                                {gLang('feedback.delete')}
                            </Button>
                        </div>
                    </Space>
                </Spin>
            </Modal>
        </>
    );
};

export default FeedbackAdvancedSettingsModal;
