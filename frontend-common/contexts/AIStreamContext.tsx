import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    ReactNode,
} from 'react';
import { callAIStreamWithCancel } from '../utils/aiStream';
import { AIStreamState, AIStreamChunk } from '@ecuc/shared/types/ai.types';

const normalizeStepContent = (value: unknown): string => {
    if (typeof value === 'string') {
        return value;
    }
    if (value === undefined || value === null) {
        return '';
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

interface AIStreamContextType extends AIStreamState {
    startStream: (tid: number, prompt?: string) => Promise<void>;
    cancelStream: () => void;
    resetStream: () => void;
    editedAnswer: string;
    setEditedAnswer: (answer: string) => void;
}

const AIStreamContext = createContext<AIStreamContextType | null>(null);

/** Default value when consumed outside provider (e.g. modal portal in prod). Prevents "Cannot read properties of undefined (reading 'isLoading')". */
const defaultContextValue: AIStreamContextType = {
    isLoading: false,
    content: '',
    error: null,
    isCompleted: false,
    thinkingSteps: [],
    finalAnswer: '',
    startStream: async () => {},
    cancelStream: () => {},
    resetStream: () => {},
    editedAnswer: '',
    setEditedAnswer: () => {},
};

export const useAIStreamContext = () => {
    const context = useContext(AIStreamContext);
    return context ?? defaultContextValue;
};

interface AIStreamProviderProps {
    children: ReactNode;
}

export const AIStreamProvider: React.FC<AIStreamProviderProps> = ({ children }) => {
    const [state, setState] = useState<AIStreamState>({
        isLoading: false,
        content: '',
        error: null,
        isCompleted: false,
        thinkingSteps: [],
        finalAnswer: '',
    });

    const [editedAnswer, setEditedAnswer] = useState<string>('');

    const cancelRef = useRef<(() => void) | null>(null);

    // 同步finalAnswer到editedAnswer
    useEffect(() => {
        if (state.finalAnswer !== undefined) {
            setEditedAnswer(state.finalAnswer);
        }
    }, [state.finalAnswer]);

    // 启动流式请求
    const startStream = useCallback(async (tid: number, prompt?: string) => {
        // 重置状态
        setState({
            isLoading: true,
            content: '',
            error: null,
            isCompleted: false,
            thinkingSteps: [],
            finalAnswer: '',
        });

        // 取消之前的请求
        if (cancelRef.current) {
            cancelRef.current();
        }

        const { promise, cancel } = callAIStreamWithCancel({
            tid,
            prompt,
            onMessage: (message: AIStreamChunk) => {
                setState(prev => {
                    const newState = { ...prev };

                    switch (message.type) {
                        case 'thinking_step':
                            if (message.step) {
                                // 确保 thinkingSteps 是数组
                                if (!Array.isArray(newState.thinkingSteps)) {
                                    newState.thinkingSteps = [];
                                }
                                
                                // 添加或更新思维步骤，使用更智能的匹配策略
                                const existingIndex = newState.thinkingSteps.findIndex(
                                    step =>
                                        step.name === (message.step?.name ?? '') &&
                                        step.nodeType === (message.step?.nodeType ?? '')
                                );

                                if (existingIndex >= 0) {
                                    // 更新现有步骤，保持引用以便React检测变化
                                    newState.thinkingSteps = [...newState.thinkingSteps];
                                    const existingStep = newState.thinkingSteps[existingIndex];
                                    const newContent = normalizeStepContent(message.step.content);
                                    const existingContent = normalizeStepContent(existingStep.content);

                                    // 如果新内容非空且与现有内容不同，则累积内容
                                    let updatedContent = existingContent;
                                    if (newContent && newContent !== existingContent) {
                                        // 如果现有内容为空，直接使用新内容
                                        if (!existingContent) {
                                            updatedContent = newContent;
                                        } else {
                                            // 尝试合并JSON对象
                                            try {
                                                const existingObj = JSON.parse(existingContent);

                                                // 检查新内容是否为JSON
                                                let isNewContentJSON = false;
                                                let newObj;
                                                try {
                                                    newObj = JSON.parse(newContent);
                                                    isNewContentJSON = true;
                                                } catch {
                                                    // 新内容不是JSON，可能是普通字符串
                                                }

                                                if (isNewContentJSON) {
                                                    // 新内容也是JSON，进行对象合并
                                                    const mergedObj = { ...existingObj };
                                                    for (const [key, value] of Object.entries(
                                                        newObj
                                                    )) {
                                                        if (
                                                            typeof value === 'string' &&
                                                            typeof mergedObj[key] === 'string'
                                                        ) {
                                                            // 清理新内容中的多余符号
                                                            const cleanValue = value
                                                                .replace(/\/+$/, '')
                                                                .trim();
                                                            // 字符串字段拼接，避免重复
                                                            if (
                                                                cleanValue &&
                                                                !mergedObj[key].includes(cleanValue)
                                                            ) {
                                                                mergedObj[key] =
                                                                    mergedObj[key] + cleanValue;
                                                            }
                                                        } else if (
                                                            typeof value === 'object' &&
                                                            value !== null &&
                                                            typeof mergedObj[key] === 'object' &&
                                                            mergedObj[key] !== null
                                                        ) {
                                                            // 对象字段递归合并字符串属性
                                                            const mergedSubObj = {
                                                                ...mergedObj[key],
                                                            };
                                                            for (const [
                                                                subKey,
                                                                subValue,
                                                            ] of Object.entries(value)) {
                                                                if (
                                                                    typeof subValue === 'string' &&
                                                                    typeof mergedSubObj[subKey] ===
                                                                        'string'
                                                                ) {
                                                                    // 清理子对象中的多余符号
                                                                    const cleanSubValue = subValue
                                                                        .replace(/\/+$/, '')
                                                                        .trim();
                                                                    if (
                                                                        cleanSubValue &&
                                                                        !mergedSubObj[
                                                                            subKey
                                                                        ].includes(cleanSubValue)
                                                                    ) {
                                                                        mergedSubObj[subKey] =
                                                                            mergedSubObj[subKey] +
                                                                            cleanSubValue;
                                                                    }
                                                                } else {
                                                                    mergedSubObj[subKey] = subValue;
                                                                }
                                                            }
                                                            mergedObj[key] = mergedSubObj;
                                                        } else {
                                                            // 其他类型字段直接覆盖
                                                            mergedObj[key] = value;
                                                        }
                                                    }
                                                    updatedContent = JSON.stringify(mergedObj);
                                                } else {
                                                    // 新内容是普通字符串，需要累积到现有JSON的字符串字段中
                                                    const mergedObj = { ...existingObj };

                                                    // 寻找第一个字符串字段进行累积
                                                    let hasStringField = false;
                                                    for (const [key, value] of Object.entries(
                                                        mergedObj
                                                    )) {
                                                        if (typeof value === 'string') {
                                                            // 清理新内容中的多余符号
                                                            const cleanNewContent = newContent
                                                                .replace(/\/+$/, '')
                                                                .trim();
                                                            if (
                                                                cleanNewContent &&
                                                                !value.includes(cleanNewContent)
                                                            ) {
                                                                mergedObj[key] =
                                                                    value + cleanNewContent;
                                                            }
                                                            hasStringField = true;
                                                            break;
                                                        }
                                                    }

                                                    // 如果没有字符串字段，创建一个result字段
                                                    if (!hasStringField) {
                                                        const cleanNewContent = newContent
                                                            .replace(/\/+$/, '')
                                                            .trim();
                                                        mergedObj.result = cleanNewContent;
                                                    }

                                                    updatedContent = JSON.stringify(mergedObj);
                                                }
                                            } catch {
                                                // 现有内容不是JSON格式，使用原来的字符串累积逻辑
                                                    if (!existingContent.includes(newContent)) {
                                                        updatedContent = existingContent + newContent;
                                                }
                                            }
                                        }
                                    }

                                    newState.thinkingSteps[existingIndex] = {
                                        ...existingStep,
                                        ...message.step,
                                        content: updatedContent,
                                    };
                                } else {
                                    // 添加新步骤
                                    const normalizedStep = {
                                        ...message.step,
                                        content: normalizeStepContent(message.step.content),
                                    };
                                    newState.thinkingSteps = [
                                        ...newState.thinkingSteps,
                                        normalizedStep,
                                    ];
                                }

                                // 如果有步骤正在执行，保持loading状态
                                const hasExecuting = newState.thinkingSteps.some(
                                    step => step.status === 'executing'
                                );
                                if (hasExecuting) {
                                    newState.isLoading = true;
                                }
                            }
                            break;

                        case 'final_answer':
                            if (message.reply) {
                                newState.finalAnswer = message.reply;
                                newState.content = message.reply;
                                newState.isCompleted = true;
                                newState.isLoading = false;

                                // 将所有执行中的步骤标记为完成
                                newState.thinkingSteps = newState.thinkingSteps.map(step =>
                                    step.status === 'executing'
                                        ? { ...step, status: 'completed' as const }
                                        : step
                                );
                            }
                            break;

                        case 'incremental_text':
                            if (message.reply) {
                                newState.content += message.reply;
                            }
                            break;

                        default:
                            // 处理没有type字段的情况（向后兼容）
                            if (message.reply) {
                                newState.content += message.reply;
                            }
                            break;
                    }

                    return newState;
                });
            },
            onComplete: () => {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    isCompleted: true,
                }));
                cancelRef.current = null;
            },
            onError: (error: Error) => {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error.message,
                }));
                cancelRef.current = null;
            },
        });

        cancelRef.current = cancel;

        await promise;
    }, []);

    // 取消请求
    const cancelStream = useCallback(() => {
        if (cancelRef.current) {
            cancelRef.current();
            cancelRef.current = null;
            setState(prev => ({
                ...prev,
                isLoading: false,
            }));
        }
    }, []);

    // 重置状态
    const resetStream = useCallback(() => {
        cancelStream();
        setState({
            isLoading: false,
            content: '',
            error: null,
            isCompleted: false,
            thinkingSteps: [],
            finalAnswer: '',
        });
        setEditedAnswer('');
    }, [cancelStream]);

    // 组件卸载时取消请求
    useEffect(() => {
        return () => {
            if (cancelRef.current) {
                cancelRef.current();
            }
        };
    }, []);

    const value: AIStreamContextType = {
        ...state,
        startStream,
        cancelStream,
        resetStream,
        editedAnswer,
        setEditedAnswer,
    };

    return <AIStreamContext.Provider value={value}>{children}</AIStreamContext.Provider>;
};
