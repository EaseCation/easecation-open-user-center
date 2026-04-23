import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Modal, Table, Alert, Grid, Card, Typography, Space, Tag } from 'antd';
import { gLang } from '@common/language';
import { fetchData } from '@common/axiosConfig';
import {
    CalendarOutlined,
    ShoppingCartOutlined,
    UserOutlined,
    DollarOutlined,
} from '@ant-design/icons';
import { TimeConverter } from '@common/components/TimeConverter';

const { useBreakpoint } = Grid;
const { Text, Title } = Typography;

type PurchaseLog = {
    id: number;
    item_id: number;
    ecid: string;
    item_title: string;
    quantity: number;
    total_price: number;
    product_mode: string;
    spin_reward_label?: string | null;
    lottery_status?: 'pending' | 'drawn' | null;
    lottery_result?: 'won' | 'lost' | null;
    created_at: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    getTitleById: (id: number) => string;
    messageApi: any;
};

const START_DATE = new Date('2025-08-24T00:00:00.000Z');

export default function PurchaseLogsModal({ open, onClose, getTitleById, messageApi }: Props) {
    const screens = useBreakpoint();
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(screens.md ? 20 : 10);
    const [total, setTotal] = useState(0);
    const [list, setList] = useState<PurchaseLog[]>([]);

    const loadData = useCallback(
        (p = 1, ps = screens.md ? 20 : 10) => {
            setLoading(true);
            fetchData({
                url: `/item/purchase-logs/my?page=${p}&pageSize=${ps}`,
                method: 'GET',
                setData: values => {
                    const data = values?.data;
                    if (data) {
                        setTotal(data.total ?? 0);
                        setList((data.list ?? []) as PurchaseLog[]);
                        setPage(data.page ?? p);
                        setPageSize(data.pageSize ?? ps);
                    }
                },
                data: {},
            })
                .catch(() => {
                    messageApi.error(gLang('shop.purchaseLogs.fetchFailed'));
                })
                .finally(() => setLoading(false));
        },
        [messageApi, screens.md]
    );

    useEffect(() => {
        if (open) {
            loadData(1, pageSize);
        }
    }, [open, loadData, pageSize]);

    const filteredList = useMemo(() => {
        return list.filter(r => {
            const t = new Date(r.created_at);
            return t >= START_DATE;
        });
    }, [list]);

    const renderLotteryTags = (record: PurchaseLog) => {
        if (record.product_mode !== 'lottery') {
            if (record.product_mode === 'spin_lottery') {
                return (
                    <Space size={4} wrap>
                        <Tag color="purple">{gLang('shop.spinLotteryTag')}</Tag>
                        {record.spin_reward_label ? (
                            <Tag color="gold">{record.spin_reward_label}</Tag>
                        ) : null}
                    </Space>
                );
            }
            return null;
        }

        const tags = [];
        if (record.lottery_status === 'pending') {
            tags.push(
                <Tag key="pending" color="processing">
                    {gLang('shop.purchaseLogs.lotteryPending')}
                </Tag>
            );
        }
        if (record.lottery_status === 'drawn') {
            tags.push(
                <Tag key="drawn" color="default">
                    {gLang('shop.purchaseLogs.lotteryDrawn')}
                </Tag>
            );
        }
        if (record.lottery_result === 'won') {
            tags.push(
                <Tag key="won" color="success">
                    {gLang('shop.purchaseLogs.lotteryWon')}
                </Tag>
            );
        }
        if (record.lottery_result === 'lost') {
            tags.push(
                <Tag key="lost" color="error">
                    {gLang('shop.purchaseLogs.lotteryLost')}
                </Tag>
            );
        }
        return tags.length > 0 ? <Space size={4} wrap>{tags}</Space> : null;
    };

    // 移动端卡片渲染
    const renderMobileCard = (record: PurchaseLog) => (
        <Card
            key={record.id}
            size="small"
            style={{
                marginBottom: 12,
                borderRadius: 8,
                border: '1px solid var(--ant-color-border)',
                backgroundColor: 'var(--ant-color-bg-container)',
            }}
        >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {/* 商品名称 */}
                <div>
                    <Title level={5} style={{ margin: 0, color: 'var(--ant-color-text)' }}>
                        {record.item_title || getTitleById(record.item_id)}
                    </Title>
                    <div style={{ marginTop: 8 }}>{renderLotteryTags(record)}</div>
                </div>

                {/* 购买信息行 */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Space>
                        <ShoppingCartOutlined style={{ color: 'var(--ant-color-primary)' }} />
                        <Text type="secondary">
                            {gLang('shop.purchaseLogs.columns.quantity')}: {record.quantity}
                        </Text>
                    </Space>
                    <Space>
                        <DollarOutlined style={{ color: '#52c41a' }} />
                        <Text strong style={{ color: '#52c41a' }}>
                            {Number(record.total_price ?? 0)}
                        </Text>
                    </Space>
                </div>

                {/* 时间信息行 */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Space>
                        <CalendarOutlined style={{ color: 'var(--ant-color-text-secondary)' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <TimeConverter utcTime={record.created_at} />
                        </Text>
                    </Space>
                    <Space>
                        <UserOutlined style={{ color: 'var(--ant-color-text-secondary)' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.ecid}
                        </Text>
                    </Space>
                </div>
            </Space>
        </Card>
    );

    // 桌面端表格列配置
    const desktopColumns = [
        {
            title: gLang('shop.purchaseLogs.columns.time'),
            dataIndex: 'created_at',
            key: 'created_at',
            render: (v: string) => <TimeConverter utcTime={v} />,
            width: 160,
        },
        {
            title: gLang('shop.purchaseLogs.columns.ecid'),
            dataIndex: 'ecid',
            key: 'ecid',
            ellipsis: true,
            width: 180,
        },
        {
            title: gLang('shop.purchaseLogs.columns.product'),
            dataIndex: 'item_title',
            key: 'item_title',
            render: (v: string, r: PurchaseLog) => (
                <Space direction="vertical" size={4}>
                    <span>{v || getTitleById(r.item_id)}</span>
                    {renderLotteryTags(r)}
                </Space>
            ),
            ellipsis: true,
        },
        {
            title: gLang('shop.purchaseLogs.columns.status'),
            dataIndex: 'lottery_status',
            key: 'lottery_status',
            render: (_v: string, r: PurchaseLog) => renderLotteryTags(r),
            width: 180,
        },
        {
            title: gLang('shop.purchaseLogs.columns.quantity'),
            dataIndex: 'quantity',
            key: 'quantity',
            width: 80,
            align: 'center' as const,
        },
        {
            title: gLang('shop.purchaseLogs.columns.total'),
            dataIndex: 'total_price',
            key: 'total_price',
            render: (v: number) => (
                <Text strong style={{ color: '#52c41a' }}>
                    {Number(v ?? 0)}
                </Text>
            ),
            width: 100,
            align: 'right' as const,
        },
    ];

    return (
        <Modal
            title={
                <div style={{ textAlign: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}>
                        {gLang('shop.purchaseLogs.title')}
                    </Title>
                </div>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={screens.md ? 900 : '95%'}
            destroyOnHidden
            style={{ top: screens.md ? 50 : 20 }}
        >
            <Alert
                type="info"
                showIcon
                style={{
                    marginBottom: 16,
                    borderRadius: 8,
                    border: '1px solid var(--ant-color-info-border)',
                }}
                message={
                    <Text>{gLang('shop.purchaseLogs.onlyAfter', { date: '2025-08-24' })}</Text>
                }
            />

            {/* 移动端卡片视图 */}
            {!screens.md ? (
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {filteredList.map(renderMobileCard)}
                    {filteredList.length === 0 && !loading && (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: 'var(--ant-color-text-secondary)',
                            }}
                        >
                            {gLang('shop.purchaseLogs.noData')}
                        </div>
                    )}
                </div>
            ) : (
                /* 桌面端表格视图 */
                <Table
                    size="middle"
                    rowKey={r => String(r.id)}
                    loading={loading}
                    dataSource={filteredList}
                    columns={desktopColumns}
                    scroll={{ x: 800 }}
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            gLang('shop.recordRange', {
                                start: String(range[0]),
                                end: String(range[1]),
                                total: String(total),
                            }),
                        onChange: (p, ps) => loadData(p, ps),
                        pageSizeOptions: ['10', '20', '50'],
                        size: undefined,
                    }}
                    style={{
                        borderRadius: 8,
                        overflow: 'hidden',
                    }}
                />
            )}

            {/* 移动端分页 */}
            {!screens.md && (
                <div
                    style={{
                        marginTop: 16,
                        textAlign: 'center',
                        padding: '16px',
                        backgroundColor: 'var(--ant-color-fill-quaternary)',
                        borderRadius: 8,
                    }}
                >
                    <Space size="middle">
                        <Text type="secondary">
                            {gLang('shop.pageSummary', {
                                page,
                                pages: Math.ceil(total / pageSize),
                            })}
                        </Text>
                        <Text type="secondary">{gLang('shop.recordTotal', { total })}</Text>
                    </Space>
                    <div style={{ marginTop: 12 }}>
                        <Space>
                            <button
                                onClick={() => loadData(page - 1, pageSize)}
                                disabled={page <= 1}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid var(--ant-color-border)',
                                    borderRadius: 6,
                                    backgroundColor:
                                        page <= 1
                                            ? 'var(--ant-color-fill)'
                                            : 'var(--ant-color-bg-container)',
                                    color:
                                        page <= 1
                                            ? 'var(--ant-color-text-disabled)'
                                            : 'var(--ant-color-text)',
                                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {gLang('common.prevPage')}
                            </button>
                            <button
                                onClick={() => loadData(page + 1, pageSize)}
                                disabled={page >= Math.ceil(total / pageSize)}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid var(--ant-color-border)',
                                    borderRadius: 6,
                                    backgroundColor:
                                        page >= Math.ceil(total / pageSize)
                                            ? 'var(--ant-color-fill)'
                                            : 'var(--ant-color-bg-container)',
                                    color:
                                        page >= Math.ceil(total / pageSize)
                                            ? 'var(--ant-color-text-disabled)'
                                            : 'var(--ant-color-text)',
                                    cursor:
                                        page >= Math.ceil(total / pageSize)
                                            ? 'not-allowed'
                                            : 'pointer',
                                }}
                            >
                                {gLang('common.nextPage')}
                            </button>
                        </Space>
                    </div>
                </div>
            )}
        </Modal>
    );
}
