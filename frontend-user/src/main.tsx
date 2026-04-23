// main.tsx

import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import '@common/styles/index.css';

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './pages/layout/MainLayout';
import NotFound from '@common/components/NotFound/NotFound';
import Home from './pages/home/Home';
import Login from './pages/login/Login';
import LoginCallback from './pages/login/LoginCallback';
import { AuthProvider } from '@common/contexts/AuthContext';
import { AnnouncementProvider } from '@common/components/Announcement';
import MainLayoutWithoutBreadcrumb from './pages/layout/MainLayoutWithoutBreadcrumb';
import { ThemeProvider } from '@common/contexts/ThemeContext';
import MessageProvider from '@common/contexts/MessageProvider';
import { FeedbackEligibilityProvider } from './contexts/FeedbackEligibilityContext';
import DisableDevTool from 'disable-devtool';
import Maintenance from './pages/maintenance/Maintenance';
import { gLang } from '@common/language';

const Account = lazy(() => import('./pages/account/Account'));
const AccountDetail = lazy(() => import('./pages/account/detail/AccountDetail'));
const AccountManagement = lazy(() => import('./pages/account/detail/AccountManagement'));
const MediaCenter = lazy(() => import('./pages/media/MediaCenter'));
const Shop = lazy(() => import('./pages/shop/Shop'));
const TicketList = lazy(() => import('./pages/ticket/ticket-list/TicketList'));
const TicketDetail = lazy(() => import('./pages/ticket/TicketDetail'));
const TicketTypeSelect = lazy(() => import('./pages/ticket/ticket-create/TicketTypeSelect'));
const PublicScoreTop = lazy(() => import('./pages/public/PublicScoreTop'));
const PublicStageDataSGMatch = lazy(() => import('./pages/public/PublicStageDataSGMatch'));
const TicketSnapshot = lazy(() => import('./pages/public/TicketSnapshot'));
const SimpleLayoutComponent = lazy(() => import('./pages/layout/components/SimpleLayoutComponent'));
const CardOnlyLayoutComponent = lazy(
    () => import('./pages/layout/components/CardOnlyLayoutComponent')
);
const Document = lazy(() => import('./pages/public/Document'));
const DocumentCenter = lazy(() => import('./pages/document/DocumentCenter'));
const Wiki = lazy(() => import('./pages/wiki/Wiki'));
const Resources = lazy(() => import('./pages/resources/Resources'));
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'));
const VerifyRegistrationCodePage = lazy(() => import('./pages/VerifyRegistrationCodePage'));
const AnnualReport = lazy(() => import('./pages/annual-report/AnnualReport'));
const AnnualReportShare = lazy(() => import('./pages/annual-report/AnnualReportShare'));
const Lotteries = lazy(() => import('./pages/public/Lotteries'));
const Feedback = lazy(() => import('./pages/feedback/Feedback'));
const FeedbackSubscriptions = lazy(() => import('./pages/feedback/FeedbackSubscriptions'));
const FeedbackSettings = lazy(() => import('./pages/feedback/FeedbackSettings'));
const FeedbackDetail = lazy(() => import('./pages/feedback/FeedbackDetail'));
const Tlgift = lazy(() => import('./pages/tlgift/Tlgift'));

const Loading = () => (
    <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
    >
        {gLang('loading')}
    </div>
);

const PLAYGROUND_E2E_DISABLE_DEVTOOL_FLAG = 'playground-e2e-disable-devtool';

const isPlaygroundUserOrigin = (): boolean => {
    try {
        return window.location.hostname === 'uc-playground.easecation.net';
    } catch {
        return false;
    }
};

const isAutomatedBrowser = (): boolean => {
    try {
        return navigator.webdriver === true;
    } catch {
        return false;
    }
};

const shouldEnableDisableDevTool = (): boolean => {
    if (process.env.NODE_ENV === 'development') {
        return false;
    }

    try {
        // 仅对 playground 自动化测试放开 disable-devtool，避免普通环境误触发豁免。
        const shouldBypassDisableDevTool =
            isPlaygroundUserOrigin() &&
            isAutomatedBrowser() &&
            localStorage.getItem(PLAYGROUND_E2E_DISABLE_DEVTOOL_FLAG) === '1';

        return !shouldBypassDisableDevTool;
    } catch {
        return true;
    }
};

if (shouldEnableDisableDevTool()) {
    DisableDevTool({
        md5: '23070ac9c395db601f23278c63253063',
        disableMenu: false,
    });
}

