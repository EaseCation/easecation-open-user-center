import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Result, Button, Spin, Typography, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import Wrapper from '@common/components/Wrapper/Wrapper';
import { useTheme } from '@common/contexts/ThemeContext';
import { gLang } from '@common/language';
import { CUSTOM_THEME_PALETTES } from '@common/themes/customPalettes';
import axiosInstance from '@common/axiosConfig';

const { Title, Text } = Typography;

const verifyTokenAndGenerateCode = async (token: string) => {
    const response = await axiosInstance.post('/openid-verification/verify-token', undefined, {
        headers: {
            'x-verification-token': token,
        },
    });
    return (response.data?.data ?? response.data) as {
        code: number;
        email: string;
        expireTime: string;
        remainingAccounts: number;
    };
};

const VerifyRegistrationCodePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isCustomThemeActive, customTheme } = useTheme();

    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<{
        success: boolean;
        message: string;
        code?: number;
        email?: string;
        expireTime?: string;
        remainingAccounts?: number;
    } | null>(null);

    const token = searchParams.get('token');
    const palette = CUSTOM_THEME_PALETTES.blackOrange;
    const isBlackOrangeActive = isCustomThemeActive && customTheme === 'blackOrange';

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setResult({
                    success: false,
                    message: gLang('registrationCodeVerification.missingToken'),
                });
                setLoading(false);
                return;
            }

            try {
                const response = await verifyTokenAndGenerateCode(token);
                setResult({
                    success: true,
                    message: gLang('registrationCodeVerification.codeGenerated'),
                    code: response.code,
                    email: response.email,
                    expireTime: response.expireTime,
                    remainingAccounts: response.remainingAccounts,
                });
            } catch (error: any) {
                setResult({
                    success: false,
                    message:
                        error.response?.data?.data?.message ||
                        error.response?.data?.message ||
                        gLang('registrationCodeVerification.verificationFailed'),
                });
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, [token]);

    const cardStyle = isBlackOrangeActive
        ? {
              background: palette.surface,
              borderColor: palette.border,
          }
        : {};

    const buttonStyle = isBlackOrangeActive
        ? {
              background: palette.accent,
              borderColor: palette.accent,
              color: palette.textPrimary,
          }
        : {};

    if (loading) {
        return (
            <Wrapper>
                <Card style={cardStyle}>
                    <div style={{ textAlign: 'center', padding: '50px 0' }}>
                        <Spin
                            indicator={
                                <LoadingOutlined
                                    style={{
                                        fontSize: 48,
                                        color: isBlackOrangeActive ? palette.accent : '#1890ff',
                                    }}
                                    spin
                                />
                            }
                            size="large"
                        />
                        <div style={{ marginTop: 24 }}>
                            <Text
                                style={{
                                    color: isBlackOrangeActive ? palette.textPrimary : '#000000',
                                    fontSize: 16,
                                }}
                            >
                                {gLang('registrationCodeVerification.verifying')}
                            </Text>
                        </div>
                    </div>
                </Card>
            </Wrapper>
        );
    }

    if (!result) {
        return (
            <Wrapper>
                <Card style={cardStyle}>
                    <Result
                        status="error"
                        title={gLang('registrationCodeVerification.verificationFailed')}
                        subTitle={gLang('registrationCodeVerification.verificationError')}
                    />
                </Card>
            </Wrapper>
        );
    }

    return (
        <Wrapper>
            <Card style={cardStyle}>
                {result.success && result.code ? (
                    <div style={{ maxWidth: 500, margin: '0 auto', padding: '20px 0' }}>
                        <Result
                            icon={
                                <CheckCircleOutlined
                                    style={{ color: isBlackOrangeActive ? '#52c41a' : '#52c41a' }}
                                />
                            }
                            status="success"
                            title={
                                <Text
                                    style={{
                                        color: isBlackOrangeActive ? palette.textPrimary : '#000000',
                                        fontSize: 20,
                                        fontWeight: 500,
                                    }}
                                >
                                    {gLang('registrationCodeVerification.success')}
                                </Text>
                            }
                            subTitle={
                                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                    <Text
                                        style={{
                                            color: isBlackOrangeActive
                                                ? palette.textSecondary
                                                : '#666666',
                                        }}
                                    >
                                        {gLang('registrationCodeVerification.useCodeInGame')}
                                    </Text>

                                    <div
                                        style={{
                                            background: isBlackOrangeActive
                                                ? palette.surfaceAlt
                                                : '#f5f5f5',
                                            padding: '24px',
                                            borderRadius: '8px',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Text
                                            type="secondary"
                                            style={
                                                isBlackOrangeActive
                                                    ? { color: palette.textSecondary }
                                                    : {}
                                            }
                                        >
                                            {gLang('ecDetail.registrationCode.codeLabel')}
                                        </Text>
                                        <Title
                                            level={2}
                                            style={{
                                                margin: '8px 0',
                                                letterSpacing: '8px',
                                                color: isBlackOrangeActive
                                                    ? palette.accent
                                                    : undefined,
                                            }}
                                        >
                                            {result.code}
                                        </Title>
                                        <Text
                                            type="secondary"
                                            style={
                                                isBlackOrangeActive
                                                    ? { color: palette.textSecondary }
                                                    : {}
                                            }
                                        >
                                            {gLang('ecDetail.registrationCode.emailPrefix')}
                                            {result.email}
                                        </Text>
                                        <br />
                                        <Text
                                            type="secondary"
                                            style={
                                                isBlackOrangeActive
                                                    ? { color: palette.textSecondary }
                                                    : {}
                                            }
                                        >
                                            {gLang('ecDetail.registrationCode.expirePrefix')}
                                            {result.expireTime
                                                ? new Date(result.expireTime).toLocaleString()
                                                : ''}
                                        </Text>
                                    </div>

                                    {result.remainingAccounts !== undefined && (
                                        <Text
                                            style={{
                                                color: isBlackOrangeActive
                                                    ? palette.textSecondary
                                                    : '#666666',
                                            }}
                                        >
                                            {gLang(
                                                'registrationCodeVerification.remainingAccounts'
                                            ).replace(
                                                '{remaining}',
                                                String(result.remainingAccounts)
                                            )}
                                        </Text>
                                    )}
                                </Space>
                            }
                            extra={
                                <Button
                                    type="primary"
                                    onClick={() => navigate('/login')}
                                    style={buttonStyle}
                                >
                                    {gLang('registrationCodeVerification.goToLogin')}
                                </Button>
                            }
                        />
                    </div>
                ) : (
                    <Result
                        icon={
                            <CloseCircleOutlined
                                style={{ color: isBlackOrangeActive ? '#ff4d4f' : '#ff4d4f' }}
                            />
                        }
                        status="error"
                        title={
                            <Text
                                style={{
                                    color: isBlackOrangeActive ? palette.textPrimary : '#000000',
                                    fontSize: 20,
                                    fontWeight: 500,
                                }}
                            >
                                {gLang('registrationCodeVerification.failed')}
                            </Text>
                        }
                        subTitle={
                            <Text
                                style={{
                                    color: isBlackOrangeActive ? palette.textSecondary : '#666666',
                                }}
                            >
                                {result.message}
                            </Text>
                        }
                        extra={
                            <Button
                                type="primary"
                                onClick={() => navigate('/login')}
                                style={buttonStyle}
                            >
                                {gLang('registrationCodeVerification.goToLogin')}
                            </Button>
                        }
                    />
                )}
            </Card>
        </Wrapper>
    );
};

export default VerifyRegistrationCodePage;
