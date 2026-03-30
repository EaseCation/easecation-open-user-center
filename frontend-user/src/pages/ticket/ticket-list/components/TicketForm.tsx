// 发起新工单的表单组件，不包括媒体工单
// TODO refractor
//

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Button,
    Col,
    DatePicker,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Spin,
    TimePicker,
    Typography,
    Upload,
    message,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);
import { Link } from 'react-router-dom';
import { gLang } from '@common/language';
import { fetchData, submitData } from '../../../../axiosConfig';
import { useUploadProps } from '@common/utils/uploadUtils';
import { TicketAccount, TicketType } from '@ecuc/shared/types/ticket.types';
import { MediaListData, MediaStatus } from '@ecuc/shared/types/media.types';
import {
    GAME_MODES,
    RP_CHEAT_SIGNALS,
    RP_EVIDENCE_TYPES,
    RP_VIOLATION_CATEGORIES,
} from '@ecuc/shared/constants/ticket.constants';
import locale from 'antd/es/date-picker/locale/zh_CN';
import ErrorDisplay from '../../../../components/ErrorDisplay';
import quickInsertConfig, { QuickInsertItem } from '../../../../config/quickInsert.config';
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

const buildRpDetails = (values: Record<string, any>): string => {
    const violationCategoryName =
        findOptionName(RP_VIOLATION_CATEGORIES, values.violationCategory) ?? values.violationCategory;
    const evidenceTypeName =
        findOptionName(RP_EVIDENCE_TYPES, values.evidenceType) ?? values.evidenceType;
    const cheatSignalNames =
        values.violationCategory === 'cheat' && Array.isArray(values.cheatSignals)
        ? values.cheatSignals
              .map((signal: string) => findOptionName(RP_CHEAT_SIGNALS, signal) ?? signal)
              .join('、')
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

interface TicketFormProps {
    setIsModalOpen: (open: boolean) => void;
    initialType?: TicketType;
    hideTypeSelector?: boolean;
}

const TicketForm: React.FC<TicketFormProps> = ({
    setIsModalOpen,
    initialType,
    hideTypeSelector,
}) => {
    const [form] = Form.useForm();
    // useModal 初始化
    const [modal, modalContextHolder] = Modal.useModal();
    const { user } = useAuth();

    const [isSubmitBtnDisabled, setIsSubmitBtnDisabled] = useState(false);
    const [isSpinning, setIsSpinning] = useState(true);
    const [ticketType, setTicketType] = useState<TicketType>(initialType || TicketType.None);
    const [selectedQuickInsert, setSelectedQuickInsert] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<boolean>(false);
    const [messageApi, messageContextHolder] = message.useMessage();
    const rpViolationCategory = Form.useWatch('violationCategory', form);
    const rpEvidenceType = Form.useWatch('evidenceType', form);

    // ME工单媒体账号状态检查
    const [mediaData, setMediaData] = useState<MediaListData | null>(null);
    const [mediaStatusError, setMediaStatusError] = useState<string>('');

    const { uploadProps, contextHolder } = useUploadProps(
        10,
        uploadedFiles,
        setUploadedFiles,
        setIsUploading
    );
    const clearedAccountRef = useRef<string | null>(null);
    /** While true, skip persisting draft until user answers restore prompt (avoids overwriting storage with empty form). */
    const draftResolutionPendingRef = useRef(false);

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

    // 检查ME工单的媒体账号状态
    const checkMediaStatusForME = useCallback(
        (mediaData: MediaListData | null) => {
            if (ticketType !== TicketType.MediaEvents) {
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
        [ticketType]
    );

    const applyQuickInsertAvailability = useCallback(
        (configItem?: QuickInsertItem) => {
            let shouldDisableBtn = false;
            let submitText = gLang('ticketList.submit');

            // 检查ME工单的媒体账号状态
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
        setError(false);
        try {
            const configItem = quickInsertConfig[ticketType]?.[values.activity];
            let details = values.details ?? '';
            if (configItem?.extraFields?.length) {
                const titleDetails = gLang(configItem.titleKey).toString();
                const extraDetails = configItem.extraFields
                    .map(field => {
                        const label = gLang(field.labelKey).toString();
                        const value = values[field.name];
                        return value ? `${label}:${value}` : '';
                    })
                    .filter(Boolean)
                    .join('\n');
                const detailsAll = [titleDetails, extraDetails, details].filter(Boolean).join('\n');
                details = detailsAll;
            }
            if (ticketType === TicketType.ReportPlayer) {
                details = buildRpDetails(values);
            }
            await submitData({
                data: {
                    type: values.type,
                    account: values.account,
                    target: [TicketType.ReportPlayer, TicketType.Others].includes(ticketType)
                        ? values.targetChoose
                        : values.target,
                    details: details,
                    files: uploadedFiles,
                    happened_at_date: values.happened_at_date,
                    happened_at_time: values.happened_at_time,
                    gameMode: values.gameMode,
                    title: values.title,
                },
                url: '/ticket/new',
                redirectTo: '/ticket',
                successMessage: 'ticketList.success',
                method: 'POST',
                setIsFormDisabled: setIsFormDisabled,
                setIsModalOpen: setIsModalOpen,
            });
            const typeToClear = (values.type || ticketType) as TicketType;
            if (typeToClear) {
                clearTicketDraft(typeToClear);
            }
        } catch {
            setError(true);
            setIsFormDisabled(false);
        }
    };

    const handleQuickInsertChange = async (value: string) => {
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
                                // 如果没有媒体信息，填写"无"
                                form.setFieldValue(field.name, gLang('ticket.none'));
                            }
                        } else {
                            // 如果没有openid，填写"无"
                            form.setFieldValue(field.name, gLang('ticket.none'));
                        }
                    } catch {
                        // 出错时填写"无"
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
    };
    const [chooseGameList, setChooseGameList] = useState<TicketAccount[]>([]);
    const [chooseGameFrozenList, setChooseGameFrozenList] = useState<TicketAccount[]>([]);
    const [submitBtnText, setSubmitBtnText] = useState<string>(gLang('ticketList.submit'));
    const [accountOptionsLoaded, setAccountOptionsLoaded] = useState(false);

    // 自招申请状态：'before' - 未开始, 'open' - 进行中, 'closed' - 已结束
    const [adminApplicationStatus, setAdminApplicationStatus] = useState<
        'before' | 'open' | 'closed'
    >('before');
    const [countdown, setCountdown] = useState('');

    const [openTime, setOpenTime] = useState(dayjs());
    const [closeTime, setCloseTime] = useState(dayjs());

    useEffect(() => {
        if (!ticketType) {
            return;
        }
        const draft = loadTicketDraft(ticketType);
        if (!draft) {
            draftResolutionPendingRef.current = false;
            setUploadedFiles([]);
            setSelectedQuickInsert(null);
            form.setFieldsValue({ type: ticketType, files: [] });
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

        // 如果是ME工单，需要获取媒体账号信息
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

    // 倒计时
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
            onOk: () => {
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

                messageApi.success(gLang('ticketList.clearSuccess'));
            },
        });
    };

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
                    {/* 管理员申请工单 */}
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
                                        // 如果是ME工单，需要重新获取媒体账号信息
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
                                                    TicketType.Suggestion,
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
                                        <Form.Item
                                            name="activity"
                                            label={gLang('ticketList.activity')}
                                            extra={gLang(`ticketList.activityIntro`)}
                                            rules={
                                                ticketType === TicketType.MediaEvents
                                                    ? [
                                                          {
                                                              required: true,
                                                              message: gLang('required'),
                                                          },
                                                      ]
                                                    : undefined
                                            }
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
                                        {selectedQuickInsert &&
                                            quickInsertConfig[ticketType]?.[
                                                selectedQuickInsert
                                            ]?.extraFields?.map(field => {
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
                                                } else {
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
                                                            <Input
                                                                placeholder={
                                                                    field.placeholderKey
                                                                        ? gLang(
                                                                              field.placeholderKey
                                                                          )
                                                                        : undefined
                                                                }
                                                                disabled={field.lock || false}
                                                            />
                                                        </Form.Item>
                                                    );
                                                }
                                            })}
                                        {selectedQuickInsert &&
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
                                {![TicketType.ReportPlayer].includes(ticketType) && (
                                    <Form.Item
                                        name="details"
                                        label={gLang('ticketList.remark')}
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
                                <Form.Item
                                    label={gLang('ticketList.attachments')}
                                    extra={gLang('ticketList.attachmentsExtra')}
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
                                            isUploading || isSubmitBtnDisabled || isFormDisabled
                                        }
                                    >
                                        {submitBtnText}
                                    </Button>
                                    <Button
                                        onClick={handleClear}
                                        disabled={isFormDisabled}
                                        style={{ marginLeft: 8 }}
                                    >
                                        {gLang('ticketList.clear')}
                                    </Button>
                                    {/* ME工单媒体账号状态提示 */}
                                    {ticketType === TicketType.MediaEvents && mediaStatusError && (
                                        <div style={{ marginTop: '8px' }}>
                                            {mediaStatusError === 'no_media_account' && (
                                                <div style={{ color: '#ff4d4f', fontSize: '14px' }}>
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
                                            {mediaStatusError === 'invalid_media_status' && (
                                                <div style={{ color: '#ff4d4f', fontSize: '14px' }}>
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
                    </Form>
                </Typography>
            )}
        </>
    );
};

export default TicketForm;
