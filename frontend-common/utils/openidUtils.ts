// OpenID 相关工具函数

/**
 * 检查是否是有效的 openid
 * @param str 要检查的字符串
 * @returns 是否是有效的 openid
 */
export const isValidOpenid = (str: string): boolean => {
    // 格式1: o开头，后面跟着字母数字下划线连字符，长度至少18字符
    const format1 = /^o[A-Za-z0-9_-]{17,}$/.test(str);
    // 格式2: NexaId_开头+数字
    const format2 = /^NexaId_\d+$/.test(str);
    // 格式3: EC-开头（ECID格式的openid）
    const format3 = /^EC-[A-Za-z0-9_-]+$/.test(str);
    // 格式4: 32位十六进制格式的OpenID（如D8E24D1A42635338F20526E546FC0C0D）
    const format4 = /^[A-Fa-f0-9]{32}$/.test(str);
    return format1 || format2 || format3 || format4;
};
