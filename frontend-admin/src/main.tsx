import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';
import './index.css';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from '@common/contexts/AuthContext';
import { ThemeProvider } from '@common/contexts/ThemeContext';
import MessageProvider from '@common/contexts/MessageProvider';
import Login from './pages/login/Login';
import LoginCallback from './pages/login/LoginCallback';
import MainLayout from './pages/layout/MainLayout';
import MainLayoutWithoutBreadcrumb from './pages/layout/MainLayoutWithoutBreadcrumb';
import NotFound from '@common/components/NotFound/NotFound';
import Admin from './pages/admin/admin-dashboard/Admin';
import ShopAdmin from './pages/admin/shop/ShopAdmin';
import SuperPanel from './pages/admin/panel/SuperPanel';
import Shortcut from './pages/admin/admin-dashboard/Shortcut';
import TicketAssign from './pages/admin/ticket/TicketAssign';
import AdminMediaList from './pages/admin/media/media-list/AdminMediaList';
import AdminWikiBindingList from './pages/admin/media/wiki-binding-list/AdminWikiBindingList';
import AdminWatermark from './pages/admin/components/AdminWatermark';
import AdminRouteGuard from './pages/admin/components/AdminRouteGuard';
import RiskApproval from './pages/admin/admin-dashboard/risk-approval/RiskApproval';
import RiskApprovalDetail from './pages/admin/admin-dashboard/risk-approval/RiskApprovalDetail';
import RiskApprovalReview from './pages/admin/admin-dashboard/risk-approval/RiskApprovalReview';
import TicketMyAdmin from './pages/admin/ticket/TicketMyAdmin';
import UtilityTools from './pages/admin/utility-tools/UtilityTools';
import TicketQuery from './pages/admin/ticket/TicketQuery';
import MediaAdminPanel from './pages/admin/media/media-dashboard/MediaAdminPanel';
import TicketOperate from './pages/admin/ticket/ticket-operate/TicketOperate';
import TicketMyMediaAdmin from './pages/admin/media/ticket-list/TicketMyMediaAdmin';
import AdminAnnouncementList from './pages/admin/announcement/AnnouncementPanel';
import StaffAliasAdmin from './pages/admin/staff-alias/StaffAliasAdmin';
import AiCenter from './pages/admin/ai-center/AiCenter';
import SystemRiskControlAgent from './pages/admin/ai-center/agents/SystemRiskControlAgent';
import TicketAutoEntrustAgent from './pages/admin/ai-center/agents/TicketAutoEntrustAgent';
import ChannelLimitAgent from './pages/admin/ai-center/agents/ChannelLimitAgent';
import AutoProcessRules from './pages/admin/ai-center/AutoProcessRules';
const FeedbackManageRoute = lazy(() => import('./pages/admin/feedback/FeedbackManageRoute'));
const FeedbackTagLibraryPage = lazy(() => import('./pages/admin/feedback/FeedbackTagLibraryPage'));
const FeedbackTablePage = lazy(() => import('./pages/admin/feedback/FeedbackTablePage'));
import TlgiftMall from './pages/admin/tlgift/TlgiftMall';
import JiraIssueDetail from './pages/admin/jira/JiraIssueDetail';

// 重定向组件：将 operate/:type 重定向到 assign/:type（backToMy 跳转到工单列表）
const RedirectOperateToAssign = ({ basePath }: { basePath: string }) => {
    const { type } = useParams<{ type: string }>();
    if (type === 'backToMy') {
        return <Navigate to={`${basePath}/my`} replace />;
    }
    return <Navigate to={`${basePath}/assign/${type}`} replace />;
};

