import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type FC } from 'react';
import {
    Badge,
    Button,
    Grid,
    Modal,
    Skeleton,
    Space,
} from 'antd';
import {
    ClusterOutlined,
    CalendarOutlined,
    FieldTimeOutlined,
    LinkOutlined,
    NumberOutlined,
    QqOutlined,
    SafetyCertificateOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { fetchData } from '@common/axiosConfig';
import { TicketAccount } from '@ecuc/shared/types/ticket.types';
import { MediaListData, MediaStatus } from '@ecuc/shared/types/media.types';
import MediaApplyTicket from './components/media-ticket/MediaApplyTicket';
import MonthlyReviewTicket from './components/media-ticket/MonthlyReviewTicket';
import RebindingTicket from './components/media-ticket/RebindingTicket';
import { gLang } from '@common/language';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoDocumentText } from 'react-icons/io5';
import { RiAccountCircleFill, RiShoppingBag3Fill } from 'react-icons/ri';
import { FaBilibili } from 'react-icons/fa6';
import Wrapper from '@common/components/Wrapper/Wrapper';
import ErrorDisplay from '../../components/ErrorDisplay';
import usePageTitle from '@common/hooks/usePageTitle';
import { useTheme } from '@common/contexts/ThemeContext';
import dayjs from 'dayjs';
import styles from './MediaCenter.module.css';

