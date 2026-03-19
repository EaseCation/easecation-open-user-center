// 工单操作页面中的AI生成按钮

import React, { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Button, ConfigProvider, Input, Modal, Space, Tag, message } from 'antd';
import { MessageFilled } from '@ant-design/icons';
import { gLang } from '@common/language';
import { useStyle } from '@common/hooks/useStyle';
import { AIStreamProvider, useAIStreamContext } from '@common/contexts/AIStreamContext';
import { StreamModalContent } from '../../../../../components/StreamModalContent';
import { FEEDBACK_AI_PRESETS, type FeedbackAIPreset } from '../../../../../constants/feedback-ai-prompts';

interface AIGenerateButtonProps {
    onGenerate?: (prompt: string) => Promise<void>; // 向后兼容，但不再使用
    isGenerating?: boolean; // 向后兼容，但不再使用
    className?: string;
    tid?: string;
    form?: any;
    /** 是否显示预设提示词（反馈工单用） */
    showPresets?: boolean;
}

export interface AIGenerateButtonRef {
    showDialog: (presetKey?: string, context?: string) => void;
}

const { TextArea } = Input;

// 模态框底部按钮组件
const StreamModalFooter: React.FC<{
    form: any;
    onCancel: () => void;
    onClose: () => void;
}> = ({ form, onCancel, onClose }) => {
    // 直接从Context获取最新状态，避免闭包问题
    const { isLoading, isCompleted, finalAnswer, content, editedAnswer } = useAIStreamContext();

    const handleUse = () => {
        // 直接从DOM获取TextArea的当前值
        const selector = gLang('admin.ticketAiAnswerSelector');
        const safeSelector =
            typeof selector === 'string' && selector.trim()
                ? selector
                : 'textarea[placeholder*="AI"]';
        const textAreas = document.querySelectorAll(safeSelector);
        let replyContent = '';

        if (textAreas.length > 0) {
            const textArea = textAreas[0] as HTMLTextAreaElement;
            replyContent = textArea.value;
        } else {
            // 如果找不到TextArea，使用Context中的值作为备选
            replyContent = editedAnswer || finalAnswer || content;
        }

        if (form && replyContent) {
            form.setFieldValue('details', replyContent);
            form.validateFields(['details']);
        }
        onClose();
    };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid #f0f0f0',
            }}
        >
            <div>
                {isLoading && (
                    <Button danger onClick={onCancel}>
                        {gLang('admin.ticketCancelGenerate')}
                    </Button>
                )}
            </div>
            <div>
                <Button onClick={onClose}>{gLang('admin.ticketClose')}</Button>
                {isCompleted && (editedAnswer || finalAnswer || content) && (
                    <Button type="primary" onClick={handleUse} style={{ marginLeft: 8 }}>
                        {gLang('admin.ticketUseReply')}
                    </Button>
                )}
            </div>
        </div>
    );
};

// 预设提示词确认弹窗的内容组件
const PresetDialogContent: React.FC<{
    showPresets: boolean;
    initialPresetKey?: string;
    initialContext?: string;
    promptRef: React.MutableRefObject<string>;
}> = ({ showPresets, initialPresetKey, initialContext, promptRef }) => {
    const initialPreset = initialPresetKey
        ? FEEDBACK_AI_PRESETS.find(p => p.key === initialPresetKey)
        : undefined;
    const buildPrompt = (presetPrompt: string, ctx?: string) =>
        ctx ? `${ctx}\n${presetPrompt}` : presetPrompt;
    const [selectedPreset, setSelectedPreset] = useState<string | null>(initialPresetKey ?? null);
    const [promptValue, setPromptValue] = useState(buildPrompt(initialPreset?.prompt ?? '', initialContext));

    // 同步到 ref
    React.useEffect(() => {
        promptRef.current = promptValue;
    }, [promptValue, promptRef]);

    const handlePresetClick = useCallback((preset: FeedbackAIPreset) => {
        setSelectedPreset(preset.key);
        setPromptValue(buildPrompt(preset.prompt, initialContext));
    }, [initialContext]);

    return (
        <Space direction="vertical" style={{ display: 'flex' }}>
            {gLang('ticketOperate.aiReplyConfirmContent')}
            {showPresets && (
                <div>
                    <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>{gLang('admin.feedbackPresetPromptLabel')}</div>
                    <Space wrap>
                        {FEEDBACK_AI_PRESETS.map(preset => (
                            <Tag
                                key={preset.key}
                                color={selectedPreset === preset.key ? 'blue' : undefined}
                                style={{ cursor: 'pointer', padding: '2px 8px' }}
                                onClick={() => handlePresetClick(preset)}
                            >
                                {preset.label}
                            </Tag>
                        ))}
                    </Space>
                </div>
            )}
            <TextArea
                placeholder={gLang('ticketOperate.aiReplyConfirmPrompt')}
                value={promptValue}
                onChange={e => {
                    setPromptValue(e.target.value);
                    setSelectedPreset(null);
                }}
                autoSize={{ minRows: 2, maxRows: 6 }}
            />
        </Space>
    );
};

