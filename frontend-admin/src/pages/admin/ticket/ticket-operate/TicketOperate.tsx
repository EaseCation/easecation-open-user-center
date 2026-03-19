// 管理侧工单操作

import { Alert, Button, Form, Image, Input, List, message, Modal, Skeleton, Space } from 'antd';
import { fetchData, submitData } from '@common/axiosConfig';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gLang } from '@common/language';
import TicketDetailComponent from '../../../../components/TicketDetailComponent';
// import icons if needed
import SuperPanelPlayerComponent from '../../panel/components/SuperPanelPlayerComponent';
import {
    ticketWithCreator,
    ticketWithInitiator,
    ticketWithTarget,
} from '../../../../config/ticketConfig';
import { StaffShortcut } from '@ecuc/shared/types/player.types';
import { Ticket, TicketType, TicketStatus } from '@ecuc/shared/types/ticket.types';
import { PlayerActionCard } from './components/player-action-card/PlayerActionCard';
import { TicketReplyForm } from './components/TicketReplyForm';
import { TicketActionCard } from './components/TicketActionCard';
import QuickOpsComponent from './components/QuickOpsComponent';
import MediaPanelCard from './components/MediaPanelCard';
import OpenidPanelComponent from './components/openid-panel/OpenIDPanel';
import useDarkMode from '@common/hooks/useDarkMode';
import { useAuth } from '@common/contexts/AuthContext';
import ShareTicketButtons from './components/ShareTicketButtons';
import PageMeta from '../../../../components/PageMeta/PageMeta';
import { generateAdminTicketMeta } from '@common/utils/ticketMeta.utils';
import MediaMonthlyTicketsPanel from './components/MediaMonthlyTicketsPanel';
import {
    notifyTicketStatusUpdate,
    notifyTicketCountUpdate,
} from '@common/hooks/useTicketStatusUpdate';
import { MEDIA_TYPES } from '@ecuc/shared/constants/media.constants';
import { FeedbackCenterCard } from './components/FeedbackCenterCard';
import { FeedbackFormatCard } from './components/FeedbackFormatCard';

interface TicketOperateProps {
    tid?: string;
    ticket?: Ticket;
    onActionComplete?: () => void;
}

