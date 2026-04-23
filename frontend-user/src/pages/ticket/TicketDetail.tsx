// 鐜╁渚у伐鍗曡缁嗛〉闈?

import { Button, Card, Form, Popconfirm, Space, Spin, Typography, Upload } from 'antd';
import { fetchData, submitData } from '@common/axiosConfig';
import React, { useEffect, useState } from 'react';
import { gLang } from '@common/language';
import TicketDetailComponent from '../../components/TicketDetailComponent';
import { useParams } from 'react-router-dom';
import { useUploadProps } from '@common/utils/uploadUtils';
import { UploadOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { Ticket, TicketStatus, TicketType } from '@ecuc/shared/types/ticket.types';
import PageMeta from '../../components/PageMeta/PageMeta';
import { generateUserTicketMeta } from '@common/utils/ticketMeta.utils';
import FeedbackRecommendationCard from './components/FeedbackRecommendationCard';

const TicketDetail = () => {
    const { tid } = useParams();
    const [isSpinning, setIsSpinning] = useState(false);
    const [form] = Form.useForm();
    const [ticket, setTicket] = useState<Ticket | undefined>();
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [doRefresh, setDoRefresh] = useState<boolean>(false);

    const { uploadProps, contextHolder } = useUploadProps(
        10,
        uploadedFiles,
        setUploadedFiles,
        setIsUploading
    );

    useEffect(() => {
        setIsSpinning(true);
        fetchData({
            url: '/ticket/detail',
            method: 'GET',
            data: { tid: tid },
            setData: setTicket,
            setSpin: setIsSpinning,
        }).then(() => setDoRefresh(false));
    }, [doRefresh]);

    // 鏇存柊宸ュ崟璇︽儏鐨勫嚱鏁?
    const updateTicketDetail = async () => {
        await fetchData({
            url: '/ticket/detail',
            method: 'GET',
            data: { tid: tid },
            setData: updatedTicket => {
                setTicket(updatedTicket);
            },
        });
    };

    const showRpRejectGuide =
        ticket?.type === TicketType.ReportPlayer &&
        [TicketStatus.Reject, TicketStatus.AutoReject].includes(ticket.status);

    return (
        <>
            {/* 鍔ㄦ€侀〉闈eta淇℃伅 */}
            {ticket && <PageMeta {...generateUserTicketMeta(ticket)} url={window.location.href} />}

            {contextHolder}
            <Spin spinning={isSpinning} fullscreen />
            <Space direction="vertical" style={{ width: '100%' }}>
                <TicketDetailComponent ticket={ticket} isAdmin={false} />
                {showRpRejectGuide && (
                    <Card
                        style={{
                            width: '100%',
                            border: '1px solid rgba(255,255,255,0.65)',
                            borderRadius: 20,
                            overflow: 'hidden',
                            background:
                                'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,250,255,0.92) 100%)',
                            boxShadow:
                                '0 18px 40px rgba(17, 24, 39, 0.12), inset 0 1px 0 rgba(255,255,255,0.7)',
                            backdropFilter: 'blur(12px)',
                        }}
                        styles={{ body: { padding: 24 } }}
                    >
                        <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    borderRadius: 999,
                                    padding: '6px 12px',
                                    background:
                                        'linear-gradient(135deg, rgba(255,107,107,0.16) 0%, rgba(255,107,107,0.06) 100%)',
                                    border: '1px solid rgba(255,107,107,0.28)',
                                    color: '#cf1322',
                                    fontWeight: 600,
                                    width: 'fit-content',
                                }}
                            >
                                {gLang('ticketDetail.rpRejectGuide.badge')}
                            </div>

                            <Typography.Title
                                level={3}
                                style={{ margin: 0, letterSpacing: '0.3px', color: '#111827' }}
                            >
                                {gLang('ticketDetail.rpRejectGuide.title')}
                            </Typography.Title>

                            <Typography.Paragraph
                                style={{ marginBottom: 0, color: '#4b5563', fontSize: 15 }}
                            >
                                {gLang('ticketDetail.rpRejectGuide.desc')}
                            </Typography.Paragraph>

                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                {[1, 2, 3, 4].map(index => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            borderRadius: 14,
                                            padding: '12px 14px',
                                            background:
                                                'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(241,245,249,0.9) 100%)',
                                            border: '1px solid rgba(148,163,184,0.25)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: 999,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 600,
                                                fontSize: 12,
                                                color: '#fff',
                                                background:
                                                    'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                                                flexShrink: 0,
                                                boxShadow: '0 6px 12px rgba(37, 99, 235, 0.3)',
                                            }}
                                        >
                                            {index}
                                        </div>
                                        <Typography.Text style={{ color: '#1f2937', fontSize: 14 }}>
                                            {gLang(`ticketDetail.rpRejectGuide.reason${index}`)}
                                        </Typography.Text>
                                    </div>
                                ))}
                            </Space>
                        </Space>
                    </Card>
                )}
                {ticket && (
                    <FeedbackRecommendationCard
                        sourceTid={Number(tid)}
                        onDismiss={() => setDoRefresh(true)}
                    />
                )}
                {ticket &&
                    [
                        TicketStatus.WaitingAssign,
                        TicketStatus.WaitingReply,
                        TicketStatus.WaitingStaffReply,
                        TicketStatus.Entrust,
                    ].includes(ticket.status) && (
                        <>
                            <Card
                                style={{ width: '100%' }}
                                title={gLang('ticketOperate.addition')}
                                styles={{ body: { paddingBottom: 8 } }}
                            >
                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={async values => {
                                        await submitData({
                                            data: {
                                                tid: tid,
                                                details: values.details,
                                                files: uploadedFiles,
                                            },
                                            url: '/ticket/action',
                                            successMessage: 'ticketDetail.success',
                                            method: 'POST',
                                            setIsFormDisabled: setIsFormDisabled,
                                            setIsModalOpen: () => {},
                                        });
                                        // 娓呯┖涓婁紶鏂囦欢鍒楄〃
                                        setUploadedFiles([]);
                                        form.resetFields();
                                        form.setFieldsValue({ details: '' });
                                        // 鍙洿鏂板伐鍗曡鎯咃紝涓嶅埛鏂版暣涓〉闈?
                                        await updateTicketDetail();
                                    }}
                                    autoComplete="off"
                                    disabled={isFormDisabled}
                                >
                                    <Form.Item
                                        name="details"
                                        label={gLang('ticketDetail.addition')}
                                        rules={[
                                            {
                                                required: true,
                                                message: gLang('required'),
                                            },
                                        ]}
                                    >
                                        <TextArea
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            placeholder={gLang(`ticketDetail.additionIntro`)}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        label={gLang('ticketDetail.attachment')}
                                        extra={gLang('ticketDetail.attachmentIntro')}
                                        name="files"
                                        valuePropName="fileList"
                                        getValueFromEvent={e =>
                                            Array.isArray(e) ? e : e?.fileList || []
                                        }
                                    >
                                        <Upload {...uploadProps}>
                                            <Button
                                                icon={<UploadOutlined />}
                                                loading={isUploading}
                                                disabled={isUploading}
                                            >
                                                {isUploading
                                                    ? gLang('files.uploadingText')
                                                    : gLang('files.btn')}
                                            </Button>
                                        </Upload>
                                    </Form.Item>
                                    <Form.Item>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            disabled={isUploading || isFormDisabled}
                                        >
                                            {gLang('ticketDetail.submit')}
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </Card>
                            <Popconfirm
                                title={gLang('ticketDetail.dropConfirm')}
                                description={gLang('ticketDetail.dropInto')}
                                onConfirm={() =>
                                    submitData({
                                        data: { tid: tid },
                                        url: '/ticket/drop',
                                        successMessage: 'ticketDetail.dropSuccess',
                                        method: 'GET',
                                        redirectTo: '/ticket',
                                        setIsFormDisabled: () => {},
                                        setIsModalOpen: () => {},
                                    })
                                }
                                okText={gLang('ticketDetail.dropConfirmY')}
                                cancelText={gLang('ticketDetail.dropConfirmN')}
                            >
                                <Button
                                    type="primary"
                                    size="large"
                                    danger
                                    block
                                    style={{ marginTop: '10px' }}
                                >
                                    {gLang('ticketDetail.drop')}
                                </Button>
                            </Popconfirm>
                        </>
                    )}
            </Space>
        </>
    );
};

export default TicketDetail;
