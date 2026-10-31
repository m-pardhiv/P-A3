import { describe, expect, it, vi } from 'vitest'
import { sendViaResend } from './resend'

const config = { apiKey: 're_test_key', from: 'Brightloop <billing@brightloop.example>' }
const message = { to: 'asha@customer.example', subject: 'Hello', text: 'Body' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

describe('sending through Resend', () => {
  it('posts the message with the key as a bearer token', async () => {
    const send = vi.fn().mockResolvedValue(reply(200, { id: 'abc' }))

    await sendViaResend(config, message, send)

    const [url, init] = send.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer re_test_key')
    expect(JSON.parse(init.body)).toEqual({
      from: 'Brightloop <billing@brightloop.example>',
      to: ['asha@customer.example'],
      subject: 'Hello',
      text: 'Body',
    })
  })

  it("throws with Resend's own reason when it refuses", async () => {
    const send = vi
      .fn()
      .mockResolvedValue(reply(403, { message: 'The brightloop.example domain is not verified.' }))

    await expect(sendViaResend(config, message, send)).rejects.toThrow(
      'Resend refused the email (403): The brightloop.example domain is not verified.',
    )
  })

  it('throws a clear error when the reply is not JSON', async () => {
    const send = vi
      .fn()
      .mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))

    await expect(sendViaResend(config, message, send)).rejects.toThrow('(502): no reason given')
  })

  it('throws when Resend cannot be reached', async () => {
    const send = vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND'))

    await expect(sendViaResend(config, message, send)).rejects.toThrow(
      'Resend could not be reached: getaddrinfo ENOTFOUND',
    )
  })

  it('never puts the key in an error message', async () => {
    const send = vi.fn().mockResolvedValue(reply(401, { message: 'API key is invalid' }))

    const failure = await sendViaResend(config, message, send).catch((e: Error) => e)

    expect((failure as Error).message).not.toContain('re_test_key')
  })
})
