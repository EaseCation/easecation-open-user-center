// 玩家侧工单列表页

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Typography, message } from 'antd';
import { fetchData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Ticket, TicketCountPublic } from '@ecuc/shared/types/ticket.types';
import Wrapper from '@common/components/Wrapper/Wrapper';
import PageTitle from '@common/components/PageTitle/PageTitle';
import PageIntro from '../../../components/PageIntro/PageIntro';
import TicketProgressModal from './components/TicketProgressModal';
import TicketListComponent from '../../../components/TicketListComponent';
import usePageTitle from '@common/hooks/usePageTitle';

// 淡入动画
const fadeInUpAnimation = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;

// 添加动画样式到文档头部
if (typeof document !== 'undefined' && !document.getElementById('fadeInUpAnimation')) {
    const style = document.createElement('style');
    style.id = 'fadeInUpAnimation';
    style.innerHTML = fadeInUpAnimation;
    document.head.appendChild(style);
}

const TicketList = () => {
    usePageTitle(); // 使用页面标题管理Hook
    const { Paragraph } = Typography;
    const navigate = useNavigate();
    const location = useLocation();
    const [ticketList, setTicketList] = useState<Ticket[] | undefined>(undefined);
    const [ticketCount, setTicketCount] = useState<TicketCountPublic>();
    const [isLoadingTicketCount, setIsLoadingTicketCount] = useState(true);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [isSpinning, setIsSpinning] = useState(true); // 新增
    const [messageApi, messageContextHolder] = message.useMessage();

    // Check if this is the first visit after login
    const isFirstVisitAfterLogin = useMemo(() => {
        const hasShownAnimation = sessionStorage.getItem('ticketListAnimationShown');
        const isFromLogin =
            document.referrer.includes('/login') ||
            document.referrer.includes('/login/callback') ||
            location.state?.fromLogin === true;

        // If coming from login and haven't shown animation yet, show full animation
        if (isFromLogin && !hasShownAnimation) {
            sessionStorage.setItem('ticketListAnimationShown', 'true');
            return true;
        }
        return false;
    }, [location.state]);

    // Animation delay: longer for first visit (0.1s), shorter for subsequent visits (0.02s)
    const animationDelay = isFirstVisitAfterLogin ? 0.1 : 0.02;

    useEffect(() => {
        setIsSpinning(true);
        fetchData({
            url: '/ticket/list',
            method: 'GET',
            data: {},
            setData: (data: Ticket[]) => {
                setTicketList(data);
                setIsSpinning(false);
            },
        });
        fetchData({
            url: '/ticket/count',
            method: 'GET',
            data: { type: 'user' },
            setData: setTicketCount,
            setSpin: setIsLoadingTicketCount,
        }).then();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('submitted') !== '1') {
            return;
        }
        messageApi.success(gLang('ticketList.success'));
        params.delete('submitted');
        const nextSearch = params.toString();
        navigate(
            {
                pathname: location.pathname,
                search: nextSearch ? `?${nextSearch}` : '',
            },
            { replace: true }
        );
    }, [location.pathname, location.search, messageApi, navigate]);

    let cardIndex = 0;

    return (
        <Wrapper>
            {messageContextHolder}
            {!isSpinning ? (
                <>
                    <div
                        style={{
                            opacity: 0,
                            animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                        }}
                    >
                        <PageTitle title={gLang('ticketList.title')} level={2} />
                    </div>

                    <div
                        style={{
                            opacity: 0,
                            animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                        }}
                    >
                        <PageIntro imageSrc="/image/ticket.png" imgSize={0.9}>
                            <Paragraph>{gLang('ticketList.intro')}</Paragraph>
                            <Paragraph>
                                {gLang('ticketList.recommend')}
                                <Link to="https://www.bilibili.com/opus/1036461228718817300">
                                    {gLang('ticketList.about')}
                                </Link>
                            </Paragraph>
                        </PageIntro>
                    </div>

                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div
                            style={{
                                opacity: 0,
                                animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                            }}
                        >
                            <Button
                                size="large"
                                type="primary"
                                block
                                onClick={() => navigate('/ticket/new')}
                            >
                                {gLang('ticketList.newBtn')}
                            </Button>
                        </div>

                        <div
                            style={{
                                opacity: 0,
                                animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                            }}
                        >
                            <Button size="large" block onClick={() => setIsProgressModalOpen(true)}>
                                {gLang('ticketList.showProgress')}
                            </Button>
                        </div>
                    </Space>

                    <div
                        style={{
                            opacity: 0,
                            animation: `fadeInUp 0.5s ease-in-out ${cardIndex++ * animationDelay}s forwards`,
                        }}
                    >
                        <TicketListComponent
                            tickets={ticketList}
                            style={{ marginTop: 20 }}
                            to={ticket => `/ticket/${ticket.tid}`}
                            loading={isSpinning}
                            isAdmin={false}
                        />
                    </div>
                </>
            ) : null}

            <TicketProgressModal
                isOpen={isProgressModalOpen}
                onClose={() => setIsProgressModalOpen(false)}
                ticketCount={ticketCount}
                isLoading={isLoadingTicketCount}
            />
        </Wrapper>
    );
};

export default TicketList;
