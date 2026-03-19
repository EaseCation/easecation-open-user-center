// Utility tools configuration
// Centralized configuration for utility tools used in both UtilityTools page and AdminToolsPanel

import {
    ProfileOutlined,
    KeyOutlined,
    IdcardOutlined,
    LinkOutlined,
    VideoCameraOutlined,
    ExclamationCircleOutlined,
    RobotOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import { gLang } from '@common/language';
import { CUSTOM_THEME_PALETTES } from '@common/themes/customPalettes';
import React from 'react';

export interface UtilityToolConfig {
    key: string;
    title: string;
    desc: string;
    route?: string;
    Icon: React.ComponentType<{ style?: React.CSSProperties }>;
    permission: string | null; // null means no permission required
    colorLight: string;
    colorDark: string;
}

/**
 * Get utility tools configuration
 * @returns Array of utility tool configurations
 */
export const getUtilityToolsConfig = (): UtilityToolConfig[] => {
    return [
        // 工单快捷操作 - requires authorize.normal
        {
            key: 'shortcut',
            title: gLang('adminMain.shortcut'),
            desc: gLang('utilityTools.shortcut.desc'),
            route: '/shortcut',
            Icon: ProfileOutlined,
            permission: 'authorize.normal',
            colorLight: '#1890ff',
            colorDark: '#69c0ff',
        },
        // 查看JWT令牌 - no permission required
        {
            key: 'jwt',
            title: gLang('adminMain.jwt.viewToken'),
            desc: gLang('utilityTools.jwt.desc'),
            Icon: KeyOutlined,
            permission: null,
            colorLight: '#722ed1',
            colorDark: '#b37feb',
        },
        // 客服昵称设置 - requires authorize.normal
        {
            key: 'staff-alias',
            title: gLang('adminMain.tools.staffAlias'),
            desc: gLang('utilityTools.staffAlias.desc'),
            route: '/staff-alias',
            Icon: IdcardOutlined,
            permission: 'authorize.normal',
            colorLight: '#52c41a',
            colorDark: '#7ed321',
        },
        // WIKI绑定管理 - requires ticket.WB
        {
            key: 'wiki-bindings',
            title: gLang('mediaAdmin.wikiBindings'),
            desc: gLang('utilityTools.wikiBindings.desc'),
            route: '/wiki-bindings',
            Icon: LinkOutlined,
            permission: 'ticket.WB',
            colorLight: '#faad14',
            colorDark: '#ffb74d',
        },
        // 媒体管理中心 - requires ticket.media
        {
            key: 'media',
            title: gLang('adminMain.ticket.media'),
            desc: gLang('utilityTools.media.desc'),
            route: '/media',
            Icon: VideoCameraOutlined,
            permission: 'ticket.media',
            colorLight: '#eb2f96',
            colorDark: '#ff85c0',
        },
        // 高风险操作审批 - no permission required
        {
            key: 'risk-approval',
            title: gLang('adminMain.risk.title'),
            desc: gLang('utilityTools.riskApproval.desc'),
            route: '/risk-approval',
            Icon: ExclamationCircleOutlined,
            permission: null,
            colorLight: '#faad14',
            colorDark: '#ffb74d',
        },
        // AI中心 - requires authorize.super
        {
            key: 'ai-center',
            title: gLang('adminMain.tools.aiCenter'),
            desc: gLang('utilityTools.aiCenter.desc'),
            route: '/ai-center',
            Icon: RobotOutlined,
            permission: 'authorize.super',
            colorLight: '#13c2c2',
            colorDark: '#36cfc9',
        },
        // 反馈管理 - no specific permission required
        {
            key: 'feedback-manage',
            title: gLang('feedback.manageTitle'),
            desc: gLang('utilityTools.feedbackManage.desc'),
            route: '/feedback',
            Icon: MessageOutlined,
            permission: null,
            colorLight: '#1890ff',
            colorDark: '#69c0ff',
        },
    ];
};
/**
 * Get color for utility tool with theme support
 */
export const getUtilityToolColor = (
    tool: UtilityToolConfig,
    getThemeColor: (options: any) => string
): string => {
    return getThemeColor({
        light: tool.colorLight,
        dark: tool.colorDark,
        custom: {
            blackOrange: CUSTOM_THEME_PALETTES.blackOrange.accent,
            whiteMinimal: CUSTOM_THEME_PALETTES.whiteMinimal.accent,
        },
    });
};