const fadeInUpAnimation = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(12px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;

if (typeof document !== 'undefined' && !document.getElementById('fadeInUpAnimation')) {
    const style = document.createElement('style');
    style.id = 'fadeInUpAnimation';
    style.innerHTML = fadeInUpAnimation;
    document.head.appendChild(style);
}

const { useBreakpoint } = Grid;
const CONSOLE_BACKGROUND_POOL = [
    '/image/media/backgrounds/20211009-235358.png',
    '/image/media/backgrounds/20211009-235523.png',
    '/image/media/backgrounds/20211009-235528.png',
    '/image/media/backgrounds/Background@1x.png',
    '/image/media/backgrounds/mw.png',
    '/image/media/backgrounds/pit.png',
];

interface HoloNodeProps {
    title: string;
    icon: ComponentType<{ style?: CSSProperties }>;
    onClick: () => void;
    floatDelayMs?: number;
}

const HoloNode: FC<HoloNodeProps> = ({ title, icon, onClick, floatDelayMs = 0 }) => {
    const IconComp = icon;
    return (
        <button
            type="button"
            className={styles.holoNode}
            style={{
                ['--float-delay' as any]: `${floatDelayMs}ms`,
            }}
            onClick={onClick}
        >
            <span className={styles.holoNodeIcon}>
                <IconComp style={{ fontSize: 23, color: '#bff5ff' }} />
            </span>
            <span className={styles.holoNodeTitle}>{title}</span>
        </button>
    );
};

const MediaCenter = () => {
    usePageTitle();

    const navigate = useNavigate();
    const location = useLocation();
    const screens = useBreakpoint();
    const { isDark } = useTheme();
    const isMobile = !screens.md;
    const isTablet = !!screens.md && !screens.xl;
    const [selectedBackground, setSelectedBackground] = useState<string>('');

    const isFirstVisitAfterLogin = useMemo(() => {
        const hasShownAnimation = sessionStorage.getItem('mediaAnimationShown');
        const isFromLogin =
            document.referrer.includes('/login') ||
            document.referrer.includes('/login/callback') ||
            location.state?.fromLogin === true;

        if (isFromLogin && !hasShownAnimation) {
            sessionStorage.setItem('mediaAnimationShown', 'true');
            return true;
        }
        return false;
    }, [location.state]);

    const animationDelay = isFirstVisitAfterLogin ? 0.1 : 0.02;

    const [isLoading, setIsLoading] = useState(true);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
    const [updateECID, setUpdateECID] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);
    const [chooseGameList, setChooseGameList] = useState<TicketAccount[]>([]);
    const [ECID, setECID] = useState<string>('');
    const [mediaData, setMediaData] = useState<MediaListData>();
    const [groupData, setGroupData] = useState<any>(null);
    const [error, setError] = useState<boolean>(false);

    const fetchMediaData = () => {
        setIsLoading(true);
        setError(false);
        let completedRequests = 0;
        const totalRequests = 3;
        const checkAllLoaded = () => {
            completedRequests += 1;
            if (completedRequests === totalRequests) {
                setIsLoading(false);
            }
        };

        fetchData({
            url: '/media/list',
            method: 'GET',
            data: {},
            setData: value => {
                setMediaData(value);
                setECID(value?.media?.ECID || '');
                checkAllLoaded();
                if (
                    value?.media?.id &&
                    [
                        MediaStatus.PendingReview,
                        MediaStatus.ExpiredCreator,
                        MediaStatus.ActiveCreator,
                        MediaStatus.ExcellentCreator,
                    ].includes(value.media.status as MediaStatus)
                ) {
                    fetchData({
                        url: '/media/getgroup',
                        method: 'POST',
                        data: { mediaID: value.media.id },
                        setData: groupValue => {
                            setGroupData(groupValue);
                        },
                    });
                }
            },
        }).catch(() => {
            setError(true);
            setIsLoading(false);
        });

        fetchData({
            url: '/ticket/chooseList',
            method: 'GET',
            data: { type: 'game' },
            setData: value => {
                setChooseGameList(value);
                checkAllLoaded();
            },
        }).catch(() => {
            setError(true);
            setIsLoading(false);
        });

        fetchData({
            url: '/user/info',
            method: 'GET',
            data: {},
            setData: _value => {
                checkAllLoaded();
            },
        }).catch(() => {
            setError(true);
            setIsLoading(false);
        });

        if (sessionStorage.getItem('openApplyModal') === '1') {
            setIsApplyModalOpen(true);
            sessionStorage.removeItem('openApplyModal');
        }
    };

    useEffect(() => {
        fetchMediaData();
    }, []);

    useEffect(() => {
        const shuffled = [...CONSOLE_BACKGROUND_POOL].sort(() => Math.random() - 0.5);
        let active = true;

        const tryLoad = (index: number) => {
            if (!active || index >= shuffled.length) {
                return;
            }
            const img = new Image();
            img.onload = () => {
                if (active) {
                    setSelectedBackground(shuffled[index]);
                }
            };
            img.onerror = () => {
                tryLoad(index + 1);
            };
            img.src = shuffled[index];
        };

        tryLoad(0);

        return () => {
            active = false;
        };
    }, []);

    if (isLoading) {
        return (
            <Wrapper>
                <Skeleton active paragraph={{ rows: 3 }} title={false} />
            </Wrapper>
        );
    }

    if (error) {
        return (
            <Wrapper>
                <ErrorDisplay onRetry={fetchMediaData} />
            </Wrapper>
        );
    }

    const expireDateText = mediaData?.media?.expireDate
        ? dayjs(mediaData.media.expireDate).format('YYYY-MM-DD')
        : gLang('noExpiration');
    const lastReviewedText = mediaData?.media?.lastReviewed
        ? dayjs(mediaData.media.lastReviewed).format('YYYY-MM-DD')
        : gLang('notReviewed');

    let cardIndex = 0;

    const canShowExcellentGroup = mediaData?.media?.status === MediaStatus.ExcellentCreator;
    const isExcellentCreator = mediaData?.media?.status === MediaStatus.ExcellentCreator;
    const permissionLabel = isExcellentCreator
        ? gLang('mediaCenter.excellentMonthPermissionLabel')
        : gLang('mediaCenter.shopMonthPermissionLabel');
    const isPermissionStatus = [
        MediaStatus.ActiveCreator,
        MediaStatus.ExcellentCreator,
    ].includes((mediaData?.media?.status ?? -1) as MediaStatus);
    const hasExpireDate = !!mediaData?.media?.expireDate;
    const notExpired = hasExpireDate
        ? dayjs(mediaData?.media?.expireDate).isAfter(dayjs().endOf('day'))
        : true;
    const hasMonthlyPermission = isPermissionStatus && notExpired;
    const holoLines = isTablet
        ? [
              { x1: 225, y1: 318, x2: 500, y2: 332 },
              { x1: 500, y1: 332, x2: 566, y2: 185 },
              { x1: 500, y1: 332, x2: 774, y2: 262 },
              { x1: 500, y1: 332, x2: 772, y2: 418 },
              { x1: 500, y1: 332, x2: 390, y2: 468 },
              { x1: 500, y1: 332, x2: 838, y2: 515 },
          ]
        : [
              { x1: 214, y1: 315, x2: 500, y2: 330 },
              { x1: 500, y1: 330, x2: 560, y2: 172 },
              { x1: 500, y1: 330, x2: 788, y2: 248 },
              { x1: 500, y1: 330, x2: 788, y2: 430 },
              { x1: 500, y1: 330, x2: 388, y2: 468 },
              { x1: 500, y1: 330, x2: 876, y2: 500 },
          ];

    return (
        <Wrapper
            maxWidth={9999}
            style={{ maxWidth: '100%', margin: 0 }}
        >
            <div
                className={styles.pageFullBackground}
                style={
                    {
                        '--media-console-page-bg': `url('${selectedBackground}')`,
                    } as CSSProperties
                }
            />
            <div
                className={`${styles.consoleRoot} ${isDark ? styles.themeDark : styles.themeLight}`}
                style={
                    {
                        '--media-console-bg': `url('${selectedBackground}')`,
                    } as CSSProperties
                }
            >
                <div
                    className={styles.consoleHeader}
                    style={{
                        opacity: 0,
                        animation: `fadeInUp 0.55s ease ${cardIndex++ * animationDelay}s forwards`,
                    }}
                >
                    <div className={styles.consoleTitleCn}>{gLang('mediaCenter.title')}</div>
                    <div className={styles.consoleTitleEn}>{gLang('mediaCenter.nextGenConsole')}</div>
                </div>

                <div className={styles.holoStage}>
                    <svg
                        className={`${styles.holoLinkLayer} ${isConsoleExpanded ? styles.nodeVisible : styles.nodeHidden}`}
                        viewBox="0 0 1000 620"
                        preserveAspectRatio="none"
                    >
                        {holoLines.map((line, index) => (
                            <line
                                key={index}
                                x1={line.x1}
                                y1={line.y1}
                                x2={line.x2}
                                y2={line.y2}
                                style={
                                    {
                                        ['--line-delay' as any]: `${index * 70}ms`,
                                    } as CSSProperties
                                }
                            />
                        ))}
                    </svg>

                    <div
                        className={`${styles.ePointCrystal} ${isConsoleExpanded ? styles.nodeVisible : styles.nodeHidden}`}
                        style={{
                            animation: isConsoleExpanded
                                ? `fadeInUp 0.55s ease ${cardIndex++ * animationDelay}s forwards`
                                : undefined,
                        }}
                    >
                        <div className={styles.crystalValue}>{mediaData?.media?.EBalance ?? 0}</div>
                        <div className={styles.crystalLabel}>{gLang('mediaUser.EBalance')}</div>
                    </div>

                    <div
                        className={styles.mascotZone}
                        style={{
                            opacity: 0,
                            animation: `fadeInUp 0.55s ease ${cardIndex++ * animationDelay}s forwards`,
                        }}
                    >
                        <button
                            type="button"
                            className={styles.mascotButton}
                            onClick={() => setIsConsoleExpanded(value => !value)}
                            aria-label="open creator hologram"
                        >
                            <span className={styles.ringOuter} />
                            <span className={styles.ringInner} />
                            <img src="/image/media-center.png" alt="" className={styles.mascotImage} />
                        </button>
                        <div className={styles.holoHint}>
                            {isConsoleExpanded
                                ? gLang('mediaCenter.holoHintExpanded')
                                : gLang('mediaCenter.holoHint')}
                        </div>
                        {isConsoleExpanded && (
                            <Button
                                type="primary"
                                className={styles.infoEntryButton}
                                onClick={() => setIsInfoModalOpen(true)}
                            >
                                {gLang('mediaCenter.openHoloInfo')}
                            </Button>
                        )}
                    </div>

                    <div
                        className={`${styles.nodeSlot} ${styles.nodeTop} ${isConsoleExpanded ? styles.nodeVisible : styles.nodeHidden}`}
                        style={{ ['--node-delay' as any]: '20ms' } as CSSProperties}
                    >
                        <HoloNode
                            title={gLang('mediaList.lookGuidelines')}
                            icon={IoDocumentText}
                            floatDelayMs={0}
                            onClick={() => navigate('/shop-guidelines')}
                        />
                    </div>
                    <div
                        className={`${styles.nodeSlot} ${styles.nodeRight} ${isConsoleExpanded ? styles.nodeVisible : styles.nodeHidden}`}
                        style={{ ['--node-delay' as any]: '80ms' } as CSSProperties}
                    >
                        <HoloNode
                            title={gLang('mediaCenter.shopTitle')}
                            icon={RiShoppingBag3Fill}
                            floatDelayMs={700}
                            onClick={() => navigate('/media/shop')}
                        />
                    </div>
                    <div
                        className={`${styles.nodeSlot} ${styles.nodeBottomRight} ${isConsoleExpanded ? styles.nodeVisible : styles.nodeHidden}`}
                        style={{ ['--node-delay' as any]: '130ms' } as CSSProperties}
                    >
                        <HoloNode
                            title={gLang('mediaAction.applyEPoints')}
                            icon={FaBilibili}
                            floatDelayMs={1200}
                            onClick={() => {
                                const canShowMonthlyAudit = () => {
                                    if (!mediaData?.media?.status) return false;
                                    return [
                                        MediaStatus.ExpiredCreator,
                                        MediaStatus.ActiveCreator,
                                        MediaStatus.ExcellentCreator,
                                    ].includes(mediaData.media.status as MediaStatus);
                                };
                                if (mediaData?.is_media_member || canShowMonthlyAudit()) {
                                    setIsMonthModalOpen(true);
                                } else {
                                    setIsApplyModalOpen(true);
                                }
                            }}
                        />
                    </div>
                    <div
                        className={`${styles.nodeSlot} ${styles.nodeBottomLeft} ${isConsoleExpanded ? styles.nodeVisible : styles.nodeHidden}`}
                        style={{ ['--node-delay' as any]: '180ms' } as CSSProperties}
                    >
                        <HoloNode
                            title={gLang('mediaList.updateECIDTitle')}
                            icon={RiAccountCircleFill}
                            floatDelayMs={1600}
                            onClick={() => setUpdateECID(true)}
                        />
                    </div>

                    <div
                        className={`${styles.nodeSlot} ${styles.nodeGroup} ${isConsoleExpanded ? styles.nodeVisible : styles.nodeHidden}`}
                        style={{ ['--node-delay' as any]: '230ms' } as CSSProperties}
                    >
                        <HoloNode
                            title={gLang('mediaCenter.groupApplyNode')}
                            icon={ClusterOutlined}
                            floatDelayMs={2200}
                            onClick={() => setIsGroupModalOpen(true)}
                        />
                    </div>

                </div>
            </div>

            <Modal
                open={isGroupModalOpen}
                onCancel={() => setIsGroupModalOpen(false)}
                footer={null}
                width={isMobile ? '100vw' : 560}
                centered={!isMobile}
                className={`${isMobile ? styles.holoModalMobile : styles.holoModalDesktop} ${
                    isDark ? styles.infoModalDark : styles.infoModalLight
                }`}
                style={
                    isMobile
                        ? {
                              top: 0,
                              maxWidth: '100vw',
                              paddingBottom: 0,
                          }
                        : undefined
                }
                styles={{
                    header: {
                        background: 'linear-gradient(135deg, #29135f 0%, #4529a4 100%)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        marginBottom: 0,
                    },
                    body: {
                        padding: isMobile ? '16px 14px 24px' : '18px 20px 22px',
                    },
                }}
                title={<span className={styles.modalTitle}>{gLang('mediaCenter.groupModalTitle')}</span>}
            >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {(groupData?.shopgroup1 || groupData?.shopgroup2) && (
                        <div className={styles.infoRow}>
                            <div className={styles.infoKey}>{gLang('mediaCenter.joinGroupDesc')}</div>
                            <div className={styles.infoValue}>
                                {groupData?.shopgroup1 && (
                                    <a
                                        href={groupData.shopgrouplink1}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.infoLinkPlain}
                                    >
                                        {groupData.shopgroup1}
                                    </a>
                                )}
                                {groupData?.shopgroup1 && groupData?.shopgroup2 && <span> | </span>}
                                {groupData?.shopgroup2 && (
                                    <a
                                        href={groupData.shopgrouplink2}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.infoLinkPlain}
                                    >
                                        {groupData.shopgroup2}
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {canShowExcellentGroup && groupData?.status3group && (
                        <div className={styles.infoRow}>
                            <div className={styles.infoKey}>{gLang('mediaCenter.joinstatus3groupDesc')}</div>
                            <div className={styles.infoValue}>
                                <a
                                    href={groupData.status3grouplink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.infoLinkPlain}
                                >
                                    {groupData.status3group}
                                </a>
                            </div>
                        </div>
                    )}

                    {!groupData?.shopgroup1 &&
                        !groupData?.shopgroup2 &&
                        !(canShowExcellentGroup && groupData?.status3group) && (
                            <div className={styles.infoRow}>
                                <div className={styles.infoKey}>{gLang('mediaCenter.groupNoData')}</div>
                            </div>
                        )}
                </Space>
            </Modal>

            <Modal
                open={isInfoModalOpen}
                onCancel={() => setIsInfoModalOpen(false)}
                footer={null}
                width={isMobile ? '100vw' : '50vw'}
                centered={!isMobile}
                className={`${isMobile ? styles.holoModalMobile : styles.holoModalDesktop} ${
                    isDark ? styles.infoModalDark : styles.infoModalLight
                }`}
                style={
                    isMobile
                        ? {
                              top: 0,
                              maxWidth: '100vw',
                              paddingBottom: 0,
                          }
                        : undefined
                }
                styles={{
                    header: {
                        background: 'linear-gradient(135deg, #29135f 0%, #4529a4 100%)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        marginBottom: 0,
                    },
                    body: {
                        padding: isMobile ? '16px 14px 24px' : '18px 20px 22px',
                    },
                }}
                title={
                    <div className={styles.modalHeader}>
                        <img src="/image/media-center.png" alt="" className={styles.modalMascot} />
                        <span className={styles.modalTitle}>{gLang('mediaCenter.holoInfoTitle')}</span>
                    </div>
                }
            >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <div className={styles.infoRow}>
                        <div className={styles.infoKey}>
                            <SafetyCertificateOutlined />
                            <span>{permissionLabel}</span>
                        </div>
                        <div className={styles.infoValue}>
                            <Badge
                                status={hasMonthlyPermission ? 'success' : 'default'}
                                text={
                                    <span className={styles.statusValue}>
                                        {hasMonthlyPermission
                                            ? gLang('mediaCenter.permissionYes')
                                            : gLang('mediaCenter.permissionNo')}
                                    </span>
                                }
                            />
                        </div>
                    </div>

                    <div className={styles.infoRow}>
                        <div className={styles.infoKey}>
                            <NumberOutlined />
                            <span>{gLang('mediaUser.id')}</span>
                        </div>
                        <div className={styles.infoValue}>{mediaData?.media?.id || 'N/A'}</div>
                    </div>

                    <div className={styles.infoRow}>
                        <div className={styles.infoKey}>
                            <QqOutlined />
                            <span>{gLang('mediaUser.QQNumber')}</span>
                        </div>
                        <div className={styles.infoValue}>{mediaData?.media?.QQNumber || gLang('unbound')}</div>
                    </div>

                    <div className={styles.infoRow}>
                        <div className={styles.infoKey}>
                            <LinkOutlined />
                            <span>{gLang('mediaUser.link')}</span>
                        </div>
                        <div className={styles.infoValue}>
                            {mediaData?.media?.link ? (
                                <Button
                                    type="link"
                                    href={mediaData.media.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.infoLink}
                                >
                                    {gLang('viewLink')}
                                </Button>
                            ) : (
                                'N/A'
                            )}
                        </div>
                    </div>

                    <div className={styles.infoRow}>
                        <div className={styles.infoKey}>
                            <UserOutlined />
                            <span>{gLang('mediaUser.ECID')}</span>
                        </div>
                        <div className={styles.infoValue}>{mediaData?.media?.ECID || 'N/A'}</div>
                    </div>

                    <div className={styles.infoRow}>
                        <div className={styles.infoKey}>
                            <CalendarOutlined />
                            <span>{gLang('mediaUser.expireDate')}</span>
                        </div>
                        <div className={styles.infoValue}>{expireDateText}</div>
                    </div>

                    <div className={styles.infoRow}>
                        <div className={styles.infoKey}>
                            <FieldTimeOutlined />
                            <span>{gLang('mediaUser.lastReviewed')}</span>
                        </div>
                        <div className={styles.infoValue}>{lastReviewedText}</div>
                    </div>
                </Space>
            </Modal>

            <MediaApplyTicket
                isOpen={isApplyModalOpen}
                onClose={() => setIsApplyModalOpen(false)}
                chooseGameList={chooseGameList}
            />

            <MonthlyReviewTicket
                isOpen={isMonthModalOpen}
                onClose={() => setIsMonthModalOpen(false)}
                ECID={ECID}
                platform={mediaData?.media?.mpa?.split('-')[0]}
            />

            <RebindingTicket
                isOpen={updateECID}
                onClose={() => setUpdateECID(false)}
                ECID={ECID}
                chooseGameList={chooseGameList}
            />
        </Wrapper>
    );
};

export default MediaCenter;
