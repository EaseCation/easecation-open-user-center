import { AIStreamChunk, AIStreamOptions, ThinkingStep } from '@ecuc/shared/types/ai.types';
import { BACKEND_DOMAIN } from '../global';
import { gLang } from '../language';

// 清理字符串内容，移除末尾的多余符号
function cleanupStringContent(text: string): string {
    // 移除末尾的多余斜杠和其他无意义符号
    return text.replace(/\/+$/, '').trim();
}

// 深度清理对象中的字符串字段
function cleanupContent(obj: any): any {
    if (typeof obj === 'string') {
        return cleanupStringContent(obj);
    } else if (Array.isArray(obj)) {
        return obj.map(item => cleanupContent(item));
    } else if (obj && typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            cleaned[key] = cleanupContent(value);
        }
        return cleaned;
    }
    return obj;
}

// 百炼API响应结构
interface BailianResponse {
    output?: {
        thoughts?: Array<{ response: string }>;
        text?: string;
        session_id?: string;
        finish_reason?: string;
    };
    usage?: any;
    request_id?: string;
}

// 解析百炼API的思维步骤
function parseThinkingStep(thoughtResponse: string): ThinkingStep | null {
    try {
        const nodeInfo = JSON.parse(thoughtResponse);

        // 提取内容，优先级：output > nodeResult > result
        let content = '';
        if (nodeInfo.output) {
            content = nodeInfo.output;
        } else if (nodeInfo.nodeResult) {
            // nodeResult可能是JSON字符串，尝试进一步解析
            try {
                const nodeResult = JSON.parse(nodeInfo.nodeResult);
                content = nodeResult.result || nodeInfo.nodeResult;
            } catch {
                content = nodeInfo.nodeResult;
            }
        } else if (nodeInfo.result) {
            content = nodeInfo.result;
        }

        // content本身也可能是JSON字符串，尝试解析并处理对象
        if (
            typeof content === 'string' &&
            content.trim().startsWith('{') &&
            content.trim().endsWith('}')
        ) {
            try {
                const contentObj = JSON.parse(content);

                // 如果有result字段，尝试进一步解析其内容
                if (contentObj.result && typeof contentObj.result === 'string') {
                    try {
                        // 尝试解析result字段中的JSON内容
                        const resultObj = JSON.parse(contentObj.result);
                        // 清理并使用result内的内容作为最终content
                        content = JSON.stringify(cleanupContent(resultObj));
                    } catch {
                        // result不是JSON，直接使用result字符串内容，但需要清理
                        content = cleanupStringContent(contentObj.result);
                    }
                } else if (contentObj.result) {
                    // result字段存在但不是字符串，直接使用result内容
                    content = JSON.stringify(cleanupContent(contentObj.result));
                } else {
                    // 没有result字段，使用整个对象
                    content = JSON.stringify(cleanupContent(contentObj));
                }
            } catch {
                // 解析失败，保持原content
            }
        }

        // 状态映射：百炼 -> 前端标准
        const statusMap: { [key: string]: 'executing' | 'success' | 'completed' | 'failed' } = {
            success: 'completed',
            executing: 'executing',
            failed: 'failed',
        };

        // 兜底保证content始终为字符串，避免前端渲染阶段对trim()/JSON.parse调用时崩溃
        const safeContent =
            typeof content === 'string'
                ? content
                : content === undefined || content === null
                  ? ''
                  : JSON.stringify(cleanupContent(content));

        return {
            name: nodeInfo.nodeName || gLang('aiStream.processing'),
            status: statusMap[nodeInfo.nodeStatus] || 'executing',
            nodeType: nodeInfo.nodeType || 'unknown',
            execTime: nodeInfo.nodeExecTime || '0ms',
            content: safeContent,
            usages: nodeInfo.usages || [],
        };
    } catch {
        return null;
    }
}

// 解析百炼API的最终答案
function parseFinalAnswer(text: string): string {
    try {
        const textObj = JSON.parse(text);
        return textObj.output || text;
    } catch {
        return text;
    }
}

