// 超级面板组件
import { Button, Col, ConfigProvider, message, Modal, Row, Statistic, Tabs, TabsProps } from 'antd';
import React, { useEffect, useState } from 'react';
import axiosInstance from '@common/axiosConfig';
import { fetchData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import dayjs from 'dayjs';

import TicketDetailComponent from '../../../../components/TicketDetailComponent';
import {
    BindPlayerDetailTickets,
    PlayerAuthLog,
    PlayerBanInfo,
    PlayerChatHistory,
    PlayerRecordingHistory,
} from '@ecuc/shared/types/player.types';
import { Ticket, TicketActionLog } from '@ecuc/shared/types/ticket.types';
import {
    BasicInfoTab,
    BanTab,
    PlayerActionTab,
    RecordingTab,
    GamelogTab,
    TicketTab,
    LoginTab,
    ChatTab,
    MailTab,
} from './SuperPanelPlayer';
import { usePlayerBasicCache } from '@common/hooks/usePlayerBasicCache';
import { GiftVipTab } from './SuperPanelPlayer/GiftVipTab';
import OverwatchModal from '../../../../components/OverwatchModal';

interface Props {
    ecid: string;
    tid: number | null;
    defaultTab?: string;
    initialSettings?: InitialSettings;
    setDoRefresh?: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface InitialSettings {
    action?: {
        type: string;
        reason?: string;
        toUser?: boolean;
        data?: string;
    };
}

const SuperPanelPlayerComponent = ({
    ecid,
    tid,
    defaultTab = 'basic',
    initialSettings,
    setDoRefresh,
}: Props) => {
    const {
        player: playerBasic,
        spinning: spinningDetail,
        fetchPlayerBasic,
        clearCache,
        setPlayer,
    } = usePlayerBasicCache(ecid);
    const [playerBan, setPlayerBan] = React.useState<PlayerBanInfo[] | undefined>();
    const [playerTickets, setPlayerTickets] = React.useState<BindPlayerDetailTickets | undefined>();
    const [playerTicketLogs, setPlayerTicketLogs] = React.useState<TicketActionLog[] | undefined>();
    const [playerLoginHistory, setPlayerLoginHistory] = React.useState<
        PlayerAuthLog[] | undefined
    >();
    const [playerChatHistory, setPlayerChatHistory] = React.useState<
        PlayerChatHistory[] | undefined
    >();
    const [playerMailHistory, setPlayerMailHistory] = React.useState<any[] | undefined>();
    const [playerRecordingLogs, setPlayerRecodingLogs] = React.useState<
        PlayerRecordingHistory[] | undefined
    >();

    const [tab, setTab] = React.useState<string>(defaultTab);

    const [spinningBan, setSpinningBan] = React.useState(false);
    const [spinningTicketLogs, setSpinningTicketLogs] = React.useState(false);
    const [spinningTickets, setSpinningTickets] = React.useState(false);
    const [spinningAuth, setSpinningAuth] = React.useState(false);
    const [spinningChat, setSpinningChat] = React.useState(false);
    const [spinningMail, setSpinningMail] = React.useState(false);
    const [spinningRecoding, setSpinningRecoding] = React.useState(false);

    // 录像筛选状态
    const [recordingTimeRange, setRecordingTimeRange] = React.useState<[dayjs.Dayjs, dayjs.Dayjs]>([
        dayjs().subtract(7, 'day'),
        dayjs(),
    ]);

    const [messageApi, contextHolder] = message.useMessage();
    const [previewTid, setPreviewTid] = React.useState<number | null>(null);
    const [overwatchModalVisible, setOverwatchModalVisible] = useState(false);
    const [overwatchRecordId, setOverwatchRecordId] = useState<number | null>(null);

    const [ticket, setTicket] = useState<Ticket | undefined>();

    const handleRecordingTimeRangeChange = (from: string, to: string) => {
        setRecordingTimeRange([dayjs(from), dayjs(to)]);
        setPlayerRecodingLogs(undefined); // 清空数据，触发重新加载
    };

    useEffect(() => {
        const initTicket = async () => {
            if (previewTid !== null && previewTid !== 0) {
                // 清除之前的数据，避免显示错误的工单信息
                setTicket(undefined);

                try {
                    await fetchData({
                        url: '/ticket/detail',
                        method: 'GET',
                        data: { tid: previewTid },
                        setData: setTicket,
                    });
                } catch {
                    // 如果加载失败，确保清除数据
                    setTicket(undefined);
                }
            }
        };
        initTicket().then();
    }, [previewTid]);

    useEffect(() => {
        fetchPlayerBasic(); // 只用缓存，不强制刷新
    }, [ecid]);

    // 当切换到 basic tab 或 ban tab 时，检查是否需要刷新数据
    useEffect(() => {
        if (tab === 'basic' || tab === 'ban') {
            // 检查缓存是否存在且有效
            const checkAndRefresh = () => {
                try {
                    const cached = localStorage.getItem('player_basic_cache');
                    if (cached) {
                        const cacheData = JSON.parse(cached);
                        const cachedData = cacheData[ecid];
                        // 如果没有缓存或缓存已过期，重新获取数据
                        if (!cachedData || Date.now() - cachedData.timestamp >= 5 * 60 * 1000) {
                            // 先清空当前状态，避免显示旧数据
                            setPlayer(undefined);
                            fetchPlayerBasic(true);
                        }
                    } else {
                        // 没有缓存，重新获取数据
                        // 先清空当前状态，避免显示旧数据
                        setPlayer(undefined);
                        fetchPlayerBasic(true);
                    }
                } catch {
                    // 缓存读取失败，重新获取数据
                    // 先清空当前状态，避免显示旧数据
                    setPlayer(undefined);
                    fetchPlayerBasic(true);
                }
            };

            checkAndRefresh();
        }

        // 当切换到 ban tab 时，强制刷新操作记录和处罚记录
        if (tab === 'ban') {
            // 强制重新获取操作记录和处罚记录
            setSpinningBan(true);
            fetchData({
                url: '/ec/ban',
                method: 'GET',
                data: { ecid: ecid },
                setData: rep => setPlayerBan(rep.data),
            }).then(() => setSpinningBan(false));

            setSpinningTicketLogs(true);
            fetchData({
                url: '/ec/ticket-logs',
                method: 'GET',
                data: { ecid: ecid },
                setData: rep => setPlayerTicketLogs(rep.data),
            }).then(() => setSpinningTicketLogs(false));
        }
    }, [tab, ecid]);

    useEffect(() => {
        // 根据tab延迟加载数据
        switch (tab) {
            case 'ban':
                if (!playerBan && !spinningBan) {
                    setSpinningBan(true);
                    fetchData({
                        url: '/ec/ban',
                        method: 'GET',
                        data: { ecid: ecid },
                        setData: rep => setPlayerBan(rep.data),
                    }).then(() => setSpinningBan(false));
                }
                if (!playerTicketLogs && !spinningTicketLogs) {
                    setSpinningTicketLogs(true);
                    fetchData({
                        url: '/ec/ticket-logs',
                        method: 'GET',
                        data: { ecid: ecid },
                        setData: rep => setPlayerTicketLogs(rep.data),
                    }).then(() => setSpinningTicketLogs(false));
                }
                break;
            case 'ticket':
                if (!playerTickets && !spinningTickets) {
                    setSpinningTickets(true);
                    fetchData({
                        url: '/ec/tickets',
                        method: 'GET',
                        data: { ecid: ecid },
                        setData: rep => setPlayerTickets(rep.data),
                    }).then(() => setSpinningTickets(false));
                }
                break;
            case 'login':
                if (!playerLoginHistory && !spinningAuth) {
                    setSpinningAuth(true);
                    fetchData({
                        url: '/ec/auth',
                        method: 'GET',
                        data: { ecid: ecid },
                        setData: rep => setPlayerLoginHistory(rep.data),
                    }).then(() => setSpinningAuth(false));
                }
                break;
            case 'chat':
                if (!playerChatHistory && !spinningChat) {
                    setSpinningChat(true);
                    fetchData({
                        url: '/ec/chat',
                        method: 'GET',
                        data: { ecid: ecid },
                        setData: rep => setPlayerChatHistory(rep.data),
                    }).then(() => setSpinningChat(false));
                }
                break;
            case 'mail':
                if (!playerMailHistory && !spinningMail) {
                    setSpinningMail(true);
                    fetchData({
                        url: '/ec/mail',
                        method: 'GET',
                        data: { addressee: ecid, current: 1, pageSize: 100 },
                        setData: rep => setPlayerMailHistory(rep.data),
                    }).then(() => setSpinningMail(false));
                }
                break;
            case 'recording':
                if (!playerRecordingLogs && !spinningRecoding) {
                    setSpinningRecoding(true);
                    fetchData({
                        url: '/ec/recording',
                        method: 'GET',
                        data: {
                            ecid: ecid,
                            startTime: recordingTimeRange[0].format('YYYY-MM-DD'),
                            endTime: recordingTimeRange[1].format('YYYY-MM-DD'),
                        },
                        setData: rep => setPlayerRecodingLogs(rep.data),
                    }).then(() => setSpinningRecoding(false));
                }
                break;
        }
    }, [tab, recordingTimeRange]);

    const items: TabsProps['items'] = [
        {
            key: 'basic',
            label: gLang('superPanel.tab.basic'),
            children: (
                <BasicInfoTab
                    playerBasic={playerBasic}
                    spinningDetail={spinningDetail}
                    setPreviewTid={setPreviewTid}
                />
            ),
        },
        {
            key: 'ban',
            label: gLang('superPanel.tab.ban'),
            children: (
                <BanTab
                    playerTicketLogs={playerTicketLogs}
                    playerBan={playerBan}
                    spinningTicketLogs={spinningTicketLogs}
                    spinningBan={spinningBan}
                    setPreviewTid={setPreviewTid}
                />
            ),
        },
        {
            key: 'action',
            label: gLang('superPanel.tab.action'),
            children: (
                <PlayerActionTab
                    tid={tid}
                    player={playerBasic}
                    setRefresh={v => {
                        setDoRefresh?.(v);
                    }}
                    initialValues={
                        initialSettings &&
                        initialSettings.action && {
                            type: initialSettings.action.type,
                            reason: initialSettings.action.reason,
                            toUser: initialSettings.action.toUser,
                            data: initialSettings.action.data,
                        }
                    }
                    disabled={!playerBasic}
                    spinningDetail={spinningDetail}
                    clearCache={clearCache}
                />
            ),
        },
        {
            key: 'recording',
            label: gLang('superPanel.tab.recording'),
            children: (
                <RecordingTab
                    playerRecordingLogs={playerRecordingLogs}
                    spinningRecoding={spinningRecoding}
                    timeRange={recordingTimeRange}
                    onTimeRangeChange={handleRecordingTimeRangeChange}
                    onViewOverwatch={recordId => {
                        setOverwatchRecordId(recordId);
                        setOverwatchModalVisible(true);
                    }}
                />
            ),
        },
        {
            key: 'gamelog',
            label: gLang('superPanel.tab.gamelog'),
            children: (
                <GamelogTab
                    ecid={ecid}
                    onViewOverwatch={recordId => {
                        setOverwatchRecordId(recordId);
                        setOverwatchModalVisible(true);
                    }}
                />
            ),
        },
        {
            key: 'ticket',
            label: gLang('superPanel.tab.ticket'),
            children: (
                <TicketTab
                    playerTickets={playerTickets}
                    spinningTickets={spinningTickets}
                    setPreviewTid={setPreviewTid}
                    ecid={ecid}
                />
            ),
        },
        {
            key: 'login',
            label: gLang('superPanel.tab.login'),
            children: (
                <LoginTab playerLoginHistory={playerLoginHistory} spinningAuth={spinningAuth} />
            ),
        },
        {
            key: 'chat',
            label: gLang('superPanel.tab.chat'),
            children: <ChatTab playerChatHistory={playerChatHistory} spinningChat={spinningChat} />,
        },
        {
            key: 'mail',
            label: gLang('superPanel.tab.mail'),
            children: <MailTab
                playerMailHistory={playerMailHistory}
                spinningMail={spinningMail}
                onDeleteMail={async (idmail) => {
                    await axiosInstance.delete(`/ec/mail/${idmail}`);
                    setPlayerMailHistory(prev => prev?.filter(m => m.idmail !== idmail));
                }}
            />,
        },
        {
            key: 'giftVip',
            label: gLang('superPanel.tab.giftVip'),
            children: (
                <GiftVipTab ecid={ecid} vipList={undefined} spinning={false} activeTab={tab} />
            ),
        },
    ];

    return (
        <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
            {contextHolder}
            <Row>
                <Col span={14}>
                    <Statistic
                        loading={spinningDetail}
                        title={
                            playerBasic
                                ? playerBasic.ecid + ' [LV.' + playerBasic.level + ']'
                                : gLang('loading')
                        }
                        value={playerBasic?.name}
                        style={{ marginTop: '-5px' }}
                    />
                </Col>

                <Col span={10} style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button
                            onClick={async () => {
                                const ecidToUse = playerBasic?.ecid ?? ecid;
                                if (!ecidToUse) return;
                                try {
                                    const res = await axiosInstance.get<{
                                        EPF_code?: number;
                                        url?: string;
                                        EPF_description?: string;
                                    }>('/user/console-player-url', { params: { ecid: ecidToUse } });
                                    if (res.data?.EPF_code === 200 && res.data?.url) {
                                        window.open(res.data.url, '_blank');
                                    } else {
                                        messageApi.error(
                                            res.data?.EPF_description ??
                                                gLang('crossDomain.switchFailed')
                                        );
                                    }
                                } catch (err: unknown) {
                                    const axiosError = err as {
                                        response?: { data?: { EPF_description?: string } };
                                    };
                                    messageApi.error(
                                        axiosError?.response?.data?.EPF_description ??
                                            gLang('crossDomain.switchFailedRetry')
                                    );
                                }
                            }}
                        >
                            {gLang('superPanel.goconsole')}
                        </Button>
                    </div>
                </Col>
            </Row>

            <ConfigProvider
                theme={{
                    token: {
                        padding: 10,
                        paddingLG: 15,
                    },
                    components: {
                        Alert: {
                            withDescriptionPadding: '10px 10px 3px 15px',
                        },
                        Card: {
                            /* 这里是你的组件 token */
                        },
                    },
                }}
            >
                <Tabs
                    defaultActiveKey={defaultTab}
                    tabPosition={'top'}
                    style={{ flex: 1, minHeight: 220 }}
                    items={items}
                    onChange={key => setTab(key)}
                />
            </ConfigProvider>

            {/*查看工单详情*/}
            <Modal
                title={gLang('superPanel.currentViewingTid') + previewTid}
                open={previewTid !== null}
                onCancel={() => setPreviewTid(null)}
                footer={null}
            >
                <TicketDetailComponent ticket={ticket} isAdmin={true} />
            </Modal>

            {/*OverwatchModal*/}
            <OverwatchModal
                visible={overwatchModalVisible}
                recordId={overwatchRecordId || 0}
                ecid={ecid}
                onCancel={() => {
                    setOverwatchModalVisible(false);
                    setOverwatchRecordId(null);
                }}
            />
        </div>
    );
};

export default SuperPanelPlayerComponent;
