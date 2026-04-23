import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Modal, Space, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import axiosInstance from '@common/axiosConfig';
import useIsPC from '@common/hooks/useIsPC';
import { TimeConverter } from '@common/components/TimeConverter';
import { gLang } from '@common/language';
import { Ticket, TicketStatus } from '@ecuc/shared/types/ticket.types';

const { Text } = Typography;

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

type Props = {
    open: boolean;
    onCancel: () => void;
};

type MediaEventActivityKey = 'ECNET_LIKE' | 'ECXHS_POST' | 'CLOUD_MATERIAL' | 'OTHER';

type MediaEventTableItem = Ticket & {
    activityKey: MediaEventActivityKey;
    activityLabel: string;
};

type ActivityConfigItem = {
    key: MediaEventActivityKey;
    matchers: string[];
    labelKey: string;
};

const getActivityConfig = (): ActivityConfigItem[] => [
    {
        key: 'CLOUD_MATERIAL',
        matchers: [gLang('ticketList.quickInsertListTitle.CLOUD_MATERIAL')],
        labelKey: 'ticketList.quickInsertListTitle.CLOUD_MATERIAL',
    },
    {
        key: 'ECXHS_POST',
        matchers: [gLang('ticketList.quickInsertListTitle.ECXHS_POST')],
        labelKey: 'ticketList.quickInsertListTitle.ECXHS_POST',
    },
    {
        key: 'ECNET_LIKE',
        matchers: [gLang('ticketList.quickInsertListTitle.ECNET_LIKE')],
        labelKey: 'ticketList.quickInsertListTitle.ECNET_LIKE',
    },
    {
        key: 'OTHER',
        matchers: [gLang('ticketList.quickInsertListTitle.OTHER')],
        labelKey: 'ticketList.quickInsertListTitle.OTHER',
    },
];

const resolveActivityKey = (
    title: string,
    activityConfig: ActivityConfigItem[]
): MediaEventActivityKey => {
    for (const item of activityConfig) {
        if (item.matchers.some(matcher => title.includes(matcher))) {
            return item.key;
        }
    }
    return 'OTHER';
};

