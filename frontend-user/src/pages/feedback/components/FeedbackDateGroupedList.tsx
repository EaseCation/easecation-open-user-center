// 按解决日期分组的反馈列表组件

import React, { useMemo } from 'react';
import { Typography } from 'antd';
import { FeedbackListItemDto } from '@ecuc/shared/types/ticket.types';
import { useTheme } from '@common/contexts/ThemeContext';
import { gLang } from '@common/language';

const { Text } = Typography;

interface DateGroup {
    dateLabel: string;
    items: FeedbackListItemDto[];
}

function formatDateLabel(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return gLang('feedback.dateToday');
    if (diffDays === 1) return gLang('feedback.dateYesterday');
    if (diffDays === 2) return gLang('feedback.dateDayBeforeYesterday');

    if (date.getFullYear() === now.getFullYear()) {
        return gLang('feedback.dateFormat', {
            month: String(date.getMonth() + 1),
            day: String(date.getDate()),
        });
    }
    return gLang('feedback.dateFormatWithYear', {
        year: String(date.getFullYear()),
        month: String(date.getMonth() + 1),
        day: String(date.getDate()),
    });
}

function groupByCompleteDate(items: FeedbackListItemDto[]): DateGroup[] {
    const groups: DateGroup[] = [];
    let currentLabel: string | null = null;
    let currentItems: FeedbackListItemDto[] = [];

    for (const item of items) {
        const completeTime = item.complete_time ? new Date(item.complete_time) : null;
        const label = completeTime ? formatDateLabel(completeTime) : gLang('feedback.dateUnknown');

        if (label !== currentLabel) {
            if (currentLabel !== null && currentItems.length > 0) {
                groups.push({ dateLabel: currentLabel, items: currentItems });
            }
            currentLabel = label;
            currentItems = [item];
        } else {
            currentItems.push(item);
        }
    }

    if (currentLabel !== null && currentItems.length > 0) {
        groups.push({ dateLabel: currentLabel, items: currentItems });
    }

    return groups;
}

// 淡入动画样式
const getAnimationStyle = (index: number, animationDelay: number): React.CSSProperties => ({
    opacity: 0,
    willChange: 'transform, opacity',
    animation: `fadeInUp 0.42s cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(index * animationDelay, 0.2)}s forwards`,
});

interface FeedbackDateGroupedListProps {
    items: FeedbackListItemDto[];
    renderItem: (item: FeedbackListItemDto, index: number) => React.ReactNode;
    gap?: number;
    animationDelay?: number;
}

const FeedbackDateGroupedList: React.FC<FeedbackDateGroupedListProps> = ({
    items,
    renderItem,
    gap = 12,
    animationDelay = 0.015,
}) => {
    const { getThemeColor } = useTheme();
    const groups = useMemo(() => groupByCompleteDate(items), [items]);

    const lineColor = getThemeColor({ light: '#e0e0e0', dark: '#3a3a3a' });
    const textColor = getThemeColor({ light: '#999', dark: '#666' });

    let globalIndex = 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>
            {groups.map(group => {
                const separatorIndex = globalIndex++;
                return (
                    <React.Fragment key={group.dateLabel}>
                        {/* 日期分隔条 */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                padding: '8px 0 4px',
                                ...getAnimationStyle(separatorIndex, animationDelay),
                            }}
                        >
                            <div style={{ flex: 1, height: 1, background: lineColor }} />
                            <Text
                                style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: textColor,
                                    whiteSpace: 'nowrap',
                                    userSelect: 'none',
                                }}
                            >
                                {group.dateLabel}
                            </Text>
                            <div style={{ flex: 1, height: 1, background: lineColor }} />
                        </div>

                        {/* 组内列表项 */}
                        {group.items.map(item => {
                            const itemIndex = globalIndex++;
                            return (
                                <div
                                    key={item.tid}
                                    style={getAnimationStyle(itemIndex, animationDelay)}
                                >
                                    {renderItem(item, itemIndex)}
                                </div>
                            );
                        })}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default FeedbackDateGroupedList;
