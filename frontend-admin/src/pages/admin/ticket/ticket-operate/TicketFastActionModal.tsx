//工单快捷操作的模态框组件

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, message, Select, Alert } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { gLang } from '@common/language';
import { fetchData } from '@common/axiosConfig';

interface GiftSendStats {
    report: { last24h: number };
    feedback: { last24h: number };
}

interface FastActionModalProps {
    visible: boolean;
    onClose: () => void;
    ecid?: string;
    action?: string;
    type?: string;
    tid?: string;
    authorizer?: string;
    reason?: string;
    onRefresh?: () => void;
    updateTicketDetail?: () => Promise<void>;
}

const FastActionModal: React.FC<FastActionModalProps> = ({
    visible,
    onClose,
    ecid,
    action,
    tid,
    authorizer,
    onRefresh,
    updateTicketDetail,
}) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [punishType, setPunishType] = useState<string>('hack');
    const [giftStats, setGiftStats] = useState<GiftSendStats | null>(null);
    /** When last24h > 5, confirm button is frozen for 3 seconds; this is remaining seconds. */
    const [giftConfirmCooldown, setGiftConfirmCooldown] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    // 举报/反馈礼包弹框打开时拉取该玩家(ecid)近24小时收到数
    useEffect(() => {
        if (!visible || (action !== 'report' && action !== 'feedback') || !ecid?.trim()) {
            setGiftStats(null);
            return;
        }
        fetchData({
            url: '/ec/gift-send-stats',
            method: 'GET',
            data: { ecid: ecid.trim() },
            setData: (resp: GiftSendStats & { EPF_code?: number }) => {
                if (resp?.report != null && resp?.feedback != null)
                    setGiftStats({
                        report: { last24h: resp.report.last24h },
                        feedback: { last24h: resp.feedback.last24h },
                    });
            },
        });
    }, [visible, action, ecid]);

    const GIFT_THRESHOLD = 5;
    const giftLast24h =
        giftStats && (action === 'report' ? giftStats.report.last24h : giftStats.feedback.last24h);
    // 已发满 5 个时提示，即第 6 个及以后弹出（last24h >= 5）
    const giftOverThreshold = typeof giftLast24h === 'number' && giftLast24h >= GIFT_THRESHOLD;
    const GIFT_COOLDOWN_SEC = 3;
    const requiresReason = action === 'punish' || action === 'unban' || action === 'unmute' || action === 'unfreeze_score_top' || action === 'unrestrict_nick';
    const showsValueInput =
        action === 'report' ||
        action === 'feedback' ||
        (action === 'punish' && punishType !== 'warn' && punishType !== 'overwatch' && punishType !== 'restrict_nick');

    // When last24h >= 5 (第6个及以后), freeze confirm button for 3 seconds.
    useEffect(() => {
        if (!visible || !giftOverThreshold) {
            setGiftConfirmCooldown(0);
            return;
        }
        setGiftConfirmCooldown(GIFT_COOLDOWN_SEC);
        const t = setInterval(() => {
            setGiftConfirmCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(t);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [visible, giftOverThreshold]);

    // 时间换算函数
    const parseTimeInput = (input: string): number | null => {
        if (!input || typeof input !== 'string') return null;

        const inputStr = input.toLowerCase().trim();

        // 匹配时间格式：数字 + 单位（y/m/d）
        const timeRegex = /^(\d+(?:\.\d+)?)(y|m|d)$/;
        const match = inputStr.match(timeRegex);

        if (!match) return null;

        const value = parseFloat(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'y': // 年
                return Math.round(value * 365 * 24); // 1年 = 365天 * 24小时
            case 'm': // 月
                return Math.round(value * 30 * 24); // 1月 = 30天 * 24小时
            case 'd': // 天
                return Math.round(value * 24); // 1天 = 24小时
            default:
                return null;
        }
    };

    // 处理时间输入框变化
    const handleTimeInputChange = (value: string | number | null) => {
        if (typeof value === 'string') {
            const parsedTime = parseTimeInput(value);
            if (parsedTime !== null) {
                // 自动换算并更新输入框
                form.setFieldsValue({ value: parsedTime });
                messageApi.success(
                    gLang('ticketShortcut.timeConverted', {
                        original: value,
                        hours: parsedTime,
                    })
                );
            }
        }
    };

    // 处理处罚类型变化
    const handlePunishTypeChange = (value: string) => {
        setPunishType(value);
        if (value !== 'hack') {
            // 非封禁类型，清空时间和理由
            form.setFieldsValue({
                value: 1,
                reason: '',
            });
        } else {
            // 封禁类型，设置默认值
            form.setFieldsValue({
                value: 87600,
                reason: gLang('admin.ticketFastActionKai'),
            });
        }
    };

    // 自动跳转到下一个工单的函数
    const autoJumpToNextTicket = useCallback(async () => {
        // 从当前路径推断工单类型
        const pathSegments = location.pathname.split('/');
        // 路径格式：/[media/]ticket/operate/TYPE/TID
        const currentType = pathSegments[pathSegments.length - 2]; // 获取倒数第二个路径段作为类型

        // 判断是否为媒体工单
        const isMediaTicket = location.pathname.includes('/media/ticket/');

        // 根据当前类型确定下一个工单的分配类型
        let assignType = 'unassigned'; // 默认为未分配的普通工单

        if (isMediaTicket) {
            // 媒体工单类型映射
            if (currentType === 'auditMedia') {
                assignType = 'auditMedia';
            } else if (currentType === 'monthlyMedia') {
                assignType = 'monthlyMedia';
            } else if (currentType === 'updateMedia') {
                assignType = 'updateMedia';
            } else if (currentType === 'mediaEvent') {
                assignType = 'mediaEvent';
            } else {
                assignType = 'myMedia';
            }
        } else {
            // 普通工单类型映射
            if (currentType === 'my') {
                assignType = 'my';
            } else if (currentType === 'upgrade') {
                assignType = 'upgrade';
            } else {
                assignType = 'unassigned';
            }
        }

        // 调用工单分配API获取下一个工单
        await fetchData({
            url: '/ticket/assign',
            method: 'GET',
            data: { type: assignType },
            setData: resp => {
                if (resp.status === 0) {
                    // 没有更多工单了，显示提示并跳转到工单管理页面
                    messageApi.success(gLang('ticketOperate.allDone'));
                    setTimeout(() => {
                        if (isMediaTicket) {
                            navigate('/media', { replace: true });
                        } else {
                            navigate('/panel', { replace: true });
                        }
                    }, 1500);
                } else if (resp.status === -1) {
                    // 工单过多，显示警告但仍跳转
                    messageApi.success(gLang('ticketOperate.tooManyTickets'));
                } else {
                    // 有新工单，显示跳转提示
                    messageApi.success(gLang('ticketShortcut.jumpingToNext', { tid: resp.tid }));
                    // 跳转到新工单的操作页面
                    setTimeout(() => {
                        if (isMediaTicket) {
                            navigate(`/media/ticket/operate/${assignType}/${resp.tid}`, {
                                replace: true,
                            });
                        } else {
                            navigate(`/ticket/operate/${assignType}/${resp.tid}`, {
                                replace: true,
                            });
                        }
                    }, 500);
                }
            },
        });
    }, [location.pathname, messageApi, navigate]);

    const handleSubmit = useCallback(async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // 发送API请求
            await fetchData({
                url: '/ec/fast-action',
                method: 'POST',
                data: {
                    ecid: values.ecid,
                    action: action,
                    ...(action === 'punish'
                        ? {
                              ...(punishType !== 'warn' &&
                                  punishType !== 'overwatch' &&
                                  punishType !== 'restrict_nick' && {
                                      time:
                                          typeof values.value === 'string'
                                              ? parseInt(values.value)
                                              : values.value,
                                  }), // 警告/监管/昵称限制类型不发送时间，确保time是数字
                              reason: values.reason,
                              type: values.type,
                          }
                        : action === 'unban' || action === 'unmute'
                          ? {
                                reason: values.reason,
                            }
                          : action === 'transfer_to_hack'
                            ? {}
                            : {
                                  value: values.value,
                              }),
                    authorizer: authorizer,
                    tid: tid,
                },
                setData: () => {
                    messageApi.success(gLang('ticketShortcut.operationSuccess'));
                },
            });

            // 操作成功后刷新页面信息
            if (onRefresh) {
                onRefresh();
            }

            // 更新工单详情
            if (updateTicketDetail) {
                await updateTicketDetail();
            }

            // 仅在处罚操作时自动跳转到下一个未分配的工单
            if (action === 'punish') {
                await autoJumpToNextTicket();
            }

            setLoading(false);
            onClose();
        } catch {
            messageApi.error(gLang('ticketShortcut.operationFailed'));
            setLoading(false);
        }
    }, [
        form,
        action,
        punishType,
        authorizer,
        tid,
        messageApi,
        onRefresh,
        updateTicketDetail,
        onClose,
        autoJumpToNextTicket,
        setLoading,
    ]);

    return (
        <>
            {contextHolder}
            <Modal
                title={gLang('ticketShortcut.shortcut')}
                open={visible}
                onCancel={onClose}
                footer={[
                    <Button key="cancel" onClick={onClose}>
                        {gLang('cancel')}
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={loading}
                        onClick={handleSubmit}
                        disabled={giftOverThreshold && giftConfirmCooldown > 0}
                    >
                        {giftOverThreshold && giftConfirmCooldown > 0
                            ? `${gLang('confirm')} (${giftConfirmCooldown}s)`
                            : gLang('confirm')}
                    </Button>,
                ]}
                width={500}
            >
                {(action === 'report' || action === 'feedback') &&
                    ecid?.trim() &&
                    (giftStats ? (
                        <>
                            {giftOverThreshold && (
                                <Alert
                                    type="error"
                                    showIcon
                                    message={gLang('ticketShortcut.giftStatsOverThreshold')}
                                    style={{ marginBottom: 8 }}
                                />
                            )}
                            <Alert
                                type="info"
                                showIcon
                                message={gLang('ticketShortcut.giftStats', {
                                    last24h:
                                        action === 'report'
                                            ? giftStats.report.last24h
                                            : giftStats.feedback.last24h,
                                })}
                                style={{ marginBottom: 16 }}
                            />
                        </>
                    ) : (
                        <Alert message={gLang('loading')} style={{ marginBottom: 16 }} />
                    ))}
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        ecid: ecid || '',
                        action: action || '',
                        value: action === 'punish' ? 87600 : 1,
                        tid: tid || '',
                        authorizer: authorizer || '',
                        reason: action === 'punish' ? gLang('admin.ticketFastActionKai') : '',
                        type: action === 'punish' ? 'hack' : '',
                        time: '',
                    }}
                >
                    <Form.Item
                        name="ecid"
                        label="ECID"
                        rules={[{ required: true, message: gLang('ticketShortcut.enterECID') }]}
                    >
                        <Input placeholder={gLang('ticketShortcut.enterECID')} />
                    </Form.Item>

                    <Form.Item label={gLang('ticketShortcut.action')}>
                        <Input value={action ? gLang(`ticketShortcut.${action}`) : ''} disabled />
                    </Form.Item>

                    {showsValueInput && (
                        <Form.Item
                            name="value"
                            label={
                                action === 'punish'
                                    ? gLang('ticketShortcut.time')
                                    : gLang('ticketShortcut.value')
                            }
                            rules={[
                                {
                                    required: true,
                                    message:
                                        action === 'punish'
                                            ? gLang('ticketShortcut.enterTime')
                                            : gLang('ticketShortcut.enterValue'),
                                },
                            ]}
                            extra={
                                action === 'punish'
                                    ? gLang('ticketShortcut.timeInputHint')
                                    : undefined
                            }
                        >
                            <InputNumber
                                min={1}
                                placeholder={
                                    action === 'punish'
                                        ? gLang('ticketShortcut.enterTime')
                                        : gLang('ticketShortcut.enterValue')
                                }
                                style={{ width: '100%' }}
                                suffix={
                                    action === 'punish' ? gLang('ticketShortcut.hour') : undefined
                                }
                                stringMode={action === 'punish'} // 处罚时允许字符串输入
                                onPressEnter={e => {
                                    if (action === 'punish') {
                                        const target = e.target as HTMLInputElement;
                                        handleTimeInputChange(target.value);
                                    }
                                }}
                                onBlur={e => {
                                    if (action === 'punish') {
                                        handleTimeInputChange(e.target.value);
                                    }
                                }}
                                onChange={value => {
                                    if (action === 'punish' && typeof value === 'string') {
                                        // 检测是否包含时间单位，如果有就立即转换
                                        if (/\d+[ymd]$/i.test(value)) {
                                            handleTimeInputChange(value);
                                        }
                                    }
                                }}
                            />
                        </Form.Item>
                    )}

                    {action === 'punish' && (
                        <>
                            <Form.Item
                                name="type"
                                label={gLang('ticketShortcut.type')}
                                rules={[
                                    { required: true, message: gLang('ticketShortcut.selectType') },
                                ]}
                            >
                                <Select
                                    placeholder={gLang('ticketShortcut.selectType')}
                                    onChange={handlePunishTypeChange}
                                >
                                    <Select.Option value="ban">
                                        {gLang('ticketShortcut.banType')}
                                    </Select.Option>
                                    <Select.Option value="hack">
                                        {gLang('ticketShortcut.hackType')}
                                    </Select.Option>
                                    <Select.Option value="mute">
                                        {gLang('ticketShortcut.muteType')}
                                    </Select.Option>
                                    <Select.Option value="freeze_score_top">
                                        {gLang('ticketShortcut.freezeScoreTopType')}
                                    </Select.Option>
                                    <Select.Option value="restrict_nick">
                                        {gLang('ticketShortcut.restrictNickType')}
                                    </Select.Option>
                                    <Select.Option value="warn">
                                        {gLang('ticketShortcut.warnType')}
                                    </Select.Option>
                                    <Select.Option value="overwatch">
                                        {gLang('ticketShortcut.overwatchType')}
                                    </Select.Option>
                                </Select>
                            </Form.Item>
                        </>
                    )}

                    {requiresReason && (
                        <Form.Item
                            name="reason"
                            label={gLang('ticketShortcut.reason')}
                            rules={[
                                {
                                    required: true,
                                    message: gLang('ticketShortcut.enterReason'),
                                },
                            ]}
                        >
                            <Input.TextArea
                                placeholder={gLang('ticketShortcut.enterReason')}
                                rows={3}
                                maxLength={200}
                                showCount
                            />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </>
    );
};

export default FastActionModal;