const MediaEventStatsModal: React.FC<Props> = ({ open, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [tickets, setTickets] = useState<MediaEventTableItem[]>([]);
    const isPC = useIsPC();
    const activityConfig = useMemo(() => getActivityConfig(), []);

    useEffect(() => {
        if (!open) return;

        const loadTickets = async () => {
            setLoading(true);
            try {
                const all: MediaEventTableItem[] = [];
                let page = 1;
                let hasMore = false;

                do {
                    const response = await axiosInstance.get('/ticket/query/media', {
                        params: {
                            page,
                            pageSize: PAGE_SIZE,
                            types: ['ME'],
                            status: [TicketStatus.WaitingAssign],
                            sortBy: 'tidDesc',
                        },
                    });

                    if (response.data?.EPF_code && response.data.EPF_code !== 200) {
                        break;
                    }

                    const pageResult = Array.isArray(response.data?.result)
                        ? (response.data.result as Ticket[])
                        : [];

                    const pageItems = pageResult.map(ticket => {
                        const activityKey = resolveActivityKey(
                            String(ticket.title ?? ''),
                            activityConfig
                        );
                        const activityItem = activityConfig.find(item => item.key === activityKey);
                        return {
                            ...ticket,
                            activityKey,
                            activityLabel: activityItem
                                ? gLang(activityItem.labelKey)
                                : gLang('ticketList.quickInsertListTitle.OTHER'),
                        } as MediaEventTableItem;
                    });

                    all.push(...pageItems);
                    hasMore = Boolean(response.data?.hasMore);
                    page += 1;
                } while (hasMore && page <= MAX_PAGES);

                setTickets(all);
            } catch {
                setTickets([]);
            } finally {
                setLoading(false);
            }
        };

        void loadTickets();
    }, [open, activityConfig]);

    const activityFilters = useMemo(
        () =>
            activityConfig.map(item => ({
                text: gLang(item.labelKey),
                value: item.key,
            })),
        [activityConfig]
    );

    const dateFilters = useMemo(
        () => [
            { text: gLang('admin.seniorUnassignedToday'), value: 'today' },
            { text: gLang('admin.seniorUnassigned7d'), value: '7d' },
            { text: gLang('admin.seniorUnassigned30d'), value: '30d' },
        ],
        []
    );

    const activitySummary = useMemo(() => {
        return activityConfig
            .map(item => {
                const label = gLang(item.labelKey);
                const count = tickets.filter(ticket => ticket.activityKey === item.key).length;
                return { key: item.key, label, count };
            })
            .filter(item => item.count > 0);
    }, [tickets, activityConfig]);

    return (
        <Modal
            title={gLang('admin.mediaEventStatsModal.title')}
            open={open}
            onCancel={onCancel}
            footer={null}
            width={isPC ? 900 : '95%'}
            centered
            style={{ maxWidth: 'calc(100vw - 16px)' }}
        >
            {loading && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                    <Text type="secondary">{gLang('loading')}</Text>
                </div>
            )}

            {!loading && tickets.length === 0 && (
                <Empty description={gLang('admin.mediaEventStatsModal.empty')} />
            )}

            {!loading && tickets.length > 0 && (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Space wrap>
                        {activitySummary.map(item => (
                            <Tag key={item.key} color="blue">
                                {item.label}: {item.count}
                            </Tag>
                        ))}
                    </Space>
                    <Table<MediaEventTableItem>
                        rowKey="tid"
                        dataSource={tickets}
                        pagination={{
                            pageSize: 12,
                            showSizeChanger: false,
                            showTotal: () =>
                                gLang('admin.mediaEventStatsModal.total', {
                                    total: tickets.length,
                                }),
                        }}
                        scroll={{ x: 'max-content' }}
                        size={isPC ? 'middle' : 'small'}
                        columns={[
                            {
                                title: gLang('admin.mediaEventStatsModal.tid'),
                                dataIndex: 'tid',
                                key: 'tid',
                                width: 120,
                                fixed: isPC ? 'left' : undefined,
                                render: (tid: number) => (
                                    <Button
                                        type="link"
                                        size="small"
                                        onClick={() => {
                                            window.open(
                                                `/media/ticket/operate/backToMy/${tid}`,
                                                '_blank'
                                            );
                                        }}
                                    >
                                        {tid}
                                    </Button>
                                ),
                            },
                            {
                                title: gLang('admin.mediaEventStatsModal.activity'),
                                dataIndex: 'activityLabel',
                                key: 'activityLabel',
                                width: isPC ? 220 : 140,
                                filters: activityFilters,
                                onFilter: (value, record) => record.activityKey === value,
                                sorter: (a, b) => a.activityLabel.localeCompare(b.activityLabel),
                            },
                            ...(isPC
                                ? [
                                      {
                                          title: gLang('admin.mediaEventStatsModal.ticketTitle'),
                                          dataIndex: 'title',
                                          key: 'title',
                                      },
                                  ]
                                : []),
                            {
                                title: gLang('admin.mediaEventStatsModal.createdAt'),
                                dataIndex: 'create_time',
                                key: 'create_time',
                                width: isPC ? 220 : 150,
                                filters: dateFilters,
                                onFilter: (value, record) => {
                                    if (!record.create_time) return false;
                                    const createdAt = dayjs(record.create_time);
                                    const now = dayjs();
                                    if (value === 'today') {
                                        return createdAt.isSame(now, 'day');
                                    }
                                    if (value === '7d') {
                                        return createdAt.isAfter(now.subtract(7, 'day'));
                                    }
                                    if (value === '30d') {
                                        return createdAt.isAfter(now.subtract(30, 'day'));
                                    }
                                    return true;
                                },
                                sorter: (a, b) =>
                                    dayjs(a.create_time).valueOf() - dayjs(b.create_time).valueOf(),
                                render: (create_time: string) => (
                                    <TimeConverter utcTime={create_time} />
                                ),
                            },
                        ]}
                    />
                </Space>
            )}
        </Modal>
    );
};

export default MediaEventStatsModal;