// 内部组件，使用Context获取状态
const AIGenerateButtonInternal = forwardRef<AIGenerateButtonRef, AIGenerateButtonProps>((props, ref) => {
    const { className, tid, form, showPresets = false } = props;
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [streamModal, streamContextHolder] = Modal.useModal();
    const [messageApi, messageContextHolder] = message.useMessage();
    const promptRef = React.useRef('');
    const pendingPresetKeyRef = React.useRef<string | undefined>(undefined);
    const pendingContextRef = React.useRef<string | undefined>(undefined);
    const { isLoading, startStream, cancelStream, resetStream } = useAIStreamContext();

    // 流式生成处理函数
    const handleStreamGenerate = async (prompt: string) => {
        if (!tid) {
            messageApi.error(gLang('admin.ticketIdMissing'));
            return;
        }

        resetStream();

        // 显示流式输出模态框
        const streamModalInstance = streamModal.info({
            title: gLang('admin.ticketAiThinkingTitle'),
            content: (
                <div>
                    <StreamModalContent />
                    <StreamModalFooter
                        form={form}
                        onCancel={() => {
                            cancelStream();
                            streamModalInstance.destroy();
                        }}
                        onClose={() => {
                            cancelStream();
                            streamModalInstance.destroy();
                        }}
                    />
                </div>
            ),
            width: 800,
            footer: null,
        });

        const ticketId = parseInt(tid || '0');
        if (isNaN(ticketId) || ticketId === 0) {
            throw new Error(gLang('admin.ticketInvalidId'));
        }
        await startStream(ticketId, prompt || undefined);
    };

    const showDialog = useCallback((presetKey?: string, context?: string) => {
        promptRef.current = '';
        pendingPresetKeyRef.current = presetKey;
        pendingContextRef.current = context;
        setConfirmOpen(true);
    }, []);

    const handleConfirmOk = useCallback(async () => {
        setConfirmOpen(false);
        await handleStreamGenerate(promptRef.current);
    }, [tid, form]);

    const handleConfirmCancel = useCallback(() => {
        setConfirmOpen(false);
    }, []);

    useImperativeHandle(ref, () => ({
        showDialog,
    }), [showDialog]);

    const { styles } = useStyle();

    return (
        <ConfigProvider
            button={{
                className: styles.aiButton,
            }}
        >
            <div key="stream-modal-holder">{streamContextHolder}</div>
            {messageContextHolder}
            <Button
                type="primary"
                icon={<MessageFilled />}
                loading={isLoading}
                onClick={() => showDialog()}
                className={className}
            >
                {gLang('ticketOperate.aiReply')}
            </Button>
            <Modal
                open={confirmOpen}
                centered
                title={gLang('ticketOperate.aiReplyConfirm')}
                okText={gLang('ticketOperate.aiReplyConfirmOK')}
                cancelText={gLang('cancel')}
                onOk={handleConfirmOk}
                onCancel={handleConfirmCancel}
                okButtonProps={{ className }}
            >
                {confirmOpen && (
                    <PresetDialogContent
                        showPresets={showPresets}
                        initialPresetKey={pendingPresetKeyRef.current}
                        initialContext={pendingContextRef.current}
                        promptRef={promptRef}
                    />
                )}
            </Modal>
            <style>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `}</style>
        </ConfigProvider>
    );
});

AIGenerateButtonInternal.displayName = 'AIGenerateButtonInternal';

// 主导出组件，包装Context Provider
export const AIGenerateButton = forwardRef<AIGenerateButtonRef, AIGenerateButtonProps>((props, ref) => {
    return (
        <AIStreamProvider>
            <AIGenerateButtonInternal ref={ref} {...props} />
        </AIStreamProvider>
    );
});

AIGenerateButton.displayName = 'AIGenerateButton';
