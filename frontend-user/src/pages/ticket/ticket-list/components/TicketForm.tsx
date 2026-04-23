// 发起新工单的表单组件，不包括媒体工单
// TODO refractor
//

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    App,
    Button,
    Col,
    DatePicker,
    Flex,
    Form,
    Input,
    Modal,
    Row,
    Select,
    InputNumber,
    Spin,
    TimePicker,
    Typography,
    Upload,
    message,
} from 'antd';
import {
    CloudOutlined,
    EditOutlined,
    NotificationOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);
import { Link } from 'react-router-dom';
import { gLang } from '@common/language';
import { fetchData, submitData } from '../../../../axiosConfig';
import { useUploadProps } from '@common/utils/uploadUtils';
import { Ticket, TicketAccount, TicketType } from '@ecuc/shared/types/ticket.types';
import { MediaListData, MediaStatus } from '@ecuc/shared/types/media.types';
import {
    GAME_MODES,
    RP_CHEAT_SIGNALS,
    RP_EVIDENCE_TYPES,
    RP_VIOLATION_CATEGORIES,
} from '@ecuc/shared/constants/ticket.constants';
import locale from 'antd/es/date-picker/locale/zh_CN';
import ErrorDisplay from '../../../../components/ErrorDisplay';
import quickInsertConfig, {
    QuickInsertExtraField,
    QuickInsertItem,
} from '../../../../config/quickInsert.config';
import {
    clearTicketDraft,
    loadTicketDraft,
    saveTicketDraft,
} from '@common/utils/ticketDraftStorage';
import { UploadFile } from 'antd/es/upload/interface';
import { convertUTCToFormat } from '@common/components/TimeConverter';
import { useAuth } from '@common/contexts/AuthContext';
import AccountMatchingFormItem from '../../../../components/AccountMatchingFormItem';

const { Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const SAVE_INTERVAL_MS = 5000;

const findOptionName = (
    options: Array<{ key: string; name: string }>,
    optionKey?: string
): string | undefined => {
    if (!optionKey) {
        return undefined;
    }
    return options.find(option => option.key === optionKey)?.name;
};

const normalizeTargetValue = (value?: string): string => (value ?? '').trim().toLowerCase();
const isEmptyQuickInsertValue = (value: unknown): boolean => {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim() === '';
    }
    return false;
};

