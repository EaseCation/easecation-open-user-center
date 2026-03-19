// 管理端创建反馈模态框

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, message, Space, Segmented } from 'antd';
import MarkdownEditor from '@common/components/MarkdownEditor/MarkdownEditor';
import { fetchData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import { useNavigate } from 'react-router-dom';
import FeedbackTagSelect from '@common/components/Feedback/FeedbackTagSelect';

interface CreateFeedbackModalProps {
    open: boolean;
    onClose: () => void;
}

const CreateFeedbackModal: React.FC<CreateFeedbackModalProps> = ({ open, onClose }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        if (!open) {
            form.resetFields();
        }
    }, [open, form]);

    const handleSubmit = async (values: {
        title: string;
        details: string;
        isPublic: boolean;
        subscriptions?: string;
        publicTagIds?: number[];
        internalTagIds?: number[];
    }) => {
        setLoading(true);
        try {
            // 解析订阅列表（每行一个openid）
            const subscriptionsList: string[] = values.subscriptions
                ? values.subscriptions
                      .split('\n')
                      .map(line => line.trim())
                      .filter(line => line.length > 0)
                : [];

            // 创建GU类型工单（反馈），不走正常工单流程
            // 使用fetchData来获取返回的tid
            let tid: number | null = null;
            await fetchData({
                url: '/feedback/create',
                method: 'POST',
                data: {
                    title: values.title,
                    details: values.details,
                    isPublic: values.isPublic ?? true, // 默认为公开
                    subscriptions: subscriptionsList,
                    publicTagIds: values.publicTagIds ?? [],
                    internalTagIds: values.internalTagIds ?? [],
                },
                setData: (response: any) => {
                    if (response?.tid) {
                        tid = response.tid;
                    }
                },
            });

            messageApi.success(gLang('feedback.createSuccess'));
            form.resetFields();
            onClose();

            // 跳转到管理端工单操作页面
            if (tid) {
                navigate(`/ticket/operate/backToMy/${tid}`);
            }
        } catch {
            messageApi.error(gLang('feedback.createFeedbackFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {contextHolder}
            <Modal
                title={gLang('feedback.createFeedbackTitle')}
                open={open}
                onCancel={() => {
                    form.resetFields();
                    onClose();
                }}
                footer={null}
                width={600}
                destroyOnHidden
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    style={{ padding: '16px 0' }}
                >
                    <Form.Item
                        name="isPublic"
                        label={gLang('feedback.statusLabel')}
                        initialValue={true}
                        style={{ marginBottom: 16 }}
                    >
                        <Segmented
                            value={form.getFieldValue('isPublic')}
                            onChange={val => form.setFieldValue('isPublic', val)}
                            options={[
                                { value: true, label: gLang('feedback.public') },
                                { value: false, label: gLang('feedback.private') },
                            ]}
                        />
                    </Form.Item>

                    <Form.Item
                        name="title"
                        label={gLang('feedback.newTitle')}
                        rules={[
                            { required: true, message: gLang('required') },
                            { max: 100, message: gLang('feedback.titleMaxLength') },
                        ]}
                    >
                        <Input placeholder={gLang('feedback.titleIntro')} />
                    </Form.Item>

                    <Form.Item
                        name="details"
                        label={gLang('feedback.addition')}
                        rules={[{ required: true, message: gLang('required') }]}
                    >
                        <MarkdownEditor
                            placeholder={gLang('feedback.additionIntro')}
                            minRows={6}
                            maxRows={16}
                        />
                    </Form.Item>

                    <Form.Item
                        name="publicTagIds"
                        label={gLang('feedback.publicTag')}
                        initialValue={[]}
                    >
                        <FeedbackTagSelect
                            admin
                            allowCreate
                            scope="PUBLIC"
                            placeholder={gLang('feedback.selectOrCreatePublicTag')}
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
                            placeholder={gLang('feedback.selectOrCreateInternalTag')}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="subscriptions"
                        label={gLang('feedback.subscriptions')}
                        help={gLang('feedback.subscriptionsHelp')}
                    >
                        <Input.TextArea
                            rows={4}
                            placeholder={gLang('feedback.subscriptionsPlaceholder')}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space style={{ marginTop: 16 }}>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {gLang('feedback.createFeedback')}
                            </Button>
                            <Button onClick={onClose}>{gLang('cancel')}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default CreateFeedbackModal;
