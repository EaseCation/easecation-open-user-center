/**
 * Game log tab for super panel: match list, player list, pit sessions (relay via UC backend to ecapi).
 * Usage: Rendered inside super panel between recording tab and ticket tab.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
    Button,
    Collapse,
    DatePicker,
    Divider,
    Drawer,
    Form,
    Input,
    List,
    Modal,
    Segmented,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
} from 'antd';
import { PlayCircleOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { fetchData } from '@common/axiosConfig';
import { gLang } from '@common/language';

const { RangePicker } = DatePicker;

function formatTime(timeValue: string | number | Date | undefined): string {
    if (timeValue == null) return '-';
    return dayjs(timeValue).format('YYYY-MM-DD HH:mm:ss');
}

function getFieldLabel(field: string): string {
    const t = gLang('superPanel.gamelog.' + field);
    return t || field;
}

interface GamelogTabProps {
    ecid: string;
    /** Optional: open super panel overwatch modal for replay (replayId in match) */
    onViewOverwatch?: (recordId: number) => void;
}

export const GamelogTab: React.FC<GamelogTabProps> = ({ ecid, onViewOverwatch }) => {
    const [mode, setMode] = useState<'match' | 'player' | 'pit'>('match');
    const [gameOptions, setGameOptions] = useState<{ label: string; value: string }[]>([]);
    const [gamesLoading, setGamesLoading] = useState(false);

    // Match mode
    const [matchForm] = Form.useForm();
    const [matchData, setMatchData] = useState<any[]>([]);
    const [matchTotal, setMatchTotal] = useState(0);
    const [matchLoading, setMatchLoading] = useState(false);
    const [matchPage, setMatchPage] = useState(1);
    const [matchPageSize, setMatchPageSize] = useState(20);
    const [sessionIdInputVisible, setSessionIdInputVisible] = useState(false);
    const [sessionIdInputValue, setSessionIdInputValue] = useState('');
    const [detailVisible, setDetailVisible] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
    const [currentRequestGame, setCurrentRequestGame] = useState<string | undefined>();
    const [detailOpenedBySessionIdInput, setDetailOpenedBySessionIdInput] = useState(false);
    const [detailData, setDetailData] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [detailModalTitle, setDetailModalTitle] = useState('');
    const [detailModalContent, setDetailModalContent] = useState<any[]>([]);

    // Player mode
    const [playerForm] = Form.useForm();
    const [playerData, setPlayerData] = useState<any[]>([]);
    const [playerTotal, setPlayerTotal] = useState(0);
    const [playerLoading, setPlayerLoading] = useState(false);
    const [playerPage, setPlayerPage] = useState(1);
    const [playerPageSize, setPlayerPageSize] = useState(20);
    const [playerDrawerVisible, setPlayerDrawerVisible] = useState(false);
    const [currentPlayerJson, setCurrentPlayerJson] = useState<any | null>(null);

    // Pit mode
    const [pitForm] = Form.useForm();
    const [pitData, setPitData] = useState<any[]>([]);
    const [pitTotal, setPitTotal] = useState(0);
    const [pitLoading, setPitLoading] = useState(false);
    const [pitPage, setPitPage] = useState(1);
    const [pitPageSize, setPitPageSize] = useState(20);
    const [pitDrawerVisible, setPitDrawerVisible] = useState(false);
    const [currentPitJson, setCurrentPitJson] = useState<any | null>(null);
    const [pitDetailVisible, setPitDetailVisible] = useState(false);
    const [currentPitId, setCurrentPitId] = useState<string | undefined>();
    const [pitDetailData, setPitDetailData] = useState<any>(null);
    const [pitDetailLoading, setPitDetailLoading] = useState(false);

    const loadGames = useCallback(async () => {
        setGamesLoading(true);
        try {
            await fetchData({
                url: '/ec/gamelog/games',
                method: 'GET',
                data: {},
                setData: (rep: any) => {
                    const list = rep?.data ?? [];
                    setGameOptions((list as string[]).map((g: string) => ({ label: g, value: g })));
                },
            });
        } finally {
            setGamesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    const fetchMatchData = useCallback(
        async (page = 1, pageSize = 20) => {
            const values = matchForm.getFieldsValue();
            if (!values.game) {
                setMatchData([]);
                setMatchTotal(0);
                return;
            }
            const start = values.timeRange?.[0] ? dayjs(values.timeRange[0]).toISOString() : undefined;
            const end = values.timeRange?.[1] ? dayjs(values.timeRange[1]).toISOString() : undefined;
            setMatchLoading(true);
            try {
                await fetchData({
                    url: '/ec/gamelog/matches',
                    method: 'GET',
                    data: {
                        game: values.game,
                        nick: values.nick ?? ecid,
                        start,
                        end,
                        current: page,
                        pageSize,
                    },
                    setData: (rep: any) => {
                        setMatchData(rep?.data ?? []);
                        setMatchTotal(rep?.pagination?.total ?? 0);
                        setMatchPage(page);
                        setMatchPageSize(pageSize);
                    },
                });
            } finally {
                setMatchLoading(false);
            }
        },
        [ecid, matchForm]
    );

    const fetchPlayerData = useCallback(
        async (page = 1, pageSize = 20) => {
            const values = playerForm.getFieldsValue();
            if (!values.game) {
                setPlayerData([]);
                setPlayerTotal(0);
                return;
            }
            const start = values.timeRange?.[0] ? dayjs(values.timeRange[0]).toISOString() : undefined;
            const end = values.timeRange?.[1] ? dayjs(values.timeRange[1]).toISOString() : undefined;
            setPlayerLoading(true);
            try {
                await fetchData({
                    url: '/ec/gamelog/players',
                    method: 'GET',
                    data: {
                        game: values.game,
                        nick: values.nick ?? ecid,
                        start,
                        end,
                        current: page,
                        pageSize,
                    },
                    setData: (rep: any) => {
                        setPlayerData(rep?.data ?? []);
                        setPlayerTotal(rep?.pagination?.total ?? 0);
                        setPlayerPage(page);
                        setPlayerPageSize(pageSize);
                    },
                });
            } finally {
                setPlayerLoading(false);
            }
        },
        [ecid, playerForm]
    );

    const fetchPitData = useCallback(
        async (page = 1, pageSize = 20) => {
            const values = pitForm.getFieldsValue();
            const start = values.timeRange?.[0] ? dayjs(values.timeRange[0]).toISOString() : undefined;
            const end = values.timeRange?.[1] ? dayjs(values.timeRange[1]).toISOString() : undefined;
            setPitLoading(true);
            try {
                await fetchData({
                    url: '/ec/gamelog/pit/sessions',
                    method: 'GET',
                    data: {
                        type: values.type,
                        nick: values.nick,
                        start,
                        end,
                        current: page,
                        pageSize,
                    },
                    setData: (rep: any) => {
                        setPitData(rep?.data ?? []);
                        setPitTotal(rep?.pagination?.total ?? 0);
                        setPitPage(page);
                        setPitPageSize(pageSize);
                    },
                });
            } finally {
                setPitLoading(false);
            }
        },
        [pitForm]
    );

    const openSessionDetail = (sessionId: string, game?: string) => {
        setDetailOpenedBySessionIdInput(false);
        setCurrentSessionId(sessionId);
        setCurrentRequestGame(game);
        setDetailVisible(true);
    };

    useEffect(() => {
        if (detailVisible && currentSessionId) {
            setDetailLoading(true);
            setDetailData(null);
            const gameParam = detailOpenedBySessionIdInput ? undefined : currentRequestGame;
            fetchData({
                url: '/ec/gamelog/match-details',
                method: 'GET',
                data: { sessionId: currentSessionId, ...(gameParam ? { game: gameParam } : {}) },
                setData: (rep: any) => setDetailData(rep?.data?.data ?? rep?.data ?? null),
            }).finally(() => setDetailLoading(false));
        }
    }, [detailVisible, currentSessionId, currentRequestGame, detailOpenedBySessionIdInput]);

    const handleViewDetail = (key: string, data: any[]) => {
        setDetailModalTitle(getFieldLabel(key));
        setDetailModalContent(data);
        setDetailModalVisible(true);
    };

    useEffect(() => {
        if (pitDetailVisible && currentPitId) {
            setPitDetailLoading(true);
            setPitDetailData(null);
            fetchData({
                url: '/ec/gamelog/pit/session-details',
                method: 'GET',
                data: { id: currentPitId },
                setData: (rep: any) => setPitDetailData(rep?.data?.data ?? rep?.data ?? null),
            }).finally(() => setPitDetailLoading(false));
        }
    }, [pitDetailVisible, currentPitId]);

    const matchColumns = [
        { title: 'Session ID', dataIndex: 'sessionId', key: 'sessionId', width: 260, render: (t: string, r: any) => <a onClick={() => openSessionDetail(r.sessionId, currentRequestGame)}>{t}</a> },
        { title: gLang('superPanel.gamelog.gameType'), dataIndex: 'gameType', key: 'gameType', width: 100 },
        { title: gLang('superPanel.gamelog.gameMode'), dataIndex: 'gameMode', key: 'gameMode', width: 100 },
        { title: gLang('superPanel.gamelog.mapName'), dataIndex: 'mapName', key: 'mapName', width: 160 },
        { title: gLang('superPanel.gamelog.startTime'), dataIndex: 'startTime', key: 'startTime', width: 160, render: (t: any) => formatTime(t) },
        { title: gLang('superPanel.gamelog.endTime'), dataIndex: 'endTime', key: 'endTime', width: 160, render: (t: any) => formatTime(t) },
        { title: gLang('superPanel.gamelog.totalPlayers'), dataIndex: 'totalPlayers', key: 'totalPlayers', width: 90, align: 'right' as const },
        { title: gLang('superPanel.gamelog.roomOwner'), dataIndex: 'roomOwner', key: 'roomOwner', width: 110 },
        { title: gLang('superPanel.gamelog.winTeamName'), dataIndex: 'winTeamName', key: 'winTeamName', width: 100, render: (t: string) => t || '-' },
    ];

    const defaultTimeRange: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs().subtract(7, 'day'), dayjs()];

    return (
        <Spin spinning={gamesLoading}>
            <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                    <Segmented
                        value={mode}
                        options={[
                            { label: 'Match', value: 'match' },
                            { label: 'Player', value: 'player' },
                            { label: 'Pit', value: 'pit' },
                        ]}
                        onChange={(v) => {
                            setMode(v as 'match' | 'player' | 'pit');
                            if (v === 'match') fetchMatchData(1, matchPageSize);
                            else if (v === 'player') fetchPlayerData(1, playerPageSize);
                            else if (v === 'pit') {
                                if (!pitForm.getFieldValue('type')) pitForm.setFieldsValue({ type: 'pit' });
                                fetchPitData(1, pitPageSize);
                            }
                        }}
                    />
                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        onClick={() => setSessionIdInputVisible(true)}
                    >
                        {gLang('superPanel.gamelog.bySessionId')}
                    </Button>
                </Space>

                {mode === 'match' && (
                    <>
                        <Form
                            layout="inline"
                            form={matchForm}
                            initialValues={{ nick: ecid, timeRange: defaultTimeRange }}
                            onFinish={() => fetchMatchData(1, matchPageSize)}
                        >
                            <Form.Item name="game" label={gLang('superPanel.gamelog.gameCode')} rules={[{ required: true }]}>
                                <Select
                                    style={{ width: 160 }}
                                    placeholder={gLang('superPanel.gamelog.selectGame')}
                                    options={gameOptions}
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </Form.Item>
                            <Form.Item name="nick" label={gLang('superPanel.gamelog.playerNickEcid')}>
                                <Input placeholder="ECID" style={{ width: 180 }} />
                            </Form.Item>
                            <Form.Item name="timeRange" label={gLang('superPanel.gamelog.matchTime')}>
                                <RangePicker showTime style={{ width: 260 }} />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit">
                                    {gLang('superPanel.gamelog.query')}
                                </Button>
                            </Form.Item>
                        </Form>
                        <Table
                            size="small"
                            loading={matchLoading}
                            rowKey="_id"
                            columns={matchColumns}
                            dataSource={matchData}
                            scroll={{ x: 'max-content' }}
                            pagination={{
                                current: matchPage,
                                pageSize: matchPageSize,
                                total: matchTotal,
                                showSizeChanger: true,
                                onChange: (p, ps) => fetchMatchData(p, ps ?? matchPageSize),
                            }}
                        />
                    </>
                )}

                {mode === 'player' && (
                    <>
                        <Form
                            layout="inline"
                            form={playerForm}
                            initialValues={{ nick: ecid }}
                            style={{ marginBottom: 16 }}
                        >
                            <Form.Item name="game" label={gLang('superPanel.gamelog.gameCode')} rules={[{ required: true }]}>
                                <Select
                                    style={{ width: 160 }}
                                    placeholder={gLang('superPanel.gamelog.selectGame')}
                                    options={gameOptions}
                                    showSearch
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </Form.Item>
                            <Form.Item name="nick" label={gLang('superPanel.gamelog.playerEcid')}>
                                <Input placeholder={gLang('superPanel.gamelog.playerEcid')} style={{ width: 200 }} />
                            </Form.Item>
                            <Form.Item name="timeRange" label={gLang('superPanel.gamelog.timeRange')}>
                                <RangePicker showTime style={{ width: 260 }} />
                            </Form.Item>
                            <Form.Item>
                                <Space>
                                    <Button type="primary" onClick={() => fetchPlayerData(1, playerPageSize)}>{gLang('superPanel.gamelog.query')}</Button>
                                    <Button onClick={() => { playerForm.resetFields(); setPlayerData([]); setPlayerTotal(0); }}>{gLang('superPanel.gamelog.reset')}</Button>
                                </Space>
                            </Form.Item>
                        </Form>
                        <List
                            loading={playerLoading}
                            dataSource={playerData}
                            pagination={{
                                current: playerPage,
                                pageSize: playerPageSize,
                                total: playerTotal,
                                showSizeChanger: true,
                                onChange: (p, ps) => fetchPlayerData(p, ps ?? playerPageSize),
                            }}
                            renderItem={(item: any) => (
                                <List.Item
                                    actions={[
                                        <a key="s" onClick={() => item.sessionId && openSessionDetail(item.sessionId)}>{gLang('superPanel.gamelog.openSessionDetail')}</a>,
                                        <a key="j" onClick={() => { setCurrentPlayerJson(item); setPlayerDrawerVisible(true); }}>{gLang('superPanel.gamelog.viewJson')}</a>,
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={<span>Session: {item.sessionId || '-'} {item.ecId ? `（ECID: ${item.ecId}）` : ''}</span>}
                                        description={<span>{gLang('superPanel.gamelog.playerLabel')} {item.playerAlias || item.playerName || '-'}</span>}
                                    />
                                </List.Item>
                            )}
                        />
                    </>
                )}

                {mode === 'pit' && (
                    <>
                        <Form
                            layout="inline"
                            form={pitForm}
                            initialValues={{ type: 'pit' }}
                            style={{ marginBottom: 16 }}
                        >
                            <Form.Item name="type" label={gLang('superPanel.gamelog.serverType')}>
                                <Input style={{ width: 160 }} placeholder={gLang('superPanel.gamelog.serverTypePlaceholder')} />
                            </Form.Item>
                            <Form.Item name="nick" label={gLang('superPanel.gamelog.playerName')}>
                                <Input style={{ width: 200 }} placeholder="playerName" />
                            </Form.Item>
                            <Form.Item name="timeRange" label={gLang('superPanel.gamelog.timeRange')}>
                                <RangePicker showTime style={{ width: 260 }} />
                            </Form.Item>
                            <Form.Item>
                                <Space>
                                    <Button type="primary" onClick={() => fetchPitData(1, pitPageSize)}>{gLang('superPanel.gamelog.query')}</Button>
                                    <Button onClick={() => { pitForm.resetFields(); setPitData([]); setPitTotal(0); }}>{gLang('superPanel.gamelog.reset')}</Button>
                                </Space>
                            </Form.Item>
                        </Form>
                        <List
                            loading={pitLoading}
                            dataSource={pitData}
                            pagination={{
                                current: pitPage,
                                pageSize: pitPageSize,
                                total: pitTotal,
                                showSizeChanger: true,
                                onChange: (p, ps) => fetchPitData(p, ps ?? pitPageSize),
                            }}
                            renderItem={(item: any) => (
                                <List.Item
                                    actions={[
                                        <a key="d" onClick={() => { if (item._id) { setCurrentPitId(item._id); setPitDetailVisible(true); } }}>{gLang('superPanel.gamelog.openPitDetail')}</a>,
                                        <a key="j" onClick={() => { setCurrentPitJson(item); setPitDrawerVisible(true); }}>{gLang('superPanel.gamelog.viewJson')}</a>,
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={`ID: ${item._id || '-'}`}
                                        description={<span>{gLang('superPanel.gamelog.playerLabel')} {item.playerAlias || item.playerName || '-'}{gLang('superPanel.gamelog.serverLabel')} {item.serverName || '-'}</span>}
                                    />
                                </List.Item>
                            )}
                        />
                    </>
                )}
            </Space>

            <Modal
                title={gLang('superPanel.gamelog.bySessionId')}
                open={sessionIdInputVisible}
                onCancel={() => { setSessionIdInputVisible(false); setSessionIdInputValue(''); }}
                onOk={() => {
                    if (sessionIdInputValue.trim()) {
                        setDetailOpenedBySessionIdInput(true);
                        setCurrentSessionId(sessionIdInputValue.trim());
                        setCurrentRequestGame(undefined);
                        setDetailVisible(true);
                        setSessionIdInputVisible(false);
                        setSessionIdInputValue('');
                    }
                }}
                okText={gLang('superPanel.gamelog.query')}
                destroyOnClose
            >
                <Input
                    placeholder={gLang('superPanel.gamelog.inputSessionId')}
                    value={sessionIdInputValue}
                    onChange={(e) => setSessionIdInputValue(e.target.value)}
                    onPressEnter={() => {
                        if (sessionIdInputValue.trim()) {
                            setDetailOpenedBySessionIdInput(true);
                            setCurrentSessionId(sessionIdInputValue.trim());
                            setCurrentRequestGame(undefined);
                            setDetailVisible(true);
                            setSessionIdInputVisible(false);
                            setSessionIdInputValue('');
                        }
                    }}
                    allowClear
                />
            </Modal>

            <Modal
                title={gLang('superPanel.gamelog.sessionDetail')}
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={1000}
                destroyOnClose
            >
                {detailLoading ? (
                    <Typography.Text>{gLang('superPanel.gamelog.loading')}</Typography.Text>
                ) : detailData ? (
                    <div>
                        {/* 1. 原始信息 (match) - dynamic columns, field labels, formatTime/replayId */}
                        {detailData.match && (
                            <>
                                <Typography.Title level={5}>{gLang('superPanel.gamelog.rawInfo')}</Typography.Title>
                                <Table
                                    size="small"
                                    rowKey="key"
                                    dataSource={Object.entries(detailData.match)
                                        .filter(([k]) => k !== '_id')
                                        .map(([key, value]) => ({ key, value }))}
                                    columns={[
                                        { title: gLang('superPanel.gamelog.field'), dataIndex: 'key', width: 140, render: (k: string) => getFieldLabel(k) || k },
                                        {
                                            title: gLang('superPanel.gamelog.value'),
                                            dataIndex: 'value',
                                            render: (val: any, row: { key: string }) => {
                                                const key = row.key;
                                                if (val == null) return '-';
                                                if (key === 'startTime' || key === 'endTime') return formatTime(val);
                                                if (key === 'replayId' && (typeof val === 'number' || /^\d+$/.test(String(val)))) {
                                                    const rid = Number(val);
                                                    return (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            {val}
                                                            {onViewOverwatch && (
                                                                <PlayCircleOutlined
                                                                    style={{ color: '#1890ff', cursor: 'pointer', fontSize: 16 }}
                                                                    onClick={() => onViewOverwatch(rid)}
                                                                    title={gLang('superPanel.gamelog.viewReplay')}
                                                                />
                                                            )}
                                                        </span>
                                                    );
                                                }
                                                return typeof val === 'object' ? JSON.stringify(val) : String(val);
                                            },
                                        },
                                    ]}
                                    pagination={false}
                                />
                            </>
                        )}
                        {/* 2. 对局时间线（Log）- Collapse 折叠/展开，位置在 match 与 players 之间 */}
                        {(() => {
                            const sessionLog = Array.isArray(detailData.log) ? detailData.log : (detailData.data?.log ?? []);
                            return sessionLog.length > 0 ? (
                            <div style={{ marginTop: 24 }}>
                                <Collapse
                                    ghost
                                    items={[
                                        {
                                            key: 'log',
                                            label: (
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <Typography.Title level={5} style={{ margin: 0 }}>
                                                        {gLang('superPanel.gamelog.logTimeline')}
                                                    </Typography.Title>
                                                    <Tag color="default" style={{ marginLeft: 8 }}>
                                                        {gLang('superPanel.gamelog.logCount')} {sessionLog.length} {gLang('superPanel.gamelog.logCountSuffix')}
                                                    </Tag>
                                                </div>
                                            ),
                                            children: (
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    {sessionLog.map(
                                                        (entry: { time: string; events: any[] }, index: number) => (
                                                            <div key={index}>
                                                                {index > 0 && (
                                                                    <Divider style={{ margin: '12px 0' }} />
                                                                )}
                                                                <div style={{ marginBottom: 8 }}>
                                                                    <Typography.Text strong style={{ fontSize: 14 }}>
                                                                        {formatTime(entry.time)}
                                                                    </Typography.Text>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: 4,
                                                                        paddingLeft: 16,
                                                                    }}
                                                                >
                                                                    {(entry.events || []).map((evt: any, i: number) => (
                                                                        <div
                                                                            key={i}
                                                                            style={{
                                                                                display: 'flex',
                                                                                gap: 8,
                                                                                flexWrap: 'wrap',
                                                                            }}
                                                                        >
                                                                            {Object.entries(evt).map(
                                                                                ([type, payload]) => (
                                                                                    <span key={type}>
                                                                                        <Typography.Text strong>
                                                                                            {type}:
                                                                                        </Typography.Text>{' '}
                                                                                        {typeof payload === 'object'
                                                                                            ? JSON.stringify(payload)
                                                                                            : String(payload)}
                                                                                    </span>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            ),
                                        },
                                    ]}
                                />
                            </div>
                            ) : null;
                        })()}
                        {/* 3. 玩家数据 (players) - dynamic columns from first row, field labels, render by type */}
                        {detailData.players?.length > 0 && (
                            <>
                                <Typography.Title level={5} style={{ marginTop: 24 }}>{gLang('superPanel.gamelog.playerData')}</Typography.Title>
                                <Table
                                    size="small"
                                    rowKey="_id"
                                    dataSource={detailData.players}
                                    scroll={{ x: 'max-content' }}
                                    pagination={{ pageSize: 10 }}
                                    columns={Object.keys(detailData.players[0])
                                        .filter(k => k !== '_id' && k !== 'sessionId')
                                        .map(key => ({
                                            title: getFieldLabel(key),
                                            dataIndex: key,
                                            key,
                                            sorter: (a: any, b: any) => {
                                                const aVal = a[key];
                                                const bVal = b[key];
                                                if (aVal == null) return 1;
                                                if (bVal == null) return -1;
                                                if (Array.isArray(aVal) && Array.isArray(bVal)) return aVal.length - bVal.length;
                                                if (typeof aVal === 'number' && typeof bVal === 'number') return aVal - bVal;
                                                return String(aVal).localeCompare(String(bVal));
                                            },
                                            render: (text: any) => {
                                                if (text === null || text === undefined) return '-';
                                                if (Array.isArray(text) && text.length === 0) return '-';
                                                if (key === 'registerTime') return formatTime(text);
                                                if (key === 'rank') return typeof text === 'number' ? text + 1 : text;
                                                if (typeof text === 'boolean') return text ? gLang('superPanel.gamelog.yes') : gLang('superPanel.gamelog.no');
                                                if (key === 'partyMembers' || key === 'chatMessages') {
                                                    const arr = Array.isArray(text) ? text : [];
                                                    if (arr.length === 0) return '-';
                                                    return (
                                                        <Button type="link" size="small" onClick={() => handleViewDetail(key, arr)}>
                                                            {gLang('superPanel.gamelog.viewCount')}{arr.length}{gLang('superPanel.gamelog.viewCountSuffix')}
                                                        </Button>
                                                    );
                                                }
                                                return typeof text === 'object' ? JSON.stringify(text) : String(text);
                                            },
                                        }))}
                                />
                            </>
                        )}
                    </div>
                ) : (
                    <Typography.Text>{gLang('superPanel.gamelog.noData')}</Typography.Text>
                )}
            </Modal>

            {/* Detail modal (party members / chat messages etc), higher zIndex above Session detail */}
            <Modal
                title={detailModalTitle}
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={800}
                zIndex={10000}
            >
                <div style={{ maxHeight: 500, overflow: 'auto' }}>
                    {detailModalContent.map((item: any, index: number) => {
                        if (detailModalTitle === 'chatMessages' && typeof item === 'object') {
                            const time = item.time ? formatTime(item.time) : '';
                            const message = item.message ?? item.content ?? JSON.stringify(item);
                            return (
                                <div key={index} style={{ padding: '8px 0' }}>
                                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{time}</div>
                                    <div style={{ paddingLeft: 16, wordBreak: 'break-word' }}>{message}</div>
                                    {index < detailModalContent.length - 1 && <Divider style={{ margin: '8px 0' }} />}
                                </div>
                            );
                        }
                        return (
                            <div key={index}>
                                {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                                {index < detailModalContent.length - 1 && <Divider style={{ margin: '8px 0' }} />}
                            </div>
                        );
                    })}
                </div>
            </Modal>

            <Drawer title="Player JSON" placement="right" width={520} open={playerDrawerVisible} onClose={() => { setPlayerDrawerVisible(false); setCurrentPlayerJson(null); }}>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{currentPlayerJson ? JSON.stringify(currentPlayerJson, null, 2) : ''}</pre>
            </Drawer>
            <Drawer title="Pit Session JSON" placement="right" width={520} open={pitDrawerVisible} onClose={() => { setPitDrawerVisible(false); setCurrentPitJson(null); }}>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{currentPitJson ? JSON.stringify(currentPitJson, null, 2) : ''}</pre>
            </Drawer>

            <Modal
                title={gLang('superPanel.gamelog.pitSessionDetail')}
                open={pitDetailVisible}
                onCancel={() => { setPitDetailVisible(false); setCurrentPitId(undefined); }}
                footer={null}
                width={800}
                destroyOnClose
            >
                {pitDetailLoading ? (
                    <Typography.Text>{gLang('superPanel.gamelog.loading')}</Typography.Text>
                ) : pitDetailData ? (
                    <div>
                        {pitDetailData.session && (
                            <Table
                                size="small"
                                rowKey={(_, i) => String(i)}
                                dataSource={Object.entries(pitDetailData.session).map(([key, value]) => ({ key, value: value != null ? String(value) : '' }))}
                                columns={[{ title: gLang('superPanel.gamelog.field'), dataIndex: 'key', width: 160 }, { title: gLang('superPanel.gamelog.value'), dataIndex: 'value' }]}
                                pagination={false}
                            />
                        )}
                        {pitDetailData.log?.length > 0 && (
                            <>
                                <Typography.Title level={5} style={{ marginTop: 16 }}>Log</Typography.Title>
                                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(pitDetailData.log, null, 2)}</pre>
                            </>
                        )}
                    </div>
                ) : (
                    <Typography.Text>{gLang('superPanel.gamelog.noData')}</Typography.Text>
                )}
            </Modal>
        </Spin>
    );
};
