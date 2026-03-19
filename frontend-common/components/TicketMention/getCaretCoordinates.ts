/**
 * 计算 textarea 中光标的像素坐标（相对于 textarea 元素）。
 * 使用 mirror div 技术：创建一个不可见的 div 复制 textarea 的样式和文本，
 * 然后在光标位置插入一个 span 来测量坐标。
 */

const MIRROR_STYLE_PROPS = [
    'direction',
    'boxSizing',
    'width',
    'overflowX',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
] as const;

export interface CaretCoordinates {
    top: number;
    left: number;
    height: number;
}

export function getCaretCoordinates(
    element: HTMLTextAreaElement,
    position: number
): CaretCoordinates {
    const doc = element.ownerDocument;
    const mirror = doc.createElement('div');
    mirror.id = 'ticket-mention-mirror';

    const style = mirror.style;
    const computed = getComputedStyle(element);

    style.whiteSpace = 'pre-wrap';
    style.wordWrap = 'break-word';
    style.position = 'absolute';
    style.visibility = 'hidden';
    style.overflow = 'hidden';

    for (const prop of MIRROR_STYLE_PROPS) {
        style[prop as any] = computed[prop as any];
    }

    // height 设为 auto 让 mirror 自然撑开
    style.height = 'auto';

    mirror.textContent = element.value.substring(0, position);

    const span = doc.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    mirror.appendChild(span);

    doc.body.appendChild(mirror);

    const coordinates: CaretCoordinates = {
        top: span.offsetTop - element.scrollTop,
        left: span.offsetLeft,
        height: parseInt(computed.lineHeight) || parseInt(computed.fontSize) * 1.2,
    };

    doc.body.removeChild(mirror);

    return coordinates;
}
