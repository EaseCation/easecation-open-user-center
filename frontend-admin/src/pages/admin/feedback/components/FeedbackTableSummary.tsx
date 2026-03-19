import React, { useMemo } from 'react';
import { Button, Card, Flex, Popover, Space, Tag, Typography } from 'antd';
import { gLang } from '@common/language';
import useIsPC from '@common/hooks/useIsPC';
import { PROGRESS_DOT_COLOR } from '@common/components/Feedback/FeedbackTagGroup';
import {
    sortByProgressOrder,
    FeedbackListSummary,
    FeedbackTagCountSummary,
} from '@ecuc/shared/types/ticket.types';

const { Text } = Typography;
const { CheckableTag } = Tag;

type SummaryChip = {
    key: string;
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    dotColor?: string;
};

interface FeedbackTableSummaryProps {
    summary: FeedbackListSummary;
    publicTagIds?: number[];
    internalTagIds?: number[];
    developerTagIds?: number[];
    progressTagIds?: number[];
    noProgressTag?: boolean;
    onTogglePublicTag: (tagIds: number[], canonicalTagId: number) => void;
    onToggleInternalTag: (tagIds: number[], canonicalTagId: number) => void;
    onToggleDeveloperTag: (tagIds: number[], canonicalTagId: number) => void;
    onToggleProgressTag: (tagIds: number[], canonicalTagId: number) => void;
    onToggleNoProgressTag: () => void;
}

const isTagGroupActive = (activeIds: number[], tagId: number): boolean => activeIds.includes(tagId);

const getVisibleTagStats = (
    stats: FeedbackTagCountSummary[],
    activeIds: number[],
    limit: number
): { visible: FeedbackTagCountSummary[]; hidden: FeedbackTagCountSummary[] } => {
    const visible = stats.filter(
        (item, index) => index < limit || isTagGroupActive(activeIds, item.tag.id)
    );
    const visibleTagIdSet = new Set(visible.map(item => item.tag.id));

    return {
        visible,
        hidden: stats.filter(item => !visibleTagIdSet.has(item.tag.id)),
    };
};

const SummaryTagButton: React.FC<{ chip: SummaryChip }> = ({ chip }) => (
    <CheckableTag checked={chip.active} onChange={() => chip.onClick()} style={{ margin: 0 }}>
        <Space size={3}>
            {chip.dotColor ? (
                <span
                    style={{
                        display: 'inline-block',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: chip.dotColor,
                        verticalAlign: 'middle',
                    }}
                />
            ) : null}
            <span>{chip.label}</span>
            <Text type="secondary" style={{ fontSize: 11 }}>
                {chip.count}
            </Text>
        </Space>
    </CheckableTag>
);

const SummaryMetric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <Space size={4}>
        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            {label}
        </Text>
        <Text strong style={{ fontSize: 13 }}>
            {value}
        </Text>
    </Space>
);

const TagRow: React.FC<{ label: string; chips: SummaryChip[]; hiddenChips?: SummaryChip[] }> = ({
    label,
    chips,
    hiddenChips,
}) => (
    <Flex align="center" gap={6} wrap="wrap">
        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {label}
        </Text>
        {chips.length > 0 ? (
            chips.map(chip => <SummaryTagButton chip={chip} key={chip.key} />)
        ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
                —
            </Text>
        )}
        {hiddenChips && hiddenChips.length > 0 ? (
            <Popover
                trigger="click"
                placement="bottom"
                content={(
                    <Flex gap={6} wrap="wrap" style={{ maxWidth: 320 }}>
                        {hiddenChips.map(chip => (
                            <SummaryTagButton chip={chip} key={chip.key} />
                        ))}
                    </Flex>
                )}
            >
                <Button type="link" size="small" style={{ padding: 0, height: 'auto' }}>
                    +{hiddenChips.length}
                </Button>
            </Popover>
        ) : null}
    </Flex>
);

