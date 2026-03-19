/**
 * 工单引用自动补全 hook。
 * 监听 textarea 的输入，检测 # 触发模式，调用搜索 API 返回候选列表。
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import axiosInstance from '../../axiosConfig';
import { getCaretCoordinates, type CaretCoordinates } from './getCaretCoordinates';

const DEBOUNCE_MS = 300;
const MAX_CANDIDATES = 8;

/** # 触发模式：匹配光标前的 #xxx */
const TRIGGER_RE = /(^|\s)#(\S*)$/;

export interface TicketRefCandidate {
    tid: number;
    title: string;
    status: string;
}

export interface UseTicketMentionResult {
    /** 下拉是否可见 */
    visible: boolean;
    /** 候选列表 */
    candidates: TicketRefCandidate[];
    /** 当前选中索引 */
    selectedIndex: number;
    /** 下拉定位（相对 textarea） */
    position: CaretCoordinates | null;
    /** 是否正在加载 */
    loading: boolean;
    /** 需要挂到 textarea 的 onKeyDown */
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    /** 选中某个候选项 */
    selectCandidate: (candidate: TicketRefCandidate) => void;
    /** 关闭下拉 */
    dismiss: () => void;
    /** 手动触发检测（输入变化后调用） */
    checkTrigger: () => void;
}

export function useTicketMention(
    getTextArea: () => HTMLTextAreaElement | null | undefined,
    value: string,
    onChange: (newValue: string) => void
): UseTicketMentionResult {
    const [visible, setVisible] = useState(false);
    const [candidates, setCandidates] = useState<TicketRefCandidate[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [position, setPosition] = useState<CaretCoordinates | null>(null);
    const [loading, setLoading] = useState(false);

    // 记录当前 # 触发的起始位置（即 # 字符在 value 中的 index）
    const triggerStartRef = useRef<number>(-1);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const dismiss = useCallback(() => {
        setVisible(false);
        setCandidates([]);
        setSelectedIndex(0);
        setPosition(null);
        triggerStartRef.current = -1;
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
    }, []);

    const fetchCandidates = useCallback(async (keyword: string) => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        try {
            const resp = await axiosInstance.get('/feedback/reference-search', {
                params: { keyword, scope: 'public' },
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            const list: TicketRefCandidate[] = resp.data?.data?.list ?? resp.data?.list ?? [];
            setCandidates(list.slice(0, MAX_CANDIDATES));
            setSelectedIndex(0);
        } catch {
            if (!controller.signal.aborted) {
                setCandidates([]);
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, []);

    const checkTrigger = useCallback(() => {
        const ta = getTextArea();
        if (!ta) return;

        const cursorPos = ta.selectionStart;
        const textBefore = value.substring(0, cursorPos);
        const match = TRIGGER_RE.exec(textBefore);

        if (!match) {
            if (visible) dismiss();
            return;
        }

        // # 在 value 中的位置
        const hashIndex = cursorPos - match[2].length - 1;
        triggerStartRef.current = hashIndex;

        // 计算光标位置用于定位下拉
        const coords = getCaretCoordinates(ta, hashIndex);
        setPosition(coords);
        setVisible(true);

        // 防抖搜索
        const keyword = match[2];
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            fetchCandidates(keyword);
        }, DEBOUNCE_MS);
    }, [getTextArea, value, visible, dismiss, fetchCandidates]);

    const selectCandidate = useCallback(
        (candidate: TicketRefCandidate) => {
            const ta = getTextArea();
            if (!ta || triggerStartRef.current < 0) return;

            const start = triggerStartRef.current;
            const cursorPos = ta.selectionStart;
            const before = value.substring(0, start);
            const after = value.substring(cursorPos);
            const insertion = `#${candidate.tid} `;
            const newValue = before + insertion + after;
            onChange(newValue);

            // 设置光标到插入文本之后
            const newCursorPos = start + insertion.length;
            setTimeout(() => {
                ta.focus();
                ta.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);

            dismiss();
        },
        [getTextArea, value, onChange, dismiss]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (!visible || candidates.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % candidates.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + candidates.length) % candidates.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectCandidate(candidates[selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                dismiss();
            }
        },
        [visible, candidates, selectedIndex, selectCandidate, dismiss]
    );

    // 清理
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    return {
        visible,
        candidates,
        selectedIndex,
        position,
        loading,
        handleKeyDown,
        selectCandidate,
        dismiss,
        checkTrigger,
    };
}
