//AI中心页面组件
//Usage: Displayed when user accesses the AI center page.

import React, { useMemo } from 'react';
import { Card, Col, Row, Space, Typography } from 'antd';
import Wrapper from '@common/components/Wrapper/Wrapper';
import PageTitle from '@common/components/PageTitle/PageTitle';
import usePageTitle from '@common/hooks/usePageTitle';
import { gLang } from '@common/language';
import { useNavigate } from 'react-router-dom';
import {
    SafetyCertificateOutlined,
    PartitionOutlined,
    SlidersOutlined,
    ApartmentOutlined,
} from '@ant-design/icons';

const { Paragraph, Title } = Typography;

const AiCenter: React.FC = () => {
    usePageTitle();
    const navigate = useNavigate();

    const cards = useMemo(() => {
        return [
            {
                key: 'system-risk-control',
                title: gLang('aiCenter.autoReject.title'),
                to: '/ai-center/system-risk-control',
                Icon: SafetyCertificateOutlined,
                color: '#1677ff',
            },
            {
                key: 'ticket-auto-entrust',
                title: gLang('aiCenter.autoEntrust.title'),
                to: '/ai-center/ticket-auto-entrust',
                Icon: PartitionOutlined,
                color: '#13c2c2',
            },
            {
                key: 'channel-limit',
                title: gLang('aiCenter.channelLimit.title'),
                to: '/ai-center/channel-limit',
                Icon: SlidersOutlined,
                color: '#fa8c16',
            },
            {
                key: 'auto-process-rules',
                title: gLang('aiCenter.autoProcess.title'),
                to: '/ai-center/auto-process-rules',
                Icon: ApartmentOutlined,
                color: '#0f766e',
            },
        ];
    }, []);

    return (
        <Wrapper>
            <PageTitle title={gLang('aiCenter.title')} />
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Paragraph type="secondary">{gLang('aiCenter.home.intro')}</Paragraph>
                <Row gutter={[16, 16]}>
                    {cards.map(card => (
                        <Col key={card.key} xs={24} md={12} lg={8}>
                            {(() => {
                                const Icon = card.Icon;
                                return (
                                    <Card
                                        hoverable
                                        title={
                                            <Space size={10} align="center">
                                                <Icon style={{ color: card.color, fontSize: 18 }} />
                                                <Title level={5} style={{ margin: 0 }}>
                                                    {card.title}
                                                </Title>
                                            </Space>
                                        }
                                        style={{ height: '100%' }}
                                        onClick={() => navigate(card.to)}
                                    >
                                        <div
                                            style={{
                                                height: 120,
                                                borderRadius: 12,
                                                background: `linear-gradient(135deg, ${card.color}22, transparent)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon style={{ fontSize: 46, color: card.color }} />
                                        </div>
                                    </Card>
                                );
                            })()}
                        </Col>
                    ))}
                </Row>
            </Space>
        </Wrapper>
    );
};

export default AiCenter;
