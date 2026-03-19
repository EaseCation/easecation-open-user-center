/**
 * 工单引用自动补全下拉组件。
 * 浮动在 textarea 光标位置下方，展示候选工单列表。
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Spin, theme } from 'antd';
import type { GlobalToken } from 'antd';
import { gLang } from '../../language';
import {
    useTicketMention,
    type TicketRefCandidate,
    type UseTicketMentionResult,
} from './useTicketMention';

// 反馈状态到颜色的映射（open 状态使用 token.colorPrimary，由调用处传入）
const getStatusColor = (status: string, primaryColor: string): string => {
    const map: Record<string, string> = {
        O: primaryColor, // open
        W: primaryColor,
        X: primaryColor,
        E: primaryColor,
        A: '#52c41a', // accepted/ended
        P: '#52c41a',
        B: '#ff4d4f', // rejected/closed
        R: '#ff4d4f',
        D: '#ff4d4f',
    };
    return map[status] ?? '#999';
};

export interface TicketMentionDropdownProps {
    /** 获取底层 textarea DOM 元素 */
    getTextArea: () => HTMLTextAreaElement | null | undefined;
    /** 文本值 */
    value: string;
    /** 文本变更回调 */
    onChange: (newValue: string) => void;
    /** 暴露 hook 结果供父组件使用（如合并 onKeyDown） */
    mentionRef?: React.MutableRefObject<UseTicketMentionResult | null>;
}

const TicketMentionDropdown: React.FC<TicketMentionDropdownProps> = ({
    getTextArea,
    value,
    onChange,
    mentionRef,
}) => {
    const mention = useTicketMention(getTextArea, value, onChange);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { token } = theme.useToken();

    // 暴露 mention 结果给父组件
    useEffect(() => {
        if (mentionRef) mentionRef.current = mention;
    }, [mention, mentionRef]);

    // value 变化时检测触发
    // 只在 value 变化时触发，mention.checkTrigger 内部已用 ref 管理状态
    useEffect(() => {
        mention.checkTrigger();
    }, [value, mention.checkTrigger]);

    // 点击外部关闭
    useEffect(() => {
        if (!mention.visible) return;
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                mention.dismiss();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [mention.visible, mention.dismiss]);

    if (!mention.visible || !mention.position) return null;

    const ta = getTextArea();
    if (!ta) return null;

    // 计算下拉绝对位置
    const taRect = ta.getBoundingClientRect();
    const dropdownStyle: React.CSSProperties = {
        position: 'fixed',
        top: taRect.top + mention.position.top + mention.position.height + 4,
        left: taRect.left + mention.position.left,
        zIndex: 1050,
        minWidth: 280,
        maxWidth: 420,
        maxHeight: 320,
        overflowY: 'auto',
        background: token.colorBgElevated,
        borderRadius: token.borderRadiusLG,
        boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
        border: `1px solid ${token.colorBorderSecondary}`,
        padding: '4px 0',
        fontSize: token.fontSize,
    };

    const content = (
        <div ref={dropdownRef} style={dropdownStyle}>
            {mention.loading && mention.candidates.length === 0 ? (
                <div style={{ padding: '12px 16px', textAlign: 'center', color: token.colorTextTertiary }}>
                    <Spin size="small" /> <span style={{ marginLeft: 8 }}>{gLang('feedback.ticketRefLoading')}</span>
                </div>
            ) : mention.candidates.length === 0 ? (
                <div style={{ padding: '12px 16px', textAlign: 'center', color: token.colorTextTertiary }}>
                    {gLang('feedback.ticketRefNoResults')}
                </div>
            ) : (
                mention.candidates.map((item, index) => (
                    <CandidateItem
                        key={item.tid}
                        item={item}
                        isSelected={index === mention.selectedIndex}
                        onClick={() => mention.selectCandidate(item)}
                        onMouseEnter={() => {/* selectedIndex 由键盘控制，鼠标悬停不切换 */}}
                        token={token}
                    />
                ))
            )}
        </div>
    );

    return createPortal(content, document.body);
};

const CandidateItem: React.FC<{
    item: TicketRefCandidate;
    isSelected: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    token: GlobalToken;
}> = ({ item, isSelected, onClick, token }) => {
    const statusColor = getStatusColor(item.status, token.colorPrimary);
    const title = item.title.length > 40 ? item.title.slice(0, 40) + '...' : item.title;

    const selectedBg = token.controlItemBgActive;
    const hoverBg = token.controlItemBgHover;

    return (
        <div
            onClick={onClick}
            style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: isSelected ? selectedBg : 'transparent',
                transition: 'background 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = isSelected ? selectedBg : hoverBg)}
            onMouseOut={e => (e.currentTarget.style.background = isSelected ? selectedBg : 'transparent')}
        >
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: statusColor,
                    flexShrink: 0,
                }}
            />
            <span style={{ color: token.colorPrimary, fontWeight: 500, flexShrink: 0 }}>
                #{item.tid}
            </span>
            <span style={{ color: token.colorText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
            </span>
        </div>
    );
};

export default TicketMentionDropdown;
