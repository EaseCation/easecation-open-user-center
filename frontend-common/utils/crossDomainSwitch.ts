import axiosInstance from '@common/axiosConfig';
import { gLang } from '@common/language';
import { getGlobalMessageApi } from '@common/utils/messageApiHolder';

type DomainType = 'user' | 'admin';

interface SwitchDomainParams {
    type: DomainType;
    path: string;
}

const LOCAL_PORT_MAP: Record<DomainType, number> = {
    user: 9101,
    admin: 9102,
};

const isLocalHost = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';

const buildState = (returnTo: string) =>
    btoa(JSON.stringify({ return_to: returnTo }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

export const switchDomain = async ({ type, path }: SwitchDomainParams): Promise<void> => {
    try {
        const hostname = window.location.hostname;

        // Local environment: switch between local user/admin apps directly.
        if (isLocalHost(hostname)) {
            const token = localStorage.getItem('jwt') || '';
            const refreshToken = localStorage.getItem('jwt_refresh') || '';
            const state = buildState(path);
            const targetPort = LOCAL_PORT_MAP[type];
            const localUrl = `http://${hostname}:${targetPort}/login/callback?token=${encodeURIComponent(token)}&refresh_token=${encodeURIComponent(refreshToken)}&state=${encodeURIComponent(state)}&crossDomainSwitch=true`;
            window.location.href = localUrl;
            return;
        }

        const response = await axiosInstance.post('/user/cross-domain-switch?json=true', {
            type,
            path,
            refresh_token: localStorage.getItem('jwt_refresh') || undefined,
        });

        const responseData = response.data;
        if (responseData.EPF_code === 200 && responseData.redirectUrl) {
            window.location.href = responseData.redirectUrl;
            return;
        }

        const messageApi = getGlobalMessageApi();
        messageApi?.error(responseData.EPF_description || gLang('crossDomain.switchFailed'));
    } catch (error: any) {
        const messageApi = getGlobalMessageApi();
        if (error.response?.data?.EPF_description) {
            messageApi?.error(error.response.data.EPF_description);
        } else {
            messageApi?.error(gLang('crossDomain.switchFailedRetry'));
        }
    }
};