// 解析SSE数据行
function parseSSELine(line: string): { type: string; data: string } | null {
    const trimmedLine = line.trim();

    // 跳过空行和注释行
    if (!trimmedLine || trimmedLine.startsWith(':')) {
        return null;
    }

    // 解析SSE格式：field:value
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) {
        return null;
    }

    const field = trimmedLine.slice(0, colonIndex);
    const value = trimmedLine.slice(colonIndex + 1).trim();

    const result = { type: field, data: value };

    return result;
}

// 处理百炼响应数据的共用逻辑
function processBailianData(
    data: string,
    onMessage?: (message: AIStreamChunk) => void,
    onChunk?: (chunk: string) => void
): { fullText: string; shouldReturn: boolean } {
    let fullText = '';
    let shouldReturn = false;

    if (data === '[DONE]') {
        return { fullText, shouldReturn: true };
    }

    // 每个data行都是完整的JSON，直接解析
    if (data.trim().startsWith('{') && data.trim().endsWith('}')) {
        try {
            const bailianResponse: BailianResponse = JSON.parse(data);

            // 处理思维步骤
            if (
                bailianResponse.output?.thoughts &&
                Array.isArray(bailianResponse.output.thoughts)
            ) {
                for (let i = 0; i < bailianResponse.output.thoughts.length; i++) {
                    const thought = bailianResponse.output.thoughts[i];
                    if (thought && thought.response) {
                        const thinkingStep = parseThinkingStep(thought.response);
                        if (thinkingStep && onMessage) {
                            onMessage({
                                type: 'thinking_step',
                                step: thinkingStep,
                            });
                        }
                    }
                }
            }

            // 处理最终答案
            if (bailianResponse.output?.text) {
                const finalAnswer = parseFinalAnswer(bailianResponse.output.text);
                if (finalAnswer && onMessage) {
                    onMessage({
                        type: 'final_answer',
                        reply: finalAnswer,
                    });
                    fullText = finalAnswer;
                }
            }

            // 检查完成状态
            if (bailianResponse.output?.finish_reason === 'stop') {
                shouldReturn = true;
            }
        } catch {
            // 尝试作为旧格式解析
            const parsed: AIStreamChunk = JSON.parse(data);

            if (onMessage) {
                onMessage(parsed);
                if (parsed.reply) {
                    fullText += parsed.reply;
                }
            } else if (parsed.reply) {
                fullText += parsed.reply;
                onChunk?.(parsed.reply);
            }

            if (parsed.error) {
                throw new Error(parsed.error);
            }
        }
    }

    return { fullText, shouldReturn };
}

/**
 * 调用流式 AI 接口
 */