const getQuickInsertFieldDisplayValue = (
    field: QuickInsertExtraField,
    value: unknown
): string | number => {
    if (field.inputType === 'select' && field.options) {
        const matched = field.options.find(option => option.value === value);
        if (matched) {
            return gLang(matched.labelKey);
        }
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    return value as string | number;
};

const buildRpDetails = (values: Record<string, any>): string => {
    const violationCategoryName =
        findOptionName(RP_VIOLATION_CATEGORIES, values.violationCategory) ??
        values.violationCategory;
    const evidenceTypeName =
        findOptionName(RP_EVIDENCE_TYPES, values.evidenceType) ?? values.evidenceType;
    const cheatSignalNames =
        values.violationCategory === 'cheat' && Array.isArray(values.cheatSignals)
            ? values.cheatSignals
                  .map((signal: string) => findOptionName(RP_CHEAT_SIGNALS, signal) ?? signal)
                  .join(', ')
            : '';

    const lines = [
        `${gLang('ticketList.rpFields.violationCategory')}: ${violationCategoryName ?? ''}`,
        `${gLang('ticketList.rpFields.cheatSignals')}: ${cheatSignalNames || gLang('ticket.none')}`,
        `${gLang('ticketList.rpFields.evidenceType')}: ${evidenceTypeName ?? ''}`,
    ];

    if (values.evidenceType === 'replay') {
        lines.push(`${gLang('ticketList.rpFields.replayCode')}: ${values.replayCode ?? ''}`);
    }
    if (values.evidenceType === 'video') {
        lines.push(`${gLang('ticketList.rpFields.videoUrl')}: ${values.videoUrl ?? ''}`);
    }

    lines.push(`${gLang('ticketList.rpFields.sceneSummary')}: ${values.sceneSummary ?? ''}`);

    return lines.join('\n');
};

const sanitizeFormValuesForDraft = (values: Record<string, any>): Record<string, any> => {
    const sanitized: Record<string, any> = { ...values };
    if (sanitized.happened_at_date && dayjs.isDayjs(sanitized.happened_at_date)) {
        sanitized.happened_at_date = sanitized.happened_at_date.toISOString();
    }
    if (sanitized.happened_at_time && dayjs.isDayjs(sanitized.happened_at_time)) {
        sanitized.happened_at_time = sanitized.happened_at_time.format('HH:mm');
    }
    delete sanitized.files;
    return sanitized;
};

const restoreFormValuesFromDraft = (values: Record<string, any>): Record<string, any> => {
    const restored: Record<string, any> = { ...values };
    if (restored.happened_at_date) {
        const date = dayjs(restored.happened_at_date);
        restored.happened_at_date = date.isValid() ? date : undefined;
    }
    if (restored.happened_at_time) {
        const time = dayjs(restored.happened_at_time, 'HH:mm');
        restored.happened_at_time = time.isValid() ? time : undefined;
    }
    return restored;
};

const extractDisplayFileName = (filePath: string): string => {
    const lastSegment = filePath.split('/').pop() ?? filePath;
    const underscoreIndex = lastSegment.indexOf('_');
    return underscoreIndex >= 0 ? lastSegment.substring(underscoreIndex + 1) : lastSegment;
};

const mapUploadedFilesToFileList = (files: string[]): UploadFile[] => {
    return files.map(filePath => ({
        uid: filePath,
        name: extractDisplayFileName(filePath),
        status: 'done' as UploadFile['status'],
    }));
};

/** 深度链接 ?event=wechat|rednote|other �?ME 工单活动（quickInsert）键 */
const MEDIA_EVENT_QUERY_TO_ACTIVITY: Record<'wechat' | 'rednote' | 'other', string> = {
    wechat: 'ECNET_LIKE',
    rednote: 'ECXHS_POST',
    other: 'OTHER',
};

const MEDIA_EVENT_CARD_META: Record<
    string,
    { icon: React.ReactNode; color: string; shadow: string; summaryKey: string }
> = {
    ECNET_LIKE: {
        icon: <NotificationOutlined />,
        color: '#13C2C2',
        shadow: 'rgba(19, 194, 194, 0.28)',
        summaryKey: 'ticketList.mediaEventSummary.ECNET_LIKE',
    },
    ECXHS_POST: {
        icon: <EditOutlined />,
        color: '#F759AB',
        shadow: 'rgba(247, 89, 171, 0.28)',
        summaryKey: 'ticketList.mediaEventSummary.ECXHS_POST',
    },
    CLOUD_MATERIAL: {
        icon: <CloudOutlined />,
        color: '#2F54EB',
        shadow: 'rgba(47, 84, 235, 0.3)',
        summaryKey: 'ticketList.mediaEventSummary.CLOUD_MATERIAL',
    },
    OTHER: {
        icon: <UploadOutlined />,
        color: '#52C41A',
        shadow: 'rgba(82, 196, 26, 0.3)',
        summaryKey: 'ticketList.mediaEventSummary.OTHER',
    },
};

export type TicketFormInitialMediaEvent = keyof typeof MEDIA_EVENT_QUERY_TO_ACTIVITY;
export type TicketFormInitialMediaActivityKey = 'ECNET_LIKE' | 'ECXHS_POST' | 'CLOUD_MATERIAL' | 'OTHER';

interface TicketFormProps {
    setIsModalOpen: (open: boolean) => void;
    initialType?: TicketType;
    hideTypeSelector?: boolean;
    /** /ticket/new?type=ME&event=wechat|rednote|other 时预填媒体活�?*/
    initialMediaEvent?: TicketFormInitialMediaEvent;
    /** 预设媒体活动模板键（用于二级弹窗选择后直达表单） */
    initialMediaActivityKey?: TicketFormInitialMediaActivityKey;
}

const TicketForm: React.FC<TicketFormProps> = ({
    setIsModalOpen,
    initialType,
    hideTypeSelector,
    initialMediaEvent,
    initialMediaActivityKey,
}) => {
    const resolvedInitialMediaActivityKey =
        initialMediaActivityKey ??
        (initialMediaEvent ? MEDIA_EVENT_QUERY_TO_ACTIVITY[initialMediaEvent] : undefined);
    const [form] = Form.useForm();
    // useModal 初始�?
    const [modal, modalContextHolder] = Modal.useModal();
    const { modal: appModal } = App.useApp();
    const { user } = useAuth();

    const [isSubmitBtnDisabled, setIsSubmitBtnDisabled] = useState(false);
    const [isSpinning, setIsSpinning] = useState(true);
    const [ticketType, setTicketType] = useState<TicketType>(initialType || TicketType.None);
    const [selectedQuickInsert, setSelectedQuickInsert] = useState<string | null>(
        initialType === TicketType.MediaEvents && resolvedInitialMediaActivityKey
            ? resolvedInitialMediaActivityKey
            : null
    );
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const [isSubmitFlowLocked, setIsSubmitFlowLocked] = useState(false);
    const [isConfirmActionLocked, setIsConfirmActionLocked] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<boolean>(false);
    const [messageApi, messageContextHolder] = message.useMessage();
    const rpViolationCategory = Form.useWatch('violationCategory', form);
    const rpEvidenceType = Form.useWatch('evidenceType', form);
    const cloudMaterialPurchaseMethod = Form.useWatch('cloudMaterialPurchaseMethod', form);

    // ME工单媒体账号状态检�?
    const [mediaData, setMediaData] = useState<MediaListData | null>(null);
    const [mediaStatusError, setMediaStatusError] = useState<string>('');
    const { uploadProps, contextHolder } = useUploadProps(
        10,
        uploadedFiles,
        setUploadedFiles,
        setIsUploading
    );
    const submittingModalRef = useRef<{ destroy: () => void } | null>(null);
    const clearedAccountRef = useRef<string | null>(null);
    /** While true, skip persisting draft until user answers restore prompt (avoids overwriting storage with empty form). */
    const draftResolutionPendingRef = useRef(false);
    /** 记录已通过 URL 预填�?ME 活动，避免依赖项变化导致重复 apply（如重复拼接详情模板�?*/
    const lastMediaUrlPresetRef = useRef<string | null>(null);
    const tryApplyInitialMediaEventRef = useRef<() => void>(() => undefined);
    const tryApplyInitialMediaActivityKeyRef = useRef<() => void>(() => undefined);
    const closeSubmittingModal = () => {
        submittingModalRef.current?.destroy();
        submittingModalRef.current = null;
    };
    const openSubmittingModal = () => {
        if (submittingModalRef.current) {
            return;
        }
        submittingModalRef.current = appModal.info({
            icon: null,
            title: null,
            content: (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: '12px',
                        padding: '8px 0',
                    }}
                >
                    <img
                        src="/logo/EaseCation.png"
                        alt=""
                        className="easecation-logo-breathe"
                        style={{ width: 160, height: 160, objectFit: 'contain' }}
                    />
                    <Flex align="center" justify="center" gap={8}>
                        <Spin size="small" />
                        <Paragraph style={{ marginBottom: 0, fontSize: '18px', fontWeight: 600 }}>
                            {gLang('ticketList.submittingTitle')}
                        </Paragraph>
                    </Flex>
                </div>
            ),
            okButtonProps: {
                style: { display: 'none' },
            },
            closable: false,
            maskClosable: false,
            keyboard: false,
            centered: true,
        });
    };

    // 获取媒体账号信息
    const fetchMediaData = useCallback(async () => {
        try {
            await fetchData({
                url: '/media/list',
                method: 'GET',
                data: {},
                setData: setMediaData,
            });
            return true;
        } catch {
            setMediaData(null);
            return false;
        }
    }, []);

    // ME����ý���˺�״̬���
    const checkMediaStatusForME = useCallback(
        (mediaData: MediaListData | null) => {
            if (ticketType !== TicketType.MediaEvents) {
                setMediaStatusError('');
                return true;
            }
            
            if (selectedQuickInsert === 'CLOUD_MATERIAL') {
                setMediaStatusError('');
                return true;
            }

            if (
                !mediaData ||
                !mediaData.media ||
                [MediaStatus.Player].includes(mediaData.media.status as MediaStatus)
            ) {
                setMediaStatusError('no_media_account');
                return false;
            }

            const status = mediaData.media.status;
            if ([MediaStatus.Frozen].includes(status as MediaStatus)) {
                setMediaStatusError('invalid_media_status');
                return false;
            }

            setMediaStatusError('');
            return true;
        },
        [ticketType, selectedQuickInsert]
    );

    const applyQuickInsertAvailability = useCallback(
        (configItem?: QuickInsertItem) => {
            let shouldDisableBtn = false;
            let submitText = gLang('ticketList.submit');

            // 检查ME工单的媒体账号状�?
            if (ticketType === TicketType.MediaEvents) {
                const isMediaStatusValid = checkMediaStatusForME(mediaData);
                if (!isMediaStatusValid) {
                    shouldDisableBtn = true;
                    submitText = gLang('ticketList.submit');
                }
            }

            if (configItem) {
                const now = new Date();
                if (configItem.startTime) {
                    const start = new Date(configItem.startTime + 'T00:00:00.000Z');
                    if (now < start) {
                        shouldDisableBtn = true;
                        submitText = gLang('ticketList.notstarttime');
                    }
                }
                if (configItem.endTime) {
                    const end = new Date(configItem.endTime + 'T23:59:59.999Z');
                    if (now > end) {
                        shouldDisableBtn = true;
                        submitText = gLang('ticketList.endtime');
                    }
                }
            }
            setSubmitBtnText(submitText);
            setIsSubmitBtnDisabled(shouldDisableBtn);
        },
        [ticketType, checkMediaStatusForME, mediaData]
    );

    const handleSubmit = async (values: any) => {
        setIsSubmitFlowLocked(true);
        setError(false);
        try {
            const configItem = quickInsertConfig[ticketType]?.[values.activity];
            let details = values.details ?? '';
            if (configItem?.extraFields?.length) {
                const titleDetails = gLang(configItem.titleKey).toString();
                const extraDetails = configItem.extraFields
                    .map(field => {
                        const label = gLang(field.labelKey).toString();
                        const rawValue = values[field.name];
                        if (isEmptyQuickInsertValue(rawValue)) {
                            return '';
                        }
                        const value = getQuickInsertFieldDisplayValue(field, rawValue);
                        return `${label}: ${value}`;
                    })
                    .filter(Boolean)
                    .join('\n');
                const detailsAll = [titleDetails, extraDetails, details].filter(Boolean).join('\n');
                details = detailsAll;
            }
            if (ticketType === TicketType.ReportPlayer) {
                details = buildRpDetails(values);
            }

            const targetValue = [TicketType.ReportPlayer, TicketType.Others].includes(ticketType)
                ? values.targetChoose
                : values.target;
            let submitTitle = values.title;
            if (ticketType === TicketType.MediaEvents && values.activity === 'CLOUD_MATERIAL') {
                const cloudMaterialTitle = String(values.cloudMaterialTitle ?? '').trim();
                submitTitle = gLang('ticketList.cloudMaterialTicketTitle', {
                    title: cloudMaterialTitle,
                }).trim();
            }

            if (ticketType === TicketType.ReportPlayer) {
                const normalizedTarget = normalizeTargetValue(targetValue);
                if (normalizedTarget) {
                    let ticketList: Ticket[] = [];
                    try {
                        await fetchData({
                            url: '/ticket/list',
                            method: 'GET',
                            data: {},
                            setData: (data: Ticket[]) => {
                                ticketList = Array.isArray(data) ? data : [];
                            },
                        });
                    } catch {
                        ticketList = [];
                    }

                    const rpTicketIds = ticketList
                        .filter(item => item.type === TicketType.ReportPlayer && Number(item.tid) > 0)
                        .map(item => Number(item.tid));

                    const rpTicketDetails = await Promise.all(
                        rpTicketIds.map(async tid => {
                            let detail: Ticket | undefined;
                            try {
                                await fetchData({
                                    url: '/ticket/detail',
                                    method: 'GET',
                                    data: { tid },
                                    setData: (data: Ticket) => {
                                        detail = data;
                                    },
                                });
                            } catch {
                                detail = undefined;
                            }
                            return detail;
                        })
                    );

                    const sevenDaysAgo = dayjs().subtract(7, 'day');
                    const duplicateCount = rpTicketDetails.filter(item => {
                        if (!item) {
                            return false;
                        }
                        if (normalizeTargetValue(item.target) !== normalizedTarget) {
                            return false;
                        }
                        const createdAt = dayjs(item.create_time);
                        if (!createdAt.isValid()) {
                            return false;
                        }
                        return createdAt.isAfter(sevenDaysAgo) || createdAt.isSame(sevenDaysAgo);
                    }).length;

                    if (duplicateCount >= 1) {
                        const shouldContinue = await new Promise<boolean>(resolve => {
                            modal.confirm({
                                title: gLang('ticketList.rpDuplicateReport.title'),
                                content: (
                                    <Typography>
                                        <Paragraph>
                                            {gLang('ticketList.rpDuplicateReport.content1')}
                                        </Paragraph>
                                        <Paragraph style={{ color: '#EC5B56' }}>
                                            {gLang('ticketList.rpDuplicateReport.content2')}
                                        </Paragraph>
                                    </Typography>
                                ),
                                okText: gLang('ticketList.rpDuplicateReport.okText'),
                                cancelText: gLang('ticketList.rpDuplicateReport.cancelText'),
                                onOk: () => {
                                    resolve(true);
                                },
                                onCancel: () => {
                                    resolve(false);
                                },
                            });
                        });

                        if (!shouldContinue) {
                            setIsSubmitFlowLocked(false);
                            setIsConfirmActionLocked(false);
                            closeSubmittingModal();
                            return;
                        }
                    }
                }
            }

            const typeToClear = (values.type || ticketType) as TicketType;
            openSubmittingModal();
            setIsModalOpen(false);
            await submitData({
                data: {
                    type: values.type,
                    account: values.account,
                    target: targetValue,
                    details: details,
                    files: uploadedFiles,
                    happened_at_date: values.happened_at_date,
                    happened_at_time: values.happened_at_time,
                    gameMode: values.gameMode,
                    title: submitTitle,
                },
                url: '/ticket/new',
                redirectTo: '/ticket?submitted=1',
                successMessage: 'ticketList.success',
                method: 'POST',
                setIsFormDisabled: setIsFormDisabled,
                setIsModalOpen: setIsModalOpen,
            });
            if (typeToClear) {
                clearTicketDraft(typeToClear);
            }
        } catch {
            setError(true);
            setIsFormDisabled(false);
            setIsSubmitFlowLocked(false);
            setIsConfirmActionLocked(false);
            closeSubmittingModal();
        }
    };

    const applyQuickInsertByKey = useCallback(
        async (value: string) => {
            setSelectedQuickInsert(value);
            const configItem = quickInsertConfig[ticketType]?.[value];
            applyQuickInsertAvailability(configItem);
            if (!configItem) return;
            if (configItem.extraFields?.length) {
                form.resetFields(configItem.extraFields.map(f => f.name));

                // 处理autoType字段
                for (const field of configItem.extraFields) {
                    if (field.autoType === 'mediaID') {
                        try {
                            // 获取当前用户的openid
                            const userOpenid = user?.openid;
                            if (userOpenid) {
                                // 调用API获取媒体信息
                                let mediaId = null;
                                await fetchData({
                                    url: '/media/list',
                                    method: 'GET',
                                    data: {},
                                    setData: response => {
                                        if (response && response.is_media_member && response.media) {
                                            mediaId = response.media.id;
                                        }
                                    },
                                });

                                if (mediaId) {
                                    // 如果有媒体信息，填写媒体ID
                                    form.setFieldValue(field.name, mediaId);
                                } else {
                                    // 如果没有媒体信息，填�?�?
                                    form.setFieldValue(field.name, gLang('ticket.none'));
                                }
                            } else {
                                // 如果没有openid，填�?�?
                                form.setFieldValue(field.name, gLang('ticket.none'));
                            }
                        } catch {
                            // 出错时填�?�?
                            form.setFieldValue(field.name, gLang('ticket.none'));
                        }
                    }
                }
            } else {
                const details = form.getFieldValue('details') ?? '';
                const template = gLang(configItem.contentKey).toString();
                form.setFieldsValue({
                    details: details !== '' ? `${template}\n${details}` : template,
                });
            }
        },
        [ticketType, applyQuickInsertAvailability, form, user]
    );

    const handleQuickInsertChange = (value: string) => {
        form.setFieldValue('activity', value);
        void applyQuickInsertByKey(value);
    };

    useEffect(() => {
        if (
            selectedQuickInsert !== 'CLOUD_MATERIAL' ||
            cloudMaterialPurchaseMethod === 'ec_coin' ||
            cloudMaterialPurchaseMethod === 'voucher'
        ) {
            return;
        }
        form.setFieldValue('cloudMaterialPrice', undefined);
    }, [selectedQuickInsert, cloudMaterialPurchaseMethod, form]);

    const [chooseGameList, setChooseGameList] = useState<TicketAccount[]>([]);
    const [chooseGameFrozenList, setChooseGameFrozenList] = useState<TicketAccount[]>([]);
    const [submitBtnText, setSubmitBtnText] = useState<string>(gLang('ticketList.submit'));
    const [accountOptionsLoaded, setAccountOptionsLoaded] = useState(false);

    // 自招申请状态：'before' - 未开�? 'open' - 进行�? 'closed' - 已结�?
    const [adminApplicationStatus, setAdminApplicationStatus] = useState<
        'before' | 'open' | 'closed'
    >('before');
    const [countdown, setCountdown] = useState('');

    const [openTime, setOpenTime] = useState(dayjs());
    const [closeTime, setCloseTime] = useState(dayjs());

    const tryApplyInitialMediaEvent = useCallback(() => {
        if (!initialMediaEvent || ticketType !== TicketType.MediaEvents) {
            return;
        }
        if (draftResolutionPendingRef.current || isSpinning || error || !accountOptionsLoaded) {
            return;
        }
        const activityKey = MEDIA_EVENT_QUERY_TO_ACTIVITY[initialMediaEvent];
        if (!activityKey || !quickInsertConfig[TicketType.MediaEvents]?.[activityKey]) {
            return;
        }
        const presetKey = `${initialMediaEvent}:${activityKey}`;
        if (lastMediaUrlPresetRef.current === presetKey) {
            return;
        }
        lastMediaUrlPresetRef.current = presetKey;
        form.setFieldsValue({ activity: activityKey });
        void applyQuickInsertByKey(activityKey);
    }, [
        initialMediaEvent,
        ticketType,
        isSpinning,
        error,
        accountOptionsLoaded,
        form,
        applyQuickInsertByKey,
    ]);

    const tryApplyInitialMediaActivityKey = useCallback(() => {
        if (!resolvedInitialMediaActivityKey || ticketType !== TicketType.MediaEvents) {
            return;
        }
        if (draftResolutionPendingRef.current || isSpinning || error || !accountOptionsLoaded) {
            return;
        }
        if (!quickInsertConfig[TicketType.MediaEvents]?.[resolvedInitialMediaActivityKey]) {
            return;
        }
        const presetKey = `activity_key:${resolvedInitialMediaActivityKey}`;
        if (lastMediaUrlPresetRef.current === presetKey) {
            return;
        }
        lastMediaUrlPresetRef.current = presetKey;
        form.setFieldsValue({ activity: resolvedInitialMediaActivityKey });
        void applyQuickInsertByKey(resolvedInitialMediaActivityKey);
    }, [
        resolvedInitialMediaActivityKey,
        ticketType,
        isSpinning,
        error,
        accountOptionsLoaded,
        form,
        applyQuickInsertByKey,
    ]);

    tryApplyInitialMediaEventRef.current = tryApplyInitialMediaEvent;
    tryApplyInitialMediaActivityKeyRef.current = tryApplyInitialMediaActivityKey;

    useEffect(() => {
        tryApplyInitialMediaEvent();
    }, [tryApplyInitialMediaEvent]);
    useEffect(() => {
        tryApplyInitialMediaActivityKey();
    }, [tryApplyInitialMediaActivityKey]);

    useEffect(() => {
        if (!ticketType) {
            return;
        }
        const draft = loadTicketDraft(ticketType);
        if (!draft) {
            draftResolutionPendingRef.current = false;
            setUploadedFiles([]);
            const presetMediaActivity =
                ticketType === TicketType.MediaEvents ? resolvedInitialMediaActivityKey : undefined;
            setSelectedQuickInsert(presetMediaActivity ?? null);
            form.setFieldsValue({
                type: ticketType,
                files: [],
                activity: presetMediaActivity,
            });
            if (presetMediaActivity) {
                void applyQuickInsertByKey(presetMediaActivity);
            }
            applyQuickInsertAvailability();
            return;
        }

        draftResolutionPendingRef.current = true;
        setUploadedFiles([]);
        setSelectedQuickInsert(null);
        form.setFieldsValue({ type: ticketType, files: [] });
        applyQuickInsertAvailability();

        const applyDraftToForm = () => {
            const restoredValues = restoreFormValuesFromDraft(draft.formValues);
            const fileList = mapUploadedFilesToFileList(draft.uploadedFiles ?? []);
            setUploadedFiles(draft.uploadedFiles ?? []);

            const draftQuickInsert = draft.selectedQuickInsert ?? null;
            const quickInsertConfigItem = draftQuickInsert
                ? quickInsertConfig[ticketType]?.[draftQuickInsert]
                : undefined;

            if (!quickInsertConfigItem) {
                setSelectedQuickInsert(null);
                applyQuickInsertAvailability();
            } else {
                setSelectedQuickInsert(draftQuickInsert);
                applyQuickInsertAvailability(quickInsertConfigItem);
            }

            form.setFieldsValue({
                ...restoredValues,
                type: ticketType,
                files: fileList,
            });
        };

        const instance = modal.confirm({
            title: gLang('ticketList.draftRestorePromptTitle'),
            content: gLang('ticketList.draftRestorePromptContent'),
            okText: gLang('ticketList.draftRestoreOk'),
            cancelText: gLang('ticketList.draftRestoreCancel'),
            onOk: () => {
                draftResolutionPendingRef.current = false;
                applyDraftToForm();
                messageApi.success(gLang('ticketList.draftRestored'));
            },
            onCancel: () => {
                draftResolutionPendingRef.current = false;
                clearTicketDraft(ticketType);
                queueMicrotask(() => {
                    tryApplyInitialMediaEventRef.current();
                    tryApplyInitialMediaActivityKeyRef.current();
                });
            },
        });

        return () => {
            instance.destroy();
        };
    }, [ticketType, form, messageApi, applyQuickInsertAvailability, modal]);

    useEffect(() => {
        if (!ticketType) {
            return;
        }
        const intervalId = window.setInterval(() => {
            if (draftResolutionPendingRef.current) {
                return;
            }
            const currentValues = form.getFieldsValue(true);
            const valuesToSave = sanitizeFormValuesForDraft({
                ...currentValues,
                type: ticketType,
            });
            saveTicketDraft(ticketType, {
                formValues: valuesToSave,
                uploadedFiles,
                selectedQuickInsert,
                timestamp: Date.now(),
            });
        }, SAVE_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
            if (draftResolutionPendingRef.current) {
                return;
            }
            const currentValues = form.getFieldsValue(true);
            const valuesToSave = sanitizeFormValuesForDraft({
                ...currentValues,
                type: ticketType,
            });
            saveTicketDraft(ticketType, {
                formValues: valuesToSave,
                uploadedFiles,
                selectedQuickInsert,
                timestamp: Date.now(),
            });
        };
    }, [form, ticketType, uploadedFiles, selectedQuickInsert]);

    useEffect(() => {
        fetchData({
            url: '/ticket/adminRecruitmentTime',
            method: 'GET',
            data: {},
            setData: (data: { openTime: string; closeTime: string }) => {
                setOpenTime(dayjs(data.openTime));
                setCloseTime(dayjs(data.closeTime));
            },
        });
    }, []);

    useEffect(() => {
        setIsSpinning(true);
        setError(false);
        setAccountOptionsLoaded(false);
        const fetchPromises = [
            fetchData({
                url: '/ticket/chooseList',
                method: 'GET',
                data: { type: 'game' },
                setData: setChooseGameList,
            }),
            fetchData({
                url: '/ticket/chooseList',
                method: 'GET',
                data: { type: 'frozen' },
                setData: setChooseGameFrozenList,
            }),
        ];

        // 如果是ME工单，需要获取媒体账号信�?
        if (ticketType === TicketType.MediaEvents) {
            fetchPromises.push(
                fetchMediaData().then(success => {
                    if (!success) {
                        setError(true);
                    }
                })
            );
        }

        Promise.all(fetchPromises).finally(() => {
            setIsSpinning(false);
            setAccountOptionsLoaded(true);
        });
    }, [ticketType, fetchMediaData]);

    useEffect(() => {
        if (!ticketType || !accountOptionsLoaded || error) {
            return;
        }

        const currentAccountId = form.getFieldValue('account');
        if (!currentAccountId) {
            return;
        }

        const availableAccounts =
            (ticketType === TicketType.WeChatUnfreeze ? chooseGameFrozenList : chooseGameList) ??
            [];
        const isAccountStillBound = availableAccounts.some(
            account => account.id === currentAccountId
        );

        if (isAccountStillBound) {
            return;
        }

        const previousClearedAccount = clearedAccountRef.current;
        clearedAccountRef.current = currentAccountId;
        form.setFieldsValue({ account: undefined });

        if (previousClearedAccount !== currentAccountId) {
            messageApi.warning(gLang('ticketList.accountNoLongerBound'));
        }

        if (draftResolutionPendingRef.current) {
            return;
        }

        const currentValues = form.getFieldsValue(true);
        const sanitizedValues = sanitizeFormValuesForDraft({
            ...currentValues,
            account: undefined,
            type: ticketType,
        });

        saveTicketDraft(ticketType, {
            formValues: sanitizedValues,
            uploadedFiles,
            selectedQuickInsert,
            timestamp: Date.now(),
        });
    }, [
        accountOptionsLoaded,
        chooseGameFrozenList,
        chooseGameList,
        clearedAccountRef,
        form,
        messageApi,
        error,
        selectedQuickInsert,
        ticketType,
        uploadedFiles,
    ]);

    // 倒计�?
    useEffect(() => {
        const timer = setInterval(() => {
            const now = dayjs();

            if (now.isBefore(openTime)) {
                setAdminApplicationStatus('before');
                const diff = openTime.diff(now);
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setCountdown(
                    gLang('ticket.durationDhms', {
                        days: String(days),
                        hours: String(hours),
                        minutes: String(minutes),
                        seconds: String(seconds),
                    })
                );
            } else if (now.isBetween(openTime, closeTime)) {
                setAdminApplicationStatus('open');
                const diff = closeTime.diff(now);
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setCountdown(
                    gLang('ticket.durationDhms', {
                        days: String(days),
                        hours: String(hours),
                        minutes: String(minutes),
                        seconds: String(seconds),
                    })
                );
            } else {
                setAdminApplicationStatus('closed');
                setCountdown('');
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [openTime, closeTime]);

    const handleSubmitClick = () => {
        modal.confirm({
            title: gLang('ticketList.confirmTitle'),
            content: (
                <Typography>
                    <Paragraph>{gLang('ticketList.confirmContent1')}</Paragraph>
                    <Paragraph>{gLang('ticketList.confirmContent2')}</Paragraph>
                    <Paragraph style={{ color: '#EC5B56' }}>
                        {gLang('ticketList.confirmContent3')}
                    </Paragraph>
                </Typography>
            ),
            okButtonProps: {
                disabled: isConfirmActionLocked || isSubmitFlowLocked,
            },
            cancelButtonProps: {
                disabled: isConfirmActionLocked || isSubmitFlowLocked,
            },
            onOk: () => {
                setIsConfirmActionLocked(true);
                setIsSubmitFlowLocked(true);
                form.submit();
            },
        });
    };

    const handleClear = () => {
        modal.confirm({
            title: gLang('ticketList.clearConfirmTitle'),
            content: gLang('ticketList.clearConfirmContent'),
            onOk: () => {
                // Clear form fields except type
                const currentType = form.getFieldValue('type');
                form.resetFields();
                form.setFieldsValue({
                    type: currentType,
                    files: [],
                });

                // Clear uploaded files
                setUploadedFiles([]);

                // Clear quick insert selection
                setSelectedQuickInsert(null);

                // Clear draft
                if (ticketType) {
                    clearTicketDraft(ticketType);
                }

                if (
                    ticketType === TicketType.MediaEvents &&
                    (initialMediaEvent || initialMediaActivityKey)
                ) {
                    lastMediaUrlPresetRef.current = null;
                }

                messageApi.success(gLang('ticketList.clearSuccess'));
            },
        });
    };

    const shouldHideMeActivitySelector =
        ticketType === TicketType.MediaEvents &&
        hideTypeSelector &&
        Boolean(resolvedInitialMediaActivityKey);
    const shouldShowMeActivityFormFields =
        ticketType !== TicketType.MediaEvents ||
        Boolean(selectedQuickInsert) ||
        Boolean(shouldHideMeActivitySelector && resolvedInitialMediaActivityKey);
    const attachmentExtraText =
        ticketType === TicketType.MediaEvents && selectedQuickInsert === 'CLOUD_MATERIAL'
            ? gLang('ticketList.cloudMaterialAttachmentNote')
            : gLang('ticketList.attachmentsExtra');

    return (
        <>
            {contextHolder}
            {messageContextHolder}
            {modalContextHolder}
            {isSpinning && !error && <Spin spinning={true} fullscreen />}
            {error && (
                <ErrorDisplay
                    onRetry={() => {
                        setError(false);
                        setIsSpinning(true);
                        // 重新加载数据
                        Promise.all([
                            fetchData({
                                url: '/ticket/chooseList',
                                method: 'GET',
                                data: { type: 'game' },
                                setData: setChooseGameList,
                            }),
                            fetchData({
                                url: '/ticket/chooseList',
                                method: 'GET',
                                data: { type: 'frozen' },
                                setData: setChooseGameFrozenList,
                            }),
                        ]).finally(() => setIsSpinning(false));
                    }}
                />
            )}
            {!error && (
                <Typography>
                    <Paragraph>{gLang('ticketList.newIntro')}</Paragraph>
                    {/* 管理员申请工�?*/}
                    {ticketType && [TicketType.Application].includes(ticketType) && (
                        <>
                            {adminApplicationStatus === 'before' && (
                                <Typography>
                                    <Paragraph
                                        style={{
                                            color: '#1890ff',
                                            fontWeight: 'bold',
                                            fontSize: '16px',
                                        }}
                                    >
                                        {gLang('ticketList.adminRecruit.before.title', {
                                            countdown,
                                        })}
                                    </Paragraph>
                                    <Paragraph style={{ color: '#1890ff' }}>
                                        {gLang('ticketList.adminRecruit.before.openTime', {
                                            time: convertUTCToFormat(
                                                openTime.toISOString(),
                                                gLang('ticket.dateTimeFormat')
                                            ),
                                        })}
                                    </Paragraph>
                                    <Paragraph style={{ color: '#1890ff' }}>
                                        {gLang('ticketList.adminRecruit.before.closeTime', {
                                            time: convertUTCToFormat(
                                                closeTime.toISOString(),
                                                gLang('ticket.dateTimeFormat')
                                            ),
                                        })}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.before.intro')}
                                    </Paragraph>
                                </Typography>
                            )}

                            {adminApplicationStatus === 'open' && (
                                <Typography>
                                    <Paragraph
                                        style={{
                                            color: '#52c41a',
                                            fontWeight: 'bold',
                                            fontSize: '16px',
                                        }}
                                    >
                                        {gLang('ticketList.adminRecruit.open.title', { countdown })}
                                    </Paragraph>
                                    <Paragraph style={{ color: '#52c41a' }}>
                                        {gLang('ticketList.adminRecruit.open.closeTime', {
                                            time: convertUTCToFormat(
                                                closeTime.toISOString(),
                                                gLang('ticket.dateTimeFormat')
                                            ),
                                        })}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.open.intro')}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.open.preRulesPrefix')}
                                        <Link
                                            to={
                                                'https://wiki.easecation.net/EaseCation_Wiki:%E7%8E%A9%E5%AE%B6%E5%AE%88%E5%88%99'
                                            }
                                        >
                                            {gLang(
                                                'ticketList.adminRecruit.open.preRulesPlayerGuidelines'
                                            )}
                                        </Link>
                                        {gLang('ticketList.adminRecruit.open.preRulesAnd')}
                                        <Link
                                            to={
                                                'https://wiki.easecation.net/EaseCation_Wiki:%E6%80%BB%E5%88%99'
                                            }
                                        >
                                            {gLang(
                                                'ticketList.adminRecruit.open.preRulesGeneralGuidelines'
                                            )}
                                        </Link>
                                        {gLang('ticketList.adminRecruit.open.preRulesMiddle')}
                                        <Link to={'https://wiki.easecation.net/%E9%A6%96%E9%A1%B5'}>
                                            {gLang('ticketList.adminRecruit.open.preRulesWiki')}
                                        </Link>
                                        {gLang('ticketList.adminRecruit.open.preRulesSuffix')}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.open.statementIntro')}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.open.statementPart1Prefix')}
                                        <strong>
                                            {gLang(
                                                'ticketList.adminRecruit.open.statementPart1Highlight'
                                            )}
                                        </strong>
                                        {gLang('ticketList.adminRecruit.open.statementPart1Suffix')}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.open.statementPart2')}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.open.topicAPrefix')}
                                        <Link
                                            to={'https://www.bilibili.com/opus/1036461228718817300'}
                                        >
                                            {gLang('ticketList.adminRecruit.open.topicATitle')}
                                        </Link>
                                        {gLang('ticketList.adminRecruit.open.topicASuffix')}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.open.topicB')}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.open.topicC')}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.open.topicD')}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.open.ageLimit')}
                                    </Paragraph>
                                    <Paragraph style={{ color: '#EC5B56', marginTop: '-10px' }}>
                                        {gLang('ticketList.adminRecruit.open.noAi')}
                                    </Paragraph>
                                    <Paragraph style={{ color: '#EC5B56', marginTop: '-10px' }}>
                                        {gLang('ticketList.adminRecruit.open.noSensitiveInfo')}
                                    </Paragraph>
                                </Typography>
                            )}

                            {adminApplicationStatus === 'closed' && (
                                <Typography>
                                    <Paragraph
                                        style={{
                                            color: '#EC5B56',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {gLang('ticketList.adminRecruit.closed.title')}
                                    </Paragraph>
                                    <Paragraph>
                                        {gLang('ticketList.adminRecruit.closed.notice', {
                                            time: convertUTCToFormat(
                                                closeTime.toISOString(),
                                                gLang('ticket.dateTimeFormat')
                                            ),
                                        })}
                                    </Paragraph>
                                </Typography>
                            )}
                        </>
                    )}

                    {[TicketType.Consultation].includes(ticketType) && (
                        <Paragraph style={{ color: '#EC5B56', marginTop: '-10px' }}>
                            {gLang('ticketList.newIntroPublic')}
                        </Paragraph>
                    )}
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={{
                            type: initialType,
                        }}
                        onFinish={handleSubmit}
                        onFinishFailed={() => {
                            setIsSubmitFlowLocked(false);
                            setIsConfirmActionLocked(false);
                            closeSubmittingModal();
                        }}
                        autoComplete="off"
                        disabled={isFormDisabled}
                    >
                        {!hideTypeSelector && (
                            <Form.Item
                                name="type"
                                label={gLang('ticketList.type')}
                                rules={[
                                    {
                                        required: true,
                                        message: gLang('required'),
                                    },
                                ]}
                                extra={gLang(`ticketList.typeExtra.${ticketType}`)}
                            >
                                <Select
                                    onChange={value => {
                                        setTicketType(value);
                                        setSelectedQuickInsert(null);
                                        // 如果是ME工单，需要重新获取媒体账号信�?
                                        if (value === TicketType.MediaEvents) {
                                            fetchMediaData().then(() => {
                                                applyQuickInsertAvailability();
                                            });
                                        } else {
                                            applyQuickInsertAvailability();
                                        }
                                        form.resetFields([
                                            'account',
                                            'target',
                                            'targetChoose',
                                            'quickInsert',
                                            'violationCategory',
                                            'cheatSignals',
                                            'evidenceType',
                                            'replayCode',
                                            'videoUrl',
                                            'sceneSummary',
                                        ]);
                                    }}
                                >
                                    <Option value={TicketType.Argument}>
                                        {gLang('ticket.type.AG')}
                                    </Option>
                                    <Option value={TicketType.ReportPlayer}>
                                        {gLang('ticket.type.RP')}
                                    </Option>
                                    <Option value={TicketType.ResendProduct}>
                                        {gLang('ticket.type.SP')}
                                    </Option>
                                    <Option value={TicketType.WeChatUnfreeze}>
                                        {gLang('ticket.type.AW')}
                                    </Option>
                                    <Option value={TicketType.Consultation}>
                                        {gLang('ticket.type.OP')}
                                    </Option>
                                    <Option value={TicketType.Suggestion}>
                                        {gLang('ticket.type.JY')}
                                    </Option>
                                    <Option value={TicketType.ReportStaff}>
                                        {gLang('ticket.type.RS')}
                                    </Option>
                                    <Option value={TicketType.MediaEvents}>
                                        {gLang('ticket.type.ME')}
                                    </Option>
                                    <Option value={TicketType.Others}>
                                        {gLang('ticket.type.OT')}
                                    </Option>
                                    <Option value={TicketType.Application}>
                                        {gLang('ticket.type.AP')}
                                    </Option>
                                </Select>
                            </Form.Item>
                        )}
                        {hideTypeSelector && (
                            <Form.Item name="type" hidden>
                                <Input type="hidden" />
                            </Form.Item>
                        )}
                        {!(
                            [TicketType.Application].includes(ticketType) &&
                            adminApplicationStatus !== 'open'
                        ) && (
                            <>
                                {[
                                    TicketType.Argument,
                                    TicketType.ReportPlayer,
                                    TicketType.ResendProduct,
                                    TicketType.Suggestion,
                                    TicketType.WeChatUnfreeze,
                                    TicketType.ReportStaff,
                                    TicketType.Application,
                                    TicketType.Others,
                                    TicketType.MediaEvents,
                                ].includes(ticketType) && (
                                    <Form.Item
                                        name="account"
                                        label={gLang('ticketList.account.' + ticketType)}
                                        rules={[
                                            {
                                                required: ![
                                                    TicketType.Others,
                                                    TicketType.ReportStaff,
                                                ].includes(ticketType),
                                                message: gLang('required'),
                                            },
                                        ]}
                                        extra={gLang(`ticketList.accountExtra.${ticketType}`)}
                                    >
                                        <Select
                                            options={
                                                Array.isArray(
                                                    ticketType === TicketType.WeChatUnfreeze
                                                        ? chooseGameFrozenList
                                                        : chooseGameList
                                                )
                                                    ? (ticketType === TicketType.WeChatUnfreeze
                                                          ? chooseGameFrozenList
                                                          : chooseGameList
                                                      ).map(item => ({
                                                          value: item.id,
                                                          label: item.display,
                                                      }))
                                                    : []
                                            }
                                        />
                                    </Form.Item>
                                )}
                                {[
                                    TicketType.ReportPlayer,
                                    TicketType.ReportStaff,
                                    TicketType.Others,
                                ].includes(ticketType) && (
                                    <AccountMatchingFormItem
                                        name="target"
                                        label={gLang('ticketList.target.' + ticketType)}
                                        extra={gLang(`ticketList.targetExtra.${ticketType}`)}
                                        required={![TicketType.Others].includes(ticketType)}
                                        requiredMessage={gLang('required')}
                                        chooseFieldName={
                                            [TicketType.ReportPlayer, TicketType.Others].includes(
                                                ticketType
                                            )
                                                ? 'targetChoose'
                                                : undefined
                                        }
                                        chooseRequired={[TicketType.ReportPlayer].includes(
                                            ticketType
                                        )}
                                        placeholder={gLang('ticketList.target.' + ticketType)}
                                    />
                                )}
                                {[TicketType.ReportPlayer].includes(ticketType) && (
                                    <Row>
                                        <Col span={12}>
                                            <Form.Item
                                                name="happened_at_date"
                                                label={gLang('ticketList.happenedDate')}
                                                extra={gLang(`ticketList.happenedDateExtra`)}
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: gLang('required'),
                                                    },
                                                ]}
                                            >
                                                <DatePicker
                                                    locale={locale}
                                                    inputReadOnly={true}
                                                    disabledDate={current =>
                                                        current && current > dayjs().endOf('day')
                                                    }
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                name="happened_at_time"
                                                label={gLang('ticketList.happenedTime')}
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: gLang('required'),
                                                    },
                                                ]}
                                            >
                                                <TimePicker
                                                    locale={locale}
                                                    inputReadOnly={true}
                                                    format={'HH:mm'}
                                                    minuteStep={5}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                )}
                                {[TicketType.ReportPlayer].includes(ticketType) && (
                                    <Form.Item
                                        name="violationCategory"
                                        label={gLang('ticketList.rpFields.violationCategory')}
                                        rules={[
                                            {
                                                required: true,
                                                message: gLang('required'),
                                            },
                                        ]}
                                    >
                                        <Select
                                            placeholder={gLang(
                                                'ticketList.rpFields.violationCategoryPlaceholder'
                                            )}
                                            onChange={value => {
                                                if (value !== 'cheat') {
                                                    form.setFieldValue('cheatSignals', undefined);
                                                }
                                            }}
                                        >
                                            {RP_VIOLATION_CATEGORIES.map(item => (
                                                <Option key={item.key} value={item.key}>
                                                    {item.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                )}
                                {[TicketType.ReportPlayer].includes(ticketType) &&
                                    rpViolationCategory === 'cheat' && (
                                        <Form.Item
                                            name="cheatSignals"
                                            label={gLang('ticketList.rpFields.cheatSignals')}
                                            extra={gLang('ticketList.rpFields.cheatSignalsExtra')}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: gLang('required'),
                                                    type: 'array',
                                                },
                                            ]}
                                        >
                                            <Select
                                                mode="multiple"
                                                placeholder={gLang(
                                                    'ticketList.rpFields.cheatSignalsPlaceholder'
                                                )}
                                            >
                                                {RP_CHEAT_SIGNALS.map(item => (
                                                    <Option key={item.key} value={item.key}>
                                                        {item.name}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    )}
                                {[TicketType.ReportPlayer].includes(ticketType) && (
                                    <Form.Item
                                        name="evidenceType"
                                        label={gLang('ticketList.rpFields.evidenceType')}
                                        rules={[
                                            {
                                                required: true,
                                                message: gLang('required'),
                                            },
                                        ]}
                                    >
                                        <Select
                                            placeholder={gLang(
                                                'ticketList.rpFields.evidenceTypePlaceholder'
                                            )}
                                            onChange={value => {
                                                if (value !== 'replay') {
                                                    form.setFieldValue('replayCode', undefined);
                                                }
                                                if (value !== 'video') {
                                                    form.setFieldValue('videoUrl', undefined);
                                                }
                                            }}
                                        >
                                            {RP_EVIDENCE_TYPES.map(item => (
                                                <Option key={item.key} value={item.key}>
                                                    {item.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                )}
                                {[TicketType.ReportPlayer].includes(ticketType) &&
                                    rpEvidenceType === 'replay' && (
                                        <Form.Item
                                            name="replayCode"
                                            label={gLang('ticketList.rpFields.replayCode')}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: gLang('required'),
                                                },
                                            ]}
                                        >
                                            <Input
                                                placeholder={gLang(
                                                    'ticketList.rpFields.replayCodePlaceholder'
                                                )}
                                            />
                                        </Form.Item>
                                    )}
                                {[TicketType.ReportPlayer].includes(ticketType) &&
                                    rpEvidenceType === 'video' && (
                                        <Form.Item
                                            name="videoUrl"
                                            label={gLang('ticketList.rpFields.videoUrl')}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: gLang('required'),
                                                },
                                                {
                                                    type: 'url',
                                                    message: gLang(
                                                        'ticketList.rpFields.videoUrlInvalid'
                                                    ),
                                                },
                                            ]}
                                        >
                                            <Input
                                                placeholder={gLang(
                                                    'ticketList.rpFields.videoUrlPlaceholder'
                                                )}
                                            />
                                        </Form.Item>
                                    )}
                                {[TicketType.ReportPlayer].includes(ticketType) && (
                                    <Form.Item
                                        name="sceneSummary"
                                        label={gLang('ticketList.rpFields.sceneSummary')}
                                        rules={[
                                            {
                                                required: true,
                                                message: gLang('required'),
                                            },
                                        ]}
                                    >
                                        <TextArea
                                            placeholder={gLang(
                                                'ticketList.rpFields.sceneSummaryPlaceholder'
                                            )}
                                            autoSize={{ minRows: 2 }}
                                        />
                                    </Form.Item>
                                )}
                                {[TicketType.ReportPlayer].includes(ticketType) && (
                                    <Form.Item
                                        name="gameMode"
                                        label={gLang('ticketList.gameMode')}
                                        extra={gLang('ticketList.gameModeExtra')}
                                        rules={[
                                            {
                                                required: true,
                                                message: gLang('required'),
                                            },
                                        ]}
                                    >
                                        <Select placeholder={gLang('ticketList.selectGameMode')}>
                                            {GAME_MODES.map(mode => (
                                                <Option key={mode.key} value={mode.key}>
                                                    {mode.name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                )}
                                {[
                                    TicketType.Others,
                                    TicketType.Consultation,
                                    TicketType.Suggestion,
                                ].includes(ticketType) && (
                                    <Form.Item
                                        name="title"
                                        label={gLang('ticketList.newTitle')}
                                        extra={gLang(`ticketList.newTitleIntro`)}
                                        rules={[
                                            {
                                                required: true,
                                                message: gLang('required'),
                                            },
                                            {
                                                max: 20,
                                                message: gLang('ticketList.titleTooLong'),
                                            },
                                        ]}
                                    >
                                        <Input maxLength={20} showCount />
                                    </Form.Item>
                                )}
                                {quickInsertConfig[ticketType] && (
                                    <>
                                        {ticketType === TicketType.MediaEvents ? (
                                            <>
                                                <Form.Item
                                                    name="activity"
                                                    label={gLang('ticketList.activity')}
                                                    extra={gLang('ticketList.activityCardIntro')}
                                                    rules={[
                                                        {
                                                            required: true,
                                                            message: gLang('required'),
                                                        },
                                                    ]}
                                                    hidden
                                                >
                                                    <Input />
                                                </Form.Item>
                                                {!shouldHideMeActivitySelector && (
                                                    <div style={{ marginBottom: 16 }}>
                                                        <Paragraph
                                                            style={{
                                                                marginBottom: 10,
                                                                fontWeight: 600,
                                                                fontSize: 14,
                                                            }}
                                                        >
                                                            {gLang('ticketList.activity')}
                                                        </Paragraph>
                                                        <Row gutter={[12, 12]}>
                                                            {(
                                                                [
                                                                    'ECNET_LIKE',
                                                                    'ECXHS_POST',
                                                                    'CLOUD_MATERIAL',
                                                                    'OTHER',
                                                                ]
                                                                    .filter(
                                                                        key =>
                                                                            quickInsertConfig[
                                                                                TicketType.MediaEvents
                                                                            ]?.[key]
                                                                    )
                                                                    .map(key => [
                                                                        key,
                                                                        quickInsertConfig[
                                                                            TicketType.MediaEvents
                                                                        ]?.[
                                                                            key
                                                                        ] as QuickInsertItem,
                                                                    ]) as Array<
                                                                    [string, QuickInsertItem]
                                                                >
                                                            ).map(([key, item]) => {
                                                                const cardMeta =
                                                                    MEDIA_EVENT_CARD_META[key] ?? {
                                                                        icon: <UploadOutlined />,
                                                                        color: '#1677ff',
                                                                        shadow:
                                                                            'rgba(22, 119, 255, 0.25)',
                                                                        summaryKey:
                                                                            'ticketList.activityIntro',
                                                                    };
                                                                const isSelected =
                                                                    selectedQuickInsert === key;
                                                                return (
                                                                    <Col
                                                                        key={key}
                                                                        xs={24}
                                                                        sm={12}
                                                                        md={12}
                                                                    >
                                                                        <Button
                                                                            type="text"
                                                                            block
                                                                            onClick={() =>
                                                                                handleQuickInsertChange(
                                                                                    key
                                                                                )
                                                                            }
                                                                            style={{
                                                                                height: 'auto',
                                                                                borderRadius: 14,
                                                                                border: isSelected
                                                                                    ? `1px solid ${cardMeta.color}`
                                                                                    : '1px solid rgba(0,0,0,0.08)',
                                                                                boxShadow: isSelected
                                                                                    ? `0 8px 18px ${cardMeta.shadow}`
                                                                                    : '0 2px 8px rgba(0,0,0,0.04)',
                                                                                padding:
                                                                                    '14px 16px',
                                                                                textAlign: 'left',
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    gap: 10,
                                                                                    alignItems:
                                                                                        'flex-start',
                                                                                }}
                                                                            >
                                                                                <span
                                                                                    style={{
                                                                                        width: 36,
                                                                                        height: 36,
                                                                                        borderRadius: 10,
                                                                                        display:
                                                                                            'inline-flex',
                                                                                        alignItems:
                                                                                            'center',
                                                                                        justifyContent:
                                                                                            'center',
                                                                                        color: '#fff',
                                                                                        background:
                                                                                            cardMeta.color,
                                                                                    }}
                                                                                >
                                                                                    {cardMeta.icon}
                                                                                </span>
                                                                                <span>
                                                                                    <div
                                                                                        style={{
                                                                                            fontWeight:
                                                                                                600,
                                                                                            color: 'rgba(0,0,0,0.88)',
                                                                                        }}
                                                                                    >
                                                                                        {gLang(
                                                                                            item.titleKey
                                                                                        )}
                                                                                    </div>
                                                                                    <div
                                                                                        style={{
                                                                                            marginTop: 6,
                                                                                            fontSize: 12,
                                                                                            color: 'rgba(0,0,0,0.55)',
                                                                                            lineHeight:
                                                                                                1.5,
                                                                                        }}
                                                                                    >
                                                                                        {gLang(
                                                                                            cardMeta.summaryKey
                                                                                        )}
                                                                                    </div>
                                                                                </span>
                                                                            </div>
                                                                        </Button>
                                                                    </Col>
                                                                );
                                                            })}
                                                        </Row>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <Form.Item
                                                name="activity"
                                                label={gLang('ticketList.activity')}
                                                extra={gLang(`ticketList.activityIntro`)}
                                                rules={undefined}
                                            >
                                                <Select onChange={handleQuickInsertChange}>
                                                    {Object.entries(
                                                        quickInsertConfig[ticketType] || {}
                                                    ).map(([key, item]) => (
                                                        <Option key={key} value={key}>
                                                            {gLang(item.titleKey)}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        )}
                                        {shouldShowMeActivityFormFields &&
                                            selectedQuickInsert &&
                                            quickInsertConfig[ticketType]?.[
                                                selectedQuickInsert
                                            ]?.extraFields?.map(field => {
                                                if (field.name === 'cloudMaterialPrice') {
                                                    return null;
                                                }
                                                // 根据autoType决定使用哪种组件
                                                if (field.autoType === 'accountMatch') {
                                                    return (
                                                        <AccountMatchingFormItem
                                                            key={field.name}
                                                            name={field.name}
                                                            label={gLang(field.labelKey)}
                                                            extra={
                                                                field.placeholderKey
                                                                    ? gLang(field.placeholderKey)
                                                                    : undefined
                                                            }
                                                            required={field.required}
                                                            requiredMessage={gLang('required')}
                                                            chooseFieldName="choose"
                                                            chooseRequired={field.required}
                                                            chooseRequiredMessage={gLang(
                                                                'required'
                                                            )}
                                                        />
                                                    );
                                                }
                                                if (field.inputType === 'textarea') {
                                                    return (
                                                        <Form.Item
                                                            key={field.name}
                                                            name={field.name}
                                                            label={gLang(field.labelKey)}
                                                            rules={
                                                                field.required
                                                                    ? [
                                                                          {
                                                                              required: true,
                                                                              message:
                                                                                  gLang('required'),
                                                                          },
                                                                      ]
                                                                    : undefined
                                                            }
                                                        >
                                                            <TextArea
                                                                autoSize={{ minRows: 2 }}
                                                                placeholder={
                                                                    field.placeholderKey
                                                                        ? gLang(
                                                                              field.placeholderKey
                                                                          )
                                                                        : undefined
                                                                }
                                                            />
                                                        </Form.Item>
                                                    );
                                                }
                                                if (field.inputType === 'select') {
                                                    return (
                                                        <Form.Item
                                                            key={field.name}
                                                            name={field.name}
                                                            label={gLang(field.labelKey)}
                                                            rules={
                                                                field.required
                                                                    ? [
                                                                          {
                                                                              required: true,
                                                                              message:
                                                                                  gLang('required'),
                                                                          },
                                                                      ]
                                                                    : undefined
                                                            }
                                                        >
                                                            <Select
                                                                placeholder={gLang('required')}
                                                                onChange={value => {
                                                                    if (
                                                                        field.name ===
                                                                            'cloudMaterialPurchaseMethod' &&
                                                                        value !== 'ec_coin' &&
                                                                        value !== 'voucher'
                                                                    ) {
                                                                        form.setFieldValue(
                                                                            'cloudMaterialPrice',
                                                                            undefined
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                {field.options?.map(option => (
                                                                    <Option
                                                                        key={option.value}
                                                                        value={option.value}
                                                                    >
                                                                        {gLang(option.labelKey)}
                                                                    </Option>
                                                                ))}
                                                            </Select>
                                                        </Form.Item>
                                                    );
                                                }
                                                if (field.inputType === 'number') {
                                                    return (
                                                        <Form.Item
                                                            key={field.name}
                                                            name={field.name}
                                                            label={gLang(field.labelKey)}
                                                        >
                                                            <InputNumber
                                                                min={field.min}
                                                                style={{ width: '100%' }}
                                                                placeholder={
                                                                    field.placeholderKey
                                                                        ? gLang(
                                                                              field.placeholderKey
                                                                          )
                                                                        : undefined
                                                                }
                                                            />
                                                        </Form.Item>
                                                    );
                                                }

                                                return (
                                                    <Form.Item
                                                        key={field.name}
                                                        name={field.name}
                                                        label={gLang(field.labelKey)}
                                                        rules={
                                                            field.required
                                                                ? [
                                                                      {
                                                                          required: true,
                                                                          message: gLang('required'),
                                                                      },
                                                                  ]
                                                                : undefined
                                                        }
                                                    >
                                                        <Input
                                                            placeholder={
                                                                field.placeholderKey
                                                                    ? gLang(field.placeholderKey)
                                                                    : undefined
                                                            }
                                                            disabled={field.lock || false}
                                                        />
                                                    </Form.Item>
                                                );
                                            })}
                                        {shouldShowMeActivityFormFields &&
                                            selectedQuickInsert === 'CLOUD_MATERIAL' &&
                                            cloudMaterialPurchaseMethod !== 'free' && (
                                                <Form.Item
                                                    name="cloudMaterialPrice"
                                                    label={gLang('ticketList.cloudMaterialPrice')}
                                                    rules={
                                                        cloudMaterialPurchaseMethod === 'ec_coin'
                                                            ? [
                                                                  {
                                                                      required: true,
                                                                      message: gLang('required'),
                                                                  },
                                                                  {
                                                                      type: 'number',
                                                                      min: 10000,
                                                                      message: gLang(
                                                                          'ticketList.cloudMaterialEcCoinPriceMinError'
                                                                      ),
                                                                  },
                                                              ]
                                                            : [
                                                                  {
                                                                      required: true,
                                                                      message: gLang('required'),
                                                                  },
                                                              ]
                                                    }
                                                >
                                                    <InputNumber
                                                        min={
                                                            cloudMaterialPurchaseMethod === 'ec_coin'
                                                                ? 10000
                                                                : 0
                                                        }
                                                        style={{ width: '100%' }}
                                                        placeholder={gLang(
                                                            'ticketList.cloudMaterialPricePlaceholder'
                                                        )}
                                                    />
                                                </Form.Item>
                                            )}
                                        {shouldShowMeActivityFormFields &&
                                            selectedQuickInsert &&
                                            quickInsertConfig[ticketType]?.[selectedQuickInsert]
                                                ?.noteKey && (
                                                <Paragraph type="secondary">
                                                    {gLang(
                                                        quickInsertConfig[ticketType]?.[
                                                            selectedQuickInsert
                                                        ]?.noteKey as string
                                                    )}
                                                </Paragraph>
                                            )}
                                    </>
                                )}
                                {shouldShowMeActivityFormFields &&
                                    ![TicketType.ReportPlayer].includes(ticketType) && (
                                    <Form.Item
                                        name="details"
                                        label={
                                            ticketType === TicketType.MediaEvents
                                                ? gLang('ticketList.extraSupplement')
                                                : gLang('ticketList.remark')
                                        }
                                        extra={gLang(`ticketList.detailsExtra.${ticketType}`)}
                                    >
                                        <TextArea
                                            autoSize={{ minRows: 2 }}
                                            onChange={e => {
                                                const textarea = e.target as HTMLTextAreaElement;
                                                textarea.style.height = 'auto';
                                                textarea.style.height = `${textarea.scrollHeight + 24}px`;
                                            }}
                                        />
                                    </Form.Item>
                                )}
                                {shouldShowMeActivityFormFields && (
                                    <>
                                        <Form.Item
                                            label={gLang('ticketList.attachments')}
                                            extra={attachmentExtraText}
                                            name="files"
                                            rules={[
                                                {
                                                    required: [
                                                        TicketType.ResendProduct,
                                                        TicketType.ReportPlayer,
                                                        TicketType.MediaEvents,
                                                    ].includes(ticketType),
                                                    message: gLang('required'),
                                                },
                                            ]}
                                            valuePropName="fileList"
                                            getValueFromEvent={e =>
                                                Array.isArray(e) ? e : e?.fileList || []
                                            }
                                        >
                                            <Upload {...uploadProps}>
                                                <Button
                                                    icon={<UploadOutlined />}
                                                    loading={isUploading}
                                                    disabled={isUploading}
                                                >
                                                    {isUploading
                                                        ? gLang('files.uploadingText')
                                                        : gLang('files.btn')}
                                                </Button>
                                            </Upload>
                                        </Form.Item>
                                        <Form.Item>
                                            <Button
                                                type="primary"
                                                onClick={handleSubmitClick}
                                                disabled={
                                                    isUploading ||
                                                    isSubmitBtnDisabled ||
                                                    isFormDisabled ||
                                                    isSubmitFlowLocked
                                                }
                                            >
                                                {submitBtnText}
                                            </Button>
                                            <Button
                                                onClick={handleClear}
                                                disabled={isFormDisabled || isSubmitFlowLocked}
                                                style={{ marginLeft: 8 }}
                                            >
                                                {gLang('ticketList.clear')}
                                            </Button>
                                            {/* ME工单媒体账号状态提�?*/}
                                            {ticketType === TicketType.MediaEvents &&
                                                selectedQuickInsert !== 'CLOUD_MATERIAL' &&
                                                mediaStatusError && (
                                                    <div style={{ marginTop: '8px' }}>
                                                        {mediaStatusError ===
                                                            'no_media_account' && (
                                                            <div
                                                                style={{
                                                                    color: '#ff4d4f',
                                                                    fontSize: '14px',
                                                                }}
                                                            >
                                                                {gLang(
                                                                    'ticketList.mediaStatusError.noMediaAccount'
                                                                )}
                                                                <Link
                                                                    to="/media"
                                                                    style={{
                                                                        marginLeft: '8px',
                                                                        color: '#1890ff',
                                                                    }}
                                                                >
                                                                    {gLang(
                                                                        'ticketList.mediaStatusError.goToMediaCenter'
                                                                    )}
                                                                </Link>
                                                            </div>
                                                        )}
                                                        {mediaStatusError ===
                                                            'invalid_media_status' && (
                                                            <div
                                                                style={{
                                                                    color: '#ff4d4f',
                                                                    fontSize: '14px',
                                                                }}
                                                            >
                                                                {gLang(
                                                                    'ticketList.mediaStatusError.invalidMediaStatus'
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                        </Form.Item>
                                    </>
                                )}
                            </>
                        )}
                    </Form>
                </Typography>
            )}
        </>
    );
};

export default TicketForm;





