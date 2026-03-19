import React from 'react';
import { Space, Tag, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { gLang } from '@common/language';
import { FeedbackTagSummary, FEEDBACK_PROGRESS_OPTIONS } from '@ecuc/shared/types/ticket.types';

const { Text } = Typography;

const [P_RESEARCH, P_DEVELOP, P_TEST, P_DONE] = FEEDBACK_PROGRESS_OPTIONS;

/** Tag 组件用的颜色名 */
export const PROGRESS_TAG_COLOR: Record<string, string> = {
    [P_RESEARCH]: 'blue',
    [P_DEVELOP]: 'orange',
    [P_TEST]: 'purple',
    [P_DONE]: 'green',
};

/** Badge 圆点用的 hex 色值 */
export const PROGRESS_DOT_COLOR: Record<string, string> = {
    [P_RESEARCH]: '#1677ff',
    [P_DEVELOP]: '#fa8c16',
    [P_TEST]: '#722ed1',
    [P_DONE]: '#52c41a',
};

/** 开发者标签：绿色 + 人员图标 */
export const DeveloperTag: React.FC<{ tag: FeedbackTagSummary }> = ({ tag }) => (
    <Tag color="green" icon={<UserOutlined />}>
        {tag.name}
    </Tag>
);

/** 开发进度标签：带颜色圆点 */
export const ProgressTag: React.FC<{ tag: FeedbackTagSummary }> = ({ tag }) => (
    <Tag color={PROGRESS_TAG_COLOR[tag.name] ?? 'purple'}>
        <span style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: PROGRESS_DOT_COLOR[tag.name] ?? '#722ed1',
            marginRight: 4,
            verticalAlign: 'middle',
            position: 'relative',
            top: -1,
        }} />
        {tag.name}
    </Tag>
);

interface FeedbackTagGroupProps {
    publicTags?: FeedbackTagSummary[];
    internalTags?: FeedbackTagSummary[];
    developerTags?: FeedbackTagSummary[];
    progressTag?: FeedbackTagSummary | null;
    showInternal?: boolean;
    showDeveloper?: boolean;
    showProgress?: boolean;
    emptyText?: string;
}

const FeedbackTagGroup: React.FC<FeedbackTagGroupProps> = ({
    publicTags = [],
    internalTags = [],
    developerTags = [],
    progressTag,
    showInternal = false,
    showDeveloper = false,
    showProgress = false,
    emptyText,
}) => {
    const hasTags =
        publicTags.length > 0 ||
        (showInternal && internalTags.length > 0) ||
        (showDeveloper && developerTags.length > 0) ||
        (showProgress && progressTag != null);
    if (!hasTags) {
        return emptyText ? <Text type="secondary">{emptyText}</Text> : null;
    }

    return (
        <Space size={[4, 4]} wrap>
            {publicTags.map(tag => (
                <Tag color="blue" key={`public-${tag.id}`}>
                    {tag.name}
                </Tag>
            ))}
            {showInternal &&
                internalTags.map(tag => (
                    <Tag color="gold" key={`internal-${tag.id}`}>
                        {gLang('feedback.internalTagPrefix')}: {tag.name}
                    </Tag>
                ))}
            {showDeveloper &&
                developerTags.map(tag => (
                    <DeveloperTag tag={tag} key={`developer-${tag.id}`} />
                ))}
            {showProgress && progressTag && (
                <ProgressTag tag={progressTag} key={`progress-${progressTag.id}`} />
            )}
        </Space>
    );
};

export default FeedbackTagGroup;
