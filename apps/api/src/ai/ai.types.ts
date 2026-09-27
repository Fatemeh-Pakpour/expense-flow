import type { AiEnv } from '../config/env';

export const AI_CONFIG = Symbol('AI_CONFIG');

export type AiConfig = AiEnv;

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};
