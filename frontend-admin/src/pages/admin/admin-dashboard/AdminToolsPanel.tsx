// 管理面板，实用工具

import React, { useMemo, useState } from 'react';
import { Button, Col, Input, Modal, Row, Space, Typography, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import useIsPC from '@common/hooks/useIsPC';
import { gLang } from '@common/language';
import { isValidOpenid } from '@common/utils/openidUtils';
import AdminToolCard from '../components/AdminToolCard';
import OpenIDPanel from '../ticket/ticket-operate/components/openid-panel/OpenIDPanel';
import type { MessageInstance } from 'antd/es/message/interface';
import { getUtilityToolsConfig } from '../config/utilityTools.config';

type Props = {
    onOpenSuperPanel: (ecid: string) => void;
    onOpenTicketAction: (tid: string) => void;
    user?: { permission?: string[] } | null;
    messageApi: MessageInstance;
};

const AdminToolsPanel: React.FC<Props> = ({
    onOpenSuperPanel,
    onOpenTicketAction,
    user,
    messageApi,
}) => {
    const { Title, Text } = Typography;
    const isPC = useIsPC();
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<'auto' | 'ticket' | 'ecid' | 'openid'>('auto');
    const [jwtModalVisible, setJwtModalVisible] = useState(false);
    const [jwtValue, setJwtValue] = useState('');
    const [openidModalVisible, setOpenidModalVisible] = useState(false);
    const [currentOpenid, setCurrentOpenid] = useState('');

    // 智能判断是否为工单号（4-6位数字）
    const isTicketId = useMemo(() => /^\d{4,6}$/.test(query.trim()), [query]);

    // 智能判断是否为openid
    const isOpenId = useMemo(() => {
        const trimmed = query.trim();
        return isValidOpenid(trimmed);
    }, [query]);

    const handleSubmit = () => {
        const value = query.trim();
        if (!value) return;

        let effectiveMode: 'ticket' | 'ecid' | 'openid';
        if (mode === 'auto') {
            if (isTicketId) {
                effectiveMode = 'ticket';
            } else if (isOpenId) {
                effectiveMode = 'openid';
            } else {
                effectiveMode = 'ecid';
            }
        } else {
            effectiveMode = mode;
        }

        if (effectiveMode === 'ticket') {
            onOpenTicketAction(value);
        } else if (effectiveMode === 'openid') {
            // 对于openid，我们需要先查询绑定的账号信息
            handleOpenIdQuery(value);
        } else {
            onOpenSuperPanel(value);
        }
    };

    // 处理openid查询
    const handleOpenIdQuery = (openid: string) => {
        // 设置OpenID并显示模态框
        setCurrentOpenid(openid);
        setOpenidModalVisible(true);
    };

    const showJwtToken = () => {
        try {
            const jwt = localStorage.getItem('jwt');
            if (jwt) {
                setJwtValue(jwt);
                setJwtModalVisible(true);
            } else {
                messageApi.warning(gLang('adminMain.jwt.notFound'));
            }
        } catch {
            messageApi.error(gLang('adminMain.jwt.getFailed'));
        }
    };

    const copyJwtToClipboard = () => {
        navigator.clipboard
            .writeText(jwtValue)
            .then(() => {
                messageApi.success(gLang('adminMain.jwt.copySuccess'));
            })
            .catch(() => {
                messageApi.error(gLang('adminMain.jwt.copyFailed'));
            });
    };

    const modeOptions = [
        { value: 'auto', label: gLang('adminMain.tools.smart') },
        { value: 'ticket', label: gLang('adminMain.tools.tid') },
        { value: 'ecid', label: gLang('adminMain.tools.ecid') },
        { value: 'openid', label: gLang('adminMain.tools.openid') },
    ] as const;

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={4} style={{ marginBottom: 4 }}>
                {gLang('adminMain.group.tools')}
            </Title>

            {/* 搜索工具 */}
            <Input.Search
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={
                    isPC
                        ? gLang('adminMain.tools.searchPlaceholder')
                        : gLang('adminMain.tools.searchPlaceholderMobile')
                }
                allowClear
                enterButton={
                    isPC ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <SearchOutlined />
                            {gLang('adminMain.tools.search')}
                        </span>
                    ) : (
                        <SearchOutlined />
                    )
                }
                onSearch={handleSubmit}
                style={{ marginTop: isPC ? 12 : 6, marginBottom: isPC ? 12 : 6 }}
                addonBefore={
                    <Select
                        value={mode}
                        onChange={(v: 'auto' | 'ticket' | 'ecid' | 'openid') => setMode(v)}
                        options={modeOptions as unknown as { value: string; label: string }[]}
                        size={isPC ? 'middle' : 'small'}
                        style={{ minWidth: isPC ? 96 : 72 }}
                    />
                }
            />

            {/* 工具卡片 */}
            {(() => {
                const utilityTools = getUtilityToolsConfig().filter(
                    tool => !tool.permission || user?.permission?.includes(tool.permission)
                );

                const columnSpan = isPC ? 6 : 12;
                return (
                    <Row gutter={[16, 16]}>
                        {utilityTools.map(tool => (
                            <Col key={tool.key} span={columnSpan}>
                                <AdminToolCard
                                    to={tool.key === 'jwt' ? undefined : tool.route}
                                    onClick={tool.key === 'jwt' ? showJwtToken : undefined}
                                    icon={<tool.Icon />}
                                    text={tool.title}
                                />
                            </Col>
                        ))}
                    </Row>
                );
            })()}

            {/* JWT令牌模态框 */}
            <Modal
                title={gLang('adminMain.jwt.modalTitle')}
                open={jwtModalVisible}
                onCancel={() => setJwtModalVisible(false)}
                footer={[
                    <Button key="copy" type="primary" onClick={copyJwtToClipboard}>
                        {gLang('adminMain.jwt.copyButton')}
                    </Button>,
                    <Button key="close" onClick={() => setJwtModalVisible(false)}>
                        {gLang('adminMain.jwt.closeButton')}
                    </Button>,
                ]}
            >
                <Text type="warning" style={{ display: 'block' }}>
                    {gLang('adminMain.jwt.securityTip')}
                </Text>
                <Input.TextArea value={jwtValue} readOnly rows={6} style={{ marginTop: 16 }} />
            </Modal>

            {/* OpenID面板模态框 */}
            <Modal
                title={`OpenID: ${currentOpenid}`}
                open={openidModalVisible}
                onCancel={() => setOpenidModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setOpenidModalVisible(false)}>
                        {gLang('adminMain.jwt.closeButton')}
                    </Button>,
                ]}
                width={1200}
                style={{ top: 20 }}
            >
                {currentOpenid && <OpenIDPanel openid={currentOpenid} defaultExpanded={true} />}
            </Modal>
        </Space>
    );
};

export default AdminToolsPanel;
