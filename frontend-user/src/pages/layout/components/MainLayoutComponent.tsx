import { Breadcrumb, Card, Layout, Button, Space, Tooltip, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { Content, Footer, Header } from 'antd/es/layout/layout';
import { gLang } from '@common/language';
import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import './MainLayoutComponent.css';
import { useTheme } from '@common/contexts/ThemeContext';
import ErrorBoundary from '../../../components/ErrorBoundary';
import { LogoutOutlined, SwapOutlined, BgColorsOutlined, UserOutlined } from '@ant-design/icons';
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
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isLoginPage = location.pathname === '/login' || location.pathname.startsWith('/login/');
    const [themeModalOpen, setThemeModalOpen] = React.useState(false);

    // 在组件加载时检查是否有管理端传来的路径参数
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const adminReturnPath = params.get('admin_return_path');
        if (adminReturnPath) {
            localStorage.setItem('admin_last_path', adminReturnPath);

            // 清理 URL 参数
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('admin_return_path');
            window.history.replaceState({}, '', newUrl.toString());
        }
    }, [location.search]);

    // 跨子域切换到管理端（记住用户端位置，恢复之前保存的管理端位置）
    const handleSwitchToAdminDomain = async () => {
        // 清理跨域参数，防止参数嵌套
        const searchParams = new URLSearchParams(location.search);
        searchParams.delete('user_return_path'); // 移除跨域参数
        searchParams.delete('admin_return_path'); // 移除跨域参数
        const cleanSearch = searchParams.toString();
        const currentPath = location.pathname + (cleanSearch ? '?' + cleanSearch : '');

        // 尝试恢复之前保存的管理端路径
        let targetPath = '/'; // 默认跳转到管理端首页
        const savedAdminPath = localStorage.getItem('admin_last_path');

        if (savedAdminPath) {
            targetPath = savedAdminPath;
            // 清除已使用的路径记录
            localStorage.removeItem('admin_last_path');
        }

        // 将用户端路径作为 URL 参数传递给管理端
        const adminPathWithParam = `${targetPath}${targetPath.includes('?') ? '&' : '?'}user_return_path=${encodeURIComponent(currentPath)}`;

        await switchDomain({
            type: 'admin',
            path: adminPathWithParam, // 跳转到管理端路径，并带上用户端路径参数
        });
    };

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
    const handleLogin = () => {
        const currentUrl = window.location.href;
        navigate('/login?return_to=' + encodeURIComponent(currentUrl));
    };

    const settingsMenuItems: MenuProps['items'] = user
        ? [
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
          ]
        : [
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
                  key: 'login',
                  label: gLang('pageTitle./login'),
                  icon: <UserOutlined />,
                  onClick: handleLogin,
              },
          ];

    return (
        <>
            <Layout
                style={{
                    height: 'auto',
                    overflow: 'visible',
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
                        <Link to={'/'} style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={'/logo/EaseCation.png'} alt="Logo" width={'150px'} />
                            {/* <h2 style={{ color: '#1F1F1F', marginLeft: '10px', marginTop: '7px' }}>{gLang('title')}</h2> */}
                        </Link>
                    )}
                    <Space size={8} align="center">
                        {/* 切换到管理端按钮 - 仅对有管理员身份的用户显示 */}
                        {user && user.userid && (
                            <Tooltip title={gLang('mainLayout.switchToAdminCenter')}>
                                <Button
                                    type="text"
                                    icon={<SwapOutlined />}
                                    onClick={handleSwitchToAdminDomain}
                                    style={{ color: headerTextColor }}
                                />
                            </Tooltip>
                        )}
                        {/* 设置菜单 - 使用用户图标表示用户端 */}
                        <Dropdown
                            menu={{ items: settingsMenuItems }}
                            trigger={['click']}
                            placement="bottomRight"
                        >
                            <Button
                                type="text"
                                icon={<UserOutlined />}
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
                <Content className={'main-content'}>
                    {breadcrumbItems.length > 0 && (
                        <Breadcrumb className="main-breadcrumb" items={breadcrumbItems} />
                    )}
                    <Card
                        variant={'borderless'}
                        hoverable={false}
                        style={{
                            display: 'flex',
                            minHeight: '80vh',
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
                {
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
                }
            </Layout>
        </>
    );
};

export default MainLayoutComponent;
