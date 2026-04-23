import React, { useState } from 'react';
import { Button, Card, Modal, Radio, Space, Typography } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import { useTheme, type CustomThemeName } from '@common/contexts/ThemeContext';
import { gLang } from '@common/language';
import { CUSTOM_THEME_PALETTES } from '@common/themes/customPalettes';

const { Paragraph, Text } = Typography;

type ThemeSelectionValue = 'system' | CustomThemeName;

interface ThemeSettingsButtonProps {
    // 如果提供了 open 和 onOpenChange，则作为受控组件使用
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    // 如果 hideButton 为 true，则只渲染 Modal 不渲染按钮
    hideButton?: boolean;
}

const ThemeSettingsButton: React.FC<ThemeSettingsButtonProps> = ({
    open: controlledOpen,
    onOpenChange,
    hideButton = false,
}) => {
    const [internalOpen, setInternalOpen] = useState(false);

    // 使用受控或非受控模式
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = (value: boolean) => {
        if (isControlled) {
            onOpenChange?.(value);
        } else {
            setInternalOpen(value);
        }
    };
    const {
        isCustomThemeActive,
        customTheme,
        activateCustomTheme,
        deactivateCustomTheme,
        getThemeColor,
    } = useTheme();
    type PaletteKey = keyof (typeof CUSTOM_THEME_PALETTES)[CustomThemeName];
    const getCustomColor = (key: PaletteKey) => {
        if (!customTheme) {
            return undefined;
        }
        return {
            [customTheme]: CUSTOM_THEME_PALETTES[customTheme][key],
        } as Partial<Record<CustomThemeName, string>>;
    };

    const selectedTheme: ThemeSelectionValue =
        isCustomThemeActive && customTheme ? customTheme : 'system';

    const handleThemeSelection = (value: ThemeSelectionValue) => {
        if (value === selectedTheme) {
            setOpen(false);
            return;
        }

        if (value === 'system') {
            deactivateCustomTheme();
        } else {
            activateCustomTheme(value);
        }
        setOpen(false);
    };

    const modalBorder = getThemeColor({
        light: '#f0f0f0',
        dark: '#303030',
        custom: getCustomColor('border'),
    });
    const modalTitleColor = getThemeColor({
        light: '#1a1a1a',
        dark: '#f5f5f5',
        custom: getCustomColor('textPrimary'),
    });
    const descriptionColor = getThemeColor({
        light: '#666666',
        dark: '#8c8c8c',
        custom: getCustomColor('textMuted'),
    });
    const highlightColor = getThemeColor({
        light: '#1677ff',
        dark: '#177ddc',
        custom: getCustomColor('accent'),
    });
    const buttonTextColor = getThemeColor({
        light: '#1f1f1f',
        dark: '#f5f5f5',
        custom: getCustomColor('textPrimary'),
    });
    const cardBackground = getThemeColor({
        light: '#ffffff',
        dark: '#1f1f1f',
        custom: getCustomColor('surfaceAlt'),
    });
    const cardActiveBackground = getThemeColor({
        light: '#f5f5f5',
        dark: '#262626',
        custom: getCustomColor('hover'),
    });
    const cardBorderColor = getThemeColor({
        light: '#e5e5e5',
        dark: '#303030',
        custom: getCustomColor('border'),
    });

    const themeOptions: Array<{
        value: ThemeSelectionValue;
        label: string;
        description: string;
        note?: string;
        previewColors: string[];
    }> = [
        {
            value: 'system',
            label: gLang('resources.theme.systemLabel'),
            description: gLang('resources.theme.systemDescription'),
            previewColors: ['#ffffff', '#1f1f1f', '#1677ff'],
        },
        {
            value: 'blackOrange',
            label: gLang('resources.theme.blackOrangeLabel'),
            description: gLang('resources.theme.blackOrangeDescription'),
            note: gLang('resources.theme.blackOrangeNote'),
            previewColors: [
                CUSTOM_THEME_PALETTES.blackOrange.background,
                CUSTOM_THEME_PALETTES.blackOrange.textPrimary,
                CUSTOM_THEME_PALETTES.blackOrange.accent,
            ],
        },
        {
            value: 'whiteMinimal',
            label: gLang('resources.theme.whiteMinimalLabel'),
            description: gLang('resources.theme.whiteMinimalDescription'),
            note: gLang('resources.theme.whiteMinimalNote'),
            previewColors: [
                CUSTOM_THEME_PALETTES.whiteMinimal.background,
                CUSTOM_THEME_PALETTES.whiteMinimal.textPrimary,
                CUSTOM_THEME_PALETTES.whiteMinimal.accent,
            ],
        },
    ];

    return (
        <>
            {!hideButton && (
                <Button
                    type="text"
                    icon={<BgColorsOutlined />}
                    style={{
                        color: buttonTextColor,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                    onClick={() => setOpen(true)}
                />
            )}
            <Modal
                open={open}
                onCancel={() => setOpen(false)}
                footer={null}
                centered
                destroyOnHidden
                title={gLang('resources.theme.title')}
                styles={{
                    header: {
                        color: modalTitleColor,
                        borderBottom: `1px solid ${modalBorder}`,
                    },
                }}
            >
                <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                    <Paragraph style={{ margin: 0, color: descriptionColor }}>
                        {gLang('resources.theme.description')}
                    </Paragraph>
                    <Radio.Group
                        value={selectedTheme}
                        onChange={event =>
                            handleThemeSelection(event.target.value as ThemeSelectionValue)
                        }
                        style={{ width: '100%' }}
                    >
                        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                            {themeOptions.map(option => {
                                const isSelected = option.value === selectedTheme;
                                return (
                                    <Card
                                        key={option.value}
                                        onClick={() => handleThemeSelection(option.value)}
                                        style={{
                                            border: `1px solid ${
                                                isSelected ? highlightColor : cardBorderColor
                                            }`,
                                            background: isSelected
                                                ? cardActiveBackground
                                                : cardBackground,
                                            cursor: 'pointer',
                                            transition:
                                                'border-color 0.2s ease, background-color 0.2s ease',
                                        }}
                                        styles={{ body: { padding: '16px 20px' } }}
                                    >
                                        <Space
                                            align="start"
                                            style={{
                                                width: '100%',
                                                justifyContent: 'space-between',
                                                gap: 16,
                                            }}
                                        >
                                            <Space align="start" size={12}>
                                                <Radio value={option.value} />
                                                <Space orientation="vertical" size={4}>
                                                    <Text
                                                        style={{
                                                            color: isSelected
                                                                ? highlightColor
                                                                : modalTitleColor,
                                                            fontWeight: 600,
                                                            fontSize: 16,
                                                        }}
                                                    >
                                                        {option.label}
                                                    </Text>
                                                    <Text style={{ color: descriptionColor }}>
                                                        {option.description}
                                                    </Text>
                                                    {option.note && (
                                                        <Text
                                                            style={{
                                                                color: highlightColor,
                                                                fontSize: 12,
                                                            }}
                                                        >
                                                            {option.note}
                                                        </Text>
                                                    )}
                                                </Space>
                                            </Space>
                                            <Space size={8} wrap>
                                                {option.previewColors.map((color, index) => (
                                                    <div
                                                        key={`${option.value}-${index}`}
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 8,
                                                            background: color,
                                                            border: `1px solid ${
                                                                isSelected
                                                                    ? highlightColor
                                                                    : modalBorder
                                                            }`,
                                                        }}
                                                    />
                                                ))}
                                            </Space>
                                        </Space>
                                    </Card>
                                );
                            })}
                        </Space>
                    </Radio.Group>
                </Space>
            </Modal>
        </>
    );
};

export default ThemeSettingsButton;
