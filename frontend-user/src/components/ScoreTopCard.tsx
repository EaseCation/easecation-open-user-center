import React, { ReactNode, useMemo } from 'react';
import { Card, List, Space, Tag } from 'antd';
import { PublicScoreTopEntry } from '@ecuc/shared/types/player.types';
import {
    CalendarOutlined,
    DesktopOutlined,
    NumberOutlined,
    RocketOutlined,
    SunOutlined,
    TrophyOutlined,
} from '@ant-design/icons';
import { gLang } from '@common/language';
import { useTheme } from '@common/contexts/ThemeContext';
import { CUSTOM_THEME_PALETTES } from '@common/themes/customPalettes';

type ScoreTopCardProps = {
    game: string;
    type: string;
    deadlineType: string;
    pc: boolean;
    data: PublicScoreTopEntry[];
};

function getScoreTypeString(game: string, scoreType: string): string {
    switch (scoreType) {
        case 'BED':
            return gLang('scoreTop.scoreTypeBed');
        case 'DESTROY':
            return gLang('scoreTop.scoreTypeDestroy');
        case 'CRYSTAL':
            return gLang('scoreTop.scoreTypeCrystal');
        case 'KILL':
            return game === 'fb'
                ? gLang('scoreTop.scoreTypeScore')
                : gLang('scoreTop.scoreTypeKill');
        case 'DEATH':
            return gLang('scoreTop.scoreTypeDeath');
        case 'SCORE':
            return gLang('scoreTop.scoreTypePoints');
        case 'TIME':
            return gLang('scoreTop.scoreTypeTime');
        case 'WIN':
            return gLang('scoreTop.scoreTypeWin');
        case 'HERO_KILL':
            return gLang('scoreTop.scoreTypeHeroKill');
        case 'KILLER_KILL':
            return gLang('scoreTop.scoreTypeKillerKill');
        case 'FINAL_KILL':
            return gLang('scoreTop.scoreTypeFinalKill');
        case 'HOME_KILL':
            return gLang('scoreTop.scoreTypeHomeKill');
        case 'WITHER':
            return gLang('scoreTop.scoreTypeWither');
        case 'BAIGE':
            return gLang('scoreTop.scoreTypeBaige');
        case 'YANCONG':
            return gLang('scoreTop.scoreTypeYancong');
        default:
            return scoreType;
    }
}

const ScoreTopCard: React.FC<ScoreTopCardProps> = ({ game, type, deadlineType, pc, data }) => {
    const { getThemeColor, customTheme, isCustomThemeActive } = useTheme();
    const palette = CUSTOM_THEME_PALETTES.blackOrange;
    const isBlackOrangeActive = isCustomThemeActive && customTheme === 'blackOrange';

    const cardBackground = getThemeColor({
        light: '#ffffff',
        dark: '#141414',
        custom: { blackOrange: palette.surface },
    });
    const cardBorder = getThemeColor({
        light: '#f0f0f0',
        dark: '#303030',
        custom: { blackOrange: palette.border },
    });
    const titleColor = getThemeColor({
        light: '#1f1f1f',
        dark: '#f5f5f5',
        custom: { blackOrange: palette.textPrimary },
    });
    const metaMutedColor = getThemeColor({
        light: '#8c8c8c',
        dark: '#bfbfbf',
        custom: { blackOrange: palette.textSecondary },
    });
    const listDivider = getThemeColor({
        light: '#f5f5f5',
        dark: '#1f1f1f',
        custom: { blackOrange: palette.border },
    });

    const deadlineTag = useMemo((): ReactNode => {
        const commonStyle = {
            marginRight: 0,
        } as const;

        const tagWithContent = (icon: ReactNode, label: string, fallbackColor: string) => (
            <Tag
                icon={icon}
                color={fallbackColor}
                style={commonStyle}
                className="deadline-tag"
            >
                <span style={{ marginLeft: -4 }}>{label}</span>
            </Tag>
        );

        switch (deadlineType) {
            case 'DAY':
                return tagWithContent(<SunOutlined />, gLang('scoreTop.deadlineDay'), 'blue');
            case 'WEEK':
                return tagWithContent(<NumberOutlined />, gLang('scoreTop.deadlineWeek'), 'green');
            case 'MONTH':
                return tagWithContent(
                    <CalendarOutlined />,
                    gLang('scoreTop.deadlineMonth'),
                    'purple'
                );
            case 'YEAR':
                return tagWithContent(<TrophyOutlined />, gLang('scoreTop.deadlineYear'), 'orange');
            case 'FOREVER':
                return tagWithContent(<RocketOutlined />, gLang('scoreTop.deadlineForever'), 'red');
            default:
                return (
                    <Tag style={commonStyle}>
                        {deadlineType}
                    </Tag>
                );
        }
    }, [deadlineType]);

    const getScoreTagColor = (rank: number) => {
        if (rank === 1) return 'red';
        if (rank === 2) return 'volcano';
        if (rank === 3) return 'blue';
        return 'default';
    };

    const formatScore = (item: PublicScoreTopEntry): ReactNode => {
        return item.score;
    };

    return (
        <Card
            title={`${
                gLang(`game.${game}`) === `game.${game}` ? game : gLang(`game.${game}`)
            } · ${getScoreTypeString(game, type)}`}
            variant="outlined"
            extra={
                <Space size="small">
                    {pc && (
                        <Tag
                            icon={<DesktopOutlined />}
                            color="gold"
                            style={{
                                marginRight: 0,
                            }}
                        >
                            <span style={{ marginLeft: -2 }}>PC</span>
                        </Tag>
                    )}
                    {deadlineTag}
                </Space>
            }
            style={{
                background: cardBackground,
                borderColor: cardBorder,
                boxShadow: isBlackOrangeActive ? '0 4px 24px rgba(0, 0, 0, 0.35)' : undefined,
            }}
            headStyle={{
                color: titleColor,
                borderBottom: `1px solid ${cardBorder}`,
                fontWeight: 600,
            }}
        >
            <List
                itemLayout="horizontal"
                dataSource={data}
                size="small"
                renderItem={item => (
                    <List.Item
                        actions={[
                            <Tag
                                key="score"
                                color={getScoreTagColor(item.rank)}
                                style={{
                                    marginRight: -8,
                                    minWidth: 32,
                                    textAlign: 'center',
                                }}
                            >
                                {formatScore(item)}
                            </Tag>,
                        ]}
                        style={{
                            padding: 0,
                            borderBlockEnd: `1px solid ${listDivider}`,
                        }}
                    >
                        <List.Item.Meta
                            title={
                                <span
                                    style={{
                                        display: 'inline-block',
                                        marginTop: 4,
                                        color: titleColor,
                                    }}
                                >
                                    <span
                                        style={{
                                            color: metaMutedColor,
                                            marginRight: 6,
                                            minWidth: 8,
                                            display: 'inline-block',
                                        }}
                                        className={`rank-number ${item.rank === 1 ? 'rank-1' : item.rank === 2 ? 'rank-2' : item.rank === 3 ? 'rank-3' : ''}`}
                                    >
                                        {item.rank}
                                    </span>
                                    {item.name}
                                </span>
                            }
                        />
                    </List.Item>
                )}
            />
        </Card>
    );
};

export default ScoreTopCard;
