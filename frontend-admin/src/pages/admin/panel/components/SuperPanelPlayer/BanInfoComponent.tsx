import React from 'react';
import { Alert, Button, Descriptions, Tag, Typography } from 'antd';
import { gLang } from '@common/language';
import { PlayerBanInfo } from '@ecuc/shared/types/player.types';
import './baninfo-custom.css';
import { TimeConverter } from '@common/components/TimeConverter';

const { Text } = Typography;

interface BanInfoComponentProps {
    ban: PlayerBanInfo;
    setPreviewTid: (data: any) => void;
}

const BanInfoComponent: React.FC<BanInfoComponentProps> = ({ ban, setPreviewTid }) => {
    const getCustomAlertClass = () => {
        switch (ban.type) {
            case 'MUTE':
                return 'ban-alert-purple';
            case 'HACK':
                return ''; // 使用原生warning
            case 'BAN':
                return ''; // 使用原生error
            case 'WARNING':
                return 'ban-alert-pink';
            case 'KICK':
                return 'ban-alert-cyan'; // 自定义样式覆盖
            case 'KICK_HOMELAND_PLAYER':
                return 'ban-alert-pink'; // 自定义样式覆盖
            case 'PARKOUR':
                return 'ban-alert-blue'; // 自定义样式覆盖
            case 'CLEAR_SCORE':
                return 'ban-alert-orange'; // 自定义样式覆盖
            case 'CLEAR_DEGREE':
                return 'ban-alert-yellow'; // 自定义样式覆盖
            case 'OVERWATCH':
                return 'ban-alert-orange'; // 自定义样式覆盖
            case 'FREEZE_SCORE_TOP':
                return 'ban-alert-pink';
            case 'RESTRICT_NICK':
                return 'ban-alert-geekblue';
            case 'CPS_LIMIT_TRIG':
                return 'ban-alert-volcano';
            default:
                if (ban.type && ban.type.startsWith('UN')) return 'success'; // UN开头返回success
                return '';
        }
    };

    const getAlertType = (): 'success' | 'info' | 'warning' | 'error' => {
        switch (ban.type) {
            case 'MUTE':
                return 'warning'; // 使用标准 warning 类型
            case 'HACK':
                return 'warning';
            case 'BAN':
                return 'error';
            case 'WARNING':
                return 'info'; // 使用标准 info 类型
            case 'KICK':
                return 'info'; // 使用标准 info 类型
            case 'KICK_HOMELAND_PLAYER':
                return 'info'; // 使用标准 info 类型
            case 'PARKOUR':
                return 'info'; // 使用标准 info 类型
            case 'CLEAR_SCORE':
                return 'warning'; // 使用标准 warning 类型
            case 'CLEAR_DEGREE':
                return 'warning'; // 使用标准 warning 类型
            case 'OVERWATCH':
                return 'info'; // 使用标准 info 类型
            case 'FREEZE_SCORE_TOP':
                return 'info';
            case 'RESTRICT_NICK':
                return 'info';
            case 'CPS_LIMIT_TRIG':
                return 'info';
            default:
                if (ban.type && ban.type.startsWith('UN')) return 'success'; // UN开头返回success
                return 'info'; // 默认返回info
        }
    };

    const getTagColor = (type: string): string => {
        switch (type) {
            case 'HACK':
                return 'warning';
            case 'BAN':
                return 'error';
            case 'MUTE':
                return 'purple';
            case 'WARNING':
                return 'pink';
            case 'KICK':
                return 'cyan';
            case 'KICK_HOMELAND_PLAYER':
                return 'pink';
            case 'PARKOUR':
                return 'geekblue';
            case 'CLEAR_SCORE':
                return 'orange';
            case 'CLEAR_DEGREE':
                return 'gold';
            case 'OVERWATCH':
                return 'warning';
            case 'BAN_DEVICE':
                return 'purple';
            case 'FREEZE_SCORE_TOP':
                return 'pink';
            case 'RESTRICT_NICK':
                return 'geekblue';
            case 'CPS_LIMIT_TRIG':
                return 'volcano';
            case 'UNBAN':
            case 'UNMUTE':
            case 'UNHACK':
            case 'UNFREEZE_SCORE_TOP':
            case 'UNRESTRICT_NICK':
                return 'success';
            default:
                return 'default';
        }
    };

    const getButtonProps = (
        type: string
    ): {
        type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
        danger?: boolean;
        style?: React.CSSProperties;
    } => {
        switch (type) {
            case 'HACK':
                return { type: 'default', style: { color: '#faad14', borderColor: '#faad14' } };
            case 'BAN':
                return { danger: true };
            case 'MUTE':
                return { type: 'default', style: { color: '#722ed1', borderColor: '#722ed1' } };
            case 'WARNING':
                return { type: 'default', style: { color: '#eb2f96', borderColor: '#eb2f96' } };
            case 'KICK':
                return { type: 'default', style: { color: '#13c2c2', borderColor: '#13c2c2' } };
            case 'PARKOUR':
                return { type: 'default', style: { color: '#597ef7', borderColor: '#597ef7' } };
            case 'CLEAR_SCORE':
                return { type: 'default', style: { color: '#fa8c16', borderColor: '#fa8c16' } };
            case 'BAN_DEVICE':
                return { type: 'default', style: { color: '#722ed1', borderColor: '#722ed1' } };
            case 'CLEAR_DEGREE':
                return { type: 'default', style: { color: '#faad14', borderColor: '#faad14' } };
            case 'OVERWATCH':
                return { type: 'default', style: { color: '#fa8c16', borderColor: '#fa8c16' } };
            case 'FREEZE_SCORE_TOP':
                return { type: 'default', style: { color: '#eb2f96', borderColor: '#eb2f96' } };
            case 'RESTRICT_NICK':
                return { type: 'default', style: { color: '#1d39c4', borderColor: '#1d39c4' } };
            case 'CPS_LIMIT_TRIG':
                return { type: 'default', style: { color: '#fa541c', borderColor: '#fa541c' } };
            case 'UNBAN':
            case 'UNMUTE':
            case 'UNHACK':
            case 'UNFREEZE_SCORE_TOP':
            case 'UNRESTRICT_NICK':
                return { type: 'default', style: { color: '#52c41a', borderColor: '#52c41a' } };
            case 'KICK_HOMELAND_PLAYER':
                return { type: 'default', style: { color: '#eb2f96', borderColor: '#eb2f96' } };
            default:
                return { type: 'default' };
        }
    };

    return (
        <Alert
            className={`ban-alert-shadow ${getCustomAlertClass()}`}
            type={getAlertType()}
            style={{ marginBottom: 8, paddingBottom: 12 }}
            description={
                <>
                    <Text disabled>
                        {ban.logid} @ <TimeConverter utcTime={ban.time} />
                    </Text>
                    <Descriptions size="small">
                        <Descriptions.Item label={gLang('superPanel.item.banType')}>
                            <Tag color={getTagColor(ban.type)}>
                                {gLang(`playerDetail.banType.${ban.type}`) || ban.type}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label={gLang('superPanel.item.banSource')}>
                            {ban.source}
                        </Descriptions.Item>
                        {ban.type !== 'WARNING' &&
                            ban.type !== 'PARKOUR' &&
                            ban.type !== 'KICK' &&
                            ban.type !== 'CLEAR_SCORE' &&
                            ban.type !== 'RESTRICT_NICK' &&
                            ban.type !== 'CPS_LIMIT_TRIG' &&
                            !(ban.type && ban.type.startsWith('UN')) && (
                                <>
                                    <Descriptions.Item label={gLang('superPanel.item.banHours')}>
                                        {ban.hours}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={gLang('superPanel.item.banUntil')}>
                                        <TimeConverter utcTime={ban.banuntil} />
                                    </Descriptions.Item>
                                </>
                            )}
                        {ban.type === 'KICK' &&
                            ban.kickToLobby &&
                            ban.kickToLobby.trim() !== '' && (
                                <Descriptions.Item label={gLang('admin.banKickLobby')}>
                                    {ban.kickToLobby === 'true'
                                        ? gLang('admin.banYes')
                                        : gLang('admin.banNo')}
                                </Descriptions.Item>
                            )}
                        {ban.type === 'CLEAR_SCORE' && (
                            <>
                                {ban.game && (
                                    <Descriptions.Item label={gLang('admin.banGame')}>
                                        {ban.game}
                                    </Descriptions.Item>
                                )}
                                {ban.scoreType && (
                                    <Descriptions.Item label={gLang('admin.banScoreType')}>
                                        {ban.scoreType}
                                    </Descriptions.Item>
                                )}
                                {ban.deadlineType && (
                                    <Descriptions.Item label={gLang('admin.banDurationType')}>
                                        {ban.deadlineType}
                                    </Descriptions.Item>
                                )}
                                {ban.rank && (
                                    <Descriptions.Item label={gLang('admin.banRank')}>
                                        {ban.rank}
                                    </Descriptions.Item>
                                )}
                                {ban.score && (
                                    <Descriptions.Item label={gLang('admin.banScore')}>
                                        {ban.score}
                                    </Descriptions.Item>
                                )}
                            </>
                        )}
                        {ban.type !== 'KICK' &&
                            ban.type !== 'PARKOUR' &&
                            ban.type !== 'CLEAR_SCORE' &&
                            !(ban.type && ban.type.startsWith('UN')) &&
                            ban.reasontype &&
                            ban.reasontype.trim() !== '' && (
                                <Descriptions.Item label={gLang('superPanel.item.banReasonType')}>
                                    {ban.reasontype}
                                </Descriptions.Item>
                            )}
                        {ban.reason && ban.reason.trim() !== '' && (
                            <Descriptions.Item label={gLang('superPanel.item.banReason')}>
                                {ban.reason}
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </>
            }
            action={
                ban.source?.startsWith('TID_') && (
                    <Button
                        size="small"
                        {...getButtonProps(ban.type)}
                        onClick={() => setPreviewTid(ban.source?.substring(4))}
                    >
                        {gLang('superPanel.detailBtn')}
                    </Button>
                )
            }
        />
    );
};

export default BanInfoComponent;
