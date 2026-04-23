import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchData } from '../../axiosConfig';
import {
    getLatestActiveAnnouncement,
    hasActiveAutoShowAnnouncement,
    shouldShowAnnouncement,
    updatePopupTime,
    getStoredPopupSetting,
    setStoredPopupSetting,
    PopupSetting,
} from '../../utils/announcementUtils';
import { useLocation } from 'react-router-dom';
import { publicRoutes } from '../../config/publicRoutes';
import { matchPath } from 'react-router-dom';
import { Announcement } from '@ecuc/shared/types/media.types';

interface AnnouncementContextType {
    announcements: Announcement[];
    latestActiveAnnouncement: Announcement | null;
    isAnnouncementModalVisible: boolean;
    isHistoryModalVisible: boolean;
    popupSetting: PopupSetting;
    setIsAnnouncementModalVisible: (visible: boolean) => void;
    setIsHistoryModalVisible: (visible: boolean) => void;
    setPopupSetting: (setting: PopupSetting) => void;
    refreshAnnouncements: () => void;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

interface AnnouncementProviderProps {
    children: ReactNode;
}

const isOptionalAuthRoutePath = (pathname: string): boolean =>
    pathname === '/feedback' || /^\/feedback\/\d+$/.test(pathname);

export const AnnouncementProvider: React.FC<AnnouncementProviderProps> = ({ children }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isAnnouncementModalVisible, setIsAnnouncementModalVisible] = useState(false);
    const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
    const [popupSetting, setPopupSetting] = useState<PopupSetting>('any');
    const location = useLocation();

    // 计算是否为公开路由
    const isPublicRoute = publicRoutes.some(route => matchPath({ path: route }, location.pathname));
    const isOptionalAuthRoute = isOptionalAuthRoutePath(location.pathname);

    // 检查是否是带 token 的年度报告分享页
    const isAnnualReportShareWithToken =
        location.pathname === '/annual-report/share' &&
        new URLSearchParams(location.search).has('token');

    // 获取最新活跃公告
    const latestActiveAnnouncement = getLatestActiveAnnouncement(announcements);

    // 初始化弹出设置
    useEffect(() => {
        const storedSetting = getStoredPopupSetting();
        setPopupSetting(storedSetting);
    }, []);

    // 获取公告数据
    const refreshAnnouncements = async () => {
        await fetchData({
            url: '/announcement/list',
            method: 'GET',
            data: {},
            setData: response => {
                const announcementData = response.announcements || [];
                const sortedAnnouncements = announcementData.sort(
                    (a: Announcement, b: Announcement) => b.id - a.id
                );
                setAnnouncements(sortedAnnouncements);
            },
        });
    };

    useEffect(() => {
        // 只在非公开路由时获取公告数据
        // 带 token 的分享页面不需要获取公告数据
        if (!isPublicRoute && !isOptionalAuthRoute && !isAnnualReportShareWithToken) {
            refreshAnnouncements();
        }
    }, [isPublicRoute, isOptionalAuthRoute, isAnnualReportShareWithToken]);

    // 检查是否应该弹出公告
    useEffect(() => {
        // 带 token 的分享页面不显示公告
        if (
            !isPublicRoute &&
            !isOptionalAuthRoute &&
            !isAnnualReportShareWithToken &&
            announcements.length > 0
        ) {
            const latestId = announcements.length > 0 ? announcements[0].id : null;
            const hasActiveAutoShow = hasActiveAutoShowAnnouncement(announcements);
            const shouldShow = shouldShowAnnouncement(latestId, hasActiveAutoShow);

            if (shouldShow) {
                setIsAnnouncementModalVisible(true);
                // 自动弹出时也要更新弹出时间
                updatePopupTime();
            }
        }
    }, [isPublicRoute, isOptionalAuthRoute, isAnnualReportShareWithToken, announcements, popupSetting]);

    // 处理模态框打开时更新弹出时间
    const handleModalOpen = (visible: boolean) => {
        setIsAnnouncementModalVisible(visible);
        if (visible) {
            updatePopupTime();
        }
    };

    // 处理弹出设置变化
    const handlePopupSettingChange = (setting: PopupSetting) => {
        setPopupSetting(setting);
        setStoredPopupSetting(setting);
    };

    const contextValue: AnnouncementContextType = {
        announcements,
        latestActiveAnnouncement,
        isAnnouncementModalVisible,
        isHistoryModalVisible,
        popupSetting,
        setIsAnnouncementModalVisible: handleModalOpen,
        setIsHistoryModalVisible,
        setPopupSetting: handlePopupSettingChange,
        refreshAnnouncements,
    };

    return (
        <AnnouncementContext.Provider value={contextValue}>{children}</AnnouncementContext.Provider>
    );
};

export const useAnnouncement = (): AnnouncementContextType => {
    const context = useContext(AnnouncementContext);
    if (context === undefined) {
        throw new Error('useAnnouncement must be used within an AnnouncementProvider');
    }
    return context;
};
