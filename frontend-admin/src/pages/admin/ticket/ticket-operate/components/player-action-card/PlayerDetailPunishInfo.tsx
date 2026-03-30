// 工单操作页面中的玩家详情面板组件的处罚信息

import { Alert, Badge, Descriptions, Space, Spin, Tag, Typography } from 'antd';
import React, { ReactNode } from 'react';
import { Breakpoint } from 'antd/es/_util/responsiveObserver';
import { gLang } from '@common/language';
import { usePlayerBasicCache } from '@common/hooks/usePlayerBasicCache';
import { TimeConverter, convertUTCToFormat } from '../../../../../../components/TimeConverter';
import './baninfo-custom.css';

interface Props {
    ecid?: string;
    descriptionsStyle?: React.CSSProperties;
    descriptionsSize?: 'middle' | 'small' | 'default';
    column?: number | Partial<Record<Breakpoint, number>>;
    haveMarginEnd?: boolean;
    action?: ReactNode;
}

const { Text } = Typography;

const PlayerDetailPunishInfo: React.FC<Props> = ({
    ecid,
    descriptionsStyle,
    descriptionsSize = 'small',
    column,
    haveMarginEnd = false,
    action,
}) => {
    const { player, spinning } = usePlayerBasicCache(ecid);

    const isBan = () => {
        if (!player) {
            return false;
        }
        return (
            player.ban_data &&
            (!player.ban_data.dateexpire || new Date(player.ban_data.dateexpire).getTime() > Date.now())
        );
    };

    const getBanDegree = () => {
        if (!player?.ban_data) {
            return 0;
        }
        return player.ban_data.degree;
    };

    const renderAlert = () => {
        if (!player) {
            return (
                <Alert
                    type="info"
                    style={{
                        marginBlockEnd: haveMarginEnd ? 16 : 0,
                    }}
                    action={action}
                />
            );
        }

        if (!isBan()) {
            return (
                <Alert
                    type="success"
                    message={
                        <Space>
                            <Badge status="success" />
                            <span>{gLang('playerDetail.accountNormal')}</span>
                            {getBanDegree() > 0 && (
                                <Space direction="horizontal">
                                    <Text type="secondary">
                                        {gLang('playerDetail.title.banDegree', {
                                            degree: getBanDegree(),
                                        })}
                                    </Text>
                                    <Text type="secondary">
                                        {gLang('playerDetail.title.banExpire', {
                                            time: player.ban_data?.dateexpire
                                                ? convertUTCToFormat(
                                                      player.ban_data.dateexpire,
                                                      'YYYY-MM-DD'
                                                  )
                                                : '-',
                                        })}
                                    </Text>
                                </Space>
                            )}
                        </Space>
                    }
                    style={{
                        marginBlockEnd: haveMarginEnd ? 16 : 0,
                    }}
                    action={action}
                />
            );
        }

        const getAlertType = (): 'success' | 'info' | 'warning' | 'error' => {
            switch (player?.ban_data?.type) {
                case 'HACK':
                    return 'warning';
                case 'BAN':
                    return 'error';
                case 'MUTE':
                    return 'info';
                case 'WARNING':
                    return 'warning';
                case 'KICK':
                    return 'info';
                case 'PARKOUR':
                    return 'info';
                case 'KICK_HOMELAND_PLAYER':
                    return 'info';
                case 'OVERWATCH':
                    return 'warning';
                case 'FREEZE_SCORE_TOP':
                    return 'info';
                case 'RESTRICT_NICK':
                    return 'info';
                default:
                    return 'info';
            }
        };

        const getAlertCustomClass = (): string => {
            switch (player?.ban_data?.type) {
                case 'HACK':
                    return ''; // 使用原生warning样式
                case 'BAN':
                    return ''; // 使用原生error样式
                case 'MUTE':
                    return 'ban-alert-purple';
                case 'WARNING':
                    return 'ban-alert-pink';
                case 'KICK':
                    return 'ban-alert-cyan';
                case 'PARKOUR':
                    return 'ban-alert-blue';
                case 'OVERWATCH':
                    return 'ban-alert-orange';
                case 'FREEZE_SCORE_TOP':
                    return 'ban-alert-pink';
                case 'RESTRICT_NICK':
                    return 'ban-alert-geekblue';
                case 'KICK_HOMELAND_PLAYER':
                    return 'ban-alert-pink';
                default:
                    return '';
            }
        };

        const getTagColor = (
            type: string
        ):
            | 'success'
            | 'error'
            | 'warning'
            | 'info'
            | 'default'
            | 'purple'
            | 'cyan'
            | 'gold'
            | 'green'
            | 'red'
            | 'pink'
            | 'geekblue' => {
            switch (type) {
                case 'HACK':
                    return 'warning';
                case 'BAN':
                    return 'error';
                case 'MUTE':
                    return 'purple';
                case 'WARNING':
                    return 'warning';
                case 'KICK':
                    return 'info';
                case 'KICK_HOMELAND_PLAYER':
                    return 'pink';
                case 'PARKOUR':
                    return 'info';
                case 'BAN_DEVICE':
                    return 'error';
                case 'CLEAR_DEGREE':
                    return 'gold';
                case 'OVERWATCH':
                    return 'warning';
                case 'FREEZE_SCORE_TOP':
                    return 'pink';
                case 'RESTRICT_NICK':
                    return 'geekblue';
                default:
                    return 'default';
            }
        };

        return (
            <Alert
                className={getAlertCustomClass()}
                type={getAlertType()}
                action={action}
                message={<strong>{gLang('playerDetail.accountAbnormal')}</strong>}
                description={
                    <Descriptions
                        size={descriptionsSize}
                        column={column ?? 2}
                        style={{ marginBlockEnd: -16, marginBlockStart: 16, ...descriptionsStyle }}
                    >
                        <Descriptions.Item label={gLang('playerDetail.item.banType')}>
                            <Tag color={getTagColor(player?.ban_data?.type || '')}>
                                {(player?.ban_data?.type &&
                                    gLang(`playerDetail.banType.${player.ban_data.type}`)) ||
                                    player?.ban_data?.type}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label={gLang('playerDetail.item.banDegree')}>
                            {player?.ban_data?.degree}
                        </Descriptions.Item>
                        <Descriptions.Item label={gLang('playerDetail.item.punishStart')}>
                            {player?.ban_data?.dateperform ? (
                                <TimeConverter utcTime={player.ban_data.dateperform} />
                            ) : (
                                '-'
                            )}
                        </Descriptions.Item>
                        {player?.ban_data?.dateexpire && (
                            <Descriptions.Item label={gLang('playerDetail.item.punishEnd')}>
                                <TimeConverter utcTime={player.ban_data.dateexpire} />
                            </Descriptions.Item>
                        )}
                        <Descriptions.Item label={gLang('playerDetail.item.banReason')}>
                            {player?.ban_data?.reason}
                        </Descriptions.Item>
                    </Descriptions>
                }
                style={{ marginBlockEnd: haveMarginEnd ? 16 : 0, padding: '20px 24px 32px' }}
            />
        );
    };

    return <Spin spinning={spinning}>{renderAlert()}</Spin>;
};

export default PlayerDetailPunishInfo;
