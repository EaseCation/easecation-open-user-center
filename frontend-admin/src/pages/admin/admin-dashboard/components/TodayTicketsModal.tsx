import React, { useEffect, useState } from 'react';
import {
    Modal,
    Typography,
    Space,
    Table,
    Row,
    Col,
    Empty,
    Button,
    Card,
    Statistic,
    Tooltip,
    theme,
} from 'antd';
import { gLang } from '@common/language';
import { fetchData } from '@common/axiosConfig';
import {
    TICKET_TYPE_NAME_MAP,
    TICKET_STATUS_NAME_MAP,
} from '@ecuc/shared/constants/ticket.constants';

const { Text } = Typography;

interface TodayStats {
    total: number;
    byType: Record<string, number>;
    hourly: number[]; // length 24
    auto_closed?: number;
    in_game_submitted?: number;
}

export default function TodayTicketsModal({
    open,
    onCancel,
}: {
    open: boolean;
    onCancel: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<TodayStats | null>(null);
    const { token } = theme.useToken();

    // selected hour modal
    const [hourModalOpen, setHourModalOpen] = useState(false);
    const [selectedHour, setSelectedHour] = useState<number | null>(null);
    const [selectedHourData, setSelectedHourData] = useState<any[] | null>(null);
    const [hourLoading, setHourLoading] = useState(false);
    const [showHourDetails, setShowHourDetails] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetchData({
            url: '/ticket/today-stats',
            method: 'GET',
            data: {},
            setData: (resp: any) => {
                // epfResponse spreads fields so total/byType exist at top
                setData({
                    total: resp.total,
                    byType: resp.byType || {},
                    hourly: resp.hourly || [],
                    auto_closed: resp.auto_closed || 0,
                    in_game_submitted: resp.in_game_submitted || 0,
                });
            },
        }).finally(() => setLoading(false));
    }, [open]);

    const typeData = React.useMemo(() => {
        if (!data) return [] as any[];
        return Object.keys(data.byType)
            .sort()
            .map(k => ({ type: k, typeName: TICKET_TYPE_NAME_MAP[k] || k, count: data.byType[k] }));
    }, [data]);

    const hourlyMax = data?.hourly ? Math.max(...data.hourly, 1) : 1;

    const fetchHour = async (hour: number) => {
        setHourLoading(true);
        setSelectedHour(hour);
        setSelectedHourData(null);
        setShowHourDetails(false);
        setHourModalOpen(true);
        try {
            await fetchData({
                url: '/ticket/today-stats/hour',
                method: 'GET',
                data: { hour },
                setData: (resp: any) => {
                    // resp.result is array
                    setSelectedHourData(resp.result || []);
                },
            });
        } finally {
            setHourLoading(false);
        }
    };

    return (
        <>
            <Modal
                title={gLang('adminMain.todayStatsTitle')}
                open={open}
                onCancel={onCancel}
                footer={null}
                width={900}
                centered
            >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {loading && (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <Text type="secondary">{gLang('loading')}</Text>
                        </div>
                    )}

                    {!loading && !data && <Empty description={gLang('loading')} />}

                    {!loading && data && (
                        <>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={12} md={8}>
                                    <Card
                                        bordered={false}
                                        bodyStyle={{
                                            padding: 12,
                                            background: token.colorFillAlter,
                                            borderRadius: token.borderRadiusLG,
                                        }}
                                    >
                                        <Statistic
                                            title={gLang('adminMain.todayStatsTotal', {
                                                count: '',
                                            }).replace('：', '')}
                                            value={data.total}
                                            valueStyle={{ color: token.colorPrimary, fontSize: 20 }}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Card
                                        bordered={false}
                                        bodyStyle={{
                                            padding: 12,
                                            background: token.colorFillAlter,
                                            borderRadius: token.borderRadiusLG,
                                        }}
                                    >
                                        <Statistic
                                            title={gLang('adminMain.todayStatsAutoClosed', {
                                                count: '',
                                            }).replace('：', '')}
                                            value={data.auto_closed ?? 0}
                                            valueStyle={{ fontSize: 20 }}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Card
                                        bordered={false}
                                        bodyStyle={{
                                            padding: 12,
                                            background: token.colorFillAlter,
                                            borderRadius: token.borderRadiusLG,
                                        }}
                                    >
                                        <Statistic
                                            title={gLang('adminMain.todayStatsInGameSubmitted', {
                                                count: '',
                                            }).replace('：', '')}
                                            value={data.in_game_submitted ?? 0}
                                            valueStyle={{ fontSize: 20 }}
                                        />
                                    </Card>
                                </Col>
                            </Row>

                            <Row gutter={24}>
                                <Col xs={24} sm={10}>
                                    <Card
                                        title={gLang('adminMain.todayStatsTypesTitle')}
                                        size="small"
                                        bordered={false}
                                        bodyStyle={{ padding: 0 }}
                                    >
                                        <Table
                                            dataSource={typeData}
                                            size="small"
                                            pagination={false}
                                            rowKey={r => r.type}
                                            columns={[
                                                {
                                                    title: gLang('admin.todayTicketsType'),
                                                    dataIndex: 'typeName',
                                                    key: 'type',
                                                },
                                                {
                                                    title: gLang('admin.todayTicketsCount'),
                                                    dataIndex: 'count',
                                                    key: 'count',
                                                    align: 'right',
                                                },
                                            ]}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} sm={14}>
                                    <Card
                                        title={gLang('adminMain.todayStatsTimeTitle')}
                                        size="small"
                                        bordered={false}
                                    >
                                        <div
                                            style={{
                                                height: 160,
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'flex-end',
                                                    gap: 4,
                                                }}
                                            >
                                                {data.hourly.map((val, idx) => (
                                                    <Tooltip
                                                        title={gLang('admin.todayTicketsHourSlot', {
                                                            idx: String(idx),
                                                            val: String(val),
                                                        })}
                                                        key={idx}
                                                    >
                                                        <div
                                                            role="button"
                                                            onClick={() => fetchHour(idx)}
                                                            style={{
                                                                flex: 1,
                                                                height: `${val === 0 ? 2 : (val / hourlyMax) * 100}%`,
                                                                background:
                                                                    val > 0
                                                                        ? token.colorPrimary
                                                                        : token.colorFillSecondary,
                                                                borderRadius: '4px 4px 0 0',
                                                                transition: 'all 0.3s',
                                                                cursor: 'pointer',
                                                                minWidth: 4,
                                                            }}
                                                        />
                                                    </Tooltip>
                                                ))}
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    marginTop: 8,
                                                    fontSize: 10,
                                                    color: token.colorTextSecondary,
                                                }}
                                            >
                                                <span>00:00</span>
                                                <span>06:00</span>
                                                <span>12:00</span>
                                                <span>18:00</span>
                                                <span>23:00</span>
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}
                </Space>
            </Modal>

            {/* Hour detail modal */}
            <Modal
                title={
                    selectedHour !== null ? `${selectedHour}:00 — ${selectedHour}:59` : undefined
                }
                open={hourModalOpen}
                onCancel={() => setHourModalOpen(false)}
                footer={null}
                width={700}
                centered
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                        <Text strong>{gLang('admin.todayTicketsTotal')}</Text>
                        <Text>
                            {selectedHourData
                                ? selectedHourData.length
                                : hourLoading
                                  ? gLang('admin.todayTicketsLoading')
                                  : '—'}
                        </Text>
                        <Button
                            style={{ marginLeft: 12 }}
                            size="small"
                            onClick={() => setShowHourDetails(!showHourDetails)}
                        >
                            {showHourDetails
                                ? gLang('adminMain.todayStatsCollapseDetails')
                                : gLang('adminMain.todayStatsViewDetails')}
                        </Button>
                    </div>

                    {showHourDetails && selectedHourData && (
                        <Table
                            dataSource={selectedHourData}
                            size="small"
                            rowKey={r => r.tid}
                            pagination={{ pageSize: 8 }}
                            columns={[
                                { title: 'TID', dataIndex: 'tid', key: 'tid' },
                                {
                                    title: gLang('admin.todayTicketsType'),
                                    dataIndex: 'type',
                                    key: 'type',
                                    render: (t: string) => TICKET_TYPE_NAME_MAP[t] || t,
                                },
                                {
                                    title: gLang('admin.todayTicketsCreateTime'),
                                    dataIndex: 'create_time',
                                    key: 'create_time',
                                },
                                {
                                    title: gLang('admin.todayTicketsStatus'),
                                    dataIndex: 'status',
                                    key: 'status',
                                    render: (s: string) =>
                                        TICKET_STATUS_NAME_MAP[
                                            s as keyof typeof TICKET_STATUS_NAME_MAP
                                        ] || s,
                                },
                            ]}
                        />
                    )}
                </Space>
            </Modal>
        </>
    );
}
