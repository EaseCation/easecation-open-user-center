// 我的游戏账号列表

import { Button, Form, Input, message, Modal, Skeleton, Space, Typography } from 'antd';
import { gLang } from '@common/language';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CardWithBadgeComponent from '../../components/CardWithBadgeComponent';
import { fetchData, submitData } from '@common/axiosConfig';
import { ltransMedia, ltransVip, ltransVipColor } from '@common/languageTrans';
import { PlayerBindListData } from '@ecuc/shared/types/player.types';
import Wrapper from '@common/components/Wrapper/Wrapper';
import PageTitle from '@common/components/PageTitle/PageTitle';
import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import PageIntro from '../../components/PageIntro/PageIntro';
import ErrorDisplay from '../../components/ErrorDisplay';
import usePageTitle from '@common/hooks/usePageTitle';
import { useTheme } from '@common/contexts/ThemeContext';
import { CUSTOM_THEME_PALETTES } from '@common/themes/customPalettes';
import AccountRecoveryModal from './components/AccountRecoveryModal';
import RegistrationCodeModal from './components/RegistrationCodeModal';

// 淡入动画
const fadeInUpAnimation = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;

// 添加动画样式到文档头部
if (typeof document !== 'undefined' && !document.getElementById('fadeInUpAnimation')) {
    const style = document.createElement('style');
    style.id = 'fadeInUpAnimation';
    style.innerHTML = fadeInUpAnimation;
    document.head.appendChild(style);
}

