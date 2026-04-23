import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Alert, message, Typography, Spin } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useTheme } from '@common/contexts/ThemeContext';
import { CUSTOM_THEME_PALETTES } from '@common/themes/customPalettes';
import { gLang } from '@common/language';
import { fetchData } from '@common/axiosConfig';

const { Text, Title } = Typography;

interface RegistrationCodeModalProps {
    open: boolean;
    onCancel: () => void;
}

type ModalState = 'loading' | 'status' | 'email-input' | 'email-sent' | 'code-display';

const requestWithFetchData = async <T,>(url: string, method: 'GET' | 'POST', data: any): Promise<T> => {
    let result: T | undefined;
    await fetchData({
        url,
        method,
        data,
        setData: response => {
            result = (response?.data ?? response) as T;
        },
        setSpin: () => {},
    });

    if (result === undefined) {
        throw new Error('Request returned empty data');
    }

    return result;
};

const RegistrationCodeModal: React.FC<RegistrationCodeModalProps> = ({ open, onCancel }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [modalState, setModalState] = useState<ModalState>('loading');
    const [messageApi, contextHolder] = message.useMessage();
    const { isCustomThemeActive, customTheme } = useTheme();

    const [statusData, setStatusData] = useState<{
        remainingAccounts: number;
        accountCreationLimit: number;
        accountCreatedCount: number;
        currentCode?: {
            code: number;
            email: string;
            expireTime: string;
        };
    } | null>(null);

    const palette = CUSTOM_THEME_PALETTES.blackOrange;
    const isBlackOrangeActive = isCustomThemeActive && customTheme === 'blackOrange';

    const modalStyles = isBlackOrangeActive
        ? {
              body: {
                  background: palette.surfaceAlt,
                  color: palette.textPrimary,
              },
              header: {
                  background: palette.surface,
                  color: palette.textPrimary,
                  borderBottom: `1px solid ${palette.border}`,
              },
              footer: {
                  background: palette.surface,
                  borderTop: `1px solid ${palette.border}`,
              },
          }
        : undefined;

    // 加载验证状态
    const loadStatus = async () => {
        try {
            setModalState('loading');
            const status = await requestWithFetchData<{
                remainingAccounts: number;
                accountCreationLimit: number;
                accountCreatedCount: number;
                currentCode?: {
                    code: number;
                    email: string;
                    expireTime: string;
                };
            }>('/openid-verification/status', 'GET', {});
            setStatusData(status);

            if (status.currentCode) {
                setModalState('code-display');
            } else {
                setModalState('status');
            }
        } catch {
            messageApi.error(gLang('ecDetail.registrationCode.loadFailed'));
            onCancel();
        }
    };

    useEffect(() => {
        if (open) {
            loadStatus();
        } else {
            setModalState('loading');
            form.resetFields();
        }
    }, [open]);

    // 发送验证邮件
    const handleSendEmail = async (values: { email: string }) => {
        try {
            setLoading(true);
            await requestWithFetchData<{ success: boolean; message: string }>(
                '/openid-verification/send-email',
                'POST',
                { email: values.email }
            );

            setModalState('email-sent');
            messageApi.success(gLang('ecDetail.registrationCode.emailSentSuccess'));
        } catch (error: any) {
            if (error.response?.status === 429) {
                messageApi.error(
                    error.response.data.data?.message ||
                        error.response.data?.message ||
                        gLang('ecDetail.registrationCode.requestTooFrequent')
                );
            } else {
                messageApi.error(gLang('ecDetail.registrationCode.requestFailed'));
            }
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        if (modalState === 'loading') {
            return (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin size="large" />
                </div>
            );
        }

        if (modalState === 'status') {
            return (
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <Alert
                        message={gLang('ecDetail.registrationCode.accountLimitTitle')}
                        description={gLang('ecDetail.registrationCode.accountLimitDesc')
                            .replace('{remaining}', String(statusData?.remainingAccounts ?? 0))
                            .replace('{limit}', String(statusData?.accountCreationLimit ?? 0))}
                        type="info"
                        showIcon
                        style={
                            isBlackOrangeActive
                                ? {
                                      background: palette.surfaceAlt,
                                      borderColor: palette.border,
                                      color: palette.textPrimary,
                                  }
                                : undefined
                        }
                    />

                    {statusData?.remainingAccounts === 0 ? (
                        <Alert
                            message={gLang('ecDetail.registrationCode.limitReachedTitle')}
                            description={gLang('ecDetail.registrationCode.limitReachedDesc')}
                            type="warning"
                            showIcon
                            style={
                                isBlackOrangeActive
                                    ? {
                                          background: palette.surfaceAlt,
                                          borderColor: palette.border,
                                          color: palette.textPrimary,
                                      }
                                    : undefined
                            }
                        />
                    ) : (
                        <Button
                            type="primary"
                            size="large"
                            block
                            onClick={() => setModalState('email-input')}
                        >
                            {gLang('ecDetail.registrationCode.getCode')}
                        </Button>
                    )}
                </Space>
            );
        }

        if (modalState === 'email-input') {
            return (
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <Alert
                        message={gLang('ecDetail.registrationCode.emailInputTitle')}
                        description={gLang('ecDetail.registrationCode.emailInputDesc')}
                        type="info"
                        showIcon
                        style={
                            isBlackOrangeActive
                                ? {
                                      background: palette.surfaceAlt,
                                      borderColor: palette.border,
                                      color: palette.textPrimary,
                                  }
                                : undefined
                        }
                    />

                    <Form form={form} onFinish={handleSendEmail} layout="vertical" size="large">
                        <Form.Item
                            label={gLang('ecDetail.registrationCode.emailLabel')}
                            name="email"
                            rules={[
                                { required: true, message: gLang('ecDetail.registrationCode.emailRequired') },
                                { type: 'email', message: gLang('ecDetail.registrationCode.emailFormatError') },
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined />}
                                placeholder={gLang('ecDetail.registrationCode.emailPlaceholder')}
                                style={
                                    isBlackOrangeActive
                                        ? {
                                              background: palette.surfaceAlt,
                                              borderColor: palette.border,
                                              color: palette.textPrimary,
                                          }
                                        : undefined
                                }
                            />
                        </Form.Item>

                        <Form.Item>
                            <Space style={{ width: '100%' }}>
                                <Button onClick={() => setModalState('status')}>{gLang('ecDetail.registrationCode.back')}</Button>
                                <Button type="primary" htmlType="submit" loading={loading} block>
                                    {gLang('ecDetail.registrationCode.sendEmail')}
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Space>
            );
        }

        if (modalState === 'email-sent') {
            return (
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <Alert
                        message={gLang('ecDetail.registrationCode.emailSentTitle')}
                        description={gLang('ecDetail.registrationCode.emailSentDescription')}
                        type="success"
                        showIcon
                    />
                    <Button type="primary" size="large" block onClick={onCancel}>
                        {gLang('ecDetail.registrationCode.close')}
                    </Button>
                </Space>
            );
        }

        if (modalState === 'code-display' && statusData?.currentCode) {
            return (
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                    <Alert
                        message={gLang('ecDetail.registrationCode.codeGeneratedTitle')}
                        description={gLang('ecDetail.registrationCode.codeGeneratedDesc')}
                        type="success"
                        showIcon
                        style={
                            isBlackOrangeActive
                                ? {
                                      background: palette.surfaceAlt,
                                      borderColor: palette.border,
                                      color: palette.textPrimary,
                                  }
                                : undefined
                        }
                    />

                    <div
                        style={{
                            background: isBlackOrangeActive ? palette.surface : '#f5f5f5',
                            padding: '24px',
                            borderRadius: '8px',
                            textAlign: 'center',
                        }}
                    >
                        <Text
                            type="secondary"
                            style={isBlackOrangeActive ? { color: palette.textSecondary } : {}}
                        >
                            {gLang('ecDetail.registrationCode.codeLabel')}
                        </Text>
                        <Title
                            level={2}
                            style={{
                                margin: '8px 0',
                                letterSpacing: '8px',
                                color: isBlackOrangeActive ? palette.accent : undefined,
                            }}
                        >
                            {statusData.currentCode.code}
                        </Title>
                        <Text
                            type="secondary"
                            style={isBlackOrangeActive ? { color: palette.textSecondary } : {}}
                        >
                            {gLang('ecDetail.registrationCode.emailPrefix')}{statusData.currentCode.email}
                        </Text>
                        <br />
                        <Text
                            type="secondary"
                            style={isBlackOrangeActive ? { color: palette.textSecondary } : {}}
                        >
                            {gLang('ecDetail.registrationCode.expirePrefix')}{new Date(statusData.currentCode.expireTime).toLocaleString()}
                        </Text>
                    </div>

                    <Button
                        type="default"
                        size="large"
                        block
                        onClick={() => setModalState('email-input')}
                    >
                        {gLang('ecDetail.registrationCode.regetCode')}
                    </Button>
                </Space>
            );
        }

        return null;
    };

    return (
        <>
            {contextHolder}
            <Modal
                title={gLang('ecDetail.registrationCode.title')}
                open={open}
                onCancel={onCancel}
                footer={null}
                styles={modalStyles}
                width={500}
            >
                {renderContent()}
            </Modal>
        </>
    );
};

export default RegistrationCodeModal;