export async function callAIStream({
    tid,
    prompt,
    onMessage,
    onChunk,
    onComplete,
    onError,
}: AIStreamOptions): Promise<void> {
    let fullText = '';

    try {
        // 构建 URL - 使用项目标准的 BACKEND_DOMAIN
        const url = new URL('/ticket/aiReply', BACKEND_DOMAIN);
        url.searchParams.set('tid', tid.toString());
        url.searchParams.set('stream', 'true');
        if (prompt) {
            url.searchParams.set('prompt', prompt);
        }

        // 获取认证 token - 使用项目标准的 jwt token
        const token = localStorage.getItem('jwt');
        if (!token) {
            throw new Error(gLang('aiStream.noAuthToken'));
        }

        // 使用 fetch 进行流式请求
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'text/event-stream',
                'Cache-Control': 'no-cache',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error(gLang('aiStream.emptyBody'));
        }

        // 创建读取器
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { value, done } = await reader.read();

                if (done) {
                    break;
                }

                // 解码数据块并累积到缓冲区
                const chunk = decoder.decode(value, { stream: true });

                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留最后一行（可能不完整）

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    const sseData = parseSSELine(line);

                    if (sseData?.type === 'data') {
                        const { fullText: newText, shouldReturn } = processBailianData(
                            sseData.data,
                            onMessage,
                            onChunk
                        );

                        if (newText) {
                            fullText = newText;
                        }

                        if (shouldReturn) {
                            onComplete?.(fullText);
                            return;
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    } catch (error) {
        onError?.(error as Error);
    }
}

/**
 * 带取消功能的流式接口调用
 */
export function callAIStreamWithCancel({
    tid,
    prompt,
    onMessage,
    onChunk,
    onComplete,
    onError,
}: AIStreamOptions) {
    const abortController = new AbortController();

    const promise = callAIStreamCancellable({
        tid,
        prompt,
        onMessage,
        onChunk,
        onComplete,
        onError,
        signal: abortController.signal,
    });

    return {
        promise,
        cancel: () => abortController.abort(),
    };
}

/**
 * AI文案润色流式接口（轻量级，通用模型API格式）
 */
export interface AIPolishStreamOptions {
    tid: number;
    text: string;
    onChunk: (chunk: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: Error) => void;
}

export function callAIPolishStreamWithCancel(options: AIPolishStreamOptions) {
    const abortController = new AbortController();
    const promise = callAIPolishStreamInternal({ ...options, signal: abortController.signal });
    return { promise, cancel: () => abortController.abort() };
}

async function callAIPolishStreamInternal({
    tid,
    text,
    onChunk,
    onComplete,
    onError,
    signal,
}: AIPolishStreamOptions & { signal: AbortSignal }): Promise<void> {
    let fullText = '';

    try {
        const url = new URL('/ticket/aiPolish', BACKEND_DOMAIN);

        const token = localStorage.getItem('jwt');
        if (!token) {
            throw new Error(gLang('aiStream.noAuthToken'));
        }

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
                'Cache-Control': 'no-cache',
            },
            body: JSON.stringify({ tid, text }),
            signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error(gLang('aiStream.emptyBody'));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                if (signal.aborted) break;
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const sseData = parseSSELine(line);
                    if (sseData?.type !== 'data') continue;
                    if (sseData.data === '[DONE]') {
                        onComplete?.(fullText);
                        return;
                    }

                    const trimmed = sseData.data.trim();
                    if (!trimmed.startsWith('{')) continue;

                    try {
                        const json = JSON.parse(trimmed);
                        // 通用模型API增量输出格式: output.text 为增量文本
                        const chunk = json.output?.text || json.output?.choices?.[0]?.message?.content;
                        if (chunk) {
                            fullText += chunk;
                            onChunk(chunk);
                        }
                        if (json.output?.finish_reason === 'stop') {
                            onComplete?.(fullText);
                            return;
                        }
                    } catch {
                        // 跳过无法解析的行
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        onComplete?.(fullText);
    } catch (error) {
        if (signal.aborted) return;
        onError?.(error as Error);
    }
}

async function callAIStreamCancellable({
    tid,
    prompt,
    onMessage,
    onChunk,
    onComplete,
    onError,
    signal,
}: AIStreamOptions & { signal: AbortSignal }): Promise<void> {
    let fullText = '';

    try {
        const url = new URL('/ticket/aiReply', BACKEND_DOMAIN);
        url.searchParams.set('tid', tid.toString());
        url.searchParams.set('stream', 'true');
        if (prompt) {
            url.searchParams.set('prompt', prompt);
        }

        const token = localStorage.getItem('jwt');
        if (!token) {
            throw new Error(gLang('aiStream.noAuthToken'));
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'text/event-stream',
                'Cache-Control': 'no-cache',
            },
            signal, // 支持取消请求
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error(gLang('aiStream.emptyBody'));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                // 检查是否被取消
                if (signal.aborted) {
                    throw new Error(gLang('aiStream.requestCancelled'));
                }

                const { value, done } = await reader.read();

                if (done) {
                    break;
                }

                // 解码数据块并累积到缓冲区
                const chunk = decoder.decode(value, { stream: true });

                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留最后一行（可能不完整）

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    const sseData = parseSSELine(line);

                    if (sseData?.type === 'data') {
                        const { fullText: newText, shouldReturn } = processBailianData(
                            sseData.data,
                            onMessage,
                            onChunk
                        );

                        if (newText) {
                            fullText = newText;
                        }

                        if (shouldReturn) {
                            onComplete?.(fullText);
                            return;
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    } catch (error) {
        if (signal.aborted) {
            return;
        }
        onError?.(error as Error);
    }
}