const FeedbackTableSummary: React.FC<FeedbackTableSummaryProps> = ({
    summary,
    publicTagIds,
    internalTagIds,
    developerTagIds,
    progressTagIds,
    noProgressTag,
    onTogglePublicTag,
    onToggleInternalTag,
    onToggleDeveloperTag,
    onToggleProgressTag,
    onToggleNoProgressTag,
}) => {
    const isPC = useIsPC();
    const maxTagsPerSection = isPC ? 4 : 2;
    const sortedProgressTags = useMemo(
        () =>
            sortByProgressOrder(
                summary.progressTags.map(item => ({
                    ...item,
                    name: item.tag.name,
                }))
            ).map(({ name: _name, ...item }) => item),
        [summary.progressTags]
    );

    const buildChips = (
        prefix: string,
        items: FeedbackTagCountSummary[],
        activeIds: number[],
        onToggle: (tagIds: number[], canonicalTagId: number) => void,
        dotColor?: (item: FeedbackTagCountSummary) => string | undefined
    ): SummaryChip[] => {
        return items.map(item => ({
            key: `${prefix}-${item.tag.id}`,
            label: item.tag.name,
            count: item.count,
            active: isTagGroupActive(activeIds, item.tag.id),
            onClick: () => onToggle([item.tag.id], item.tag.id),
            dotColor: dotColor?.(item),
        }));
    };

    const publicVisible = getVisibleTagStats(summary.publicTags, publicTagIds ?? [], maxTagsPerSection);
    const internalVisible = getVisibleTagStats(summary.internalTags, internalTagIds ?? [], maxTagsPerSection);
    const developerVisible = getVisibleTagStats(summary.developerTags, developerTagIds ?? [], maxTagsPerSection);
    const progressVisible = getVisibleTagStats(sortedProgressTags, progressTagIds ?? [], maxTagsPerSection);

    const publicChips = buildChips(
        'public',
        publicVisible.visible,
        publicTagIds ?? [],
        onTogglePublicTag
    );
    const internalChips = buildChips(
        'internal',
        internalVisible.visible,
        internalTagIds ?? [],
        onToggleInternalTag
    );
    const developerChips = buildChips(
        'developer',
        developerVisible.visible,
        developerTagIds ?? [],
        onToggleDeveloperTag
    );

    const progressChips: SummaryChip[] = [
        ...(summary.noProgressCount > 0 || noProgressTag
            ? [
                  {
                      key: 'progress-none',
                      label: gLang('feedback.noProgressTag'),
                      count: summary.noProgressCount,
                      active: Boolean(noProgressTag),
                      onClick: onToggleNoProgressTag,
                  },
              ]
            : []),
        ...buildChips(
            'progress',
            progressVisible.visible,
            noProgressTag ? [] : (progressTagIds ?? []),
            onToggleProgressTag,
            item => PROGRESS_DOT_COLOR[item.tag.name] ?? '#722ed1'
        ),
    ];

    const publicHiddenChips = buildChips(
        'public-hidden',
        publicVisible.hidden,
        publicTagIds ?? [],
        onTogglePublicTag
    );
    const internalHiddenChips = buildChips(
        'internal-hidden',
        internalVisible.hidden,
        internalTagIds ?? [],
        onToggleInternalTag
    );
    const developerHiddenChips = buildChips(
        'developer-hidden',
        developerVisible.hidden,
        developerTagIds ?? [],
        onToggleDeveloperTag
    );
    const progressHiddenChips = buildChips(
        'progress-hidden',
        progressVisible.hidden,
        noProgressTag ? [] : (progressTagIds ?? []),
        onToggleProgressTag,
        item => PROGRESS_DOT_COLOR[item.tag.name] ?? '#722ed1'
    );

    const { total, open, closed, ended } = summary.statusCounts;

    return (
        <Card
            size="small"
            styles={{
                body: {
                    padding: isPC ? '12px 16px' : 12,
                },
            }}
        >
            <Flex gap={12} wrap="wrap" align={isPC ? 'center' : 'flex-start'}>
                <Text strong style={{ whiteSpace: 'nowrap' }}>
                    {gLang('feedback.table.summary.title')}
                </Text>
                <SummaryMetric label={gLang('feedback.table.summary.total')} value={total} />
                <SummaryMetric label={gLang('feedback.status.open')} value={open} />
                <SummaryMetric label={gLang('feedback.status.closed')} value={closed} />
                <SummaryMetric label={gLang('feedback.status.ended')} value={ended} />
                <TagRow
                    label={gLang('admin.feedbackTableProgress')}
                    chips={progressChips}
                    hiddenChips={progressHiddenChips}
                />
                <TagRow
                    label={gLang('feedback.developerTag')}
                    chips={developerChips}
                    hiddenChips={developerHiddenChips}
                />
                <TagRow
                    label={gLang('feedback.publicTag')}
                    chips={publicChips}
                    hiddenChips={publicHiddenChips}
                />
                <TagRow
                    label={gLang('feedback.internalTag')}
                    chips={internalChips}
                    hiddenChips={internalHiddenChips}
                />
            </Flex>
        </Card>
    );
};

export default FeedbackTableSummary;
