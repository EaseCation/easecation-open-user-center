// 账号管理页面

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Button,
    Card,
    Form,
    Input,
    message,
    Modal,
    Space,
    Typography,
    Alert,
    Checkbox,
    Skeleton,
} from 'antd';
import {
    CheckOutlined,
    EditOutlined,
    SecurityScanOutlined,
    UnlockOutlined,
} from '@ant-design/icons';
import { gLang } from '@common/language';
import { fetchData, submitData } from '@common/axiosConfig';
import { BindPlayerDetailBasic } from '@ecuc/shared/types/player.types';
import { UserEmailSecurity, EmailVerificationActionType } from '@ecuc/shared/types/user.types';
import Wrapper from '@common/components/Wrapper/Wrapper';
import { useTheme } from '@common/contexts/ThemeContext';
import { CUSTOM_THEME_PALETTES } from '@common/themes/customPalettes';
import ErrorDisplay from '../../../components/ErrorDisplay';
import PlayerBindingInfo from './components/PlayerBindingInfo';
import { sendEmailVerification } from '../../../services/emailVerification.service';
import usePageTitle from '@common/hooks/usePageTitle';

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

const { Title, Text } = Typography;

const AccountManagement: React.FC = () => {
    usePageTitle(); // 使用页面标题管理Hook
    const { ecid } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const [, modalContextHolder] = Modal.useModal();

    const { customTheme, isCustomThemeActive } = useTheme();
    const palette = CUSTOM_THEME_PALETTES.blackOrange;
    const isBlackOrangeActive = isCustomThemeActive && customTheme === 'blackOrange';

    // Check if this is the first visit after login
    const isFirstVisitAfterLogin = useMemo(() => {
        const hasShownAnimation = sessionStorage.getItem('accountManagementAnimationShown');
        const isFromLogin =
            document.referrer.includes('/login') ||
            document.referrer.includes('/login/callback') ||
            location.state?.fromLogin === true;

        // If coming from login and haven't shown animation yet, show full animation
        if (isFromLogin && !hasShownAnimation) {
            sessionStorage.setItem('accountManagementAnimationShown', 'true');
            return true;
        }
        return false;
    }, [location.state]);

    // Animation delay: longer for first visit (0.1s), shorter for subsequent visits (0.02s)
    const animationDelay = isFirstVisitAfterLogin ? 0.1 : 0.02;

    const [player, setPlayer] = useState<BindPlayerDetailBasic | null>(null);
    const [emailSecurity, setEmailSecurity] = useState<UserEmailSecurity | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);
    const [emailModified, setEmailModified] = useState(false);
    const [currentEmail, setCurrentEmail] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showSetSecurityModal, setShowSetSecurityModal] = useState(false);
    const [showClearSecurityModal, setShowClearSecurityModal] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showUnbindTicketModal, setShowUnbindTicketModal] = useState(false);
    const [showUnbindTicketWarningModal, setShowUnbindTicketWarningModal] = useState(false);
    /** 验证邮件发送冷却剩余秒数（0 表示无冷却） */
    const [emailSendCooldownRemaining, setEmailSendCooldownRemaining] = useState(0);

    // 验证邮件发送冷却倒计时
    useEffect(() => {
        if (emailSendCooldownRemaining <= 0) return;
        const timer = setInterval(() => {
            setEmailSendCooldownRemaining(s => (s <= 1 ? 0 : s - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [emailSendCooldownRemaining]);

    // 主题样式
    const cardStyle = isBlackOrangeActive
        ? {
              background: palette.surfaceAlt,
              borderColor: palette.border,
              color: palette.textPrimary,
          }
        : undefined;

    const buttonStyle = isBlackOrangeActive
        ? {
              background: palette.accent,
              borderColor: palette.accent,
              color: palette.textPrimary,
          }
        : undefined;

    const dangerButtonStyle = isBlackOrangeActive
        ? {
              background: palette.surfaceAlt,
              borderColor: palette.accent,
              color: palette.accent,
          }
        : undefined;

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

    // 获取账号详情和密保邮箱设置
    const fetchAccountData = async () => {
        setLoading(true);
        setError(false);

        try {
            await Promise.all([
                fetchData({
                    url: '/ec/detail',
                    method: 'GET',
                    data: { ecid },
                    setData: setPlayer,
                }),
                fetchData({
                    url: '/user/email-security',
                    method: 'GET',
                    data: { ecid },
                    setData: response => setEmailSecurity(response.data),
                }),
            ]);

            // 设置表单初始值将在useEffect中处理
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccountData();
    }, [ecid]);

    // 当player数据加载完成后设置表单初始值
    useEffect(() => {
        if (player) {
            form.setFieldsValue({
                email: player.email || '',
            });
            setCurrentEmail(player.email || '');
        }
    }, [player, form]);

    // 监听邮箱输入变化
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value;
        setCurrentEmail(newEmail);
        const originalEmail = player?.email || '';
        setEmailModified(newEmail !== originalEmail);
    };

    // 更新邮箱
    const handleUpdateEmail = async () => {
        try {
            // 验证邮箱格式
            if (!validateEmail(currentEmail)) {
                messageApi.error(gLang('accountManagement.invalidEmailFormat'));
                return;
            }

            setIsUpdatingEmail(true);

            await submitData({
                url: '/ec/update-email',
                method: 'POST',
                data: {
                    ecid,
                    email: currentEmail,
                },
                successMessage: gLang('accountManagement.emailUpdateSuccess'),
                setIsFormDisabled: () => {},
                setIsModalOpen: () => {},
            });

            messageApi.success(gLang('accountManagement.emailUpdateSuccess'));
            setEmailModified(false);
            await fetchAccountData(); // 重新获取数据
        } catch {
            messageApi.error(gLang('accountManagement.emailUpdateFailedRetry'));
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    // 设置为密保邮箱
    const handleSetSecurityEmail = async () => {
        try {
            setIsUpdatingSecurity(true);

            if (!ecid) {
                messageApi.error(gLang('accountManagement.missingEcid'));
                return;
            }
            const result = await sendEmailVerification(
                ecid,
                EmailVerificationActionType.SetSecurity
            );

            if (result.success) {
                messageApi.success(gLang('accountManagement.verifyEmailSentSet'));
                setShowSetSecurityModal(false);
                setEmailSendCooldownRemaining(60);
            } else {
                messageApi.error(result.message);
                if (result.message.includes(gLang('accountManagement.seconds'))) {
                    setEmailSendCooldownRemaining(60);
                }
            }
        } catch {
            messageApi.error(gLang('accountManagement.operationFailedRetry'));
        } finally {
            setIsUpdatingSecurity(false);
        }
    };

    // 清除密保邮箱
    const handleClearSecurityEmail = async () => {
        try {
            setIsUpdatingSecurity(true);

            if (!ecid) {
                return;
            }
            const result = await sendEmailVerification(
                ecid,
                EmailVerificationActionType.ClearSecurity
            );

            if (result.success) {
                messageApi.success(gLang('accountManagement.verifyEmailSentClear'));
                setShowClearSecurityModal(false);
                setEmailSendCooldownRemaining(60);
            } else {
                messageApi.error(result.message);
                if (result.message.includes(gLang('accountManagement.seconds'))) {
                    setEmailSendCooldownRemaining(60);
                }
            }
        } catch {
            messageApi.error(gLang('accountManagement.operationFailedRetry'));
        } finally {
            setIsUpdatingSecurity(false);
        }
    };

    // 显示设置密保邮箱确认框
    const handleShowSetSecurityModal = () => {
        setAgreedToTerms(false);
        setShowSetSecurityModal(true);
    };

    // 确认设置密保邮箱
    const handleConfirmSetSecurity = () => {
        if (!agreedToTerms) {
            messageApi.warning(gLang('ecDetail.pleaseAgreeFirst'));
            return;
        }
        setShowSetSecurityModal(false);
        handleSetSecurityEmail();
    };

    // 显示清除密保邮箱确认框
    const handleShowClearSecurityModal = () => {
        setAgreedToTerms(false);
        setShowClearSecurityModal(true);
    };

    // 确认清除密保邮箱
    const handleConfirmClearSecurity = () => {
        if (!agreedToTerms) {
            messageApi.warning(gLang('ecDetail.pleaseAgreeFirst'));
            return;
        }
        setShowClearSecurityModal(false);
        handleClearSecurityEmail();
    };

    // 修改密码
    const handleChangePassword = async (values: { oldPassword: string; newPassword: string }) => {
        try {
            setIsUpdatingSecurity(true);

            // 导入密码加密工具
            const { encryptPassword } = await import('@common/utils/passwordUtils');

            // 在前端加密密码
            if (!ecid) {
                return;
            }
            const oldPasswordHash = await encryptPassword(ecid, values.oldPassword);
            const newPasswordHash = await encryptPassword(ecid, values.newPassword);
            await submitData({
                url: '/ec/change-password',
                method: 'POST',
                data: {
                    ecid,
                    oldPasswordHash,
                    newPasswordHash,
                },
                successMessage: gLang('ecDetail.passwordChangeSuccess'),
                setIsFormDisabled: () => {},
                setIsModalOpen: () => {},
            });

            messageApi.success(gLang('ecDetail.passwordChangeSuccess'));
            setShowChangePasswordModal(false);
        } finally {
            setIsUpdatingSecurity(false);
        }
    };

    // 重置密码
    const handleResetPassword = async () => {
        try {
            setIsUpdatingSecurity(true);

            // 使用fetchData获取响应，以便处理重定向URL
            await fetchData({
                url: '/ec/reset-password',
                method: 'POST',
                data: {
                    ecid: ecid,
                },
                setData: (data: any) => {
                    if (data.EPF_code === 200) {
                        if (data.redirectUrl) {
                            // 没有密保邮箱，直接重定向到密码设置页面
                            messageApi.success(gLang('accountManagement.redirectingToPassword'));
                            setTimeout(() => {
                                window.location.href = data.redirectUrl;
                            }, 1000);
                        } else {
                            // 有密保邮箱，发送了邮件
                            messageApi.success(gLang('accountManagement.verifyEmailSentReset'));
                        }
                        setShowResetPasswordModal(false);
                    }
                },
                setSpin: () => {},
            });
        } catch {
            messageApi.error(gLang('accountManagement.operationFailedRetry'));
        } finally {
            setIsUpdatingSecurity(false);
        }
    };

    // 解绑工单
    const handleUnbindTicket = async () => {
        try {
            setIsUpdatingSecurity(true);

            await submitData({
                url: '/ec/unbind-ticket',
                method: 'POST',
                data: {
                    ecid: ecid,
                },
                successMessage: gLang('ecDetail.unbindTicketSuccess'),
                setIsFormDisabled: () => {},
                setIsModalOpen: () => {},
                redirectTo: '/account', // 添加重定向到账户页面
            });

            messageApi.success(gLang('ecDetail.unbindTicketSuccess'));
            setShowUnbindTicketModal(false);
        } catch {
            messageApi.error(gLang('accountManagement.operationFailedRetry'));
        } finally {
            setIsUpdatingSecurity(false);
        }
    };

    // 显示解绑工单确认框
    const handleShowUnbindTicketModal = () => {
        setAgreedToTerms(false);
        if (!isSecurityEmail) {
            // 未设置密保邮箱，先显示警告弹窗
            setShowUnbindTicketWarningModal(true);
        } else {
            // 已设置密保邮箱，直接显示确认弹窗
            setShowUnbindTicketModal(true);
        }
    };

    // 确认解绑工单
    const handleConfirmUnbindTicket = () => {
        setShowUnbindTicketModal(false);
        handleUnbindTicket();
    };

    // 从警告弹窗继续到确认弹窗
    const handleContinueFromWarning = () => {
        if (!agreedToTerms) {
            messageApi.warning(gLang('ecDetail.pleaseAgreeFirst'));
            return;
        }
        setShowUnbindTicketWarningModal(false);
        setAgreedToTerms(false); // 重置同意状态
        setShowUnbindTicketModal(true);
    };

    if (loading) {
        return (
            <Wrapper>
                <Skeleton active paragraph={{ rows: 3 }} title={false} />
            </Wrapper>
        );
    }

    if (error) {
        return (
            <Wrapper>
                <ErrorDisplay onRetry={fetchAccountData} />
            </Wrapper>
        );
    }

    if (!player || !emailSecurity) {
        return null;
    }

    const isSecurityEmail = Boolean(emailSecurity.email_enabled);

    // 检测是否为网易账号
    const isNeteaseAccount = (ecid: string): boolean => {
        return ecid.startsWith('netease');
    };

    // 邮箱格式验证函数
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // 检查当前邮箱格式
    const isCurrentEmailValid = validateEmail(currentEmail);

    // 响应式样式
    const responsiveContainerStyle = {
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
    };

    let cardIndex = 0;

    return (
        <Wrapper>
            {contextHolder}
            {modalContextHolder}

            <Space direction="vertical" style={responsiveContainerStyle} size={24}>
                <div
                    style={{
                        opacity: 0,
                        animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                    }}
                >
                    <Card style={cardStyle}>
                        <Title level={3}>
                            {gLang('ecDetail.manageAccount')} - {player.name}
                        </Title>
                        <Text type="secondary">ECID: {ecid}</Text>
                    </Card>
                </div>

                {/* 第一区域：邮箱和密码管理 */}
                <div
                    style={{
                        opacity: 0,
                        animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                    }}
                >
                    <Card title={gLang('ecDetail.accountManagement')} style={cardStyle}>
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            {/* 第一行：邮箱地址 */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Text
                                    strong
                                    style={{
                                        minWidth: 'fit-content',
                                        flexShrink: 0,
                                    }}
                                >
                                    {gLang('ecDetail.emailAddress')}:
                                </Text>
                                <Input
                                    value={currentEmail}
                                    onChange={handleEmailChange}
                                    style={{
                                        flex: 1,
                                        minWidth: Math.max(200, 20 * 8 + 40) + 'px',
                                        maxWidth:
                                            Math.min(
                                                400,
                                                Math.max(
                                                    20 * 8 + 40,
                                                    (currentEmail || '').length * 8 + 40
                                                )
                                            ) + 'px',
                                    }}
                                    disabled={isSecurityEmail}
                                    suffix={
                                        isSecurityEmail ? (
                                            <Text type="secondary">
                                                {gLang('ecDetail.securityEmail')}
                                            </Text>
                                        ) : null
                                    }
                                />
                                <Button
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    onClick={handleUpdateEmail}
                                    disabled={!emailModified || isSecurityEmail}
                                    loading={isUpdatingEmail}
                                    style={{
                                        ...buttonStyle,
                                        flexShrink: 0,
                                    }}
                                >
                                    {gLang('ecDetail.saveChanges')}
                                </Button>
                            </div>

                            {/* 第二行：密保邮箱状态 */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Text
                                    strong
                                    style={{
                                        minWidth: 'fit-content',
                                        flexShrink: 0,
                                    }}
                                >
                                    {gLang('ecDetail.securityEmailStatus')}:
                                </Text>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        flex: 1,
                                        minWidth: 0,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {isSecurityEmail ? (
                                        <>
                                            <SecurityScanOutlined style={{ color: '#52c41a' }} />
                                            <Text
                                                strong
                                                style={{ color: '#52c41a', whiteSpace: 'nowrap' }}
                                            >
                                                {gLang('ecDetail.securityEmail')}
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <UnlockOutlined style={{ color: '#faad14' }} />
                                            <Text
                                                strong
                                                style={{ color: '#faad14', whiteSpace: 'nowrap' }}
                                            >
                                                {gLang('ecDetail.notActivated')}
                                            </Text>
                                        </>
                                    )}
                                    {!isSecurityEmail && (
                                        <Button
                                            type="primary"
                                            icon={<SecurityScanOutlined />}
                                            onClick={handleShowSetSecurityModal}
                                            loading={isUpdatingSecurity}
                                            disabled={
                                                !isCurrentEmailValid ||
                                                emailSendCooldownRemaining > 0
                                            }
                                            style={{
                                                ...buttonStyle,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {emailSendCooldownRemaining > 0
                                                ? gLang('ecDetail.emailSendCooldown', {
                                                      seconds: emailSendCooldownRemaining,
                                                  })
                                                : gLang('ecDetail.setSecurity')}
                                        </Button>
                                    )}
                                    {isSecurityEmail && (
                                        <Button
                                            danger
                                            icon={<UnlockOutlined />}
                                            onClick={handleShowClearSecurityModal}
                                            loading={isUpdatingSecurity}
                                            disabled={emailSendCooldownRemaining > 0}
                                            style={{
                                                ...dangerButtonStyle,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {emailSendCooldownRemaining > 0
                                                ? gLang('ecDetail.emailSendCooldown', {
                                                      seconds: emailSendCooldownRemaining,
                                                  })
                                                : gLang('ecDetail.clearSecurity')}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* 第三行：修改密码 */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Text
                                    strong
                                    style={{
                                        minWidth: 'fit-content',
                                        flexShrink: 0,
                                    }}
                                >
                                    {gLang('ecDetail.passwordManagement')}:
                                </Text>
                                <Button
                                    type="default"
                                    icon={<EditOutlined />}
                                    onClick={() => setShowChangePasswordModal(true)}
                                    disabled={!ecid || isNeteaseAccount(ecid)}
                                    style={{
                                        ...buttonStyle,
                                        flexShrink: 0,
                                    }}
                                >
                                    {gLang('ecDetail.changePassword')}
                                </Button>
                            </div>

                            {/* 第四行：重置密码 */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Text
                                    strong
                                    style={{
                                        minWidth: 'fit-content',
                                        flexShrink: 0,
                                    }}
                                >
                                    {gLang('ecDetail.passwordReset')}:
                                </Text>
                                <Button
                                    danger
                                    icon={<UnlockOutlined />}
                                    onClick={() => setShowResetPasswordModal(true)}
                                    disabled={!ecid || isNeteaseAccount(ecid)}
                                    style={{
                                        ...dangerButtonStyle,
                                        flexShrink: 0,
                                    }}
                                >
                                    {gLang('ecDetail.resetPassword')}
                                </Button>
                            </div>

                            {/* 第五行：解绑工单 */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Text
                                    strong
                                    style={{
                                        minWidth: 'fit-content',
                                        flexShrink: 0,
                                    }}
                                >
                                    {gLang('ecDetail.unbindTicket')}:
                                </Text>
                                <Button
                                    danger
                                    icon={<UnlockOutlined />}
                                    onClick={handleShowUnbindTicketModal}
                                    style={{
                                        ...dangerButtonStyle,
                                        flexShrink: 0,
                                    }}
                                >
                                    {gLang('ecDetail.unbindTicketBtn')}
                                </Button>
                            </div>

                            {/* 警告 */}
                            {!ecid ||
                                (isNeteaseAccount(ecid) && (
                                    <Alert
                                        message={gLang('ecDetail.neteaseAccountWarning')}
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
                                ))}
                            {!isCurrentEmailValid && !isSecurityEmail && (
                                <Alert
                                    message={gLang('ecDetail.emailFormatRequired')}
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
                            )}
                        </Space>
                    </Card>
                </div>

                {/* 第二区域：绑定信息表格 */}
                <div
                    style={{
                        opacity: 0,
                        animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                    }}
                >
                    <Card title={gLang('ecDetail.bindingInfo')} style={cardStyle}>
                        <PlayerBindingInfo ecid={ecid || ''} />
                    </Card>
                </div>

                <div
                    style={{
                        opacity: 0,
                        animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                    }}
                >
                    <Space>
                        <Button onClick={() => navigate(`/account/${ecid}`)}>
                            {gLang('ecDetail.returnToAccount')}
                        </Button>
                    </Space>
                </div>
            </Space>

            {/* 设置密保邮箱确认模态框 */}
            <Modal
                title={gLang('ecDetail.setSecurityConfirm')}
                open={showSetSecurityModal}
                onCancel={() => setShowSetSecurityModal(false)}
                onOk={handleConfirmSetSecurity}
                okText={gLang('ecDetail.confirmSet')}
                cancelText={gLang('cancel')}
                okButtonProps={{ disabled: !agreedToTerms }}
                styles={modalStyles}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Alert
                        message={gLang('ecDetail.setSecurityConfirm')}
                        description={gLang('ecDetail.emailWillBeUsedForReset', {
                            email: player?.email,
                        })}
                        type="info"
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
                    <Checkbox
                        checked={agreedToTerms}
                        onChange={e => setAgreedToTerms(e.target.checked)}
                    >
                        {gLang('ecDetail.understandAndAgree')}
                    </Checkbox>
                </Space>
            </Modal>

            {/* 清除密保邮箱确认模态框 */}
            <Modal
                title={gLang('ecDetail.clearSecurityConfirm')}
                open={showClearSecurityModal}
                onCancel={() => setShowClearSecurityModal(false)}
                onOk={handleConfirmClearSecurity}
                okText={gLang('ecDetail.confirmClear')}
                cancelText={gLang('cancel')}
                okButtonProps={{ disabled: !agreedToTerms }}
                styles={modalStyles}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Alert
                        message={gLang('ecDetail.clearSecurityConfirm')}
                        description={gLang('ecDetail.emailWillNoLongerHaveSecurity', {
                            email: player?.email,
                        })}
                        type="warning"
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
                    <Checkbox
                        checked={agreedToTerms}
                        onChange={e => setAgreedToTerms(e.target.checked)}
                    >
                        {gLang('ecDetail.understandAndAgree')}
                    </Checkbox>
                </Space>
            </Modal>

            {/* 修改密码模态框 */}
            <Modal
                title={gLang('ecDetail.changePassword')}
                open={showChangePasswordModal}
                onCancel={() => setShowChangePasswordModal(false)}
                footer={null}
                styles={modalStyles}
            >
                <Form onFinish={handleChangePassword} layout="vertical">
                    <Alert
                        message={gLang('ecDetail.unbindWarning')}
                        type="warning"
                        showIcon
                        style={{
                            fontSize: 12,
                            ...(isBlackOrangeActive
                                ? {
                                      background: palette.surfaceAlt,
                                      borderColor: palette.border,
                                      color: palette.textPrimary,
                                  }
                                : {}),
                        }}
                    />
                    <Form.Item
                        label={gLang('ecDetail.oldPassword')}
                        name="oldPassword"
                        rules={[{ required: true, message: gLang('ecDetail.oldPasswordRequired') }]}
                    >
                        <Input.Password placeholder={gLang('ecDetail.oldPasswordPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        label={gLang('ecDetail.newPassword')}
                        name="newPassword"
                        rules={[
                            { required: true, message: gLang('ecDetail.newPasswordRequired') },
                            { min: 6, message: gLang('ecDetail.passwordMinLength') },
                        ]}
                    >
                        <Input.Password placeholder={gLang('ecDetail.newPasswordPlaceholder')} />
                    </Form.Item>

                    <Form.Item
                        label={gLang('ecDetail.confirmNewPassword')}
                        name="confirmNewPassword"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: gLang('ecDetail.confirmPasswordRequired') },
                            ({ getFieldValue }) => ({
                                validator(_rule, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(
                                        new Error(gLang('ecDetail.passwordMismatch'))
                                    );
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            placeholder={gLang('ecDetail.confirmPasswordPlaceholder')}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setShowChangePasswordModal(false)}>
                                {gLang('cancel')}
                            </Button>
                            <Button type="primary" htmlType="submit" loading={isUpdatingSecurity}>
                                {gLang('ecDetail.confirmChange')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* 重置密码模态框 */}
            <Modal
                title={gLang('ecDetail.resetPassword')}
                open={showResetPasswordModal}
                onCancel={() => setShowResetPasswordModal(false)}
                onOk={handleResetPassword}
                okText={gLang('ecDetail.confirmReset')}
                cancelText={gLang('cancel')}
                okButtonProps={{ disabled: !agreedToTerms }}
                styles={modalStyles}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Alert
                        message={gLang('ecDetail.unbindWarning')}
                        type="warning"
                        showIcon
                        style={{
                            fontSize: 12,
                            ...(isBlackOrangeActive
                                ? {
                                      background: palette.surfaceAlt,
                                      borderColor: palette.border,
                                      color: palette.textPrimary,
                                  }
                                : {}),
                        }}
                    />
                    <Alert
                        message={gLang('ecDetail.resetPasswordConfirm')}
                        description={gLang('ecDetail.resetPasswordDesc')}
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
                    <Checkbox
                        checked={agreedToTerms}
                        onChange={e => setAgreedToTerms(e.target.checked)}
                    >
                        {gLang('ecDetail.understandAndAgree')}
                    </Checkbox>
                </Space>
            </Modal>

            {/* 解绑工单警告模态框（未设置密保邮箱时显示） */}
            <Modal
                title={gLang('ecDetail.unbindTicketWarningTitle')}
                open={showUnbindTicketWarningModal}
                onCancel={() => setShowUnbindTicketWarningModal(false)}
                onOk={handleContinueFromWarning}
                okText={gLang('ecDetail.continue')}
                cancelText={gLang('cancel')}
                okButtonProps={{ disabled: !agreedToTerms }}
                styles={modalStyles}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Alert
                        message={gLang('ecDetail.unbindTicketWarningTitle')}
                        description={gLang('ecDetail.unbindTicketWarningDesc')}
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
                    <Checkbox
                        checked={agreedToTerms}
                        onChange={e => setAgreedToTerms(e.target.checked)}
                    >
                        {gLang('ecDetail.understandAndAgree')}
                    </Checkbox>
                </Space>
            </Modal>

            {/* 解绑工单确认模态框 */}
            <Modal
                title={gLang('ecDetail.unbindTicketConfirmTitle')}
                open={showUnbindTicketModal}
                onCancel={() => setShowUnbindTicketModal(false)}
                onOk={handleConfirmUnbindTicket}
                okText={gLang('ecDetail.confirmUnbindTicket')}
                cancelText={gLang('cancel')}
                styles={modalStyles}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Alert
                        message={gLang('ecDetail.unbindTicketConfirmTitle')}
                        description={gLang('ecDetail.unbindTicketConfirmDesc')}
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
                </Space>
            </Modal>
        </Wrapper>
    );
};

export default AccountManagement;
