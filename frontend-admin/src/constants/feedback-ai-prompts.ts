/**
 * 反馈 AI 回复预设提示词
 */

import { gLang } from '@common/language';

export const FEEDBACK_AI_SYSTEM_PROMPT = gLang('admin.feedbackAiSystemPrompt');

export interface FeedbackAIPreset {
    key: string;
    label: string;
    prompt: string;
}

export const FEEDBACK_AI_PRESETS: FeedbackAIPreset[] = [
    {
        key: 'ask_clue',
        label: gLang('admin.feedbackAiPreset.askClue.label'),
        prompt: gLang('admin.feedbackAiPreset.askClue.prompt'),
    },
    {
        key: 'comfort',
        label: gLang('admin.feedbackAiPreset.comfort.label'),
        prompt: gLang('admin.feedbackAiPreset.comfort.prompt'),
    },
    {
        key: 'follow_up',
        label: gLang('admin.feedbackAiPreset.followUp.label'),
        prompt: gLang('admin.feedbackAiPreset.followUp.prompt'),
    },
    {
        key: 'dynamic',
        label: gLang('admin.feedbackAiPreset.dynamic.label'),
        prompt: gLang('admin.feedbackAiPreset.dynamic.prompt'),
    },
];

/**
 * 进度变更时自动映射的预设提示词 key
 */
export const PROGRESS_TO_PRESET_MAP: Record<string, string> = {
    [gLang('admin.feedbackAiProgress.noneToResearch')]: 'follow_up',
    [gLang('admin.feedbackAiProgress.researchToDevelopment')]: 'follow_up',
    [gLang('admin.feedbackAiProgress.developmentToTesting')]: 'comfort',
    [gLang('admin.feedbackAiProgress.testingToCompleted')]: 'dynamic',
};

export const getPresetByKey = (key: string): FeedbackAIPreset | undefined =>
    FEEDBACK_AI_PRESETS.find(p => p.key === key);