// Check maintenance mode from environment variable
// Default to false (disabled) if not set
const isMaintenanceMode =
    import.meta.env.VITE_MAINTENANCE_MODE === 'true' ||
    import.meta.env.VITE_MAINTENANCE_MODE === '1';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <BrowserRouter>
        <ThemeProvider>
            <MessageProvider>
                <AnnouncementProvider>
                    <AuthProvider>
                        {isMaintenanceMode ? (
                            <Maintenance />
                        ) : (
                            <Suspense fallback={<Loading />}>
                                <Routes>
                                    {/* 主布局路由 */}
                                    <Route path="/" element={<MainLayout />}>
                                        <Route index element={<Home />} />
                                        <Route path="my" element={<Navigate to="/" />} />

                                        {/* 媒体中心 */}
                                        <Route path="media" element={<MediaCenter />} />
                                        <Route path="media/shop" element={<Shop />} />

                                        {/* 我的账号 */}
                                        <Route path="account" element={<Account />} />
                                        <Route path="account/:ecid" element={<AccountDetail />} />
                                        <Route
                                            path="account/:ecid/manage"
                                            element={<AccountManagement />}
                                        />

                                        {/* 公开文档 */}
                                        <Route
                                            path="media-guidelines"
                                            element={<Document docName="MediaGuidelines" />}
                                        />
                                        <Route
                                            path="shop-guidelines"
                                            element={<Document docName="ShopGuidelines" />}
                                        />
                                        <Route
                                            path="player-guidelines"
                                            element={<Document docName="PlayerGuidelines" />}
                                        />
                                        <Route
                                            path="general-guidelines"
                                            element={<Document docName="GeneralGuidelines" />}
                                        />
                                        <Route path="lotteries" element={<Lotteries />} />

                                        {/* 文档中心 */}
                                        <Route path="document" element={<DocumentCenter />} />

                                        {/* 玩家侧工单 */}
                                        <Route path="ticket" element={<TicketList />} />
                                        <Route path="ticket/new" element={<TicketTypeSelect />} />
                                        <Route path="ticket/:tid" element={<TicketDetail />} />

                                        {/* 排行榜 */}
                                        <Route path="scoretop" element={<PublicScoreTop />} />
                                        <Route
                                            path="sgmatch"
                                            element={<PublicStageDataSGMatch />}
                                        />

                                        {/* 更多资源 */}
                                        <Route path="resources" element={<Resources />} />

                                        {/* Wiki工具集合 */}
                                        <Route path="resources/wiki" element={<Wiki />} />

                                        {/* 原石商城（玩家端：我的记录、消费原石） */}
                                        <Route path="tlgift" element={<Tlgift />} />

                                        {/* 反馈中心（进入反馈区域时异步检查发言资格） */}
                                        <Route
                                            path="feedback"
                                            element={
                                                <FeedbackEligibilityProvider>
                                                    <Feedback />
                                                </FeedbackEligibilityProvider>
                                            }
                                        />
                                        <Route
                                            path="feedback/:tid"
                                            element={
                                                <FeedbackEligibilityProvider>
                                                    <FeedbackDetail />
                                                </FeedbackEligibilityProvider>
                                            }
                                        />
                                        <Route
                                            path="feedback/subscriptions"
                                            element={
                                                <FeedbackEligibilityProvider>
                                                    <FeedbackSubscriptions />
                                                </FeedbackEligibilityProvider>
                                            }
                                        />
                                        <Route
                                            path="feedback/settings"
                                            element={
                                                <FeedbackEligibilityProvider>
                                                    <FeedbackSettings />
                                                </FeedbackEligibilityProvider>
                                            }
                                        />
                                    </Route>

                                    {/* 简化布局路由 */}
                                    <Route path="/" element={<SimpleLayoutComponent />}>
                                        <Route
                                            path="tksnapshot/:tid"
                                            element={<TicketSnapshot />}
                                        />
                                    </Route>

                                    {/* 卡片布局路由 */}
                                    <Route path="/" element={<CardOnlyLayoutComponent />}>
                                        <Route
                                            path="account/:ecid/annual-report"
                                            element={<AnnualReport />}
                                        />
                                        <Route
                                            path="annual-report/share"
                                            element={<AnnualReportShare />}
                                        />
                                    </Route>

                                    {/* 无面包屑布局路由 */}
                                    <Route path="/" element={<MainLayoutWithoutBreadcrumb />}>
                                        <Route path="login" element={<Login />} />
                                        <Route path="login/callback" element={<LoginCallback />} />
                                        <Route
                                            path="verify-email"
                                            element={<EmailVerificationPage />}
                                        />
                                        <Route
                                            path="verify-registration-code"
                                            element={<VerifyRegistrationCodePage />}
                                        />
                                        <Route path="*" element={<NotFound />} />
                                    </Route>
                                </Routes>
                            </Suspense>
                        )}
                    </AuthProvider>
                </AnnouncementProvider>
            </MessageProvider>
        </ThemeProvider>
    </BrowserRouter>
);
