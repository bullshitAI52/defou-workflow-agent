import { CONFIG } from './config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export class LLMClient {
    private anthropic?: Anthropic;
    private openai?: OpenAI;
    private provider: 'anthropic' | 'openai';

    constructor() {
        this.provider = this.determineProvider();
        this.initializeClient();
    }

    private determineProvider(): 'anthropic' | 'openai' {
        let provider = CONFIG.LLM_PROVIDER as 'anthropic' | 'openai';

        // Auto-detect based on Base URL if not explicitly set to openai
        if (CONFIG.LLM_BASE_URL && (CONFIG.LLM_BASE_URL.includes('aliyuncs') || CONFIG.LLM_BASE_URL.includes('dashscope'))) {
            provider = 'openai';
        }

        // Auto-detect based on API Key format (DashScope keys often start with 'sk-')
        // But OpenAI also starts with sk-, so we rely mostly on user config or base URL.
        // However, if the user set LLM_PROVIDER=openai, we respect that.

        return provider;
    }

    private initializeClient() {
        if (this.provider === 'anthropic') {
            this.anthropic = new Anthropic({
                apiKey: CONFIG.LLM_API_KEY || 'dummy',
                baseURL: CONFIG.LLM_BASE_URL,
            });
            console.log('🤖 LLM Client initialized: Anthropic');
        } else {
            this.openai = new OpenAI({
                apiKey: CONFIG.LLM_API_KEY || 'dummy',
                baseURL: CONFIG.LLM_BASE_URL,
            });
            console.log('🤖 LLM Client initialized: OpenAI/Compatible (e.g. Qwen)');
        }
    }

    async generateText(params: {
        system?: string;
        messages: { role: 'user' | 'assistant'; content: string }[];
        maxTokens?: number;
        temperature?: number;
        model?: string;
    }): Promise<string> {
        if (CONFIG.MOCK_MODE) {
            // Return a dummy string or handle in caller. 
            // Ideally caller checks MOCK_MODE, but we can have failsafe here.
            return "MOCK CONTENT";
        }

        try {
            if (this.provider === 'anthropic') {
                const model = params.model || CONFIG.LLM_MODEL || "claude-3-5-sonnet-20240620"; // Default to a known good Claude model
                // Note: The original code used "anthropic/claude-sonnet-4" which seems like a proxy model name or specific setup.
                // We'll trust CONFIG.LLM_MODEL or fall back to a sensible default if not provided.
                // If the user was using a proxy that mapped "anthropic/claude-sonnet-4", they should set that in LLM_MODEL.

                const msg = await this.anthropic!.messages.create({
                    model: model,
                    max_tokens: params.maxTokens || 4000,
                    temperature: params.temperature || 0.7,
                    system: params.system,
                    messages: params.messages as any,
                });

                return (msg.content[0] as any).text;
            } else {
                // OpenAI / Qwen
                const model = params.model || CONFIG.LLM_MODEL || "qwen-plus"; // Default for Qwen if strictly in that mode

                const messages = [];
                if (params.system) {
                    messages.push({ role: 'system', content: params.system });
                }
                messages.push(...params.messages);

                const completion = await this.openai!.chat.completions.create({
                    model: model,
                    messages: messages as any,
                    max_tokens: params.maxTokens || 4000,
                    temperature: params.temperature || 0.7,
                });

                return completion.choices[0].message?.content || "";
            }
        } catch (error) {
            console.error(`❌ LLM Generation Error (${this.provider}):`, error);
            throw error;
        }
    }
}

export const llm = new LLMClient();
