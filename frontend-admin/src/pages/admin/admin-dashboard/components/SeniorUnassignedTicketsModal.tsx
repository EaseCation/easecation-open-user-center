import React, { useEffect, useMemo, useState } from 'react';
import { Empty, Modal, Table, Typography, Button } from 'antd';
import axiosInstance from '@common/axiosConfig';
import { gLang } from '@common/language';
import { Ticket, TicketPriority, TicketStatus } from '@ecuc/shared/types/ticket.types';
import { TICKET_TYPE_NAME_MAP } from '@ecuc/shared/constants/ticket.constants';
import dayjs from 'dayjs';
import useIsPC from '@common/hooks/useIsPC';
import { TimeConverter } from '@common/components/TimeConverter';

const { Text } = Typography;

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

type Props = {
    open: boolean;
    onCancel: () => void;
};

const SeniorUnassignedTicketsModal: React.FC<Props> = ({ open, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const isPC = useIsPC();

    useEffect(() => {
        if (!open) return;

        const loadTickets = async () => {
            setLoading(true);
            try {
                const all: Ticket[] = [];
                let page = 1;
                let hasMore = false;

                do {
                    const response = await axiosInstance.get('/ticket/query', {
                        params: {
                            page,
                            pageSize: PAGE_SIZE,
                            status: [TicketStatus.WaitingAssign],
                            priority: TicketPriority.Upgrade,
                            sortBy: 'tidDesc',
                            notType: ['MB', 'MA', 'AB', 'MM', 'MU', 'ME', 'WB']
                        },
                    });

                    if (response.data?.EPF_code && response.data.EPF_code !== 200) {
                        break;
                    }

                    const pageResult = Array.isArray(response.data?.result)
                        ? (response.data.result as Ticket[])
                        : [];
                    all.push(...pageResult);
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
    }, [open]);

    const typeFilters = useMemo(() => {
        const typeSet = new Set<string>();
        tickets.forEach(ticket => {
            if (ticket.type) {
                typeSet.add(ticket.type);
            }
        });
        return Array.from(typeSet).map(type => ({
            text: TICKET_TYPE_NAME_MAP[type] || type,
            value: type,
        }));
    }, [tickets]);

    const dateFilters = useMemo(
        () => [
            { text: gLang('admin.seniorUnassignedToday'), value: 'today' },
            { text: gLang('admin.seniorUnassigned7d'), value: '7d' },
            { text: gLang('admin.seniorUnassigned30d'), value: '30d' },
        ],
        []
    );

    return (
        <Modal
            title={gLang('adminMain.seniorUnassignedModal.title')}
            open={open}
            onCancel={onCancel}
            footer={null}
            width={isPC ? 860 : '95%'}
            centered
            style={{ maxWidth: 'calc(100vw - 16px)' }}
        >
            {loading && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                    <Text type="secondary">{gLang('loading')}</Text>
                </div>
            )}

            {!loading && tickets.length === 0 && (
                <Empty description={gLang('adminMain.seniorUnassignedModal.empty')} />
            )}

            {!loading && tickets.length > 0 && (
                <Table<Ticket>
                    rowKey="tid"
                    dataSource={tickets}
                    pagination={{
                        pageSize: 12,
                        showSizeChanger: false,
                        showTotal: () => gLang('adminMain.seniorUnassignedModal.total', { total: tickets.length })
                    }}
                    scroll={{ x: 'max-content' }}
                    size={isPC ? 'middle' : 'small'}
                    columns={[
                        {
                            title: gLang('adminMain.seniorUnassignedModal.tid'),
                            dataIndex: 'tid',
                            key: 'tid',
                            width: 120,
                            fixed: isPC ? 'left' : undefined,
                            render: (tid: number) => (
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => {
                                        // 在新标签页打开工单
                                        window.open(`/ticket/operate/backToMy/${tid}`, '_blank');
                                    }}
                                >
                                    {tid}
                                </Button>
                            ),
                        },
                        {
                            title: gLang('ticketQuery.types'),
                            dataIndex: 'type',
                            key: 'type',
                            width: isPC ? 160 : 100,
                            filters: typeFilters,
                            onFilter: (value, record) => record.type === value,
                            sorter: (a, b) =>
                                String(a.type || '').localeCompare(String(b.type || '')),
                            render: (type: string) => TICKET_TYPE_NAME_MAP[type] || type,
                        },
                        ...(isPC
                            ? [
                                  {
                                      title: gLang('adminMain.seniorUnassignedModal.ticketTitle'),
                                      dataIndex: 'title',
                                      key: 'title',
                                  },
                              ]
                            : []),
                        {
                            title: gLang('adminMain.seniorUnassignedModal.createdAt'),
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
                            render: (create_time: string) => <TimeConverter utcTime={create_time} />,
                        },
                    ]}
                />
            )}
        </Modal>
    );
};

export default SeniorUnassignedTicketsModal;
