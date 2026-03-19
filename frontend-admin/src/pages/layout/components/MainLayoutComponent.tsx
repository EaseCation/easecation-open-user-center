import { Breadcrumb, Card, Flex, Layout, Button, Space, Tooltip, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { Content, Footer, Header } from 'antd/es/layout/layout';
import { gLang } from '@common/language';
import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import './MainLayoutComponent.css';
import useIsPC from '@common/hooks/useIsPC';
import AdminPCSidebar from '../../admin/admin-dashboard/components/AdminPCSidebar';
import { useTheme } from '@common/contexts/ThemeContext';
import ErrorBoundary from '../../../components/ErrorBoundary';
import MediaPCSidebar from '../../admin/media/media-dashboard/MediaPCSidebar';
import FeedbackPCSidebar from '../../admin/feedback/FeedbackPCSidebar';
import { LogoutOutlined, SwapOutlined, BgColorsOutlined, CrownOutlined } from '@ant-design/icons';
import { convertUTCToFormat } from '@common/components/TimeConverter';
import ThemeSettingsButton from '../../../components/ThemeSettingsButton';
import { CUSTOM_THEME_PALETTES } from '@common/themes/customPalettes';
import { useAuth } from '@common/contexts/AuthContext';
import { switchDomain } from '@common/utils/crossDomainSwitch';

interface Props {
    breadcrumbItems: {
        key: React.Key;
        title: React.ReactNode;
    }[];
    onLogout?: () => void;
}

const MainLayoutComponent = ({ breadcrumbItems, onLogout }: Props) => {
    const isPC = useIsPC();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isLoginPage = location.pathname === '/login' || location.pathname.startsWith('/login/');
    const isShopAdminRoute = location.pathname.startsWith('/media/shop');
    const isFeedbackTableRoute = location.pathname.startsWith('/feedback/table');
    const [themeModalOpen, setThemeModalOpen] = React.useState(false);

    // 在组件加载时检查是否有用户端传来的路径参数
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const userReturnPath = params.get('user_return_path');
        if (userReturnPath) {
            localStorage.setItem('user_last_path', userReturnPath);

            // 清理 URL 参数
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('user_return_path');
            window.history.replaceState({}, '', newUrl.toString());
        }
    }, [location.search]);

    // 跨子域切换到用户端（记住管理端位置，恢复之前保存的用户端位置）
    const handleSwitchToUserDomain = async () => {
        // 清理跨域参数，防止参数嵌套
        const searchParams = new URLSearchParams(location.search);
        searchParams.delete('user_return_path'); // 移除跨域参数
        searchParams.delete('admin_return_path'); // 移除跨域参数
        const cleanSearch = searchParams.toString();
        const currentPath = location.pathname + (cleanSearch ? '?' + cleanSearch : '');

        // 尝试恢复之前保存的用户端路径
        let targetPath = '/'; // 默认跳转到用户端首页
        try {
            const savedUserPath = localStorage.getItem('user_last_path');

            if (savedUserPath) {
                targetPath = savedUserPath;
                // 清除已使用的路径记录
                localStorage.removeItem('user_last_path');
            }
        } catch {
            // 忽略读取失败的情况
        }

        // 将管理端路径作为 URL 参数传递给用户端
        const userPathWithParam = `${targetPath}${targetPath.includes('?') ? '&' : '?'}admin_return_path=${encodeURIComponent(currentPath)}`;

        await switchDomain({
            type: 'user',
            path: userPathWithParam, // 跳转到用户端路径，并带上管理端路径参数
        });
    };

    // 管理端主路由（显示侧边栏的页面）：主页、工单、媒体（非商城）等
    // 原来是 /admin 开头，现在是根路径 / 或 /ticket 或 /media（非shop）等
    const isAdminRoute =
        location.pathname === '/' ||
        location.pathname.startsWith('/ticket') ||
        (location.pathname.startsWith('/media') && !isShopAdminRoute) ||
        location.pathname.startsWith('/panel') ||
        location.pathname.startsWith('/shortcut') ||
        location.pathname.startsWith('/risk-approval') ||
        location.pathname.startsWith('/staff-alias') ||
        location.pathname.startsWith('/wiki-bindings') ||
        location.pathname.startsWith('/utility-tools') ||
        location.pathname.startsWith('/feedback');

    const isMediaRoute = location.pathname.startsWith('/media') && !isShopAdminRoute;

    // 反馈中心来源标记：进入 /feedback 时写入 sessionStorage，
    // 这样从反馈列表点击进入工单页后，左侧仍然保持 FeedbackPCSidebar
    const FEEDBACK_SIDEBAR_SOURCE_KEY = 'admin_sidebar_source';
    React.useEffect(() => {
        if (location.pathname.startsWith('/feedback')) {
            sessionStorage.setItem(FEEDBACK_SIDEBAR_SOURCE_KEY, 'feedback');
        } else if (
            !location.pathname.startsWith('/ticket/operate') &&
            !location.pathname.startsWith('/ticket/assign')
        ) {
            // 导航到其他非工单页时清除标记，回到普通工单 sidebar
            sessionStorage.removeItem(FEEDBACK_SIDEBAR_SOURCE_KEY);
        }
    }, [location.pathname]);

    const isFeedbackSidebarActive =
        location.pathname.startsWith('/feedback') ||
        (location.pathname.startsWith('/ticket') &&
            sessionStorage.getItem(FEEDBACK_SIDEBAR_SOURCE_KEY) === 'feedback');

    // Check if user has authorize.normal permission to show sidebar
    const hasAdminPermission = user?.permission?.includes('authorize.normal');
    // For feedback center, allow sidebar for any logged-in user (no authorize.normal required)
    const shouldShowSidebar =
        !isFeedbackTableRoute &&
        isAdminRoute &&
        isPC &&
        !!user &&
        (hasAdminPermission || isFeedbackSidebarActive);

    const { getThemeColor } = useTheme();
    const palette = CUSTOM_THEME_PALETTES.blackOrange;
    const headerBackground = getThemeColor({
        light: '#ffffff',
        dark: '#141414',
        custom: { blackOrange: palette.surface },
    });
    const headerBorder = getThemeColor({
        light: '#f0f0f0',
        dark: '#303030',
        custom: { blackOrange: palette.border },
    });
    const headerTextColor = getThemeColor({
        light: '#1f1f1f',
        dark: '#f5f5f5',
        custom: { blackOrange: palette.textPrimary },
    });

    // 设置菜单项
    const settingsMenuItems: MenuProps['items'] = [
        {
            key: 'theme',
            label: gLang('themeSettings'),
            icon: <BgColorsOutlined />,
            onClick: () => setThemeModalOpen(true),
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            label: gLang('dashboard.logout'),
            icon: <LogoutOutlined />,
            onClick: onLogout,
            danger: true,
        },
    ];

    return (
        <>
            <Layout
                style={{
                    height: shouldShowSidebar ? '100vh' : 'auto',
                    overflow: shouldShowSidebar ? 'hidden' : 'visible',
                }}
            >
                <Header
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: 56,
                        justifyContent: 'space-between',
                        background: headerBackground,
                        borderBottom: `1px solid ${headerBorder}`,
                    }}
                >
                    {isLoginPage ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={'/logo/EaseCation.png'} alt="Logo" width={'150px'} />
                            {/* <h2 style={{ color: '#1F1F1F', marginLeft: '10px', marginTop: '7px' }}>{gLang('title')}</h2> */}
                        </div>
                    ) : (
                        <div
                            onClick={() => navigate('/')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <img src={'/logo/EaseCation.png'} alt="Logo" width={'150px'} />
                            {/* <h2 style={{ color: '#1F1F1F', marginLeft: '10px', marginTop: '7px' }}>{gLang('title')}</h2> */}
                        </div>
                    )}
                    <Space size={8} align="center">
                        {/* 切换到用户端按钮 - 仅对有管理员身份的用户显示 */}
                        {user && user.userid && (
                            <Tooltip title={gLang('admin.switchToUserCenter')}>
                                <Button
                                    type="text"
                                    icon={<SwapOutlined />}
                                    onClick={handleSwitchToUserDomain}
                                    style={{ color: headerTextColor }}
                                />
                            </Tooltip>
                        )}
                        {/* 设置菜单 - 使用皇冠图标表示管理端 */}
                        <Dropdown
                            menu={{ items: settingsMenuItems }}
                            trigger={['click']}
                            placement="bottomRight"
                        >
                            <Button
                                type="text"
                                icon={<CrownOutlined />}
                                style={{ color: headerTextColor }}
                            />
                        </Dropdown>
                        {/* 主题设置弹窗（受控模式） */}
                        <ThemeSettingsButton
                            open={themeModalOpen}
                            onOpenChange={setThemeModalOpen}
                            hideButton={true}
                        />
                    </Space>
                </Header>
                {shouldShowSidebar ? (
                    <Content className="main-content admin-content">
                        <Flex gap={0} vertical={false} style={{ height: 'calc(100vh - 56px)' }}>
                            <Card
                                variant={'borderless'}
                                hoverable={false}
                                style={{
                                    display: 'flex',
                                    flex: 1,
                                    height: '100%',
                                    padding: '32px 24px',
                                    marginTop: 0,
                                    marginRight: 0,
                                    borderRadius: 0,
                                    overflow: 'auto',
                                    boxShadow: 'none',
                                }}
                                styles={{
                                    body: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: 0,
                                        width: '100%',
                                    },
                                }}
                            >
                                {isMediaRoute ? (
                                    <MediaPCSidebar />
                                ) : isFeedbackSidebarActive ? (
                                    <FeedbackPCSidebar />
                                ) : (
                                    <AdminPCSidebar />
                                )}

                                <div style={{ paddingTop: 16 }}></div>
                            </Card>
                            <Card
                                variant={'borderless'}
                                hoverable={false}
                                style={{
                                    display: 'flex',
                                    flex: 3,
                                    height: '100%',
                                    padding: '32px 32px 0 32px',
                                    marginTop: 0,
                                    marginLeft: 0,
                                    borderRadius: 0,
                                    overflow: 'auto',
                                    boxShadow: 'none',
                                }}
                                styles={{
                                    body: {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: 0,
                                        width: '100%',
                                    },
                                }}
                            >
                                <Outlet />
                                <div style={{ paddingTop: 32 }}></div>
                            </Card>
                        </Flex>
                    </Content>
                ) : (
                    <Content className={'main-content'}>
                        {breadcrumbItems.length > 0 && (
                            <Breadcrumb className="main-breadcrumb" items={breadcrumbItems} />
                        )}
                        <Card
                            variant={'borderless'}
                            hoverable={false}
                            style={{
                                display: 'flex',
                                minHeight: isAdminRoute ? 'calc(100vh - 56px)' : '80vh',
                                padding: 32,
                                marginTop: breadcrumbItems.length > 0 ? 0 : 16,
                                boxShadow: 'none',
                            }}
                            styles={{
                                body: {
                                    display: 'flex',
                                    padding: 0,
                                    width: '100%',
                                },
                            }}
                        >
                            <ErrorBoundary>
                                <Outlet />
                            </ErrorBoundary>
                        </Card>
                    </Content>
                )}
                {!isAdminRoute && (
                    <Footer style={{ textAlign: 'center', width: '100%' }}>
                        <p style={{ opacity: 0.8 }}>
                            {gLang('footer.copyright', {
                                year: convertUTCToFormat(new Date(), 'YYYY'),
                            })}
                        </p>
                        <p>
                            <a href="https://beian.miit.gov.cn/" style={{ opacity: 0.8 }}>
                                {gLang('footer.icp')}
                            </a>
                        </p>
                    </Footer>
                )}
            </Layout>
        </>
    );
};

export default MainLayoutComponent;
