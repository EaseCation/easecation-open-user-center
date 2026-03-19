// 工单操作页中的操作工单卡片（受理、驳回、升级、转交）

import React, { useState } from 'react';
import {
    Alert,
    Button,
    Col,
    ConfigProvider,
    Form,
    Input,
    message,
    Modal,
    Row,
    Space,
    Typography,
} from 'antd';
import {
    CheckCircleFilled,
    CloseCircleFilled,
    ExclamationCircleFilled,
    UpCircleFilled,
} from '@ant-design/icons';
import { Ticket, TicketStatus, TicketAction, TicketType } from '@ecuc/shared/types/ticket.types';
import { gLang } from '@common/language';
import { NavigateFunction } from 'react-router-dom';
import {
    notifyTicketStatusUpdate,
    notifyTicketCountUpdate,
} from '@common/hooks/useTicketStatusUpdate';
import useDarkMode from '@common/hooks/useDarkMode';

const { Text } = Typography;

// 统一按钮调色板（亮色/暗黑两套），并统一尺寸
const palette = (isDark: boolean) => ({
    success: {
        primary: isDark ? '#2f8e10' : '#4caf50',
        hover: isDark ? '#3aa312' : '#57b65b',
        active: isDark ? '#276f0d' : '#449d48',
    },
    danger: {
        primary: isDark ? '#b32026' : '#ff4d4f',
        hover: isDark ? '#c6282f' : '#ff5f61',
        active: isDark ? '#9f1c21' : '#f14143',
    },
    upgrade: {
        primary: isDark ? '#9e1068' : '#f759ab',
        hover: isDark ? '#b01774' : '#ff6bb5',
        active: isDark ? '#7c0c50' : '#eb4ea0',
    },
    info: {
        primary: isDark ? '#2b6fce' : '#1890ff',
        hover: isDark ? '#3c8cff' : '#40a9ff',
        active: isDark ? '#225ab0' : '#096dd9',
    },
    common: {
        radius: 12,
        height: 48,
    },
});

interface TicketActionCardProps {
    ticket?: Ticket;
    form: any;
    modal: any;
    formFinish: (values: any) => Promise<void>;
    submitData: any;
    setIsFormDisabled: (disabled: boolean) => void;
    navigate: NavigateFunction;
    returnToMy: boolean;
    toLink: string;
    tid?: string;
    onActionComplete?: () => void;
}

