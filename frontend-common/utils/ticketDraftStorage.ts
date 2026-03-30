import { TicketType } from '@ecuc/shared/types/ticket.types';

export interface TicketDraftPayload {
    formValues: Record<string, any>;
    uploadedFiles: string[];
    selectedQuickInsert: string | null;
    timestamp: number;
}

// ME类型工单完全不进行缓存
// 所有工单都不缓存附件
const filterPayloadForCaching = (payload: TicketDraftPayload): TicketDraftPayload => {
    const { ...filteredPayload } = payload;
    return {
        ...filteredPayload,
        uploadedFiles: [], // 所有工单都不缓存附件
    };
};

const STORAGE_PREFIX = 'ticket_draft_';
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Form keys that are not user-filled content for draft purposes */
const DRAFT_IGNORE_FORM_KEYS = new Set(['type', 'files']);

/**
 * Whether a single form value counts as user-filled (recursive for nested objects).
 * Attachments are not part of payload semantics here — `uploadedFiles` is cleared before checks.
 */
const isMeaningfulFormValue = (val: unknown): boolean => {
    if (val == null || val === '') {
        return false;
    }
    if (typeof val === 'string') {
        return val.trim().length > 0;
    }
    if (typeof val === 'boolean') {
        return val;
    }
    if (typeof val === 'number') {
        return !Number.isNaN(val);
    }
    if (Array.isArray(val)) {
        return val.some(item => isMeaningfulFormValue(item));
    }
    if (typeof val === 'object') {
        return Object.values(val as Record<string, unknown>).some(v => isMeaningfulFormValue(v));
    }
    return false;
};

/**
 * True when the draft has real user input worth persisting or restoring.
 * Does not use attachment paths — drafts never cache attachments.
 */
export const isTicketDraftPayloadMeaningful = (payload: TicketDraftPayload): boolean => {
    const quick = payload.selectedQuickInsert;
    if (quick != null && String(quick).trim() !== '') {
        return true;
    }
    const values = payload.formValues;
    if (!values || typeof values !== 'object') {
        return false;
    }
    for (const [key, val] of Object.entries(values)) {
        if (DRAFT_IGNORE_FORM_KEYS.has(key)) {
            continue;
        }
        if (isMeaningfulFormValue(val)) {
            return true;
        }
    }
    return false;
};

const isLocalStorageSupported = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        const testKey = '__ticket_draft_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
};

const storageAvailable = isLocalStorageSupported();

const getStorageKey = (ticketType: TicketType): string => `${STORAGE_PREFIX}${ticketType}`;

const setCookie = (key: string, value: string) => {
    if (typeof document === 'undefined') {
        return;
    }
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)};max-age=${COOKIE_MAX_AGE_SECONDS};path=/`;
};

const getCookie = (key: string): string | null => {
    if (typeof document === 'undefined') {
        return null;
    }
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
        const [cookieKey, ...rest] = cookie.split('=');
        if (decodeURIComponent(cookieKey) === key) {
            return decodeURIComponent(rest.join('='));
        }
    }
    return null;
};

const deleteCookie = (key: string) => {
    if (typeof document === 'undefined') {
        return;
    }
    document.cookie = `${encodeURIComponent(key)}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

export const saveTicketDraft = (ticketType: TicketType, payload: TicketDraftPayload) => {
    if (!ticketType) {
        return;
    }

    // ME类型工单完全不进行缓存
    if (ticketType === TicketType.MediaEvents) {
        return;
    }

    const key = getStorageKey(ticketType);
    // 所有工单都不缓存附件
    const filteredPayload = filterPayloadForCaching(payload);
    if (!isTicketDraftPayloadMeaningful(filteredPayload)) {
        clearTicketDraft(ticketType);
        return;
    }
    const serialized = JSON.stringify(filteredPayload);

    if (storageAvailable) {
        window.localStorage.setItem(key, serialized);
        return;
    }

    setCookie(key, serialized);
};

export const loadTicketDraft = (ticketType: TicketType): TicketDraftPayload | null => {
    if (!ticketType) {
        return null;
    }

    // ME类型工单完全不进行缓存，直接返回null
    if (ticketType === TicketType.MediaEvents) {
        return null;
    }

    const key = getStorageKey(ticketType);
    let storedValue: string | null = null;

    if (storageAvailable) {
        storedValue = window.localStorage.getItem(key);
    }

    if (!storedValue) {
        storedValue = getCookie(key);
    }

    if (!storedValue) {
        return null;
    }

    try {
        const parsed = JSON.parse(storedValue) as TicketDraftPayload;
        // 确保所有工单恢复时都不包含附件
        parsed.uploadedFiles = [];
        if (!isTicketDraftPayloadMeaningful(parsed)) {
            clearTicketDraft(ticketType);
            return null;
        }
        return parsed;
    } catch {
        clearTicketDraft(ticketType);
        return null;
    }
};

export const clearTicketDraft = (ticketType: TicketType) => {
    if (!ticketType) {
        return;
    }
    const key = getStorageKey(ticketType);
    if (storageAvailable) {
        window.localStorage.removeItem(key);
    }
    deleteCookie(key);
};
