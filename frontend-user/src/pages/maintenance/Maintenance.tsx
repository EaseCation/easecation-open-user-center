// Maintenance page component
// Usage: Displayed when maintenance mode is enabled.

import React from 'react';
import { Result } from 'antd';
import { useTheme } from '@common/contexts/ThemeContext';
import Wrapper from '@common/components/Wrapper/Wrapper';
import { gLang } from '@common/language';

const Maintenance: React.FC = () => {
    const { getThemeColor } = useTheme();

    return (
        <Wrapper>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '60vh',
                }}
            >
                <Result
                    status="warning"
                    title={gLang('maintenance.message')}
                    subTitle={
                        <div
                            style={{
                                color: getThemeColor({
                                    light: 'rgba(0, 0, 0, 0.65)',
                                    dark: 'rgba(255, 255, 255, 0.65)',
                                }),
                            }}
                        >
                            {gLang('maintenance.subTitle')}
                            <br />
                            {gLang('maintenance.contactAdmin')}
                        </div>
                    }
                />
            </div>
        </Wrapper>
    );
};

export default Maintenance;