const TicketOperate = (props: TicketOperateProps) => {
    const { type, tid: paramsTid } = useParams();
    const { tid: propTid, ticket: propTicket, onActionComplete: propOnActionComplete } = props;
    const tid = propTid || paramsTid;
    const [ticket, setTicket] = useState<Ticket | undefined>(propTicket);
    const [shortcuts, setShortcuts] = useState<StaffShortcut[]>([]);
    const [spinning, setSpinning] = useState(false);
    const [isFormDisabled, setIsFormDisabled] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [returnToMy, setReturnToMy] = useState(false);
    const [doRefresh, setDoRefresh] = useState(false);
    const [previewEcid, setPreviewEcid] = useState<string | null>(null);
    const [previewDefaultTab, setPreviewDefaultTab] = useState<string | undefined>(undefined);
    const [previewInitialSettings, setPreviewInitialSettings] = useState<any>(undefined);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    // 已移至 MediaPanelCard 内部的媒体面板状态
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [modal, modalContextHolder] = Modal.useModal();
    const [messageApi, contextHolder] = message.useMessage();
    const isDarkMode = useDarkMode();
    const { user } = useAuth();
    const ticketDetailRef = useRef<HTMLDivElement>(null);
    const cardRefsMap = useRef<Record<string, HTMLDivElement | null>>({});
    const [cardNavModalOpen, setCardNavModalOpen] = useState(false);
    const [forceShowCardKeys, setForceShowCardKeys] = useState<Set<string>>(new Set());
    /** Params when adding card from nav (e.g. custom ecid for player cards) */
    const [cardNavParams, setCardNavParams] = useState<Record<string, { ecid?: string }>>({});
    /** 跳转玩家/目标/OpenID 卡片时弹出：编辑 initiator、target 或 creator_openid（仅前端），{ key, value } 或 null */
    const [playerCardEditModal, setPlayerCardEditModal] = useState<{
        key: 'playerActionInitiator' | 'playerActionTarget' | 'openidPanel';
        value: string;
    } | null>(null);
    /** FB format: true = show feedback-style view in card and hide TicketDetailComponent; false = normal */
    const [feedbackFormatEnabled, setFeedbackFormatEnabled] = useState(true);
    const isFeedbackFormatView =
        ticket?.type === TicketType.Feedback && feedbackFormatEnabled;

    const CARD_NAV_KEYS: string[] = [
        'reportAlert',
        'feedbackFormat',
        'ticketDetail',
        'shareButtons',
        'playerActionInitiator',
        'playerActionTarget',
        'mediaPanel',
        'mediaMonthly',
        'wikiBinding',
        'feedbackCenter',
        'replyForm',
        'ticketAction',
        'openidPanel',
        'quickOps',
    ];

    const scrollToCard = (key: string) => {
        const el = cardRefsMap.current[key];
        if (el) {
            requestAnimationFrame(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    };

    /** 跳转时需先弹窗编辑的卡片（initiator / target / creator_openid，仅前端生效） */
    const CARDS_WITH_EDIT_MODAL: (
        | 'playerActionInitiator'
        | 'playerActionTarget'
        | 'openidPanel'
    )[] = ['playerActionInitiator', 'playerActionTarget', 'openidPanel'];

    const EDIT_MODAL_LABEL_MAP: Record<
        'playerActionInitiator' | 'playerActionTarget' | 'openidPanel',
        string
    > = {
        playerActionInitiator: 'ticketOperate.cardNav.editInitiatorLabel',
        playerActionTarget: 'ticketOperate.cardNav.editTargetLabel',
        openidPanel: 'ticketOperate.cardNav.editCreatorOpenidLabel',
    };
    const EDIT_MODAL_PLACEHOLDER_MAP: Record<
        'playerActionInitiator' | 'playerActionTarget' | 'openidPanel',
        string
    > = {
        playerActionInitiator: 'ECID',
        playerActionTarget: 'ECID',
        openidPanel: 'OpenID',
    };

    const handleCardNavClick = (key: string) => {
        if (CARDS_WITH_EDIT_MODAL.includes(key as any) && ticket) {
            setCardNavModalOpen(false);
            const value =
                key === 'playerActionInitiator'
                    ? (ticket.initiator ?? '')
                    : key === 'playerActionTarget'
                      ? (ticket.target ?? '')
                      : (ticket.creator_openid ?? '');
            setPlayerCardEditModal({
                key: key as 'playerActionInitiator' | 'playerActionTarget' | 'openidPanel',
                value,
            });
            return;
        }
        setCardNavModalOpen(false);
        setForceShowCardKeys(prev => new Set(prev).add(key));
        scrollToCard(key);
    };

    /** 确认修改发起人/目标/申请人 OpenID（仅前端），更新 ticket 状态并跳转到对应卡片 */
    const handlePlayerCardEditConfirm = () => {
        if (!playerCardEditModal || !ticket) return;
        const trimmed = playerCardEditModal.value.trim();
        setTicket(prev => {
            if (!prev) return prev;
            if (playerCardEditModal.key === 'playerActionInitiator')
                return { ...prev, initiator: trimmed };
            if (playerCardEditModal.key === 'playerActionTarget')
                return { ...prev, target: trimmed };
            if (playerCardEditModal.key === 'openidPanel')
                return { ...prev, creator_openid: trimmed };
            return prev;
        });
        setForceShowCardKeys(prev => new Set(prev).add(playerCardEditModal.key));
        if (playerCardEditModal.key !== 'openidPanel') {
            setCardNavParams(prev => ({ ...prev, [playerCardEditModal.key]: { ecid: trimmed } }));
        }
        setPlayerCardEditModal(null);
        setTimeout(() => scrollToCard(playerCardEditModal.key), 100);
    };

    // 获得工单信息
    useEffect(() => {
        setSpinning(true);
        Promise.all([
            fetchData({
                url: '/ticket/detail',
                method: 'GET',
                data: { tid: tid },
                setData: ticket => {
                    setTicket(ticket);
                },
            }),
            fetchData({
                url: '/shortcut/list',
                method: 'GET',
                data: {},
                setData: setShortcuts,
            }),
        ]).then(() => {
            setSpinning(false);
        });
        setDoRefresh(false);
    }, [doRefresh, tid, type]);

    // 更新工单详情的函数
    const updateTicketDetail = async () => {
        await fetchData({
            url: '/ticket/detail',
            method: 'GET',
            data: { tid: tid },
            setData: updatedTicket => {
                setTicket(updatedTicket);
            },
        });
    };

    const toLink = (() => {
        // 如果是媒体相关工单类型且有backToMy参数，跳转到媒体管理页面
        if (type === 'backToMy' && ticket && MEDIA_TYPES.includes(ticket.type)) {
            return '/media/ticket/my';
        }
        // 如果是backToMy参数，跳转到普通工单页面
        if (type === 'backToMy') {
            return '/ticket/my';
        }
        // 其他情况跳转到分配页面
        return '/ticket/assign/' + type;
    })();

    // 完成本工单处理
    const formFinish = async (values: any) => {
        await submitData({
            data: {
                tid: tid,
                details: values.details,
                files: uploadedFiles,
                action: values.type || 'reply',
            },
            url: '/ticket/admin',
            redirectTo: '',
            successMessage: 'ticketOperate.success',
            method: 'POST',
            setIsFormDisabled: setIsFormDisabled,
            setIsModalOpen: () => {},
        });
        // 清空上传文件列表
        setUploadedFiles([]);
        form.resetFields();
        // 只更新工单详情，不刷新整个页面
        await updateTicketDetail();

        // 通知工单状态更新
        if (values.type === 'reply') {
            notifyTicketStatusUpdate(Number(tid), TicketStatus.WaitingReply);
        } else if (values.type === 'process') {
            notifyTicketStatusUpdate(Number(tid), TicketStatus.Accept);
        } else if (values.type === 'reject') {
            notifyTicketStatusUpdate(Number(tid), TicketStatus.Reject);
        }

        // 通知工单数量更新
        notifyTicketCountUpdate();
    };

    // 处理预览关闭
    const handleClosePreview = async () => {
        setPreviewEcid(null);
        setPreviewDefaultTab(undefined);
        setPreviewInitialSettings(undefined);
        // 关闭超级面板后刷新工单详情
        await updateTicketDetail();
    };

    // 处理AI回复草稿应用
    const handleApplyAIDraft = (content: string) => {
        const currentDetails = form.getFieldValue('details') || '';
        form.setFieldValue('details', currentDetails + (currentDetails ? '\n' : '') + content);
    };

    // 处理AI操作建议执行
    const handleExecuteAIAction = async (actionJson: string) => {
        try {
            const actions = JSON.parse(actionJson);
            if (!Array.isArray(actions)) {
                messageApi.error(gLang('admin.ticketAiFormatError'));
                return;
            }

            // 执行每个操作
            for (const action of actions) {
                if (!action.type || action.data === undefined) {
                    messageApi.error(gLang('admin.ticketOpFormatError'));
                    continue;
                }

                await fetchData({
                    url: '/ec/fast-action',
                    method: 'POST',
                    data: {
                        ecid: ticket?.initiator || '',
                        action: action.type,
                        value: action.data,
                        authorizer: user?.userid || '',
                        tid: tid,
                    },
                    setData: () => {
                        messageApi.success(gLang('admin.ticketOpSuccess', { type: action.type }));
                    },
                });
            }

            // 执行完毕后刷新工单详情
            await updateTicketDetail();
        } catch {
            messageApi.error(gLang('admin.ticketAiFormatOrExecFailed'));
        }
    };

    return (
        <>
            {/* 动态页面Meta信息 */}
            {ticket && <PageMeta {...generateAdminTicketMeta(ticket)} url={window.location.href} />}

            {contextHolder}
            {modalContextHolder}
            {/* 截图图片预览 */}
            <Image
                style={{ display: 'none' }}
                preview={{
                    visible: !!previewImage,
                    src: previewImage ?? '',
                    onVisibleChange: (vis: boolean) => {
                        if (!vis) setPreviewImage(null);
                    },
                }}
            />
            <Skeleton active loading={spinning}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {/*举报工单的特殊提示*/}
                    {ticket?.type === TicketType.ReportPlayer ||
                    forceShowCardKeys.has('reportAlert') ? (
                        <div
                            ref={el => {
                                cardRefsMap.current['reportAlert'] = el;
                            }}
                        >
                            <Alert
                                showIcon
                                type="warning"
                                message={gLang('ticketOperate.adminNotice.report.title')}
                                description={gLang('ticketOperate.adminNotice.report.desc')
                                    .split('\n')
                                    .map(line => (
                                        <p key={line} style={{ marginBottom: 4 }}>
                                            {line}
                                        </p>
                                    ))}
                                style={{ paddingBottom: 16 }}
                            />
                        </div>
                    ) : null}

                    {/* FB格式工单卡片：仅对 GU 显示，支持反馈格式/正常切换、按楼回复、打开管理面板 */}
                    {(ticket?.type === TicketType.Feedback ||
                        forceShowCardKeys.has('feedbackFormat')) &&
                    ticket ? (
                        <div
                            ref={el => {
                                cardRefsMap.current['feedbackFormat'] = el;
                            }}
                        >
                            <FeedbackFormatCard
                                ticket={ticket}
                                onRefresh={updateTicketDetail}
                                feedbackFormatEnabled={feedbackFormatEnabled}
                                setFeedbackFormatEnabled={setFeedbackFormatEnabled}
                                forceShow={forceShowCardKeys.has('feedbackFormat')}
                            />
                        </div>
                    ) : null}

                    {/*工单内容组件（FB 且开启反馈格式时由 FeedbackFormatCard 展示，此处隐藏）*/}
                    {!isFeedbackFormatView ? (
                        <div
                            ref={el => {
                                (
                                    ticketDetailRef as React.MutableRefObject<HTMLDivElement | null>
                                ).current = el;
                                cardRefsMap.current['ticketDetail'] = el;
                            }}
                        >
                            <TicketDetailComponent
                                ticket={ticket}
                                isAdmin={true}
                                onRefresh={updateTicketDetail}
                                onApplyAIDraft={handleApplyAIDraft}
                                onExecuteAIAction={handleExecuteAIAction}
                            />
                        </div>
                    ) : (
                        <div
                            ref={el => {
                                (
                                    ticketDetailRef as React.MutableRefObject<HTMLDivElement | null>
                                ).current = el;
                                cardRefsMap.current['ticketDetail'] = el;
                            }}
                        />
                    )}

                    {/* 分享按钮 */}
                    <div
                        ref={el => {
                            cardRefsMap.current['shareButtons'] = el;
                        }}
                    >
                        <ShareTicketButtons
                            ticket={ticket}
                            ticketDetailRef={ticketDetailRef}
                            isDarkMode={isDarkMode}
                            user={user}
                            setPreviewImage={setPreviewImage}
                        />
                    </div>

                    {/* 玩家操作卡片 */}
                    {(ticket && ticketWithInitiator(ticket) && ticket.initiator) ||
                    (forceShowCardKeys.has('playerActionInitiator') &&
                        (ticket?.initiator || cardNavParams.playerActionInitiator?.ecid))
                        ? (() => {
                              const ecid =
                                  ticket?.initiator ??
                                  cardNavParams.playerActionInitiator?.ecid ??
                                  '';
                              return ecid ? (
                                  <div
                                      ref={el => {
                                          cardRefsMap.current['playerActionInitiator'] = el;
                                      }}
                                  >
                                      <PlayerActionCard
                                          key={`initiator-${ticket?.tid ?? 'param'}-${ecid}`}
                                          ecid={ecid}
                                          playerType={
                                              ticket
                                                  ? gLang('ticketList.account.' + ticket.type)
                                                  : gLang(
                                                        'ticketOperate.cardNav.playerActionInitiator'
                                                    )
                                          }
                                          shortcuts={shortcuts.filter(sc =>
                                              ['A', 'B'].includes(sc.type)
                                          )}
                                          windowWidth={window.innerWidth}
                                          onPreview={(ecid, tab, settings) => {
                                              setPreviewEcid(ecid);
                                              setPreviewDefaultTab(tab);
                                              setPreviewInitialSettings(settings);
                                          }}
                                          userRole="initiator"
                                          tid={tid}
                                          updateTicketDetail={updateTicketDetail}
                                      />
                                  </div>
                              ) : null;
                          })()
                        : null}

                    {/* 目标玩家操作卡片 */}
                    {(ticket && ticketWithTarget(ticket) && ticket.target) ||
                    (forceShowCardKeys.has('playerActionTarget') &&
                        (ticket?.target || cardNavParams.playerActionTarget?.ecid))
                        ? (() => {
                              const ecid =
                                  ticket?.target ?? cardNavParams.playerActionTarget?.ecid ?? '';
                              return ecid ? (
                                  <div
                                      ref={el => {
                                          cardRefsMap.current['playerActionTarget'] = el;
                                      }}
                                  >
                                      <PlayerActionCard
                                          key={`target-${ticket?.tid ?? 'param'}-${ecid}`}
                                          ecid={ecid}
                                          playerType={
                                              ticket
                                                  ? gLang('ticketList.target.' + ticket.type)
                                                  : gLang(
                                                        'ticketOperate.cardNav.playerActionTarget'
                                                    )
                                          }
                                          shortcuts={shortcuts.filter(sc =>
                                              ['A', 'B'].includes(sc.type)
                                          )}
                                          windowWidth={window.innerWidth}
                                          onPreview={(ecid, tab, settings) => {
                                              setPreviewEcid(ecid);
                                              setPreviewDefaultTab(tab);
                                              setPreviewInitialSettings(settings);
                                          }}
                                          userRole="target"
                                          tid={tid}
                                          updateTicketDetail={updateTicketDetail}
                                      />
                                  </div>
                              ) : null;
                          })()
                        : null}

                    {/* 媒体综合卡片（面板入口 + E点发放 + 更换兑奖账号） */}
                    {((ticket && ticketWithCreator(ticket)) ||
                        forceShowCardKeys.has('mediaPanel')) &&
                    ticket ? (
                        <div
                            ref={el => {
                                cardRefsMap.current['mediaPanel'] = el;
                            }}
                        >
                            <MediaPanelCard ticket={ticket} onRefresh={updateTicketDetail} />
                        </div>
                    ) : null}

                    {/* 媒体月度工单面板 */}
                    {((ticket && ticketWithCreator(ticket)) ||
                        forceShowCardKeys.has('mediaMonthly')) &&
                    ticket ? (
                        <div
                            ref={el => {
                                cardRefsMap.current['mediaMonthly'] = el;
                            }}
                        >
                            <MediaMonthlyTicketsPanel ticket={ticket} />
                        </div>
                    ) : null}

                    {/* 反馈中心卡片（JY工单） */}
                    {((ticket && ticket.type === TicketType.Suggestion) ||
                        forceShowCardKeys.has('feedbackCenter')) &&
                    ticket ? (
                        <div
                            ref={el => {
                                cardRefsMap.current['feedbackCenter'] = el;
                            }}
                        >
                            <FeedbackCenterCard
                                ticket={ticket}
                                onRefresh={updateTicketDetail}
                                forceShowWithoutMatch={forceShowCardKeys.has('feedbackCenter')}
                            />
                        </div>
                    ) : null}

                    {/*回复工单卡片（FB 且开启反馈格式时由 FeedbackFormatCard 内回复，此处隐藏）*/}
                    <div
                        ref={el => {
                            cardRefsMap.current['replyForm'] = el;
                        }}
                    >
                        {!isFeedbackFormatView && (
                            <TicketReplyForm
                                form={form}
                                ticket={ticket}
                                shortcuts={shortcuts.filter(sc => sc.type === 'M')}
                                isSubmitting={isFormDisabled}
                                uploadedFiles={uploadedFiles}
                                onUploadChange={setUploadedFiles}
                                onSubmit={formFinish}
                                onReturnToMyChange={setReturnToMy}
                                isUploading={isUploading}
                                setIsUploading={setIsUploading}
                                onOpenCardNav={() => setCardNavModalOpen(true)}
                            />
                        )}
                    </div>

                    {/*操作工单卡片*/}
                    {(ticket || forceShowCardKeys.has('ticketAction')) &&
                    ticket ? (
                        <div
                            ref={el => {
                                cardRefsMap.current['ticketAction'] = el;
                            }}
                        >
                            <TicketActionCard
                                ticket={ticket}
                                form={form}
                                modal={modal}
                                formFinish={formFinish}
                                submitData={submitData}
                                setIsFormDisabled={setIsFormDisabled}
                                navigate={navigate}
                                returnToMy={returnToMy}
                                toLink={toLink}
                                tid={tid}
                                onActionComplete={
                                    propOnActionComplete
                                        ? propOnActionComplete
                                        : ticket?.type === TicketType.Feedback
                                          ? updateTicketDetail
                                          : undefined
                                }
                            />
                        </div>
                    ) : null}

                    {/* 申请人Openid操作面板 */}
                    {!isFeedbackFormatView &&
                    (ticket || forceShowCardKeys.has('openidPanel')) &&
                    ticket ? (
                        <div
                            ref={el => {
                                cardRefsMap.current['openidPanel'] = el;
                            }}
                        >
                            <OpenidPanelComponent openid={ticket.creator_openid || ''} />
                        </div>
                    ) : null}

                    {/*开发者模式*/}
                    {!isFeedbackFormatView &&
                    (ticket || forceShowCardKeys.has('quickOps')) &&
                    ticket ? (
                        <div
                            ref={el => {
                                cardRefsMap.current['quickOps'] = el;
                            }}
                        >
                            <QuickOpsComponent
                                ticket={ticket}
                                setIsFormDisabled={setIsFormDisabled}
                                messageApi={messageApi}
                                modal={modal}
                            />
                        </div>
                    ) : null}

                    {/* 卡片导航模态框 */}
                    <Modal
                        title={gLang('ticketOperate.cardNav.title')}
                        open={cardNavModalOpen}
                        onCancel={() => setCardNavModalOpen(false)}
                        footer={null}
                        width={480}
                    >
                        <List
                            dataSource={CARD_NAV_KEYS}
                            renderItem={(key: string) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="jump"
                                            type="link"
                                            size="small"
                                            onClick={() => handleCardNavClick(key)}
                                        >
                                            {gLang('ticketOperate.cardNav.jump')}
                                        </Button>,
                                    ]}
                                >
                                    <List.Item.Meta title={gLang(`ticketOperate.cardNav.${key}`)} />
                                </List.Item>
                            )}
                        />
                    </Modal>

                    {/* 跳转玩家/目标卡片时：修改 initiator 或 target（仅前端生效） */}
                    <Modal
                        title={gLang('ticketOperate.cardNav.editInitiatorTargetTitle')}
                        open={!!playerCardEditModal}
                        onCancel={() => setPlayerCardEditModal(null)}
                        onOk={handlePlayerCardEditConfirm}
                        okText={gLang('ok')}
                        cancelText={gLang('cancel')}
                        destroyOnClose
                        width={400}
                    >
                        {playerCardEditModal && (
                            <>
                                <div style={{ marginBottom: 8 }}>
                                    <span
                                        style={{
                                            color: 'var(--ant-color-text-secondary)',
                                            fontSize: 12,
                                        }}
                                    >
                                        {gLang('ticketOperate.cardNav.editFrontendOnlyHint')}
                                    </span>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', marginBottom: 4 }}>
                                        {gLang(EDIT_MODAL_LABEL_MAP[playerCardEditModal.key])}
                                    </label>
                                    <Input
                                        value={playerCardEditModal.value}
                                        onChange={e =>
                                            setPlayerCardEditModal(prev =>
                                                prev ? { ...prev, value: e.target.value } : null
                                            )
                                        }
                                        placeholder={
                                            EDIT_MODAL_PLACEHOLDER_MAP[playerCardEditModal.key]
                                        }
                                        allowClear
                                    />
                                </div>
                            </>
                        )}
                    </Modal>

                    {/* 玩家超级面板 Modal */}
                    <Modal
                        title={`${gLang('ticketOperate.modifyPlayer')}${previewEcid}`}
                        open={!!previewEcid}
                        onCancel={handleClosePreview}
                        footer={null}
                        width="100%"
                        centered
                        style={{ maxWidth: 1000 }}
                    >
                        <div
                            style={{
                                overflowX: 'hidden',
                                overflowY: 'scroll',
                                marginTop: '20px',
                                minHeight: '88vh',
                            }}
                        >
                            <SuperPanelPlayerComponent
                                key={previewEcid}
                                ecid={previewEcid ?? ''}
                                tid={tid ? parseInt(tid) : null}
                                defaultTab={previewDefaultTab}
                                initialSettings={previewInitialSettings}
                                setDoRefresh={() => {}}
                            />
                        </div>
                    </Modal>
                </Space>
            </Skeleton>
        </>
    );
};

export default TicketOperate;