const Account = () => {
    usePageTitle(); // 使用页面标题管理Hook
    const { Paragraph } = Typography;
    const { getThemeColor, customTheme, isCustomThemeActive } = useTheme();
    const location = useLocation();
    const palette = CUSTOM_THEME_PALETTES.blackOrange;
    const isBlackOrangeActive = isCustomThemeActive && customTheme === 'blackOrange';

    // Check if this is the first visit after login
    const isFirstVisitAfterLogin = useMemo(() => {
        const hasShownAnimation = sessionStorage.getItem('accountAnimationShown');
        const isFromLogin =
            document.referrer.includes('/login') ||
            document.referrer.includes('/login/callback') ||
            location.state?.fromLogin === true;

        // If coming from login and haven't shown animation yet, show full animation
        if (isFromLogin && !hasShownAnimation) {
            sessionStorage.setItem('accountAnimationShown', 'true');
            return true;
        }
        return false;
    }, [location.state]);

    // Animation delay: longer for first visit (0.1s), shorter for subsequent visits (0.02s)
    const animationDelay = isFirstVisitAfterLogin ? 0.1 : 0.02;

    const primaryTextColor = getThemeColor({
        light: '#1f1f1f',
        dark: '#f5f5f5',
        custom: { blackOrange: palette.textPrimary },
    });
    const secondaryTextColor = getThemeColor({
        light: '#595959',
        dark: '#bfbfbf',
        custom: { blackOrange: palette.textSecondary },
    });
    const surfaceAlt = getThemeColor({
        light: '#fafafa',
        dark: '#1f1f1f',
        custom: { blackOrange: palette.surfaceAlt },
    });
    const containerBorder = getThemeColor({
        light: '#f0f0f0',
        dark: '#303030',
        custom: { blackOrange: palette.border },
    });
    const hoverShadow = isBlackOrangeActive
        ? '0 10px 30px rgba(0,0,0,0.45)'
        : '0 2px 8px rgba(0, 0, 0, 0.15)';

    const modalStyles = useMemo(() => {
        if (!isBlackOrangeActive) return undefined;
        return {
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
        } as const;
    }, [
        isBlackOrangeActive,
        palette.border,
        palette.surface,
        palette.surfaceAlt,
        palette.textPrimary,
    ]);
    const [, contextHolder] = message.useMessage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [showRegistrationCodeModal, setShowRegistrationCodeModal] = useState(false);

    const [ecList, setEcList] = useState<PlayerBindListData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<boolean>(false);

    const fetchEcList = () => {
        setLoading(true);
        setError(false);
        fetchData({
            url: '/ec/list',
            method: 'GET',
            data: {},
            setData: setEcList,
        })
            .then(() => setLoading(false))
            .catch(() => {
                setError(true);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchEcList();
    }, []);

    const getBadgeText = (ec: PlayerBindListData): string => {
        if (ec.media !== 0) {
            return ltransMedia(ec.media);
        } else if (ec.vip !== 0) {
            return ltransVip(ec.vip);
        } else {
            return '';
        }
    };

    let cardIndex = 0;

    return (
        <Wrapper>
            {contextHolder}
            {loading ? (
                <Skeleton active paragraph={{ rows: 3 }} title={false} />
            ) : error ? (
                <ErrorDisplay onRetry={fetchEcList} />
            ) : (
                <>
                    <div
                        style={{
                            opacity: 0,
                            animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                        }}
                    >
                        <PageTitle title={gLang('ecList.title')} level={2} />
                    </div>
                    <div
                        style={{
                            opacity: 0,
                            animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                        }}
                    >
                        <PageIntro>
                            <Paragraph style={{ color: secondaryTextColor }}>
                                {gLang('ecList.intro')}
                            </Paragraph>
                        </PageIntro>
                    </div>
                    <div
                        style={{
                            opacity: 0,
                            animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                        }}
                    >
                        <Button
                            size="large"
                            type={ecList.length === 0 ? 'primary' : 'default'}
                            block
                            icon={<PlusOutlined />}
                            style={{
                                marginBottom: '16px',
                                height: '48px',
                                borderRadius: '8px',
                                fontWeight: 500,
                                boxShadow: ecList.length === 0 ? hoverShadow : 'none',
                                transition: 'all 0.3s ease',
                                background: isBlackOrangeActive ? palette.accent : undefined,
                                borderColor: isBlackOrangeActive ? palette.accent : undefined,
                                color: isBlackOrangeActive ? palette.textPrimary : undefined,
                            }}
                            onClick={() => setIsModalOpen(true)}
                            className="hover-scale"
                        >
                            {gLang('ecList.bindBtn')}
                        </Button>
                    </div>

                    <div
                        style={{
                            opacity: 0,
                            animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                        }}
                    >
                        <Button
                            size="large"
                            type="default"
                            block
                            icon={<QuestionCircleOutlined />}
                            onClick={() => setShowRecoveryModal(true)}
                            style={{
                                marginBottom: '16px',
                                height: '48px',
                                borderRadius: '8px',
                                fontWeight: 500,
                                transition: 'all 0.3s ease',
                                background: isBlackOrangeActive ? palette.surfaceAlt : undefined,
                                borderColor: isBlackOrangeActive ? palette.border : undefined,
                                color: isBlackOrangeActive ? palette.textPrimary : undefined,
                            }}
                            className="hover-scale"
                        >
                            {gLang('ecDetail.accountRecovery.title')}
                        </Button>
                    </div>

                    <div
                        style={{
                            opacity: 0,
                            animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                        }}
                    >
                        <Button
                            size="large"
                            type="default"
                            block
                            icon={<PlusOutlined />}
                            onClick={() => setShowRegistrationCodeModal(true)}
                            style={{
                                marginBottom: '24px',
                                height: '48px',
                                borderRadius: '8px',
                                fontWeight: 500,
                                transition: 'all 0.3s ease',
                                background: isBlackOrangeActive ? palette.surfaceAlt : undefined,
                                borderColor: isBlackOrangeActive ? palette.border : undefined,
                                color: isBlackOrangeActive ? palette.textPrimary : undefined,
                            }}
                            className="hover-scale"
                        >
                            {gLang('ecDetail.registrationCode.btnLabel')}
                        </Button>
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }}>
                        {ecList.map(ec => (
                            <div
                                key={ec.ecid}
                                style={{
                                    opacity: 0,
                                    animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                                }}
                            >
                                <CardWithBadgeComponent
                                    title={ec.name}
                                    subTitle={ec.ecid}
                                    loading={ec.vip === 888}
                                    to={'/account/' + ec.ecid}
                                    badgeText={getBadgeText(ec)}
                                    badgeColor={
                                        isBlackOrangeActive
                                            ? palette.accent
                                            : ec.media !== 0
                                              ? 'volcano'
                                              : ltransVipColor(ec.vip)
                                    }
                                    isHoverable={true}
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
                            </div>
                        ))}
                    </Space>
                </>
            )}

            <Modal
                title={gLang('ecList.bindTitle')}
                open={isModalOpen}
                footer={false}
                onCancel={() => setIsModalOpen(false)}
                width={400}
                centered
                styles={modalStyles}
            >
                <Typography>
                    <Paragraph style={{ color: primaryTextColor }}>
                        {gLang('ecList.bindIntro')}
                    </Paragraph>
                </Typography>
                <Form
                    name="basic"
                    onFinish={values => {
                        submitData({
                            data: { code: values.code },
                            url: '/ec/bind',
                            successMessage: 'success',
                            method: 'GET',
                            redirectTo: '/account',
                            setIsFormDisabled: setIsFormDisabled,
                            setIsModalOpen: setIsModalOpen,
                        });
                    }}
                    layout="vertical"
                    autoComplete="off"
                    disabled={isFormDisabled}
                >
                    <Form.Item
                        label={gLang('ecList.bindColumn')}
                        name="code"
                        rules={[
                            {
                                required: true,
                                message: gLang('required'),
                            },
                            {
                                pattern: /^\d{6}$/,
                                message: gLang('ecList.bindSixDigits'),
                            },
                        ]}
                    >
                        <Input
                            size="large"
                            placeholder="123456"
                            style={{
                                borderRadius: '6px',
                                height: '42px',
                                background: surfaceAlt,
                                borderColor: containerBorder,
                                color: primaryTextColor,
                            }}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
                        <Space>
                            <Button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    borderRadius: '6px',
                                    height: '40px',
                                    background: isBlackOrangeActive
                                        ? palette.surfaceAlt
                                        : undefined,
                                    borderColor: isBlackOrangeActive ? palette.border : undefined,
                                    color: isBlackOrangeActive ? palette.textPrimary : undefined,
                                }}
                            >
                                {gLang('cancel')}
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={isFormDisabled}
                                style={{
                                    borderRadius: '6px',
                                    height: '40px',
                                    fontWeight: 500,
                                    boxShadow: isBlackOrangeActive
                                        ? '0 0 0 1px rgba(255, 140, 26, 0.45)'
                                        : '0 2px 0 rgba(0,0,0,0.045)',
                                    background: isBlackOrangeActive ? palette.accent : undefined,
                                    borderColor: isBlackOrangeActive ? palette.accent : undefined,
                                    color: isBlackOrangeActive ? palette.textPrimary : undefined,
                                }}
                            >
                                {gLang('ecList.bindSubmit')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 找回账号模态框 */}
            <AccountRecoveryModal
                open={showRecoveryModal}
                onCancel={() => setShowRecoveryModal(false)}
            />

            {/* 注册验证码模态框 */}
            <RegistrationCodeModal
                open={showRegistrationCodeModal}
                onCancel={() => setShowRegistrationCodeModal(false)}
            />
        </Wrapper>
    );
};

export default Account;
