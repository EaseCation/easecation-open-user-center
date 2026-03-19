import React, { useState, useEffect } from 'react';
import { Timeline, Card, Tag, Typography, Space, Divider, Input } from 'antd';
import {
    LoadingOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    ClockCircleOutlined,
    DownOutlined,
    RightOutlined,
} from '@ant-design/icons';
import useDarkMode from '@common/hooks/useDarkMode';
import { ThinkingStep } from '@ecuc/shared/types/ai.types';
import { gLang } from '@common/language';

const { Text } = Typography;
const { TextArea } = Input;

interface ThinkingTimelineProps {
    steps: ThinkingStep[];
    finalAnswer?: string;
    isLoading?: boolean;
    onFinalAnswerChange?: (value: string) => void;
}

export const ThinkingTimeline: React.FC<ThinkingTimelineProps> = ({
    steps,
    finalAnswer,
    isLoading = false,
    onFinalAnswerChange,
}) => {
    const isDarkMode = useDarkMode();
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
    const [editableAnswer, setEditableAnswer] = useState(finalAnswer || '');

    // 同步finalAnswer到editableAnswer
    useEffect(() => {
        if (finalAnswer !== undefined) {
            setEditableAnswer(finalAnswer);
        }
    }, [finalAnswer]);

    // 自动展开执行中的步骤，收起已完成的步骤1
    useEffect(() => {
        const newExpandedSteps = new Set<number>();
        if (Array.isArray(steps)) {
            steps.forEach((step, index) => {
                if (step.status === 'executing' || step.status === 'failed') {
                    newExpandedSteps.add(index);
                }
            });
        }
        setExpandedSteps(newExpandedSteps);
    }, [steps]);

    const toggleStepExpansion = (index: number) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSteps(newExpanded);
    };

    const handleAnswerChange = (value: string) => {
        setEditableAnswer(value);
        onFinalAnswerChange?.(value);
    };

    const getStepIcon = (status: ThinkingStep['status']) => {
        switch (status) {
            case 'executing':
                return <LoadingOutlined style={{ color: '#1890ff' }} spin />;
            case 'success':
            case 'completed':
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
            case 'failed':
                return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
            default:
                return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
        }
    };

    const getStepColor = (status: ThinkingStep['status']) => {
        switch (status) {
            case 'executing':
                return 'blue';
            case 'success':
            case 'completed':
                return 'green';
            case 'failed':
                return 'red';
            default:
                return 'default';
        }
    };

    const formatNodeType = (nodeType: string) => {
        const typeMap: Record<string, string> = {
            Start: gLang('thinkingTimeline.stepStart'),
            Decision: gLang('thinkingTimeline.stepDecision'),
            Script: gLang('thinkingTimeline.stepScript'),
            AppCustom: gLang('thinkingTimeline.stepAppCustom'),
            VariableHandle: gLang('thinkingTimeline.stepVariableHandle'),
            AppRefer: gLang('thinkingTimeline.stepAppRefer'),
            End: gLang('thinkingTimeline.stepEnd'),
        };
        return typeMap[nodeType] || nodeType;
    };

    const timelineItems = Array.isArray(steps) ? steps.map((step, index) => {
        const isExpanded = expandedSteps.has(index);
        const normalizedContent =
            typeof step.content === 'string'
                ? step.content
                : step.content === undefined || step.content === null
                  ? ''
                  : JSON.stringify(step.content);
        const hasContent = normalizedContent.trim().length > 0;

        return {
            icon: getStepIcon(step.status),
            children: (
                <Card
                    size="small"
                    style={{
                        marginBottom: 4,
                        backgroundColor: isDarkMode ? '#1f1f1f' : '#fafafa',
                        border: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0',
                    }}
                >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: hasContent ? 'pointer' : 'default',
                            }}
                            onClick={() => hasContent && toggleStepExpansion(index)}
                        >
                            <Space>
                                {hasContent &&
                                    (isExpanded ? (
                                        <DownOutlined
                                            style={{
                                                fontSize: '10px',
                                                color: isDarkMode ? '#a6a6a6' : '#666666',
                                            }}
                                        />
                                    ) : (
                                        <RightOutlined
                                            style={{
                                                fontSize: '10px',
                                                color: isDarkMode ? '#a6a6a6' : '#666666',
                                            }}
                                        />
                                    ))}
                                <Text strong style={{ color: isDarkMode ? '#ffffff' : '#000000' }}>
                                    {step.name}
                                </Text>
                                <Tag color={getStepColor(step.status)}>
                                    {formatNodeType(step.nodeType)}
                                </Tag>
                            </Space>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                {step.execTime}
                            </Text>
                        </div>

                        {hasContent && isExpanded && (
                            <div
                                style={{
                                    fontSize: '13px',
                                    color: isDarkMode ? '#cccccc' : '#595959',
                                    fontFamily: 'monospace',
                                    backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    marginTop: '4px',
                                }}
                            >
                                {(() => {
                                    try {
                                        // 尝试格式化JSON显示
                                        const parsed = JSON.parse(normalizedContent);
                                        return JSON.stringify(parsed, null, 2);
                                    } catch {
                                        // 不是JSON，原样显示
                                        return normalizedContent;
                                    }
                                })()}
                            </div>
                        )}

                        {/*{step.usages && step.usages.length > 0 && (
              <div>
                <Divider style={{ margin: '8px 0' }} />
                <Space wrap size="small">
                  <Text type="secondary" style={{ fontSize: '11px' }}>模型调用:</Text>
                  {step.usages.map((usage, idx) => (
                    <Tag key={idx} style={{ fontSize: '10px' }}>
                      {usage.model_id}: {usage.input_tokens}→{usage.output_tokens}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}*/}
                    </Space>
                </Card>
            ),
        };
    }) : [];

    // 如果还在加载，添加一个加载中的item
    if (isLoading && Array.isArray(steps) && steps.length > 0) {
        timelineItems.push({
            icon: <LoadingOutlined style={{ color: '#1890ff' }} spin />,
            children: (
                <Card
                    size="small"
                    style={{
                        marginBottom: 8,
                        backgroundColor: isDarkMode ? '#1f1f1f' : '#fafafa',
                        border: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0',
                    }}
                >
                    <Text type="secondary" style={{ color: isDarkMode ? '#a6a6a6' : '#666666' }}>
                        {gLang('thinkingTimeline.thinking')}
                    </Text>
                </Card>
            ),
        });
    }

    return (
        <div style={{ width: '100%' }}>
            <div style={{ marginBottom: 16 }}>
                <Text
                    strong
                    style={{
                        fontSize: '14px',
                        color: isDarkMode ? '#ffffff' : '#000000',
                    }}
                >
                    {`🤖 ${gLang('thinkingTimeline.thinkingTitle')}`}
                </Text>
            </div>

            {Array.isArray(steps) && steps.length > 0 ? (
                <Timeline
                    items={timelineItems}
                    style={{
                        padding: '0 8px',
                    }}
                />
            ) : (
                <Card
                    size="small"
                    style={{
                        backgroundColor: isDarkMode ? '#1f1f1f' : '#fafafa',
                        border: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0',
                        textAlign: 'center',
                    }}
                >
                    <Text type="secondary" style={{ color: isDarkMode ? '#a6a6a6' : '#666666' }}>
                        {isLoading
                            ? gLang('thinkingTimeline.preparing')
                            : gLang('thinkingTimeline.noThinking')}
                    </Text>
                </Card>
            )}

            {(finalAnswer || editableAnswer) && (
                <div style={{ marginTop: 16 }}>
                    <Divider>
                        <Text
                            strong
                            style={{
                                fontSize: '14px',
                                color: isDarkMode ? '#ffffff' : '#000000',
                            }}
                        >
                            {`💡 ${gLang('thinkingTimeline.finalAnswerTitle')}`}
                        </Text>
                    </Divider>
                    <Card
                        style={{
                            backgroundColor: isDarkMode ? '#0a2e0a' : '#f6ffed',
                            border: isDarkMode ? '1px solid #237804' : '1px solid #b7eb8f',
                        }}
                    >
                        <TextArea
                            value={editableAnswer}
                            onChange={e => handleAnswerChange(e.target.value)}
                            autoSize={{ minRows: 3, maxRows: 12 }}
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                resize: 'none',
                                color: isDarkMode ? '#ffffff' : '#000000',
                                lineHeight: 1.6,
                                fontSize: '14px',
                            }}
                            placeholder={gLang('thinkingTimeline.answerPlaceholder')}
                        />
                    </Card>
                </div>
            )}
        </div>
    );
};
