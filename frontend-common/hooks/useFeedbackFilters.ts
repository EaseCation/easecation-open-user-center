// 反馈中心筛选器 Hook - 管理筛选状态和参数构建

import { useState, useCallback, useEffect } from 'react';

function readFromStorage(key: string): Partial<FeedbackFiltersState> | null {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as Partial<FeedbackFiltersState>;
    } catch {
        return null;
    }
}

export type FeedbackSortBy = 'createTime' | 'lastReplyTime' | 'heat' | 'completeTime';
export type FeedbackOrder = 'asc' | 'desc';

export interface FeedbackFiltersState {
    publicTagIds?: number[];
    internalTagIds?: number[];
    developerTagIds?: number[];
    progressTagIds?: number[];
    noProgressTag?: boolean;
    filterType?: string;
    filterStatus?: string | string[];
    sortBy: FeedbackSortBy;
    order: FeedbackOrder;
    page: number;
}

export interface UseFeedbackFiltersOptions {
    pageSize?: number;
    initialFilters?: Partial<FeedbackFiltersState>;
    storageKey?: string;
}

export interface UseFeedbackFiltersReturn {
    // 状态
    publicTagIds?: number[];
    internalTagIds?: number[];
    developerTagIds?: number[];
    progressTagIds?: number[];
    noProgressTag?: boolean;
    filterType?: string;
    filterStatus?: string | string[];
    sortBy: FeedbackSortBy;
    order: FeedbackOrder;
    page: number;
    pageSize: number;

    // 更新方法
    setPublicTagIds: (tagIds?: number[]) => void;
    setInternalTagIds: (tagIds?: number[]) => void;
    setDeveloperTagIds: (tagIds?: number[]) => void;
    setProgressTagIds: (tagIds?: number[]) => void;
    setNoProgressTag: (value?: boolean) => void;
    setFilterType: (type?: string) => void;
    setFilterStatus: (status?: string | string[]) => void;
    setSortBy: (sortBy: FeedbackSortBy) => void;
    setOrder: (order: FeedbackOrder) => void;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;

    // 重置筛选
    resetFilters: () => void;

    // 构建 API 参数
    buildParams: () => Record<string, string | number | string[] | number[]>;
}

/**
 * 反馈中心筛选器 Hook
 *
 * 用于管理反馈列表的筛选状态（标签、类型、状态、排序、分页）
 *
 * @example
 * ```tsx
 * const filters = useFeedbackFilters({ pageSize: 20 });
 *
 * // 使用筛选状态
 * <Segmented value={filters.sortBy} onChange={filters.setSortBy} />
 *
 * // 构建 API 请求参数
 * const params = filters.buildParams();
 * fetchData({ url: '/feedback/list', data: params });
 * ```
 */
export const useFeedbackFilters = (
    options: UseFeedbackFiltersOptions = {}
): UseFeedbackFiltersReturn => {
    const { pageSize: initialPageSize = 20, initialFilters = {}, storageKey } = options;

    const storedFilters = storageKey ? readFromStorage(storageKey) : null;
    const mergedInitial = { ...initialFilters, ...storedFilters };

    const [publicTagIds, setPublicTagIds] = useState<number[] | undefined>(
        mergedInitial.publicTagIds
    );
    const [internalTagIds, setInternalTagIds] = useState<number[] | undefined>(
        mergedInitial.internalTagIds
    );
    const [developerTagIds, setDeveloperTagIds] = useState<number[] | undefined>(
        mergedInitial.developerTagIds
    );
    const [progressTagIds, setProgressTagIds] = useState<number[] | undefined>(
        mergedInitial.progressTagIds
    );
    const [noProgressTag, setNoProgressTag] = useState<boolean | undefined>(
        mergedInitial.noProgressTag
    );
    const [filterType, setFilterType] = useState<string | undefined>(mergedInitial.filterType);
    const [filterStatus, setFilterStatus] = useState<string | string[] | undefined>(
        mergedInitial.filterStatus
    );
    const [sortBy, setSortBy] = useState<FeedbackSortBy>(mergedInitial.sortBy || 'createTime');
    const [order, setOrder] = useState<FeedbackOrder>(mergedInitial.order || 'desc');
    const [page, setPage] = useState<number>(mergedInitial.page || 1);
    const [pageSize, setPageSize] = useState<number>(initialPageSize);

    // 将筛选状态同步写入 sessionStorage
    useEffect(() => {
        if (!storageKey) return;
        const state: FeedbackFiltersState = {
            publicTagIds,
            internalTagIds,
            developerTagIds,
            progressTagIds,
            noProgressTag,
            filterType,
            filterStatus,
            sortBy,
            order,
            page,
        };
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
            // ignore
        }
    }, [storageKey, publicTagIds, internalTagIds, developerTagIds, progressTagIds, noProgressTag, filterType, filterStatus, sortBy, order, page]);

    // 重置所有筛选条件
    const resetFilters = useCallback(() => {
        if (storageKey) {
            try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
        }
        setPublicTagIds(undefined);
        setInternalTagIds(undefined);
        setDeveloperTagIds(undefined);
        setProgressTagIds(undefined);
        setNoProgressTag(undefined);
        setFilterType(undefined);
        setFilterStatus(undefined);
        setSortBy('createTime');
        setOrder('desc');
        setPage(1);
        setPageSize(initialPageSize);
    }, [storageKey, initialPageSize]);

    // 构建 API 请求参数
    const buildParams = useCallback((): Record<string, string | number | string[] | number[]> => {
        const params: Record<string, string | number | string[] | number[]> = {
            sortBy,
            order,
            page: String(page),
            pageSize: String(pageSize),
        };

        if (publicTagIds != null && publicTagIds.length > 0) params.publicTagIds = publicTagIds;
        if (internalTagIds != null && internalTagIds.length > 0)
            params.internalTagIds = internalTagIds;
        if (developerTagIds != null && developerTagIds.length > 0)
            params.developerTagIds = developerTagIds;
        if (noProgressTag) {
            params.noProgressTag = 'true';
        } else if (progressTagIds != null && progressTagIds.length > 0) {
            params.progressTagIds = progressTagIds;
        }
        if (filterType != null && filterType !== '') params.type = filterType;
        if (filterStatus != null) {
            if (Array.isArray(filterStatus) && filterStatus.length > 0) {
                params.status = filterStatus;
            } else if (typeof filterStatus === 'string' && filterStatus !== '') {
                params.status = filterStatus;
            }
        }

        return params;
    }, [publicTagIds, internalTagIds, developerTagIds, progressTagIds, noProgressTag, filterType, filterStatus, sortBy, order, page, pageSize]);

    return {
        // 状态
        publicTagIds,
        internalTagIds,
        developerTagIds,
        progressTagIds,
        noProgressTag,
        filterType,
        filterStatus,
        sortBy,
        order,
        page,
        pageSize,

        // 更新方法
        setPublicTagIds,
        setInternalTagIds,
        setDeveloperTagIds,
        setProgressTagIds,
        setNoProgressTag,
        setFilterType,
        setFilterStatus,
        setSortBy,
        setOrder,
        setPage,
        setPageSize,

        // 工具方法
        resetFilters,
        buildParams,
    };
};
