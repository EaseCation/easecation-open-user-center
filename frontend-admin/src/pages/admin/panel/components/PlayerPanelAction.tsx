// 超级面板中对玩家进行操作的组件

import { Button, Checkbox, Form, Input, Select, Space } from 'antd';
import { fetchData, submitData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import TextArea from 'antd/es/input/TextArea';
import React, { useEffect, useState } from 'react';
import { useForm } from 'antd/es/form/Form';
import { BindPlayerDetailBasic, StaffShortcut } from '@ecuc/shared/types/player.types';

const { Option } = Select;

interface Props {
    tid: number | null;
    player: BindPlayerDetailBasic;
    setRefresh: React.Dispatch<React.SetStateAction<boolean>>;
    initialValues?: Record<string, any>;
    disabled?: boolean;
    clearCache?: (ecid?: string) => void;
}

import { parseDuration } from '@common/utils/parseDuration';

const PlayerPanelAction = ({
    tid,
    player,
    setRefresh,
    initialValues,
    disabled,
    clearCache,
}: Props) => {
    const [actionType, setActionType] = useState('');
    const [shortcuts, setShortcuts] = useState<StaffShortcut[]>([]);
    const [loadingShortcut, setLoadingShortcut] = useState(false);
    const [rawData, setRawData] = useState<string>(initialValues?.data?.toString() || '');
    const [form] = useForm();

    useEffect(() => {
        // Auto fill type
        if (initialValues && initialValues.type) {
            setActionType(initialValues.type);
        }
        // Fetch shortcuts
        fetchData({
            url: '/shortcut/list',
            method: 'GET',
            data: {
                type: 'actions',
            },
            setData: setShortcuts,
        }).then();
    }, [initialValues]);

    useEffect(() => {
        setRawData('');
        form.resetFields(['data']);
        form.resetFields(['reason']);
        form.setFieldsValue({ data: undefined });
    }, [actionType, form]);

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Form
                form={form}
                layout="vertical"
                onFinish={async values => {
                    try {
                        await submitData({
                            data: {
                                ecid: player.ecid,
                                action: values.type,
                                value: values.data,
                                reason: values.reason,
                                toUser: values.toUser,
                                tid: tid ? tid : 0,
                            },
                            url: '/ec/action',
                            redirectTo: '',
                            successMessage: 'superPanel.successAction',
                            method: 'POST',
                            setIsFormDisabled: setLoadingShortcut,
                            setIsModalOpen: setRefresh,
                        });

                        if (clearCache) {
                            clearCache(player.ecid);
                        }
                    } catch {
                        // Error handled by submitData
                    }
                }}
                autoComplete="off"
                disabled={disabled || loadingShortcut}
                initialValues={initialValues}
            >
                <Form.Item
                    name="type"
                    label={gLang('superPanel.actionType')}
                    rules={[
                        {
                            required: true,
                            message: gLang('required'),
                        },
                    ]}
                >
                    <Select
                        onChange={value => {
                            setActionType(value);
                            form.resetFields(['data']);
                        }}
                    >
                        {shortcuts.map(shortcut => (
                            <Option key={shortcut.id} value={shortcut.title}>
                                [{gLang('openidPanel.quickActions')}] {shortcut.title}
                            </Option>
                        ))}
                        <Option value="ban">{gLang('superPanel.actionTypeSelect.ban')}</Option>
                        <Option value="gift">{gLang('superPanel.actionTypeSelect.gift')}</Option>
                        <Option value="gift_vip">
                            {gLang('superPanel.actionTypeSelect.gift_vip')}
                        </Option>
                        <Option value="overwatch">
                            {gLang('superPanel.actionTypeSelect.overwatch')}
                        </Option>
                        <Option value="media">{gLang('superPanel.actionTypeSelect.media')}</Option>
                        <Option value="note">{gLang('superPanel.actionTypeSelect.note')}</Option>
                        <Option value="clearbandegree">
                            {gLang('superPanel.actionTypeSelect.clearbandegree')}
                        </Option>
                        <Option value="freeze_score_top">
                            {gLang('superPanel.actionTypeSelect.freeze_score_top')}
                        </Option>
                        <Option value="restrict_nick">
                            {gLang('superPanel.actionTypeSelect.restrict_nick')}
                        </Option>
                        <Option value="unrestrict_nick">
                            {gLang('superPanel.actionTypeSelect.unrestrict_nick')}
                        </Option>
                    </Select>
                </Form.Item>

                {[
                    'ban',
                    'ban_long',
                    'hack',
                    'hack_long',
                    'mute',
                    'freeze_score_top',
                    'freeze_score_top_long',
                    'gift',
                    'gift_vip',
                    'media',
                ].includes(actionType) && (
                    <Form.Item
                        name="data"
                        label={gLang('superPanel.actionData.' + actionType)}
                        rules={[
                            {
                                required: true,
                                message: gLang('required'),
                            },
                            {
                                validator: (_, value) => {
                                    if (
                                        ['gift'].includes(actionType) &&
                                        (value.includes('vip.') || value.includes('currency.'))
                                    ) {
                                        return Promise.reject(gLang('superPanel.noVipOrCurr'));
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        {['ban', 'ban_long', 'hack', 'hack_long', 'mute', 'freeze_score_top', 'freeze_score_top_long'].includes(actionType) ? (
                            <Input
                                style={{ width: '100%' }}
                                placeholder={gLang('admin.panelDurationExample')}
                                value={rawData}
                                onChange={e => setRawData(e.target.value)}
                                onBlur={() => {
                                    const hours = parseDuration(rawData);
                                    const max = ['ban', 'hack'].includes(actionType)
                                        ? 744
                                        : ['freeze_score_top'].includes(actionType)
                                        ? 744
                                        : 10 * 365 * 24;
                                    form.setFieldsValue({ data: Math.min(hours, max) });
                                }}
                            />
                        ) : (
                            <Input />
                        )}
                    </Form.Item>
                )}
                <Form.Item
                    name="reason"
                    label={gLang('superPanel.actionReason')}
                    rules={[
                        {
                            required: true,
                            message: gLang('required'),
                        },
                    ]}
                >
                    <TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                </Form.Item>
                {tid && (
                    <Form.Item name="toUser" valuePropName="checked">
                        <Checkbox>{gLang('superPanel.displayToUser')}</Checkbox>
                    </Form.Item>
                )}
                <Form.Item>
                    <Button type="primary" disabled={!player} htmlType="submit">
                        {gLang('superPanel.actionSubmit')}
                    </Button>
                </Form.Item>
            </Form>
        </Space>
    );
};

export default PlayerPanelAction;