// Loading 组件用于 Suspense fallback
const Loading = () => (
    <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
    >
        <Spin size="large" />
    </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Failed to find the root element');
}
ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <BrowserRouter>
            <ConfigProvider locale={zhCN}>
                <ThemeProvider>
                    <MessageProvider>
                        <AuthProvider>
                            <Suspense fallback={<Loading />}>
                                <Routes>
                                    <Route path="/" element={<MainLayout />}>
                                        <Route element={<AdminWatermark />}>
                                            {/* 管理端首页 */}
                                            <Route
                                                index
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.normal">
                                                        <Admin />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            {/* 商城管理 */}
                                            <Route
                                                path="media/shop"
                                                element={
                                                    <AdminRouteGuard requiredPermission="ticket.media">
                                                        <ShopAdmin />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="shop"
                                                element={<Navigate to="/media/shop" />}
                                            />
                                            {/* 媒体管理中心 */}
                                            <Route
                                                path="media"
                                                element={
                                                    <AdminRouteGuard requiredPermission="ticket.media">
                                                        <MediaAdminPanel />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="media/list"
                                                element={
                                                    <AdminRouteGuard requiredPermission="ticket.media">
                                                        <AdminMediaList />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="wiki-bindings"
                                                element={
                                                    <AdminRouteGuard requiredPermission="ticket.WB">
                                                        <AdminWikiBindingList />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="media/ticket/query"
                                                element={
                                                    <AdminRouteGuard requiredPermission="ticket.media">
                                                        <TicketQuery type="media" />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="media/ticket/operate/:type/:tid"
                                                element={
                                                    <AdminRouteGuard requiredPermission="ticket.media">
                                                        <TicketOperate />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="media/ticket/operate"
                                                element={<Navigate to="/media" replace />}
                                            />
                                            <Route
                                                path="media/ticket/operate/:type"
                                                element={
                                                    <RedirectOperateToAssign basePath="/media/ticket" />
                                                }
                                            />
                                            <Route
                                                path="media/ticket/assign"
                                                element={<Navigate to="/media" replace />}
                                            />
                                            <Route
                                                path="media/ticket/assign/:type"
                                                element={
                                                    <AdminRouteGuard requiredPermission="ticket.media">
                                                        <TicketAssign />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="media/ticket/my"
                                                element={
                                                    <AdminRouteGuard requiredPermission="ticket.media">
                                                        <TicketMyMediaAdmin />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            {/* 媒体公告管理 */}
                                            <Route
                                                path="media/announcements"
                                                element={
                                                    <AdminRouteGuard requiredPermission="ticket.media">
                                                        <AdminAnnouncementList />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            {/* 工单管理 */}
                                            <Route
                                                path="ticket/query"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.normal">
                                                        <TicketQuery type="common" />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="ticket/operate/:type/:tid"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.normal">
                                                        <TicketOperate />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="ticket/operate"
                                                element={<Navigate to="/" replace />}
                                            />
                                            <Route
                                                path="ticket/operate/:type"
                                                element={
                                                    <RedirectOperateToAssign basePath="/ticket" />
                                                }
                                            />
                                            <Route
                                                path="ticket/assign"
                                                element={<Navigate to="/" replace />}
                                            />
                                            <Route
                                                path="ticket/assign/:type"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.normal">
                                                        <TicketAssign />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="ticket/my"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.normal">
                                                        <TicketMyAdmin />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            {/* 工单首页重定向到管理中心 */}
                                            <Route
                                                path="ticket"
                                                element={<Navigate to="/" replace />}
                                            />
                                            {/* 快捷操作 */}
                                            <Route
                                                path="shortcut"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.normal">
                                                        <Shortcut />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            {/* 超级面板 */}
                                            <Route
                                                path="panel/:ecid"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.normal">
                                                        <SuperPanel />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            {/* 超级面板重定向：如果没有 ecid，重定向到主页 */}
                                            <Route
                                                path="panel"
                                                element={<Navigate to="/" replace />}
                                            />
                                            {/* 旧的公告路由重定向到新路由 */}
                                            <Route
                                                path="announcements"
                                                element={
                                                    <Navigate to="/media/announcements" replace />
                                                }
                                            />
                                            {/* 员工别名管理 */}
                                            <Route
                                                path="staff-alias"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.normal">
                                                        <StaffAliasAdmin />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            {/* 实用工具 */}
                                            <Route
                                                path="utility-tools"
                                                element={<UtilityTools />}
                                            />
                                            {/* 原石商城 tlgift，直接输网址进入 */}
                                            <Route path="tlgift" element={<TlgiftMall />} />
                                            {/* AI中心 */}
                                            <Route
                                                path="ai-center"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.super">
                                                        <AiCenter />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="ai-center/system-risk-control"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.super">
                                                        <SystemRiskControlAgent />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="ai-center/ticket-auto-entrust"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.super">
                                                        <TicketAutoEntrustAgent />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="ai-center/channel-limit"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.super">
                                                        <ChannelLimitAgent />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="ai-center/auto-process-rules"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.super">
                                                        <AutoProcessRules />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            {/* Jira 工单详情（通过 Kanban 中继） */}
                                            <Route
                                                path="jira/issues/:issueKey"
                                                element={
                                                    <AdminRouteGuard requiredPermission="authorize.normal">
                                                        <JiraIssueDetail />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            {/* 高风险操作审批 */}
                                            <Route
                                                path="risk-approval"
                                                element={<RiskApproval />}
                                            />
                                            <Route
                                                path="risk-approval/:id"
                                                element={<RiskApprovalDetail />}
                                            />
                                            <Route
                                                path="risk-approval/review"
                                                element={
                                                    <AdminRouteGuard requiredPermission="sen.admin">
                                                        <RiskApprovalReview />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            {/* 反馈管理 - PC分栏布局，右侧复用 /ticket/operate 路由体系，登录即可访问 */}
                                            <Route
                                                path="feedback"
                                                element={
                                                    <AdminRouteGuard>
                                                        <FeedbackManageRoute />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="feedback/tags"
                                                element={
                                                    <AdminRouteGuard>
                                                        <FeedbackTagLibraryPage />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="feedback/table"
                                                element={
                                                    <AdminRouteGuard>
                                                        <FeedbackTablePage />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                            <Route
                                                path="feedback/table/:tid"
                                                element={
                                                    <AdminRouteGuard>
                                                        <FeedbackTablePage />
                                                    </AdminRouteGuard>
                                                }
                                            />
                                        </Route>
                                    </Route>
                                    {/* 无面包屑布局路由 */}
                                    <Route path="/" element={<MainLayoutWithoutBreadcrumb />}>
                                        <Route path="login" element={<Login />} />
                                        <Route path="login/callback" element={<LoginCallback />} />
                                        <Route path="*" element={<NotFound />} />
                                    </Route>
                                </Routes>
                            </Suspense>
                        </AuthProvider>
                    </MessageProvider>
                </ThemeProvider>
            </ConfigProvider>
        </BrowserRouter>
    </React.StrictMode>
);
