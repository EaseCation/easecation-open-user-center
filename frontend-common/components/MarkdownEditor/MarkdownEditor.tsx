// 富文本（Markdown）回复框：支持源代码编辑与预览切换，带快捷按钮。
// Usage: 作为 Form.Item 的子组件，value/onChange 与 antd 表单兼容。

import React, { useState, useRef, useCallback } from 'react';
import { Segmented, Input, Tooltip, Button } from 'antd';
import {
    BoldOutlined,
    ItalicOutlined,
    StrikethroughOutlined,
    LinkOutlined,
    UnorderedListOutlined,
    OrderedListOutlined,
    MessageOutlined,
    CodeOutlined,
    MinusOutlined,
    DownOutlined,
    TableOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { gLang } from '../../language';
import { useTheme } from '../../contexts/ThemeContext';
import { TicketMentionDropdown, type UseTicketMentionResult } from '../TicketMention';

const { TextArea } = Input;

/** 将 #数字 转为 markdown 链接，用于预览模式 */
const preprocessTicketRefs = (text: string): string =>
    text.replace(/(^|\s)#(\d+)\b/g, (_, prefix, tid) => `${prefix}[#${tid}](/feedback/${tid})`);

const previewStyles = (isDark: boolean) => ({
    wrap: {
        minHeight: 80,
        padding: 12,
        borderRadius: 8,
        border: `1px solid ${isDark ? '#434343' : '#e8e8e8'}`,
        background: isDark ? '#141414' : '#fafafa',
        overflow: 'auto' as const,
    },
    base: {
        color: isDark ? '#f0f0f0' : '#222',
        fontSize: 14,
        lineHeight: 1.7,
        margin: 0,
    },
    h1: { fontSize: 20, margin: '16px 0 8px' },
    h2: { fontSize: 18, margin: '14px 0 6px' },
    h3: { fontSize: 16, margin: '12px 0 4px' },
    a: { color: isDark ? '#40a9ff' : '#1677ff' },
    code: {
        background: isDark ? '#23272e' : '#f6f8fa',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 13,
    },
    pre: {
        background: isDark ? '#23272e' : '#f6f8fa',
        padding: 12,
        borderRadius: 6,
        overflow: 'auto' as const,
    },
});

export interface MarkdownEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    minRows?: number;
    maxRows?: number;
    disabled?: boolean;
    style?: React.CSSProperties;
    /** 是否显示切换与字数，默认 true */
    showToolbar?: boolean;
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
}

type ToolbarAction = { prefix: string; suffix: string; placeholder?: string };

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    value = '',
    onChange,
    placeholder,
    maxLength,
    minRows = 3,
    maxRows = 6,
    disabled = false,
    style,
    showToolbar = true,
    onKeyDown,
}) => {
    const [mode, setMode] = useState<'source' | 'preview'>('source');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const textAreaRef = useRef<any>(null);
    const mentionRef = useRef<UseTicketMentionResult | null>(null);
    const { isDark } = useTheme();
    const styles = previewStyles(isDark);

    const getTextArea = useCallback(() => {
        return textAreaRef.current?.resizableTextArea?.textArea as HTMLTextAreaElement | undefined;
    }, []);

    const handleChange = useCallback(
        (newValue: string) => onChange?.(newValue),
        [onChange]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            mentionRef.current?.handleKeyDown(e);
            if (e.defaultPrevented) return;
            onKeyDown?.(e);
        },
        [onKeyDown]
    );

    const applyAction = useCallback(
        (action: ToolbarAction) => {
            const ta = getTextArea();
            if (!ta || !onChange) return;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const text = value ?? '';
            const before = text.slice(0, start);
            const selected = text.slice(start, end);
            const after = text.slice(end);
            const placeholder = action.placeholder ?? '';
            let newText: string;
            let newStart: number;
            let newEnd: number;
            if (selected.length > 0) {
                newText = before + action.prefix + selected + action.suffix + after;
                newStart = start + action.prefix.length;
                newEnd = newStart + selected.length;
            } else {
                newText = before + action.prefix + placeholder + action.suffix + after;
                newStart = start + action.prefix.length;
                newEnd = newStart + placeholder.length;
            }
            const normalizedText = newText || '';
            onChange(normalizedText);
            setTimeout(() => {
                ta.focus();
                ta.setSelectionRange(newStart, newEnd);
            }, 0);
        },
        [value, onChange, getTextArea]
    );

    const toolbarActions: { icon: React.ReactNode; title: string; action: ToolbarAction }[] = [
        {
            icon: <BoldOutlined />,
            title: gLang('feedback.toolbarBold'),
            action: { prefix: '**', suffix: '**', placeholder: '' },
        },
        {
            icon: <ItalicOutlined />,
            title: gLang('feedback.toolbarItalic'),
            action: { prefix: '*', suffix: '*', placeholder: '' },
        },
        {
            icon: <StrikethroughOutlined />,
            title: gLang('feedback.toolbarStrike'),
            action: { prefix: '~~', suffix: '~~', placeholder: '' },
        },
        {
            icon: <LinkOutlined />,
            title: gLang('feedback.toolbarLink'),
            action: { prefix: '[', suffix: '](url)', placeholder: gLang('feedback.toolbarLink') },
        },
        {
            icon: <UnorderedListOutlined />,
            title: gLang('feedback.toolbarUl'),
            action: { prefix: '\n- ', suffix: '', placeholder: '' },
        },
        {
            icon: <OrderedListOutlined />,
            title: gLang('feedback.toolbarOl'),
            action: { prefix: '\n1. ', suffix: '', placeholder: '' },
        },
        {
            icon: <MessageOutlined />,
            title: gLang('feedback.toolbarQuote'),
            action: { prefix: '> ', suffix: '', placeholder: '' },
        },
        {
            icon: <CodeOutlined />,
            title: gLang('feedback.toolbarCode'),
            action: { prefix: '`', suffix: '`', placeholder: '' },
        },
        {
            icon: <CodeOutlined />,
            title: gLang('feedback.toolbarCodeBlock'),
            action: { prefix: '\n```\n', suffix: '\n```\n', placeholder: '' },
        },
        {
            icon: <TableOutlined />,
            title: gLang('feedback.toolbarTable'),
            action: {
                prefix: '\n| ',
                suffix: ' |\n| --- | --- | --- |\n|  |  |  |\n',
                placeholder: gLang('feedback.toolbarTablePlaceholder'),
            },
        },
        {
            icon: <MinusOutlined />,
            title: gLang('feedback.toolbarHr'),
            action: { prefix: '\n---\n', suffix: '', placeholder: '' },
        },
    ];

    const mentionDropdown = (
        <TicketMentionDropdown
            getTextArea={getTextArea}
            value={value}
            onChange={handleChange}
            mentionRef={mentionRef}
        />
    );

    return (
        <div style={style}>
            {!advancedOpen ? (
                <>
                    <div
                        style={{
                            marginBottom: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 8,
                        }}
                    >
                        <Button
                            type="link"
                            size="small"
                            icon={<DownOutlined style={{ transform: 'rotate(-90deg)' }} />}
                            onClick={() => setAdvancedOpen(true)}
                            disabled={disabled}
                        >
                            {gLang('feedback.editorAdvanced')}
                        </Button>
                    </div>
                    <TextArea
                        ref={textAreaRef}
                        value={value}
                        onChange={e => handleChange(e.target.value || '')}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        autoSize={{ minRows, maxRows }}
                        showCount={maxLength != null}
                        maxLength={maxLength}
                        disabled={disabled}
                        style={{
                            borderRadius: 8,
                            borderColor: isDark ? '#434343' : '#e8e8e8',
                            resize: 'none',
                        }}
                    />
                    {mentionDropdown}
                </>
            ) : (
                <>
                    {showToolbar && (
                        <div
                            style={{
                                marginBottom: 8,
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <Button
                                type="link"
                                size="small"
                                icon={<DownOutlined />}
                                onClick={() => setAdvancedOpen(false)}
                                disabled={disabled}
                            >
                                {gLang('feedback.editorAdvanced')}
                            </Button>
                            <Segmented
                                options={[
                                    { label: gLang('feedback.editorSource'), value: 'source' },
                                    { label: gLang('feedback.editorPreview'), value: 'preview' },
                                ]}
                                value={mode}
                                onChange={v =>
                                    setMode(v === 'source' || v === 'preview' ? v : 'source')
                                }
                                disabled={disabled}
                            />
                            {mode === 'source' && (
                                <span
                                    style={{
                                        marginLeft: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {toolbarActions.map((item, idx) => (
                                        <Tooltip key={idx} title={item.title}>
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    !disabled && applyAction(item.action)
                                                }
                                                onKeyDown={e =>
                                                    e.key === 'Enter' &&
                                                    !disabled &&
                                                    applyAction(item.action)
                                                }
                                                style={{
                                                    padding: '4px 6px',
                                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                                    color: isDark
                                                        ? 'rgba(255,255,255,0.65)'
                                                        : 'rgba(0,0,0,0.65)',
                                                    borderRadius: 4,
                                                    lineHeight: 1,
                                                }}
                                            >
                                                {item.icon}
                                            </span>
                                        </Tooltip>
                                    ))}
                                </span>
                            )}
                        </div>
                    )}
                    {showToolbar && (
                        <div
                            style={{
                                marginBottom: 6,
                                fontSize: 12,
                                color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                            }}
                        >
                            {gLang('feedback.editorMdOnly')}
                        </div>
                    )}
                    {mode === 'source' ? (
                        <>
                            <TextArea
                                ref={textAreaRef}
                                value={value}
                                onChange={e => handleChange(e.target.value || '')}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholder}
                                autoSize={{ minRows, maxRows }}
                                showCount={maxLength != null}
                                maxLength={maxLength}
                                disabled={disabled}
                                style={{
                                    borderRadius: 8,
                                    borderColor: isDark ? '#434343' : '#e8e8e8',
                                    resize: 'none',
                                }}
                            />
                            {mentionDropdown}
                        </>
                    ) : (
                        <div style={styles.wrap}>
                            <div style={styles.base}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                    components={{
                                        p: props => <p style={{ margin: '8px 0' }} {...props} />,
                                        h1: props => <h1 style={styles.h1} {...props} />,
                                        h2: props => <h2 style={styles.h2} {...props} />,
                                        h3: props => <h3 style={styles.h3} {...props} />,
                                        a: props => (
                                            <a
                                                style={styles.a}
                                                href={props.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {props.children}
                                            </a>
                                        ),
                                        code: props => <code style={styles.code} {...props} />,
                                        pre: props => <pre style={styles.pre} {...props} />,
                                        ul: props => (
                                            <ul style={{ margin: '8px 0 8px 24px' }} {...props} />
                                        ),
                                        ol: props => (
                                            <ol style={{ margin: '8px 0 8px 24px' }} {...props} />
                                        ),
                                    }}
                                >
                                    {preprocessTicketRefs(value || '')}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MarkdownEditor;
