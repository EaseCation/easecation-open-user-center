/**
 * Modal to edit a single feedback detail: action, displayTitle, content, 精华, 仅显示给发布者.
 * Fetches by GET /feedback/admin/detail/:id; saves by PUT /feedback/admin/detail/:id.
 * Content is edited as plain text (NOTE markers stripped); MARK/ONLY_DISPLAY drive toggles.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Input, Spin, Button, App, Grid, Segmented, Form } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import axiosInstance from '@common/axiosConfig';
import { gLang } from '@common/language';
import { TicketAction } from '@ecuc/shared/types/ticket.types';
import PunishmentManagementModal from './openid-panel/PunishmentManagementModal';

const NOTE_REGEX = /\[\[\[NOTE\|([\s\S]*?)\]\]\]/g;

function stripNoteMarkers(content: string): string {
    return (content || '')
        .replace(/\[\[\[NOTE\|[\s\S]*?\]\]\]/g, '')
        .replace(/\n\n+/g, '\n')
        .trim();
}

function normalizeEmptyLines(content: string): string {
    return content || '';
}

function parseNoteMarkAndOnlyDisplay(content: string): {
    featured: boolean;
    onlyDisplayOpenids: string[];
} {
    let featured = false;
    const onlyDisplayOpenids: string[] = [];
    let m: RegExpExecArray | null;
    NOTE_REGEX.lastIndex = 0;
    while ((m = NOTE_REGEX.exec(content)) !== null) {
        const obj = JSON.parse(m[1]) as { MARK?: string; ONLY_DISPLAY?: string[] };
        if (obj.MARK) {
            const marks = String(obj.MARK).split(' · ');
            if (marks.includes(gLang('admin.feedbackEditHighlight'))) featured = true;
        }
        if (Array.isArray(obj.ONLY_DISPLAY)) {
            obj.ONLY_DISPLAY.forEach((o: string) => {
                if (typeof o === 'string' && o && !onlyDisplayOpenids.includes(o))
                    onlyDisplayOpenids.push(o);
            });
        }
    }
    return { featured, onlyDisplayOpenids };
}

export interface FeedbackDetailEditModalProps {
    open: boolean;
    detailId: number | null;
    onClose: () => void;
    onSaved?: () => void;
}

/** "仅显示给发布者" = only the poster of this detail (operator) can see it, e.g. NexaId_79 */
export const FeedbackDetailEditModal: React.FC<FeedbackDetailEditModalProps> = ({
    open,
    detailId,
    onClose,
    onSaved,
}) => {
    const { message: messageApi } = App.useApp();
    const screens = Grid.useBreakpoint();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [punishmentModalOpen, setPunishmentModalOpen] = useState(false);
    const [operator, setOperator] = useState('');
    const [displayTitle, setDisplayTitle] = useState('');
    const [content, setContent] = useState('');
    const [action, setAction] = useState<string>(TicketAction.Reply);
    const [featured, setFeatured] = useState(false);
    const [onlyDisplayToPoster, setOnlyDisplayToPoster] = useState(false);

    const loadDetail = useCallback(async () => {
        if (!open || detailId == null) return;
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/feedback/admin/detail/${detailId}`);
            const data = res?.data ?? {};
            if (data.EPF_code != null && data.EPF_code !== 200) {
                messageApi.error(
                    data.message || data.EPF_description || gLang('admin.feedbackEditLoadFailed')
                );
                return;
            }
            const rawContent = data.content ?? '';
            const { featured: feat, onlyDisplayOpenids } = parseNoteMarkAndOnlyDisplay(rawContent);
            setOperator(data.operator ?? '');
            setDisplayTitle(data.displayTitle ?? '');
            setContent(stripNoteMarkers(rawContent));
            setAction(data.action === TicketAction.Note ? TicketAction.Note : TicketAction.Reply);
            setFeatured(feat);
            setOnlyDisplayToPoster(
                Array.isArray(onlyDisplayOpenids) && onlyDisplayOpenids.length > 0
            );
        } catch (e: any) {
            messageApi.error(
                e?.response?.data?.message || e?.message || gLang('admin.feedbackEditLoadFailed')
            );
        } finally {
            setLoading(false);
        }
    }, [open, detailId]);

    useEffect(() => {
        if (open && detailId != null) loadDetail();
    }, [open, detailId, loadDetail]);

    const handleSave = async () => {
        if (detailId == null) return;
        setSaving(true);
        try {
            const only_display_openids = onlyDisplayToPoster && operator ? [operator] : [];
            await axiosInstance.put(`/feedback/admin/detail/${detailId}`, {
                action,
                displayTitle,
                content: normalizeEmptyLines(content),
                featured,
                only_display_openids,
            });
            messageApi.success(gLang('common.saved'));
            onSaved?.();
            onClose();
        } catch (e: any) {
            messageApi.error(
                e?.response?.data?.message || e?.message || gLang('admin.feedbackEditSaveFailed')
            );
        } finally {
            setSaving(false);
        }
    };

    const titleText = operator
        ? `${displayTitle || ''} (${operator})`
        : displayTitle || gLang('admin.feedbackEditTitle');
    const modalTitle = (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingRight: 8 }}>
            <span>{titleText}</span>
            {operator ? (
                <Button
                    type="text"
                    icon={<UserOutlined />}
                    size="small"
                    onClick={() => setPunishmentModalOpen(true)}
                    style={{ marginLeft: 8 }}
                />
            ) : null}
        </div>
    );

    return (
        <>
            <Modal
                title={modalTitle}
                open={open}
                onCancel={onClose}
                footer={[
                    <Button key="cancel" onClick={onClose} disabled={saving}>
                        {gLang('common.cancel')}
                    </Button>,
                    <Button
                        key="save"
                        type="primary"
                        onClick={handleSave}
                        loading={saving}
                        disabled={loading}
                    >
                        {gLang('common.save')}
                    </Button>,
                ]}
                width={600}
                destroyOnClose
                style={{ borderRadius: 8 }}
                styles={{
                    body: {
                        padding: '16px 16px 0 8px',
                    },
                    footer: {
                        padding: '12px 16px 16px',
                    },
                }}
            >
                <Spin spinning={loading}>
                    <Form
                        layout="horizontal"
                        colon={false}
                        labelAlign="right"
                        labelCol={{ flex: '64px' }}
                        wrapperCol={{ flex: 1 }}
                        style={{ paddingTop: 4 }}
                    >
                        <Form.Item label={gLang('feedback.messageType')} style={{ marginBottom: 20 }}>
                            <Segmented
                                value={featured ? 'featured' : 'normal'}
                                onChange={val => setFeatured(val === 'featured')}
                                options={[
                                    { value: 'normal', label: gLang('feedback.normal') },
                                    { value: 'featured', label: gLang('feedback.featured') },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item label={gLang('feedback.visibility')} style={{ marginBottom: 20 }}>
                            <Segmented
                                value={onlyDisplayToPoster ? 'poster' : 'all'}
                                onChange={val => setOnlyDisplayToPoster(val === 'poster')}
                                options={[
                                    { value: 'all', label: gLang('feedback.allVisible') },
                                    { value: 'poster', label: gLang('feedback.onlyPoster') },
                                ]}
                                disabled={!operator}
                            />
                        </Form.Item>
                        <Form.Item label={gLang('feedback.action')} style={{ marginBottom: 20 }}>
                            <Segmented
                                value={action}
                                onChange={setAction}
                                options={[
                                    {
                                        value: TicketAction.Reply,
                                        label: gLang('feedback.actionStatus.reply'),
                                    },
                                    {
                                        value: TicketAction.Note,
                                        label: gLang('feedback.actionStatus.note'),
                                    },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item
                            label={gLang('feedback.displayName')}
                            style={{ marginBottom: 20 }}
                        >
                            <Input
                                value={displayTitle}
                                onChange={e => setDisplayTitle(e.target.value)}
                                placeholder={gLang('feedback.displayName')}
                            />
                        </Form.Item>
                        <Form.Item label={gLang('feedback.content')} style={{ marginBottom: 0 }}>
                            <Input.TextArea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder={gLang('feedback.content')}
                                rows={6}
                            />
                        </Form.Item>
                    </Form>
                </Spin>
            </Modal>
            <PunishmentManagementModal
                openid={operator}
                visible={punishmentModalOpen}
                onClose={() => setPunishmentModalOpen(false)}
                screens={screens}
            />
        </>
    );
};
