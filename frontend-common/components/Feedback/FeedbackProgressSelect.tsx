import React, { useEffect, useState, useCallback } from 'react';
import { Badge, Grid, Modal, Segmented, Space, message } from 'antd';
import { fetchData, submitData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import { FeedbackTagSummary, sortByProgressOrder } from '@ecuc/shared/types/ticket.types';
import { PROGRESS_DOT_COLOR } from './FeedbackTagGroup';

interface FeedbackProgressSelectProps {
    tid: number;
    value: FeedbackTagSummary | null;
    /**
     * autoSave=true (默认): 选择后弹确认框并调用 API 保存，然后触发 onChanged。
     * autoSave=false: 选择后仅触发 onChanged，由父组件负责保存。
     */
    autoSave?: boolean;
    onChanged?: (newTag: FeedbackTagSummary | null, oldTag: FeedbackTagSummary | null) => void;
    disabled?: boolean;
    size?: 'small' | 'middle' | 'large';
    block?: boolean;
    showBadge?: boolean;
}

const NONE_VALUE = '__none__';

const FeedbackProgressSelect: React.FC<FeedbackProgressSelectProps> = ({
    tid,
    value,
    autoSave = true,
    onChanged,
    disabled = false,
    size,
    block = false,
    showBadge = true,
}) => {
    const screens = Grid.useBreakpoint();
    const isCompact = !screens.md;
    const [options, setOptions] = useState<FeedbackTagSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const [modal, modalContextHolder] = Modal.useModal();

    useEffect(() => {
        fetchData({
            url: '/feedback/admin/tags/options',
            method: 'GET',
            data: { scope: 'PROGRESS' },
            setData: (data: any) => {
                if (data?.list) setOptions(data.list);
            },
        });
    }, []);

    const sortedOptions = sortByProgressOrder(options);
    const segmentedOptions = [
        {
            label: showBadge ? (
                <Space size={4}>
                    <Badge status="default" />
                    {gLang('admin.feedbackProgressNone')}
                </Space>
            ) : (
                gLang('admin.feedbackProgressNone')
            ),
            value: NONE_VALUE,
        },
        ...sortedOptions.map(opt => ({
            label: showBadge ? (
                <Space size={4}>
                    <Badge color={PROGRESS_DOT_COLOR[opt.name] ?? '#888'} />
                    {opt.name}
                </Space>
            ) : (
                opt.name
            ),
            value: String(opt.id),
        })),
    ];

    const currentValue = value ? String(value.id) : NONE_VALUE;

    const resolveTag = useCallback(
        (newTagId: number | null): FeedbackTagSummary | null =>
            newTagId ? options.find(o => o.id === newTagId) ?? null : null,
        [options]
    );

    const doSaveAndNotify = useCallback(
        async (newTagId: number | null) => {
            const oldTag = value;
            setLoading(true);
            try {
                await submitData({
                    url: '/feedback/admin/progress',
                    method: 'POST',
                    data: { tid, progressTagId: newTagId },
                    successMessage: 'feedback.progressSaved',
                    setIsFormDisabled: () => {},
                    setIsModalOpen: () => {},
                });
                onChanged?.(resolveTag(newTagId), oldTag);
            } catch (e: any) {
                messageApi.error(e?.message || gLang('admin.feedbackSetProgressFailed'));
            } finally {
                setLoading(false);
            }
        },
        [tid, value, resolveTag, onChanged, messageApi]
    );

    const handleChange = useCallback(
        (val: string | number) => {
            const strVal = String(val);
            const newTagId = strVal === NONE_VALUE ? null : parseInt(strVal, 10);

            if (!autoSave) {
                // 受控模式：直接通知父组件，不调 API
                onChanged?.(resolveTag(newTagId), value);
                return;
            }

            // 自动保存模式：弹确认框后调 API
            const noneLabel = gLang('admin.feedbackProgressNone');
            const newName = resolveTag(newTagId)?.name ?? noneLabel;
            const oldName = value?.name ?? noneLabel;
            modal.confirm({
                title: gLang('admin.feedbackProgressConfirmTitle'),
                content: gLang('admin.feedbackProgressConfirmContent', { oldName, newName }),
                okText: gLang('admin.feedbackConfirm'),
                cancelText: gLang('cancel'),
                onOk: () => doSaveAndNotify(newTagId),
            });
        },
        [autoSave, value, resolveTag, modal, doSaveAndNotify, onChanged]
    );

    return (
        <>
            {contextHolder}
            {modalContextHolder}
            <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
                <Segmented
                    options={segmentedOptions}
                    value={currentValue}
                    onChange={handleChange}
                    disabled={disabled || loading}
                    size={size ?? (isCompact ? 'small' : 'middle')}
                    block={block}
                />
            </div>
        </>
    );
};

export default FeedbackProgressSelect;
