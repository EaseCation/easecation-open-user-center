// 反馈中心发言资格 Context
// 在用户进入反馈相关页面时异步检查发言资格，结果缓存在内存中，避免每次回复都调用外部 API

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchData } from '@common/axiosConfig';
import { gLang } from '@common/language';
import { useAuth } from '@common/contexts/AuthContext';

/** 发言资格检查结果（与后端 FeedbackEligibilityResult 类型对应） */
export type FeedbackEligibilityResult =
    | { canSpeak: true; nickname: string | null; ecid: string | null; isAdmin?: boolean }
    | { canSpeak: false; reason: 'NOT_SET'; message: string; actionUrl: string }
    | { canSpeak: false; reason: 'UNBOUND'; ecid: string; message: string; actionUrl: string }
    | {
          canSpeak: false;
          reason: 'PUNISHED';
          ecid: string;
          punishmentType: string;
          message: string;
      };

interface FeedbackEligibilityContextType {
    /** 资格检查结果，null 表示尚未完成检查 */
    eligibility: FeedbackEligibilityResult | null;
    /** 是否正在检查中 */
    loading: boolean;
    /** 手动刷新资格状态（如保存设置后调用） */
    refresh: () => Promise<void>;
}

const FeedbackEligibilityContext = createContext<FeedbackEligibilityContextType | undefined>(
    undefined
);

export const FeedbackEligibilityProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { user } = useAuth();
    const [eligibility, setEligibility] = useState<FeedbackEligibilityResult | null>(null);
    const [loading, setLoading] = useState(true);
    // 防止重复请求的 flag
    const fetchingRef = useRef(false);

    const fetchEligibility = useCallback(async () => {
        if (!user?.openid) {
            setEligibility(null);
            setLoading(false);
            return;
        }
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setLoading(true);
        try {
            await fetchData({
                url: '/feedback/check-eligibility',
                method: 'GET',
                data: {},
                setData: (data: FeedbackEligibilityResult) => {
                    setEligibility(data);
                },
            });
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, [user?.openid]);

    useEffect(() => {
        fetchEligibility();
    }, [fetchEligibility]);

    return (
        <FeedbackEligibilityContext.Provider
            value={{ eligibility, loading, refresh: fetchEligibility }}
        >
            {children}
        </FeedbackEligibilityContext.Provider>
    );
};

export const useFeedbackEligibility = (): FeedbackEligibilityContextType => {
    const context = useContext(FeedbackEligibilityContext);
    if (!context) {
        throw new Error(gLang('feedbackEligibility.mustUseInProvider'));
    }
    return context;
};
