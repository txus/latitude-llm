import { Chain, ContentType, MessageRole } from '@latitude-data/compiler'
import { v4 as uuid } from 'uuid'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { objectToString, Workspace } from '../../browser'
import { LogSources, Providers } from '../../constants'
import * as factories from '../../tests/factories'
import * as aiModule from '../ai'
import { runChain } from './run'

// Mock other dependencies
vi.mock('@latitude-data/compiler')
vi.mock('uuid')

describe('runChain', () => {
  const mockChain: Partial<Chain> = {
    step: vi.fn(),
    rawText: 'Test raw text',
  }

  const mockUUID = '12345678-1234-1234-1234-123456789012'
  let apikeys: Map<string, any>

  function createMockAiResponse(text: string, totalTokens: number) {
    return {
      type: 'text',
      data: {
        text: Promise.resolve(text),
        usage: Promise.resolve({ totalTokens }),
        toolCalls: Promise.resolve([]),
        providerLog: Promise.resolve({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
        }),
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'text', text })
            controller.close()
          },
        }),
      },
    }
  }

  let workspace: Workspace

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(uuid).mockReturnValue(mockUUID)

    const { workspace: w, providers } = await factories.createProject({
      providers: [{ name: 'openai', type: Providers.OpenAI }],
    })
    apikeys = new Map(providers.map((p) => [p.name, p]))
    workspace = w
  })

  it('runs a chain without schema override', async () => {
    const mockAiResponse = createMockAiResponse('AI response', 10)

    vi.spyOn(aiModule, 'ai').mockResolvedValue(mockAiResponse as any)
    vi.mocked(mockChain.step!).mockResolvedValue({
      completed: true,
      conversation: {
        messages: [
          {
            role: MessageRole.user,
            content: [{ type: ContentType.text, text: 'Test message' }],
          },
        ],
        config: { provider: 'openai', model: 'gpt-3.5-turbo' },
      },
    })

    const result = await runChain({
      workspace,
      chain: mockChain as Chain,
      apikeys,
      source: LogSources.API,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const response = await result.value.response
    expect(response).toEqual(
      expect.objectContaining({
        documentLogUuid: expect.any(String),
        text: 'AI response',
        usage: { totalTokens: 10 },
        toolCalls: [],
      }),
    )

    expect(aiModule.ai).toHaveBeenCalledWith(
      expect.objectContaining({
        config: { provider: 'openai', model: 'gpt-3.5-turbo' },
        schema: undefined,
        output: 'no-schema',
      }),
    )
  })

  it('runs a chain with schema override', async () => {
    const mockSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    } as const

    const mockAiResponse = {
      type: 'object',
      data: {
        object: Promise.resolve({ name: 'John', age: 30 }),
        usage: Promise.resolve({ totalTokens: 15 }),
        providerLog: Promise.resolve({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
        }),
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'object',
              object: { name: 'John', age: 30 },
            })
            controller.close()
          },
        }),
      },
    }

    vi.spyOn(aiModule, 'ai').mockResolvedValue(mockAiResponse as any)

    vi.mocked(mockChain.step!).mockResolvedValue({
      completed: true,
      conversation: {
        messages: [
          {
            role: MessageRole.user,
            content: [{ type: ContentType.text, text: 'Test message' }],
          },
        ],
        config: { provider: 'openai', model: 'gpt-3.5-turbo' },
      },
    })

    const result = await runChain({
      workspace,
      chain: mockChain as Chain,
      apikeys,
      source: LogSources.API,
      configOverrides: {
        schema: mockSchema,
        output: 'object',
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const response = await result.value.response
    expect(response).toEqual(
      expect.objectContaining({
        documentLogUuid: expect.any(String),
        object: { name: 'John', age: 30 },
        text: objectToString({ name: 'John', age: 30 }),
        usage: { totalTokens: 15 },
      }),
    )

    expect(aiModule.ai).toHaveBeenCalledWith(
      expect.objectContaining({
        config: { provider: 'openai', model: 'gpt-3.5-turbo' },
        schema: mockSchema,
        output: 'object',
      }),
    )
  })

  it('handles errors during chain execution', async () => {
    vi.mocked(mockChain.step!).mockRejectedValue(
      new Error('Chain execution failed'),
    )

    const result = await runChain({
      workspace,
      chain: mockChain as Chain,
      apikeys,
      source: LogSources.API,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    await expect(result.value.response).rejects.toThrow(
      'Chain execution failed',
    )
    await expect(result.value.duration).rejects.toThrow(
      'Chain execution failed',
    )
  })

  it('handles multiple steps in a chain', async () => {
    const mockAiResponse1 = createMockAiResponse('AI response 1', 10)
    const mockAiResponse2 = createMockAiResponse('AI response 2', 15)

    vi.spyOn(aiModule, 'ai')
      .mockResolvedValueOnce(mockAiResponse1 as any)
      .mockResolvedValueOnce(mockAiResponse2 as any)

    vi.mocked(mockChain.step!)
      .mockResolvedValueOnce({
        completed: false,
        conversation: {
          messages: [
            {
              role: MessageRole.user,
              content: [{ type: ContentType.text, text: 'Step 1' }],
            },
          ],
          config: { provider: 'openai', model: 'gpt-3.5-turbo' },
        },
      })
      .mockResolvedValueOnce({
        completed: true,
        conversation: {
          messages: [
            {
              role: MessageRole.user,
              content: [{ type: ContentType.text, text: 'Step 1' }],
            },
            {
              role: MessageRole.assistant,
              content: 'AI response 1',
              toolCalls: [],
            },
            {
              role: MessageRole.user,
              content: [{ type: ContentType.text, text: 'Step 2' }],
            },
          ],
          config: { provider: 'openai', model: 'gpt-3.5-turbo' },
        },
      })

    const result = await runChain({
      workspace,
      chain: mockChain as Chain,
      apikeys,
      source: LogSources.API,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const response = await result.value.response
    expect(response).toEqual(
      expect.objectContaining({
        documentLogUuid: expect.any(String),
        text: 'AI response 2',
        usage: { totalTokens: 15 },
        toolCalls: [],
      }),
    )

    expect(aiModule.ai).toHaveBeenCalledTimes(2)
  })

  it('handles system messages correctly', async () => {
    const mockAiResponse = createMockAiResponse('AI response', 10)
    vi.spyOn(aiModule, 'ai').mockResolvedValue(mockAiResponse as any)

    vi.mocked(mockChain.step!).mockResolvedValue({
      completed: true,
      conversation: {
        messages: [
          {
            role: MessageRole.system,
            content: 'System instruction',
          },
          {
            role: MessageRole.user,
            content: [{ type: ContentType.text, text: 'User message' }],
          },
        ],
        config: { provider: 'openai', model: 'gpt-3.5-turbo' },
      },
    })

    const result = await runChain({
      workspace,
      chain: mockChain as Chain,
      apikeys,
      source: LogSources.API,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const response = await result.value.response
    expect(response).toEqual(
      expect.objectContaining({
        documentLogUuid: expect.any(String),
        text: 'AI response',
        usage: { totalTokens: 10 },
        toolCalls: [],
      }),
    )

    expect(aiModule.ai).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: MessageRole.system, content: 'System instruction' },
          {
            role: MessageRole.user,
            content: [{ type: ContentType.text, text: 'User message' }],
          },
        ],
      }),
    )
  })

  it('runs a chain with object schema and output', async () => {
    const mockSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    } as const

    const mockAiResponse = {
      type: 'object',
      data: {
        object: Promise.resolve({ name: 'John', age: 30 }),
        usage: Promise.resolve({ totalTokens: 15 }),
        providerLog: Promise.resolve({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
        }),
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'object',
              object: { name: 'John', age: 30 },
            })
            controller.close()
          },
        }),
      },
    }

    vi.spyOn(aiModule, 'ai').mockResolvedValue(mockAiResponse as any)

    vi.mocked(mockChain.step!).mockResolvedValue({
      completed: true,
      conversation: {
        messages: [
          {
            role: MessageRole.user,
            content: [{ type: ContentType.text, text: 'Test message' }],
          },
        ],
        config: { provider: 'openai', model: 'gpt-3.5-turbo' },
      },
    })

    const result = await runChain({
      workspace,
      chain: mockChain as Chain,
      apikeys,
      source: LogSources.API,
      configOverrides: {
        schema: mockSchema,
        output: 'object',
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const response = await result.value.response
    expect(response).toEqual(
      expect.objectContaining({
        documentLogUuid: expect.any(String),
        object: { name: 'John', age: 30 },
        text: objectToString({ name: 'John', age: 30 }),
        usage: { totalTokens: 15 },
      }),
    )

    expect(aiModule.ai).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: mockSchema,
        output: 'object',
      }),
    )
  })

  it('runs a chain with array schema and output', async () => {
    const mockSchema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      },
    } as const

    const mockAiResponse = {
      type: 'object',
      data: {
        object: Promise.resolve([
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ]),
        providerLog: Promise.resolve({
          provider: 'openai',
          model: 'gpt-3.5-turbo',
        }),
        usage: Promise.resolve({ totalTokens: 20 }),
        fullStream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'object',
              object: [
                { name: 'John', age: 30 },
                { name: 'Jane', age: 25 },
              ],
            })
            controller.close()
          },
        }),
      },
    }

    vi.spyOn(aiModule, 'ai').mockResolvedValue(mockAiResponse as any)

    vi.mocked(mockChain.step!).mockResolvedValue({
      completed: true,
      conversation: {
        messages: [
          {
            role: MessageRole.user,
            content: [{ type: ContentType.text, text: 'Test message' }],
          },
        ],
        config: { provider: 'openai', model: 'gpt-3.5-turbo' },
      },
    })

    const result = await runChain({
      workspace,
      chain: mockChain as Chain,
      apikeys,
      source: LogSources.API,
      configOverrides: {
        schema: mockSchema,
        output: 'array',
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const response = await result.value.response
    expect(response).toEqual(
      expect.objectContaining({
        documentLogUuid: expect.any(String),
        object: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
        text: objectToString([
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ]),
        usage: { totalTokens: 20 },
      }),
    )

    expect(aiModule.ai).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: mockSchema,
        output: 'array',
      }),
    )
  })

  it('runs a chain with no-schema output', async () => {
    const mockAiResponse = createMockAiResponse(
      'AI response without schema',
      10,
    )
    vi.spyOn(aiModule, 'ai').mockResolvedValue(mockAiResponse as any)

    vi.mocked(mockChain.step!).mockResolvedValue({
      completed: true,
      conversation: {
        messages: [
          {
            role: MessageRole.user,
            content: [{ type: ContentType.text, text: 'Test message' }],
          },
        ],
        config: { provider: 'openai', model: 'gpt-3.5-turbo' },
      },
    })

    const result = await runChain({
      workspace,
      chain: mockChain as Chain,
      apikeys,
      source: LogSources.API,
      configOverrides: {
        output: 'no-schema',
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const response = await result.value.response
    expect(response).toEqual(
      expect.objectContaining({
        documentLogUuid: expect.any(String),
        text: 'AI response without schema',
        usage: { totalTokens: 10 },
        toolCalls: [],
      }),
    )

    expect(aiModule.ai).toHaveBeenCalledWith(
      expect.objectContaining({
        output: 'no-schema',
      }),
    )
  })
})
