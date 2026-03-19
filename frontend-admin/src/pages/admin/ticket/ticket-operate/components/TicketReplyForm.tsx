// 工单操作页中的回复工单组件

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button, Card, Form, Skeleton, Space, Upload, Select } from 'antd';
import {
    UploadOutlined,
    SendOutlined,
    StopOutlined,
    MessageOutlined,
    MenuOutlined,
} from '@ant-design/icons';
import { StaffShortcut } from '@ecuc/shared/types/player.types';
import { useUploadProps } from '@common/utils/uploadUtils';
import { gLang } from '@common/language';
import { QuickMessages } from './QuickMessages';
import { AIGenerateButton } from './AIGenerateButton';
import { AIPolishButton } from './AIPolishButton';
import TextArea from 'antd/es/input/TextArea';
import { TicketMentionDropdown, type UseTicketMentionResult } from '@common/components/TicketMention';
import axiosInstance from '@common/axiosConfig';
import { StaffAlias } from '@ecuc/shared/types/staff.types';
import { useAuth } from '@common/contexts/AuthContext';
// import TidJumpComponent from '../../../../../components/TidJumpComponent';

interface TicketReplyFormProps {
    form: any;
    ticket?: any;
    shortcuts: StaffShortcut[];
    isSubmitting: boolean;
    uploadedFiles: string[];
    onUploadChange: (files: string[]) => void;
    onSubmit: (values: any) => void;
    onReturnToMyChange: (checked: boolean) => void;
    isUploading?: boolean;
    setIsUploading?: (uploading: boolean) => void;
    /** Open the card navigation modal (jump to card) */
    onOpenCardNav?: () => void;
}