export const TicketActionCard = React.memo(
    ({
        ticket,
        form,
        modal,
        formFinish,
        submitData,
        setIsFormDisabled,
        navigate,
        returnToMy,
        toLink,
        tid,
        onActionComplete,
    }: TicketActionCardProps) => {
        // 移除userList状态和相关的useEffect
        const [showEntrustModal, setShowEntrustModal] = useState(false);
        const [entrustForm] = Form.useForm();
        const [isSubmitting, setIsSubmitting] = useState(false);

        // 处理委托提交
        const [messageApi, messageContextHolder] = message.useMessage();
        const handleEntrustSubmit = async () => {
            // 防抖：如果正在提交，直接返回
            if (isSubmitting) {
                return;
            }

            try {
                setIsSubmitting(true);
                const values = await entrustForm.validateFields();
                // 确保转换为数字类型
                const targetUserId = Number(values.target_user);
                await submitData({
                    url: '/entrust',
                    method: 'POST',
                    data: {
                        tid: ticket?.tid,
                        uid: targetUserId,
                        introduce: values.reason,
                    },
                    successMessage: 'ticketOperate.entrustCreateSuccess',
                    redirectTo: '',
                    setIsFormDisabled: setIsFormDisabled,
                    setIsModalOpen: () => {
                        setShowEntrustModal(false);
                        // 转交成功后强制刷新页面
                        window.location.reload();
                    },
                    messageApi: messageApi,
                });
            } catch {
                messageApi.error(gLang('ticketOperate.entrustCreateFail'));
            } finally {
                setIsSubmitting(false);
            }
        };
        const isDarkMode = useDarkMode();
        const c = palette(isDarkMode);
        const buttonStyle: React.CSSProperties = {
            width: '100%',
            fontWeight: 600,
            boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.10)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
        };

        if (!ticket) return null;

        // 按钮可用性控制：不可用时不隐藏，仅禁用
        const canProcess = [
            TicketStatus.WaitingAssign,
            TicketStatus.WaitingReply,
            TicketStatus.WaitingStaffReply,
        ].includes(ticket.status);
        const canReject = canProcess;
        const isMRType = ticket.type === TicketType.ManualReview;
        const canEntrust = canProcess;
        const canUpgrade = ticket.status !== TicketStatus.Entrust;

        return (
            <>
                {messageContextHolder}
                <Row gutter={[8, 8]} style={{ marginTop: 0 }}>
                    <>
                        <Col xs={12} sm={12} md={12} lg={6} xl={6}>
                            <ConfigProvider
                                theme={{
                                    components: {
                                        Button: {
                                            colorPrimary: c.success.primary,
                                            colorPrimaryHover: c.success.hover,
                                            colorPrimaryActive: c.success.active,
                                            borderRadiusLG: c.common.radius,
                                            controlHeightLG: c.common.height,
                                        },
                                    },
                                }}
                            >
                                <Button
                                    size="large"
                                    type="primary"
                                    icon={<CheckCircleFilled />}
                                    style={buttonStyle}
                                    disabled={!canProcess}
                                    onClick={async () => {
                                        if (
                                            await modal.confirm({
                                                icon: <CheckCircleFilled />,
                                                title: gLang('ticketOperate.confirmDoAction', {
                                                    action: gLang('ticketOperate.done'),
                                                }),
                                                content: (
                                                    <Space direction="vertical">
                                                        {form.getFieldValue('details') && (
                                                            <Alert
                                                                showIcon
                                                                message={gLang(
                                                                    'ticketOperate.confirmDoActionReply',
                                                                    {
                                                                        details:
                                                                            form.getFieldValue(
                                                                                'details'
                                                                            ),
                                                                    }
                                                                )}
                                                            />
                                                        )}
                                                        {gLang(
                                                            'ticketOperate.confirmDoActionNotice.done'
                                                        )}
                                                        <Text type="secondary">
                                                            {gLang(
                                                                'ticketOperate.confirmDoActionIntro'
                                                            )}
                                                        </Text>
                                                    </Space>
                                                ),
                                                okText: gLang('ticketOperate.confirmDoActionY'),
                                                cancelText: gLang('ticketOperate.confirmDoActionN'),
                                                centered: true,
                                            })
                                        ) {
                                            if (form.getFieldValue('details')) {
                                                await formFinish(form.getFieldsValue());
                                            }
                                            await submitData({
                                                data: {
                                                    tid: tid,
                                                    action: 'process',
                                                },
                                                url: '/ticket/admin',
                                                redirectTo: '',
                                                successMessage: 'ticketOperate.success',
                                                method: 'POST',
                                                setIsFormDisabled: setIsFormDisabled,
                                                setIsModalOpen: () => {},
                                            });

                                            // 通知工单状态更新
                                            notifyTicketStatusUpdate(
                                                Number(tid),
                                                TicketStatus.Accept
                                            );
                                            notifyTicketCountUpdate();

                                            if (onActionComplete) {
                                            onActionComplete();
                                        } else {
                                            navigate(returnToMy ? '/ticket/my' : toLink);
                                        }
                                        }
                                    }}
                                >
                                    {gLang('ticketOperate.done')}
                                </Button>
                            </ConfigProvider>
                        </Col>
                        <Col xs={12} sm={12} md={12} lg={6} xl={6}>
                            <ConfigProvider
                                theme={{
                                    components: {
                                        Button: {
                                            colorPrimary: c.danger.primary,
                                            colorPrimaryHover: c.danger.hover,
                                            colorPrimaryActive: c.danger.active,
                                            borderRadiusLG: c.common.radius,
                                            controlHeightLG: c.common.height,
                                        },
                                    },
                                }}
                            >
                                <Button
                                    size="large"
                                    type="primary"
                                    icon={<CloseCircleFilled />}
                                    style={buttonStyle}
                                    disabled={!canReject}
                                    onClick={async () => {
                                        if (
                                            await modal.confirm({
                                                icon: <CloseCircleFilled />,
                                                title: gLang('ticketOperate.confirmDoAction', {
                                                    action: gLang('ticketOperate.reject'),
                                                }),
                                                content: (
                                                    <Space direction="vertical">
                                                        {form.getFieldValue('details') && (
                                                            <Alert
                                                                showIcon
                                                                message={gLang(
                                                                    'ticketOperate.confirmDoActionReply',
                                                                    {
                                                                        details:
                                                                            form.getFieldValue(
                                                                                'details'
                                                                            ),
                                                                    }
                                                                )}
                                                            />
                                                        )}
                                                        {!isMRType &&
                                                            !form.getFieldValue('details') &&
                                                            !ticket.details?.find(
                                                                d =>
                                                                    d.action ===
                                                                        TicketAction.Reply &&
                                                                    d.operator.startsWith('AUTH')
                                                            ) && (
                                                                <Alert
                                                                    showIcon
                                                                    type="error"
                                                                    message={gLang(
                                                                        'ticketOperate.replayBeforeReject',
                                                                        {
                                                                            details:
                                                                                form.getFieldValue(
                                                                                    'details'
                                                                                ),
                                                                        }
                                                                    )}
                                                                />
                                                            )}
                                                        {gLang(
                                                            'ticketOperate.confirmDoActionNotice.reject'
                                                        )}
                                                        <Text type="secondary">
                                                            {gLang(
                                                                'ticketOperate.confirmDoActionIntro'
                                                            )}
                                                        </Text>
                                                    </Space>
                                                ),
                                                okText: gLang('ticketOperate.confirmDoActionY'),
                                                cancelText: gLang('ticketOperate.confirmDoActionN'),
                                                centered: true,
                                                okButtonProps: {
                                                    danger: true,
                                                    disabled:
                                                        !isMRType &&
                                                        !form.getFieldValue('details') &&
                                                        !ticket.details?.find(
                                                            d =>
                                                                d.action === TicketAction.Reply &&
                                                                d.operator.startsWith('AUTH')
                                                        ),
                                                },
                                            })
                                        ) {
                                            if (form.getFieldValue('details')) {
                                                await formFinish(form.getFieldsValue());
                                            }
                                            await submitData({
                                                data: {
                                                    tid: tid,
                                                    action: 'reject',
                                                },
                                                url: '/ticket/admin',
                                                redirectTo: '',
                                                successMessage: 'ticketOperate.success',
                                                method: 'POST',
                                                setIsFormDisabled: setIsFormDisabled,
                                                setIsModalOpen: () => {},
                                            });

                                            // 通知工单状态更新
                                            notifyTicketStatusUpdate(
                                                Number(tid),
                                                TicketStatus.Reject
                                            );
                                            notifyTicketCountUpdate();

                                            if (onActionComplete) {
                                            onActionComplete();
                                        } else {
                                            navigate(returnToMy ? '/ticket/my' : toLink);
                                        }
                                        }
                                    }}
                                >
                                    {gLang('ticketOperate.reject')}
                                </Button>
                            </ConfigProvider>
                        </Col>
                    </>
                    {/* 升级 */}
                    <Col xs={12} sm={12} md={12} lg={6} xl={6}>
                        <ConfigProvider
                            theme={{
                                components: {
                                    Button: {
                                        colorPrimary: c.upgrade.primary,
                                        colorPrimaryHover: c.upgrade.hover,
                                        colorPrimaryActive: c.upgrade.active,
                                        borderRadiusLG: c.common.radius,
                                        controlHeightLG: c.common.height,
                                    },
                                },
                            }}
                        >
                            <Button
                                size="large"
                                type="primary"
                                icon={<UpCircleFilled />}
                                style={buttonStyle}
                                disabled={!canUpgrade}
                                onClick={async () => {
                                    if (
                                        await modal.confirm({
                                            icon: <UpCircleFilled />,
                                            title: gLang('ticketOperate.confirmDoAction', {
                                                action: gLang('ticketOperate.upgrade'),
                                            }),
                                            content: (
                                                <Space direction="vertical">
                                                    {gLang(
                                                        'ticketOperate.confirmDoActionNotice.upgrade'
                                                    )}
                                                    <Text type="secondary">
                                                        {gLang(
                                                            'ticketOperate.confirmDoActionIntro'
                                                        )}
                                                    </Text>
                                                </Space>
                                            ),
                                            okText: gLang('ticketOperate.confirmDoActionY'),
                                            cancelText: gLang('ticketOperate.confirmDoActionN'),
                                            centered: true,
                                        })
                                    ) {
                                        await submitData({
                                            data: {
                                                tid: tid,
                                                action: 'upgrade',
                                            },
                                            url: '/ticket/admin',
                                            redirectTo: '',
                                            successMessage: 'ticketOperate.success',
                                            method: 'POST',
                                            setIsFormDisabled: setIsFormDisabled,
                                            setIsModalOpen: () => {},
                                        });

                                        // 通知工单状态更新
                                        notifyTicketStatusUpdate(
                                            Number(tid),
                                            TicketStatus.WaitingAssign
                                        ); // 升级后重新等待分配
                                        notifyTicketCountUpdate();

                                        if (onActionComplete) {
                                            onActionComplete();
                                        } else {
                                            navigate(returnToMy ? '/ticket/my' : toLink);
                                        }
                                    }
                                }}
                            >
                                {gLang('ticketOperate.upgrade')}
                            </Button>
                        </ConfigProvider>
                    </Col>

                    <Col xs={12} sm={12} md={12} lg={6} xl={6}>
                        <ConfigProvider
                            theme={{
                                components: {
                                    Button: {
                                        colorPrimary: c.info.primary,
                                        colorPrimaryHover: c.info.hover,
                                        colorPrimaryActive: c.info.active,
                                        borderRadiusLG: c.common.radius,
                                        controlHeightLG: c.common.height,
                                    },
                                },
                            }}
                        >
                            <Button
                                size="large"
                                type="primary"
                                icon={<ExclamationCircleFilled />}
                                style={buttonStyle}
                                disabled={!canEntrust}
                                onClick={() => setShowEntrustModal(true)}
                            >
                                {gLang('ticketOperate.createEntrust')}
                            </Button>
                        </ConfigProvider>
                    </Col>
                </Row>

                {/* 委托模态框 */}
                <Modal
                    title={gLang('ticketOperate.createEntrustTitle')}
                    open={showEntrustModal}
                    onCancel={() => {
                        if (!isSubmitting) {
                            setShowEntrustModal(false);
                        }
                    }}
                    onOk={handleEntrustSubmit}
                    confirmLoading={isSubmitting}
                    okButtonProps={{ disabled: isSubmitting }}
                >
                    <Form form={entrustForm} layout="vertical">
                        <Form.Item
                            label={gLang('ticketOperate.entrustTargetUserId')}
                            name="target_user"
                            rules={[
                                {
                                    required: true,
                                    message: gLang('ticketOperate.entrustUserIdRequired'),
                                },
                                {
                                    validator: (_, value) => {
                                        if (!/^[0-9]+$/.test(value)) {
                                            return Promise.reject(
                                                gLang('ticketOperate.entrustUserIdValid')
                                            );
                                        }
                                        const num = Number(value);
                                        if (num < 0) {
                                            return Promise.reject(
                                                gLang('ticketOperate.entrustUserIdNonNegative')
                                            );
                                        }
                                        if (num > 10000) {
                                            return Promise.reject(
                                                gLang('ticketOperate.entrustUserIdMax')
                                            );
                                        }
                                        return Promise.resolve();
                                    },
                                },
                            ]}
                        >
                            <Input
                                placeholder={gLang('ticketOperate.entrustUserIdPlaceholder')}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={5}
                                onChange={e => {
                                    e.target.value = e.target.value.replace(/\D/g, '');
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            label={gLang('ticketOperate.entrustReason')}
                            name="reason"
                            rules={[
                                {
                                    required: true,
                                    message: gLang('ticketOperate.entrustReasonRequired'),
                                },
                                { max: 200, message: gLang('ticketOperate.entrustReasonMax') },
                            ]}
                        >
                            <Input.TextArea
                                rows={4}
                                showCount
                                maxLength={200}
                                placeholder={gLang('ticketOperate.entrustReasonPlaceholder')}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            </>
        );
    }
);

TicketActionCard.displayName = 'TicketActionCard';
