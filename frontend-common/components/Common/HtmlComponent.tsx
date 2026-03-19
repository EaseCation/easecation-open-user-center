import React, { useCallback } from 'react';

interface HtmlContentProps {
    content: string;
}

const HTMLComponent: React.FC<HtmlContentProps> = ({ content }) => {
    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const target = (e.target as HTMLElement).closest('a');
        if (!target) return;
        const href = target.getAttribute('href');
        if (!href || !href.startsWith('/')) return;
        // 内部链接：阻止原生导航，改用 SPA 路由
        e.preventDefault();
        window.history.pushState({}, '', href);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }, []);

    return <div dangerouslySetInnerHTML={{ __html: content }} onClick={handleClick} />;
};

export default HTMLComponent;
