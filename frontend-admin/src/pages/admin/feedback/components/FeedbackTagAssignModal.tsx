import React, { useEffect, useState } from 'react';
import { Modal, Space, Typography } from 'antd';
import { fetchData } from '@common/axiosConfig';
import FeedbackTagSelect from '@common/components/Feedback/FeedbackTagSelect';
import { gLang } from '@common/language';
import { FeedbackTagSummary } from '@ecuc/shared/types/ticket.types';

const { Text } = Typography;

interface FeedbackTagAssignModalProps {
    open: boolean;
    tid?: number;
    onClose: () => void;
    onSaved?: () => void;
}

const FeedbackTagAssignModal: React.FC<FeedbackTagAssignModalProps> = ({
    open,
    tid,
    onClose,
    onSaved,
}) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publicTagIds, setPublicTagIds] = useState<number[]>([]);
    const [internalTagIds, setInternalTagIds] = useState<number[]>([]);
    const [developerTagIds, setDeveloperTagIds] = useState<number[]>([]);
    const [selectedPublicTags, setSelectedPublicTags] = useState<FeedbackTagSummary[]>([]);
    const [selectedInternalTags, setSelectedInternalTags] = useState<FeedbackTagSummary[]>([]);
    const [selectedDeveloperTags, setSelectedDeveloperTags] = useState<FeedbackTagSummary[]>([]);

    useEffect(() => {
        if (!open) {
            setLoading(false);
            setSaving(false);
            setPublicTagIds([]);
            setInternalTagIds([]);
            setDeveloperTagIds([]);
            setSelectedPublicTags([]);
            setSelectedInternalTags([]);
            setSelectedDeveloperTags([]);
            return;
        }

        if (tid) {
            setLoading(true);
            fetchData({
                url: '/feedback/meta',
                method: 'GET',
                data: { tid },
                setData: (data: {
                    publicTags?: FeedbackTagSummary[];
                    internalTags?: FeedbackTagSummary[];
                    developerTags?: FeedbackTagSummary[];
                }) => {
                    const nextPublicTags = data?.publicTags ?? [];
                    const nextInternalTags = data?.internalTags ?? [];
                    const nextDeveloperTags = data?.developerTags ?? [];
                    setSelectedPublicTags(nextPublicTags);
                    setSelectedInternalTags(nextInternalTags);
                    setSelectedDeveloperTags(nextDeveloperTags);
                    setPublicTagIds(nextPublicTags.map(tag => tag.id));
                    setInternalTagIds(nextInternalTags.map(tag => tag.id));
                    setDeveloperTagIds(nextDeveloperTags.map(tag => tag.id));
                },
            }).finally(() => setLoading(false));
            return;
        }

        setPublicTagIds([]);
        setInternalTagIds([]);
        setDeveloperTagIds([]);
        setSelectedPublicTags([]);
        setSelectedInternalTags([]);
        setSelectedDeveloperTags([]);
    }, [open, tid]);

    const handleSave = async () => {
        if (!tid) {
            return;
        }
        setSaving(true);
        try {
            await fetchData({
                url: '/feedback/admin/tags/set',
                method: 'POST',
                data: {
                    tid,
                    publicTagIds,
                    internalTagIds,
                    developerTagIds,
                },
                setData: (data: {
                    publicTags?: FeedbackTagSummary[];
                    internalTags?: FeedbackTagSummary[];
                    developerTags?: FeedbackTagSummary[];
                }) => {
                    const nextPublicTags = data?.publicTags ?? [];
                    const nextInternalTags = data?.internalTags ?? [];
                    const nextDeveloperTags = data?.developerTags ?? [];
                    setSelectedPublicTags(nextPublicTags);
                    setSelectedInternalTags(nextInternalTags);
                    setSelectedDeveloperTags(nextDeveloperTags);
                    setPublicTagIds(nextPublicTags.map(tag => tag.id));
                    setInternalTagIds(nextInternalTags.map(tag => tag.id));
                    setDeveloperTagIds(nextDeveloperTags.map(tag => tag.id));
                },
            });
            onSaved?.();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title={gLang('feedback.editTag')}
            open={open}
            onCancel={onClose}
            confirmLoading={saving}
            onOk={handleSave}
            destroyOnHidden
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        {gLang('feedback.publicTag')}
                    </Text>
                    <FeedbackTagSelect
                        admin
                        allowCreate
                        scope="PUBLIC"
                        value={publicTagIds}
                        onChange={setPublicTagIds}
                        selectedTags={selectedPublicTags}
                        placeholder={gLang('feedback.selectOrCreatePublicTag')}
                        style={{ width: '100%' }}
                        disabled={loading}
                    />
                </div>
                <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        {gLang('feedback.internalTag')}
                    </Text>
                    <FeedbackTagSelect
                        admin
                        allowCreate
                        scope="INTERNAL"
                        value={internalTagIds}
                        onChange={setInternalTagIds}
                        selectedTags={selectedInternalTags}
                        placeholder={gLang('feedback.selectOrCreateInternalTag')}
                        style={{ width: '100%' }}
                        disabled={loading}
                    />
                </div>
                <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        {gLang('feedback.developerTag')}
                    </Text>
                    <FeedbackTagSelect
                        admin
                        allowCreate
                        scope="DEVELOPER"
                        value={developerTagIds}
                        onChange={setDeveloperTagIds}
                        selectedTags={selectedDeveloperTags}
                        placeholder={gLang('feedback.selectOrCreateDeveloperTag')}
                        style={{ width: '100%' }}
                        disabled={loading}
                    />
                </div>
            </Space>
        </Modal>
    );
};

export default FeedbackTagAssignModal;
