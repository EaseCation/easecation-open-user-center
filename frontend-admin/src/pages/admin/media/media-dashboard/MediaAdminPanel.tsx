// 媒体管理中心
import { Button, Col, Row, Space, theme, Typography } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { gLang } from '@common/language';
import {
    CarryOutOutlined,
    ContactsOutlined,
    ContainerOutlined,
    GiftOutlined,
    IssuesCloseOutlined,
    LikeOutlined,
    NotificationOutlined,
    UnorderedListOutlined,
    SearchOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import React, { useEffect, useState } from 'react';
import AdminStatLinkItem from '../../components/AdminStatLinkItem';

import { MediaTicketCountPublic } from '@ecuc/shared/types/ticket.types';
import { fetchData } from '@common/axiosConfig';
import useIsPC from '@common/hooks/useIsPC';
import { useTicketCountUpdate } from '@common/hooks/useTicketStatusUpdate';
import AdminToolCard from '../../components/AdminToolCard';
import MediaEventStatsModal from './components/MediaEventStatsModal';

type UserInfoLite = { permission?: string[] };

const MediaAdminPanel = () => {
    const { pathname } = useLocation();
    const { Title, Paragraph } = Typography;

    const isPC = useIsPC();
    const { useToken } = theme;
    const { token } = useToken();

    const [ticketCount, setTicketCount] = useState<MediaTicketCountPublic>();
    const [userInfo, setUserInfo] = useState<UserInfoLite | null>(null);
    const [showMediaEventStatsModal, setShowMediaEventStatsModal] = useState(false);

    // 使用实时更新hook
    const countUpdateTrigger = useTicketCountUpdate();

    useEffect(() => {
        fetchData({
            url: '/ticket/media/count',
            method: 'GET',
            data: { type: 'admin' },
            setData: value => {
                setTicketCount(value);
            },
        }).then();
        // 获取用户信息
        fetchData({
            url: '/user/info',
            method: 'GET',
            data: {},
            setData: value => {
                setUserInfo(value);
            },
        });
    }, [pathname, countUpdateTrigger]);

    const containerStyle = {
        width: '100%',
        ['--admin-primary-color']: token.colorPrimary,
    } as React.CSSProperties;

    return (
        <Space direction="vertical" size="large" style={containerStyle}>
            <Typography>
                <Title>{gLang('mediaAdmin.welcomeTitle')}</Title>
                <Paragraph>{gLang('mediaAdmin.tagline')}</Paragraph>
            </Typography>

            <Space direction="vertical" style={{ width: '100%' }}>
                <Title level={4} style={{ marginBottom: 4 }}>
                    {gLang('mediaAdmin.ticketQueue.pendingChannel')}
                </Title>

                {isPC && (
                    <Space
                        direction="horizontal"
                        size="large"
                        style={{ width: '100%', display: 'flex' }}
                        styles={{ item: { display: 'flex', flex: 1 } }}
                    >
                        <AdminStatLinkItem
                            to="/media/ticket/assign/auditMedia"
                            count={ticketCount?.count_waiting_audit}
                            isPC={isPC}
                            icon={<CarryOutOutlined />}
                            title={gLang('mediaAdmin.ticket.mediaAudit')}
                            loading={!ticketCount}
                        />
                        <AdminStatLinkItem
                            to="/media/ticket/assign/monthlyMedia"
                            count={ticketCount?.count_waiting_monthly}
                            isPC={isPC}
                            icon={<IssuesCloseOutlined />}
                            title={gLang('mediaAdmin.ticket.monthlyMediaReview')}
                            loading={!ticketCount}
                        />
                        <AdminStatLinkItem
                            to="/media/ticket/assign/updateMedia"
                            count={ticketCount?.count_waiting_update}
                            isPC={isPC}
                            icon={<ContactsOutlined />}
                            title={gLang('mediaAdmin.ticket.changePermissionNumber')}
                            loading={!ticketCount}
                        />
                        <AdminStatLinkItem
                            to="/media/ticket/assign/mediaEvent"
                            count={ticketCount?.count_waiting_event}
                            isPC={isPC}
                            icon={<LikeOutlined />}
                            title={gLang('mediaAdmin.ticket.mediaEvent')}
                            onClick={() => setShowMediaEventStatsModal(true)}
                            buttonText={gLang('admin.mediaEventStatsModal.viewButton')}
                            loading={!ticketCount}
                        />
                    </Space>
                )}

                {!isPC && (
                    <Row gutter={[12, 12]}>
                        <Col span={12}>
                            <AdminStatLinkItem
                                to="/media/ticket/assign/auditMedia"
                                count={ticketCount?.count_waiting_audit}
                                isPC={false}
                                icon={<CarryOutOutlined />}
                                title={gLang('mediaAdmin.ticket.mediaAudit')}
                            />
                        </Col>
                        <Col span={12}>
                            <AdminStatLinkItem
                                to="/media/ticket/assign/monthlyMedia"
                                count={ticketCount?.count_waiting_monthly}
                                isPC={false}
                                icon={<IssuesCloseOutlined />}
                                title={gLang('mediaAdmin.ticket.monthlyMediaReview')}
                            />
                        </Col>
                        <Col span={12}>
                            <AdminStatLinkItem
                                to="/media/ticket/assign/updateMedia"
                                count={ticketCount?.count_waiting_update}
                                isPC={false}
                                icon={<ContactsOutlined />}
                                title={gLang('mediaAdmin.ticket.changePermissionNumber')}
                            />
                        </Col>
                        <Col span={12}>
                            <AdminStatLinkItem
                                to="/media/ticket/assign/mediaEvent"
                                count={ticketCount?.count_waiting_event}
                                isPC={false}
                                icon={<LikeOutlined />}
                                title={gLang('mediaAdmin.ticket.mediaEvent')}
                                onClick={() => setShowMediaEventStatsModal(true)}
                                buttonText={gLang('admin.mediaEventStatsModal.viewButton')}
                            />
                        </Col>
                    </Row>
                )}
            </Space>

            <Space direction="vertical" style={{ width: '100%' }}>
                <Title level={4} style={{ marginBottom: 4 }}>
                    {gLang('mediaAdmin.ticketQueue.ticketQueue')}
                </Title>

                {isPC && (
                    <Space
                        direction="horizontal"
                        size="large"
                        style={{ width: '100%', display: 'flex' }}
                        styles={{ item: { display: 'flex', flex: 1 } }}
                    >
                        <AdminStatLinkItem
                            to="/media/ticket/assign/upgradeMedia"
                            count={ticketCount?.count_waiting_my?.upgrade}
                            isPC={isPC}
                            icon={<IssuesCloseOutlined />}
                            title={gLang('mediaAdmin.ticket.upgradeQueue')}
                            loading={!ticketCount}
                        />
                        <AdminStatLinkItem
                            to="/media/ticket/assign/myMedia"
                            count={ticketCount?.count_waiting_my?.my}
                            isPC={isPC}
                            icon={<ContainerOutlined />}
                            title={gLang('mediaAdmin.ticket.myProcessingQueue')}
                            loading={!ticketCount}
                        />
                    </Space>
                )}

                {!isPC && (
                    <Row gutter={[12, 12]}>
                        <Col span={12}>
                            <AdminStatLinkItem
                                to="/media/ticket/assign/upgradeMedia"
                                count={ticketCount?.count_waiting_my?.upgrade}
                                isPC={false}
                                icon={<IssuesCloseOutlined />}
                                title={gLang('mediaAdmin.ticket.upgradeQueue')}
                            />
                        </Col>
                        <Col span={12}>
                            <AdminStatLinkItem
                                to="/media/ticket/assign/myMedia"
                                count={ticketCount?.count_waiting_my?.my}
                                isPC={false}
                                icon={<ContainerOutlined />}
                                title={gLang('mediaAdmin.ticket.myProcessingQueue')}
                            />
                        </Col>
                        <Col span={24}>
                            <Link to={'/media/ticket/my'}>
                                <Button size="large" block icon={<VideoCameraOutlined />}>
                                    {gLang('mediaAdmin.ticket.my')}
                                </Button>
                            </Link>
                        </Col>
                        <Col span={24}>
                            <Link to={'/media/ticket/query'}>
                                <Button size="large" block icon={<SearchOutlined />}>
                                    {gLang('mediaAdmin.ticket.query')}
                                </Button>
                            </Link>
                        </Col>
                    </Row>
                )}
            </Space>

            <Space direction="vertical" style={{ width: '100%' }}>
                <Title level={4} style={{ marginBottom: 4 }}>
                    {gLang('mediaAdmin.labs')}
                </Title>
                {isPC ? (
                    <Space
                        direction="horizontal"
                        size="large"
                        style={{ width: '100%', display: 'flex' }}
                        styles={{ item: { display: 'flex', flex: 1 } }}
                    >
                        {userInfo?.permission?.includes('shop') && (
                            <AdminToolCard
                                to="/media/shop"
                                icon={<GiftOutlined />}
                                text={gLang('mediaAdmin.ecExchangeManage')}
                            />
                        )}
                        <AdminToolCard
                            to="/media/list"
                            icon={<UnorderedListOutlined />}
                            text={gLang('mediaAdmin.mediaList')}
                        />
                        <AdminToolCard
                            to="/media/announcements"
                            icon={<NotificationOutlined />}
                            text={gLang('mediaAdmin.announcements')}
                        />
                    </Space>
                ) : (
                    <Row gutter={[12, 12]}>
                        {userInfo?.permission?.includes('shop') && (
                            <Col span={12}>
                                <AdminToolCard
                                    to="/media/shop"
                                    icon={<GiftOutlined />}
                                    text={gLang('mediaAdmin.ecExchangeManage')}
                                />
                            </Col>
                        )}
                        <Col span={12}>
                            <AdminToolCard
                                to="/media/list"
                                icon={<UnorderedListOutlined />}
                                text={gLang('mediaAdmin.mediaList')}
                            />
                        </Col>
                        <Col span={12}>
                            <AdminToolCard
                                to="/media/announcements"
                                icon={<NotificationOutlined />}
                                text={gLang('mediaAdmin.announcements')}
                            />
                        </Col>
                    </Row>
                )}
            </Space>
            <MediaEventStatsModal
                open={showMediaEventStatsModal}
                onCancel={() => setShowMediaEventStatsModal(false)}
            />
        </Space>
    );
};

export default MediaAdminPanel;
