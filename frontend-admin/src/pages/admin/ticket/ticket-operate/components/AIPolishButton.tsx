import React, { useCallback, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Button, ConfigProvider, Typography, message } from 'antd';
import { HighlightOutlined, UndoOutlined } from '@ant-design/icons';
import { gLang } from '@common/language';
import { callAIPolishStreamWithCancel } from '@common/utils/aiStream';
import { useStyle } from '@common/hooks/useStyle';

const { Text } = Typography;

interface AIPolishButtonProps {
    tid?: string;
    form: any;
    setPlaceholderOverride: (placeholder: string | null) => void;
    style?: React.CSSProperties;
}

export interface AIPolishButtonRef {
    /** 外部触发润色：先将 text 填入输入框，再启动润色流程 */
    polishText: (text: string) => void;
}

export const AIPolishButton = forwardRef<AIPolishButtonRef, AIPolishButtonProps>(({
    tid,
    form,
    setPlaceholderOverride,
    style,
}, ref) => {
    const [isPolishing, setIsPolishing] = useState(false);
    const [originalText, setOriginalText] = useState<string | null>(null);
    const cancelRef = useRef<(() => void) | null>(null);
    const [messageApi, contextHolder] = message.useMessage();

    const startPolish = useCallback((text: string) => {
        if (!text.trim()) {
            messageApi.warning(gLang('admin.aiPolishEnterContent'));
            return;
        }
        if (!tid) return;

        setOriginalText(text);
        setIsPolishing(true);
        form.setFieldValue('details', '');
        setPlaceholderOverride(gLang('admin.aiPolishGenerating'));

        const { promise, cancel } = callAIPolishStreamWithCancel({
            tid: parseInt(tid, 10),
            text,
            onChunk: (chunk) => {
                const current = form.getFieldValue('details') ?? '';
                form.setFieldValue('details', current + chunk);
            },
            onComplete: () => {
                setIsPolishing(false);
                setPlaceholderOverride(null);
                cancelRef.current = null;
            },
            onError: (error) => {
                setIsPolishing(false);
                setPlaceholderOverride(null);
                cancelRef.current = null;
                messageApi.error(gLang('admin.aiPolishFailed', { error: error.message }));
                const current = (form.getFieldValue('details') ?? '').trim();
                if (!current) {
                    form.setFieldValue('details', text);
                    setOriginalText(null);
                }
            },
        });

        cancelRef.current = cancel;
        promise.catch(() => {});
    }, [tid, form, messageApi, setPlaceholderOverride]);

    const handlePolish = useCallback(() => {
        const text = (form.getFieldValue('details') ?? '').trim();
        startPolish(text);
    }, [form, startPolish]);

    const handleCancel = useCallback(() => {
        cancelRef.current?.();
        cancelRef.current = null;
        setIsPolishing(false);
        setPlaceholderOverride(null);
    }, [setPlaceholderOverride]);

    const handleRestore = useCallback(() => {
        if (originalText != null) {
            form.setFieldValue('details', originalText);
            setOriginalText(null);
        }
    }, [originalText, form]);

    useImperativeHandle(ref, () => ({
        polishText: (text: string) => {
            form.setFieldValue('details', text);
            startPolish(text);
        },
    }), [form, startPolish]);

    const { styles } = useStyle();

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, ...style }}>
            {contextHolder}
            <ConfigProvider button={{ className: styles.aiButton }}>
                <Button
                    type="primary"
                    icon={<HighlightOutlined />}
                    loading={isPolishing}
                    onClick={handlePolish}
                    size="small"
                >
                    {gLang('admin.aiPolish')}
                </Button>
            </ConfigProvider>
            {isPolishing && (
                <Button size="small" onClick={handleCancel}>
                    {gLang('admin.aiPolishCancel')}
                </Button>
            )}
            {!isPolishing && originalText != null && (
                <Button
                    size="small"
                    icon={<UndoOutlined />}
                    onClick={handleRestore}
                >
                    {gLang('admin.aiPolishRestore')}
                </Button>
            )}
            {originalText != null && (
                <Text
                    type="secondary"
                    style={{
                        fontSize: 12,
                        lineHeight: '24px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        flex: '1 1 auto',
                    }}
                    title={originalText}
                >
                    {gLang('admin.aiPolishOriginal')}{originalText}
                </Text>
            )}
        </div>
    );
});

AIPolishButton.displayName = 'AIPolishButton';
