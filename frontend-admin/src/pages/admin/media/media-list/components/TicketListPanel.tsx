// 工单列表面板组件

import React, { useState } from 'react';
import { Collapse, Typography, Spin, Modal } from 'antd';
import { gLang } from '@common/language';
import TicketListComponent from '../../../../../components/TicketListComponent';
import TicketDetailComponent from '../../../../../components/TicketDetailComponent';
import { Ticket } from '@ecuc/shared/types/ticket.types';
import { fetchData } from '@common/axiosConfig';

const { Title } = Typography;

interface TicketListPanelProps {
    title?: string;
    tickets: Ticket[];
    loading?: boolean;
    defaultCollapsed?: boolean;
    onTicketClick?: (tid: number) => void;
}

const TicketListPanel: React.FC<TicketListPanelProps> = ({
    title = gLang('superPanel.title.ticketNormal'),
    tickets,
    loading = false,
    defaultCollapsed = false,
    onTicketClick,
}) => {
    const [previewTid, setPreviewTid] = useState<number | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | undefined>(undefined);
    const [detailLoading, setDetailLoading] = useState(false);

    const handleTicketClick = async (tid: number) => {
        // 如果有外部传入的点击处理函数，只调用它，不自己打开模态框
        if (onTicketClick) {
            onTicketClick(tid);
        } else {
            // 没有外部点击处理函数时，使用内部模态框
            setPreviewTid(tid);
            setDetailLoading(true);
            // 清除之前的数据，避免显示错误的工单信息
            setSelectedTicket(undefined);
            // 获取工单详情
            await fetchData({
                url: '/ticket/detail',
                method: 'GET',
                data: { tid },
                setData: setSelectedTicket,
                setSpin: setDetailLoading,
            });
        }
    };

    const handleModalClose = () => {
        setPreviewTid(null);
        setSelectedTicket(undefined);
    };

    // 如果没有工单数据，不渲染组件
    if (!Array.isArray(tickets) || tickets.length === 0) {
        return null;
    }

    return (
        <>
            <Collapse
                defaultActiveKey={defaultCollapsed ? [] : ['1']}
                items={[
                    {
                        key: '1',
                        label: (
                            <Title level={5} style={{ margin: 0 }}>
                                {title} ({tickets.length})
                            </Title>
                        ),
                        children: (
                            <Spin spinning={loading}>
                                <TicketListComponent
                                    tickets={tickets}
                                    loading={loading}
                                    onTicketClick={handleTicketClick}
                                    style={{}}
                                />
                            </Spin>
                        ),
                    },
                ]}
            />

            {/* 工单详情弹窗 */}
            <Modal
                title={gLang('superPanel.currentViewingTid') + previewTid}
                open={previewTid !== null}
                footer={null}
                onCancel={handleModalClose}
                width={800}
            >
                <Spin spinning={detailLoading}>
                    <TicketDetailComponent ticket={selectedTicket} isAdmin={true} />
                </Spin>
            </Modal>
        </>
    );
};

export default TicketListPanel;
