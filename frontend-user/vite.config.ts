import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import obfuscatorPlugin from 'rollup-plugin-javascript-confuser';

// https://vitejs.dev/config/
export default defineConfig(() => ({
    envDir: path.resolve(__dirname, '..', 'frontend-common'),
    plugins: [
        react(),
        obfuscatorPlugin({
            // 匹配所有 chunk，由 exclude 负责过滤
            include: [/./],
            // 排除第三方库的 chunk，避免无意义的混淆
            exclude: [/vendor/],
            options: {
                target: 'browser',
                preset: 'high',
                // pack 会将代码包进 IIFE，与 Vite 的 ESM 输出不兼容
                pack: false,
                // variableMasking 不支持 Rollup 打包后的多声明语句 (var a=1, b=2)
                variableMasking: false,
                // 以下三项会生成 with 语句，ESM 严格模式下不允许
                globalConcealing: false,
                flatten: false,
                controlFlowFlattening: false,
                // dispatcher 将标识符替换为函数调用，与 ESM export 语句不兼容
                dispatcher: false,
                // renameGlobals 会重命名导出标识符，破坏跨 chunk 的 ESM import/export 引用
                renameGlobals: false,
            },
        }),
    ],
    resolve: {
        alias: {
            '@ecuc/shared': path.resolve(__dirname, '..', 'shared'),
            '@common': path.resolve(__dirname, '..', 'frontend-common'),
        },
    },
    optimizeDeps: {
        exclude: ['@ecuc/shared', '@common'],
    },
    server: {
        port: 9101,
        fs: {
            // 允许访问上级目录下的 shared 包
            allow: [path.resolve(__dirname, '..')],
        },
    },
    define: {
        'import.meta.env.DEV': process.env.NODE_ENV !== 'production',
    },
    build: {
        // 启用 CSS 代码分割
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                // 将第三方库拆分到 vendor chunk，便于混淆时排除
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                },
            },
        },
    },
}));
