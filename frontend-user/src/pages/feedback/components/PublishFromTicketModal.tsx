import React, { useState, useEffect } from 'react';
import { Modal, Button, Typography, Alert, Space, Upload, message, Collapse, Tag } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axiosInstance from '@common/axiosConfig';
import { gLang } from '@common/language';
import { useUploadProps } from '@common/utils/uploadUtils';
import TextArea from 'antd/es/input/TextArea';

const { Text } = Typography;

interface PublishFromTicketModalProps {
    open: boolean;
    onClose: () => void;
    recommendationId: number;
    feedbackTid: number;
    feedbackTitle: string;
    initialContent: string;
    initialFiles: string[];
    onSuccess: () => void;
}

const PublishFromTicketModal: React.FC<PublishFromTicketModalProps> = ({
    open,
    onClose,
    recommendationId,
    feedbackTid,
    feedbackTitle,
    initialContent,
    initialFiles,
    onSuccess,
}) => {
    const [content, setContent] = useState(initialContent);
    const [files, setFiles] = useState<string[]>(initialFiles);
    const [submitting, setSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    const { uploadProps, contextHolder: uploadContextHolder } = useUploadProps(
        10,
        files,
        setFiles,
        setIsUploading
    );

    useEffect(() => {
        if (open) {
            setContent(initialContent);
            setFiles(initialFiles);
            setAdvancedOpen(false);
        }
    }, [open, initialContent, initialFiles]);

    const trimmedContent = content.trim();

    const handleSubmit = async () => {
        if (!trimmedContent && files.length === 0) {
            messageApi.warning(gLang('feedback.recommendation.modalContentRequired'));
            return;
        }
        setSubmitting(true);
        try {
            const res = await axiosInstance.post('/feedback/recommendation/publish', {
                recommendationId,
                content: trimmedContent,
                files,
            });
            if (res.data?.EPF_code === 200) {
                onClose();
                onSuccess();
            } else {
                messageApi.error(
                    res.data?.message || gLang('feedback.recommendation.publishFailed')
                );
            }
        } catch {
            messageApi.error(gLang('feedback.recommendation.publishFailedRetry'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={gLang('feedback.recommendation.modalTitle')}
            open={open}
            onCancel={onClose}
            footer={null}
            width={640}
            destroyOnClose
        >
            {contextHolder}
            {uploadContextHolder}

            <Alert
                type="warning"
                showIcon
                message={gLang('feedback.recommendation.modalPublicWarning')}
                style={{ marginBottom: 16 }}
            />

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message={
                    feedbackTitle
                        ? gLang('feedback.recommendation.modalTargetWithTitle')
                              .replace('{tid}', String(feedbackTid))
                              .replace('{title}', feedbackTitle)
                        : gLang('feedback.recommendation.modalTargetWithoutTitle').replace(
                              '{tid}',
                              String(feedbackTid)
                          )
                }
                description={gLang('feedback.recommendation.confirmPublishDesc')}
            />

            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <div>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>
                        {gLang('feedback.recommendation.modalPreviewTitle')}
                    </Text>
                    <div
                        style={{
                            border: '1px solid #f0f0f0',
                            borderRadius: 8,
                            padding: 12,
                            background: '#fafafa',
                        }}
                    >
                        <Text style={{ whiteSpace: 'pre-wrap', display: 'block' }}>
                            {trimmedContent || gLang('feedback.recommendation.modalPreviewEmpty')}
                        </Text>
                        {files.length > 0 && (
                            <div
                                style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}
                            >
                                {files.map(file => {
                                    const fileName = file.substring(file.lastIndexOf('/') + 1);
                                    return <Tag key={file}>{fileName}</Tag>;
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <Collapse
                    activeKey={advancedOpen ? ['advanced'] : []}
                    onChange={keys =>
                        setAdvancedOpen(Array.isArray(keys) && keys.includes('advanced'))
                    }
                    items={[
                        {
                            key: 'advanced',
                            label: gLang('feedback.recommendation.modalAdvancedSection'),
                            children: (
                                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                    <Text type="secondary">
                                        {gLang('feedback.recommendation.modalAdvancedDesc')}
                                    </Text>
                                    <div>
                                        <Text strong style={{ display: 'block', marginBottom: 6 }}>
                                            {gLang('feedback.recommendation.modalContentLabel')}
                                        </Text>
                                        <TextArea
                                            value={content}
                                            onChange={e => setContent(e.target.value)}
                                            autoSize={{ minRows: 4, maxRows: 12 }}
                                            placeholder={gLang(
                                                'feedback.recommendation.modalContentPlaceholder'
                                            )}
                                        />
                                    </div>

                                    <div>
                                        <Text strong style={{ display: 'block', marginBottom: 6 }}>
                                            {gLang('feedback.recommendation.modalAttachmentLabel')}
                                        </Text>
                                        <Upload {...uploadProps}>
                                            <Button
                                                icon={<UploadOutlined />}
                                                loading={isUploading}
                                                disabled={isUploading}
                                            >
                                                {isUploading
                                                    ? gLang(
                                                          'feedback.recommendation.modalUploading'
                                                      )
                                                    : gLang(
                                                          'feedback.recommendation.modalUploadBtn'
                                                      )}
                                            </Button>
                                        </Upload>
                                    </div>
                                </Space>
                            ),
                        },
                    ]}
                />

                <Alert
                    type="info"
                    message={gLang('feedback.recommendation.modalCloseInfo')}
                    style={{ marginTop: 4 }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <Button onClick={onClose}>
                        {gLang('feedback.recommendation.modalCancel')}
                    </Button>
                    <Button
                        type="primary"
                        onClick={handleSubmit}
                        loading={submitting}
                        disabled={(!trimmedContent && files.length === 0) || isUploading}
                    >
                        {gLang('feedback.recommendation.modalSubmit')}
                    </Button>
                </div>
            </Space>
        </Modal>
    );
};

export default PublishFromTicketModal;