export const TicketReplyForm = React.memo(
    ({
        form,
        ticket,
        shortcuts,
        isSubmitting,
        uploadedFiles,
        onUploadChange,
        onSubmit,
        onReturnToMyChange,
        isUploading = false,
        setIsUploading,
        onOpenCardNav,
    }: TicketReplyFormProps) => {
        const { user } = useAuth();
        const [aliases, setAliases] = useState<StaffAlias[]>([]);
        const [currentAliasId, setCurrentAliasId] = useState<number | null>(null);
        const [loadingAliases, setLoadingAliases] = useState(false);
        const [placeholderOverride, setPlaceholderOverride] = useState<string | null>(null);
        const textAreaRef = useRef<any>(null);
        const mentionRef = useRef<UseTicketMentionResult | null>(null);
        const getTextArea = useCallback(
            () => textAreaRef.current?.resizableTextArea?.textArea as HTMLTextAreaElement | undefined,
            []
        );

        // 获取当前用户的别名列表
        useEffect(() => {
            const fetchAliases = async () => {
                if (!user?.userid) return;

                setLoadingAliases(true);
                try {
                    const response = await axiosInstance.get('/staff/alias');
                    const aliasesList: StaffAlias[] = response.data?.aliases ?? [];
                    setAliases(aliasesList);

                    // 获取当前工单中使用的别名ID
                    if (ticket?.staff_alias && ticket.tid) {
                        try {
                            const staffAliasDict =
                                typeof ticket.staff_alias === 'string'
                                    ? JSON.parse(ticket.staff_alias)
                                    : ticket.staff_alias;
                            // 从JWT获取当前用户ID
                            const currentUid = String(user.userid);
                            const aliasIdInDict = staffAliasDict[currentUid];

                            if (aliasIdInDict !== undefined) {
                                // 如果aliasId为0（逻辑0，表示不显示客服名），直接设置
                                if (aliasIdInDict === 0) {
                                    setCurrentAliasId(0);
                                } else {
                                    // 验证别名ID是否存在于别名列表中
                                    const aliasExists = aliasesList.find(
                                        a => a.id === aliasIdInDict
                                    );
                                    if (aliasExists) {
                                        setCurrentAliasId(aliasIdInDict);
                                    } else {
                                        // 如果别名ID无效，使用默认别名
                                        const defaultAlias = aliasesList.find(a => a.is_default);
                                        if (defaultAlias) {
                                            setCurrentAliasId(defaultAlias.id);
                                        }
                                    }
                                }
                            } else {
                                // 如果字典中没有，使用默认别名
                                const defaultAlias = aliasesList.find(a => a.is_default);
                                if (defaultAlias) {
                                    setCurrentAliasId(defaultAlias.id);
                                }
                            }
                        } catch {
                            // 解析失败，使用默认别名
                            const defaultAlias = aliasesList.find(a => a.is_default);
                            if (defaultAlias) {
                                setCurrentAliasId(defaultAlias.id);
                            }
                        }
                    } else {
                        // 如果没有字典，使用默认别名
                        const defaultAlias = aliasesList.find(a => a.is_default);
                        if (defaultAlias) {
                            setCurrentAliasId(defaultAlias.id);
                        }
                    }
                } finally {
                    setLoadingAliases(false);
                }
            };

            if (ticket?.tid && user?.userid) {
                fetchAliases();
            }
        }, [ticket?.tid, ticket?.staff_alias, user?.userid]);

        React.useMemo(
            () =>
                shortcuts
                    .filter(sc => sc.type === 'M')
                    .map(sc => ({
                        key: sc.uid,
                        label: (
                            <a
                                onClick={() => {
                                    const details = form.getFieldValue('details') ?? '';
                                    form.setFieldValue('details', details + sc.content);
                                }}
                            >
                                {sc.title}
                            </a>
                        ),
                    })),
            [shortcuts, form]
        );
        const { uploadProps, contextHolder } = useUploadProps(
            10,
            uploadedFiles,
            onUploadChange,
            setIsUploading
        );
        const returnToMyVal = Form.useWatch('returnToMy', form);
        const replyTypeVal = Form.useWatch('type', form);
        const detailsVal: string = Form.useWatch('details', form) ?? '';
        // 标题点击切换类型
        const handleTitleClick = () => {
            const currentType = form.getFieldValue('type');
            const nextType = currentType === 'reply' ? 'note' : 'reply';
            form.setFieldValue('type', nextType);
        };
        // 标题悬浮提示
        const nextType = replyTypeVal === 'reply' ? 'note' : 'reply';
        const titleTooltip = `${gLang('ticketOperate.switchto')}${gLang(`ticketOperate.${nextType}`)}`;
        // 标题悬停样式
        React.useEffect(() => {
            const style = document.createElement('style');
            style.innerHTML = `.ticket-title-hover:hover { color: #1677ff !important; }`;
            document.head.appendChild(style);
            return () => {
                document.head.removeChild(style);
            };
        }, []);
        return (
            <>
                {contextHolder}
                <Card
                    data-testid="reply-card"
                    style={{ width: '100%' }}
                    size="small"
                    styles={{ body: { paddingBottom: 8 }, header: { padding: '8px 12px' } }}
                    title={
                        <Space
                            size={8}
                            align="center"
                            style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                            <Space size={8} align="center">
                                <MessageOutlined />
                                <span
                                    className="ticket-title-hover"
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        transition: 'color 0.2s',
                                    }}
                                    onClick={handleTitleClick}
                                    title={titleTooltip}
                                >
                                    {gLang(`ticketOperate.${replyTypeVal || 'reply'}`)}
                                </span>
                            </Space>
                            {onOpenCardNav && (
                                <Button
                                    type="default"
                                    size="small"
                                    icon={<MenuOutlined />}
                                    onClick={onOpenCardNav}
                                >
                                    {gLang('ticketOperate.cardNav.title')}
                                </Button>
                            )}
                        </Space>
                    }
                >
                    {!ticket ? (
                        <Skeleton active />
                    ) : (
                        <Space direction="vertical" style={{ display: 'flex' }}>
                            <Form
                                form={form}
                                onFinish={value => {
                                    onSubmit(value);
                                }}
                                initialValues={{ type: 'reply', returnToMy: false }}
                                disabled={isSubmitting}
                            >
                                {/*回复类型选择（隐藏，仅用于表单值）*/}
                                <Form.Item
                                    name="type"
                                    style={{ display: 'none' }}
                                    rules={[{ required: true, message: gLang('required') }]}
                                >
                                    <Select
                                        options={[
                                            { value: 'reply', label: gLang('ticketOperate.reply') },
                                            { value: 'note', label: gLang('ticketOperate.note') },
                                        ]}
                                    />
                                </Form.Item>

                                {/*别名选择（仅管理员可见）*/}
                                {aliases.length > 0 && (
                                    <Form.Item
                                        label={gLang('ticketOperate.currentAlias')}
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Select
                                            size="small"
                                            style={{ width: 200 }}
                                            value={currentAliasId}
                                            onChange={async (aliasId: number) => {
                                                if (!ticket?.tid) return;
                                                await axiosInstance.post('/ticket/admin', {
                                                    tid: ticket.tid,
                                                    action: 'updateAlias',
                                                    details: aliasId,
                                                });
                                                setCurrentAliasId(aliasId);
                                            }}
                                            loading={loadingAliases}
                                            options={[
                                                {
                                                    value: 0,
                                                    label: gLang('ticketOperate.hideStaffName'),
                                                },
                                                ...aliases.map(alias => ({
                                                    value: alias.id,
                                                    label: `${alias.alias}${alias.is_default ? gLang('admin.feedbackFormatDefault') : ''}`,
                                                })),
                                            ]}
                                        />
                                    </Form.Item>
                                )}

                                {/*回复信息*/}
                                <Form.Item
                                    name="details"
                                    rules={[{ required: true, message: gLang('required') }]}
                                    labelCol={{ span: 0 }}
                                    wrapperCol={{ span: 24 }}
                                >
                                    <TextArea
                                        ref={textAreaRef}
                                        autoSize={{ minRows: 2, maxRows: 32 }}
                                        placeholder={placeholderOverride || undefined}
                                        onKeyDown={e => {
                                            mentionRef.current?.handleKeyDown(e);
                                            if (e.defaultPrevented) return;
                                            if (e.ctrlKey && e.key === 'Enter') {
                                                form.submit();
                                            }
                                        }}
                                    />
                                </Form.Item>
                                <TicketMentionDropdown
                                    getTextArea={getTextArea}
                                    value={detailsVal}
                                    onChange={v => form.setFieldValue('details', v)}
                                    mentionRef={mentionRef}
                                />

                                {/*AI润色*/}
                                <AIPolishButton
                                    tid={ticket?.tid?.toString()}
                                    form={form}
                                    setPlaceholderOverride={setPlaceholderOverride}
                                    style={{ marginBottom: 8 }}
                                />

                                {/*快捷回复信息*/}
                                <QuickMessages shortcuts={shortcuts} form={form} />

                                {/* 是否不再接单：改为按钮，移动到提交区 */}

                                {/* 文件列表（展示在按钮组上方） */}
                                <div style={{ margin: '0 0 8px' }}>
                                    <Upload
                                        className="list-only-upload"
                                        {...uploadProps}
                                        fileList={form.getFieldValue('files') || []}
                                        showUploadList
                                        listType="text"
                                        openFileDialogOnClick={false}
                                        onRemove={file => {
                                            if (
                                                typeof (uploadProps as any).onRemove === 'function'
                                            ) {
                                                (uploadProps as any).onRemove(file);
                                            }
                                            const current = form.getFieldValue('files') || [];
                                            const next = current.filter(
                                                (f: any) => f.uid !== (file as any).uid
                                            );
                                            form.setFieldValue('files', next);
                                            return true;
                                        }}
                                    />
                                    <style>{`.list-only-upload .ant-upload { display: none !important; }`}</style>
                                </div>

                                {/*回复确认*/}
                                <Form.Item>
                                    <Space align="center" size={12} wrap>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={isSubmitting}
                                            disabled={isUploading}
                                            icon={<SendOutlined />}
                                        >
                                            {gLang(
                                                `ticketOperate.submit${replyTypeVal || 'reply'}`
                                            )}
                                        </Button>
                                        <AIGenerateButton
                                            tid={ticket?.tid?.toString()}
                                            form={form}
                                        />
                                        <Form.Item
                                            name="returnToMy"
                                            valuePropName="checked"
                                            noStyle
                                        >
                                            <Button
                                                type={returnToMyVal ? 'primary' : 'default'}
                                                danger={returnToMyVal}
                                                icon={<StopOutlined />}
                                                onClick={() => {
                                                    const next = !returnToMyVal;
                                                    form.setFieldValue('returnToMy', next);
                                                    onReturnToMyChange(next);
                                                }}
                                            >
                                                {gLang('ticketOperate.returnToMyCheckbox')}
                                            </Button>
                                        </Form.Item>
                                        <Form.Item
                                            name="files"
                                            valuePropName="fileList"
                                            getValueFromEvent={e =>
                                                Array.isArray(e) ? e : e?.fileList || []
                                            }
                                            noStyle
                                        >
                                            <Upload {...uploadProps} showUploadList={false}>
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
                                    </Space>
                                </Form.Item>
                            </Form>
                        </Space>
                    )}
                </Card>
            </>
        );
    }
);

TicketReplyForm.displayName = 'TicketReplyForm';
