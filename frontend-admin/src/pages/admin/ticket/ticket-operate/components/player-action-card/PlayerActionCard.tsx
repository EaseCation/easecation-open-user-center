// 工单操作页面中的玩家详情面板组件
// 支持快捷键：Alt+Q 快速打开处罚操作模态框（仅对目标用户有效）

import React, { useState, useEffect } from 'react';
import { Button, Card, Space, Tag, Typography } from 'antd';
import { IdcardOutlined, EyeOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { usePlayerBasicCache } from '@common/hooks/usePlayerBasicCache';
import PlayerDetailPunishInfo from './PlayerDetailPunishInfo';
import { StaffShortcut } from '@ecuc/shared/types/player.types';
import { TicketAction, TicketDetail } from '@ecuc/shared/types/ticket.types';
import { gLang } from '@common/language';
import FastActionModal from '../../TicketFastActionModal';
import { getGlobalMessageApi } from '@common/utils/messageApiHolder';
import PunishCopyMailModal from './PunishCopyMailModal';

interface PlayerActionCardProps {
    ecid: string;
    playerType: string;
    ticketType?: string;
    shortcuts: StaffShortcut[];
    windowWidth: number;
    onPreview: (ecid: string, defaultTab?: string, initialSettings?: unknown) => void;
    /**
     * 指定当前面板是针对哪个角色：
     * - "target": 目标
     * - "initiator": 发起人
     */
    userRole: 'target' | 'initiator';
    tid?: string;
    ticketTitle?: string;
    ticketDetails?: TicketDetail[];
    updateTicketDetail?: () => Promise<void>;
}

export const PlayerActionCard: React.FC<PlayerActionCardProps> = ({
    ecid,
    playerType,
    ticketType,
    shortcuts,
    windowWidth,
    onPreview,
    userRole,
    tid,
    ticketTitle,
    ticketDetails,
    updateTicketDetail,
}) => {
    const [fastActionVisible, setFastActionVisible] = useState(false);
    const [copyMailVisible, setCopyMailVisible] = useState(false);
    const [action, setAction] = useState<string | undefined>('');
    const [collapsed, setCollapsed] = useState(false);

    // 获取玩家基础信息（包括昵称），用于在 ECID 旁显示中文昵称
    const { player } = usePlayerBasicCache(ecid);

    // 监听快捷键 Alt+Q - 打开处罚模态框
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // 检查是否按下 Alt+Q，且只对目标用户生效
            if (event.altKey && event.key.toLowerCase() === 'q' && userRole === 'target') {
                event.preventDefault();
                setAction('punish');
                setFastActionVisible(true);

                // 显示提示消息
                const api = getGlobalMessageApi();
                api?.info(gLang('ticketShortcut.hotkeyTriggered'));
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // 清理事件监听器
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [userRole]); // 依赖项包括 userRole

    // 无头像样式，角色通过 Tag 展示
    const canUseAppealSelfReleaseActions =
        userRole === 'initiator' && ['AG', 'OT', 'RS'].includes(ticketType || '');
    const canUseOtClearBanDegreeAction = userRole === 'initiator' && ticketType === 'OT';
    const canUseTransferToHackAction =
        (ticketType === 'AG' && userRole === 'initiator') ||
        (ticketType === 'OT' && (userRole === 'initiator' || userRole === 'target'));
    const hasTicketPunishment = Boolean(
        ticketDetails?.some(detail => {
            const content = detail.content || '';
            const bySystem = detail.operator === 'SYSTEM' && detail.action === TicketAction.Reply;
            const byStaffAction =
                detail.operator.startsWith('AUTH_UID_') || detail.action === TicketAction.Note;
            if (!bySystem && !byStaffAction) return false;
            return /(处罚|禁言|封禁|小黑屋|hack|mute|warning|ban|已处罚|违规行为警告)/i.test(
                content
            );
        })
    );
    const canCopyPunishMail =
        userRole === 'target' && ticketType === 'RP' && hasTicketPunishment && Boolean(ecid);

    // 普通快捷操作按钮
    const shortcutButtons = shortcuts.map(sc => (
        <Button
            key={sc.uid}
            size="small"
            type="default"
            onClick={() => onPreview(ecid, 'action', { action: { type: sc.title } })}
        >
            {sc.title}
        </Button>
    ));

    // 全局快捷操作
    const extraButtons: React.ReactNode[] =
        userRole === 'target'
            ? [
                  <Button
                      block={windowWidth < 480}
                      size="small"
                      key="punish"
                      danger
                      onClick={() => {
                          setAction('punish');
                          setFastActionVisible(true);
                      }}
                  >
                      {gLang('ticketShortcut.punish')}
                  </Button>,
                  <Button
                      block={windowWidth < 480}
                      size="small"
                      key="punish_copy"
                      onClick={() => setCopyMailVisible(true)}
                      disabled={!canCopyPunishMail}
                      title={
                          canCopyPunishMail
                              ? undefined
                              : gLang('admin.punishCopyMail.disabledHint')
                      }
                  >
                      {gLang('admin.punishCopyMail.copyButton')}
                  </Button>,
                  ...(canUseTransferToHackAction
                      ? [
                            <Button
                                block={windowWidth < 480}
                                type="default"
                                size="small"
                                key="transfer_to_hack"
                                onClick={() => {
                                    setAction('transfer_to_hack');
                                    setFastActionVisible(true);
                                }}
                            >
                                {gLang('ticketShortcut.transfer_to_hack')}
                            </Button>,
                        ]
                      : []),
              ]
            : [
                  <Button
                      block={windowWidth < 480}
                      type="default"
                      size="small"
                      key="report_gift"
                      onClick={() => {
                          setAction('report');
                          setFastActionVisible(true);
                      }}
                  >
                      {gLang('ticketShortcut.report_gift')}
                  </Button>,
                  <Button
                      block={windowWidth < 480}
                      type="default"
                      size="small"
                      key="feedback_gift"
                      onClick={() => {
                          setAction('feedback');
                          setFastActionVisible(true);
                      }}
                  >
                      {gLang('ticketShortcut.feedback_gift')}
                  </Button>,
                  <Button
                      block={windowWidth < 480}
                      type="default"
                      size="small"
                      key="unban_gift"
                      onClick={() => {
                          setAction('unban_gift');
                          setFastActionVisible(true);
                      }}
                  >
                      {gLang('ticketShortcut.unban_gift')}
                  </Button>,
                  ...(canUseAppealSelfReleaseActions
                      ? [
                            <Button
                                block={windowWidth < 480}
                                type="default"
                                size="small"
                                key="unban"
                                onClick={() => {
                                    setAction('unban');
                                    setFastActionVisible(true);
                                }}
                            >
                                {gLang('ticketShortcut.unban')}
                            </Button>,
                            <Button
                                block={windowWidth < 480}
                                type="default"
                                size="small"
                                key="unmute"
                                onClick={() => {
                                    setAction('unmute');
                                    setFastActionVisible(true);
                                }}
                            >
                                {gLang('ticketShortcut.unmute')}
                            </Button>,
                        ]
                      : []),
                  ...(canUseTransferToHackAction
                      ? [
                            <Button
                                block={windowWidth < 480}
                                type="default"
                                size="small"
                                key="transfer_to_hack"
                                onClick={() => {
                                    setAction('transfer_to_hack');
                                    setFastActionVisible(true);
                                }}
                            >
                                {gLang('ticketShortcut.transfer_to_hack')}
                            </Button>,
                        ]
                      : []),
                  ...(canUseOtClearBanDegreeAction
                      ? [
                            <Button
                                block={windowWidth < 480}
                                type="default"
                                size="small"
                                key="clearbandegree"
                                onClick={() => {
                                    setAction('clearbandegree');
                                    setFastActionVisible(true);
                                }}
                            >
                                {gLang('ticketShortcut.clearbandegree')}
                            </Button>,
                        ]
                      : []),
              ];

    return (
        <Card
            size="small"
            styles={{
                header: { padding: '8px 12px' },
                body: collapsed ? { padding: 0, display: 'none' } : { padding: 12 },
            }}
            title={
                <Space size={8} align="center" wrap>
                    <Space
                        size={6}
                        wrap
                        direction={windowWidth < 480 ? 'vertical' : 'horizontal'}
                        align={windowWidth < 480 ? 'start' : 'center'}
                    >
                        <Space size={6} align="center" wrap={false}>
                            <IdcardOutlined />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Typography.Text
                                    className="ticket-title-hover"
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 600,
                                        textDecoration: 'underline',
                                        textDecorationStyle: 'dotted',
                                        textUnderlineOffset: 2,
                                        textDecorationThickness: 1,
                                        cursor: 'pointer',
                                        ...(windowWidth < 480 ? { display: 'block' } : {}),
                                    }}
                                    onClick={() => {
                                        const api = getGlobalMessageApi();
                                        if (
                                            navigator &&
                                            navigator.clipboard &&
                                            navigator.clipboard.writeText
                                        ) {
                                            navigator.clipboard
                                                .writeText(ecid)
                                                .then(() =>
                                                    api?.success(gLang('common.copySuccess'))
                                                )
                                                .catch(() =>
                                                    api?.error(gLang('common.copyFailed'))
                                                );
                                        } else {
                                            try {
                                                // 兜底：创建临时文本区域复制
                                                const textarea = document.createElement('textarea');
                                                textarea.value = ecid;
                                                document.body.appendChild(textarea);
                                                textarea.select();
                                                document.execCommand('copy');
                                                document.body.removeChild(textarea);
                                                api?.success(gLang('common.copySuccess'));
                                            } catch {
                                                api?.error(gLang('common.copyFailed'));
                                            }
                                        }
                                    }}
                                    title={gLang('common.copy')}
                                >
                                    {ecid}
                                </Typography.Text>

                                {player?.name && (
                                    <Typography.Text
                                        type="secondary"
                                        style={{ fontSize: 13 }}
                                        title={player.name}
                                    >
                                        {player.name}
                                    </Typography.Text>
                                )}
                            </div>
                        </Space>
                        <Space size={4} wrap>
                            <Tag color="blue">{playerType}</Tag>
                        </Space>
                    </Space>
                </Space>
            }
            extra={
                <Button
                    type="text"
                    size="small"
                    icon={collapsed ? <DownOutlined /> : <UpOutlined />}
                    onClick={() => setCollapsed(prev => !prev)}
                    title={collapsed ? gLang('common.switch.open') : gLang('common.switch.close')}
                />
            }
        >
            {!collapsed && (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <PlayerDetailPunishInfo
                        ecid={ecid}
                        column={windowWidth > 700 ? 2 : 1}
                        action={
                            windowWidth >= 800 && (
                                <Button
                                    icon={<EyeOutlined />}
                                    onClick={() => onPreview(ecid)}
                                    disabled={!ecid}
                                >
                                    {gLang('ticketOperate.actionTo')}
                                </Button>
                            )
                        }
                    />

                    {windowWidth < 800 && (
                        <Button
                            block
                            icon={<EyeOutlined />}
                            onClick={() => onPreview(ecid)}
                            disabled={!ecid}
                        >
                            {gLang('ticketOperate.actionTo')}
                        </Button>
                    )}

                    {/* 快捷操作（自定义 + 全局） */}
                    <Space size={[6, 6]} wrap style={{ display: 'flex', width: '100%' }}>
                        {shortcutButtons}
                        {extraButtons.map((btn, idx) => (
                            <React.Fragment key={`extra_${idx}`}>{btn}</React.Fragment>
                        ))}
                    </Space>
                </Space>
            )}

            <FastActionModal
                visible={fastActionVisible}
                onClose={() => setFastActionVisible(false)}
                ecid={ecid}
                action={action}
                tid={tid}
                authorizer={`TID_${tid}`}
                updateTicketDetail={updateTicketDetail}
            />
            <PunishCopyMailModal
                open={copyMailVisible}
                onClose={() => setCopyMailVisible(false)}
                tid={tid}
                reportedEcid={ecid}
                ticketTitle={ticketTitle}
                ticketDetails={ticketDetails}
                currentBanData={player?.ban_data}
            />
        </Card>
    );
};
