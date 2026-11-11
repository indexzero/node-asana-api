/*
 * client.js: Client for the Asana REST API.
 *
 * (C) 2012 Charlie Robbins
 *
 */

import { STATUS_CODES } from 'node:http'
import { Projects } from './projects.js'
import { Stories } from './stories.js'
import { Tags } from './tags.js'
import { Tasks } from './tasks.js'
import { Users } from './users.js'
import { Workspaces } from './workspaces.js'

/**
 * Credentials for OAuth. Only `accessToken` is needed to make requests. The
 * rest lets the client refresh an expired token once and retry.
 * @typedef {object} OAuthOptions
 * @property {string} [accessToken]
 * @property {string} [refreshToken]
 * @property {string} [clientId]
 * @property {string} [clientSecret]
 * @property {string} [redirectUrl]
 */

/**
 * The part of a `fetch` response that the client reads.
 * @typedef {object} FetchResponse
 * @property {boolean} ok
 * @property {number} status
 * @property {() => Promise<string>} text
 */

/**
 * The part of `fetch` that the client uses. The standard `fetch` fits, and
 * so does a small stand-in for a proxy or a test. Written out here so the
 * published types need neither the DOM library nor `@types/node`.
 * @callback Fetch
 * @param {string} input
 * @param {{ method?: string, headers?: Record<string, string>, body?: string }} [init]
 * @returns {Promise<FetchResponse>}
 */

/**
 * @typedef {object} ClientOptions
 * @property {string} [token] A personal access token or an OAuth access token.
 * @property {OAuthOptions} [oauth] OAuth credentials, when the token should be refreshed.
 * @property {string} [url] Base URL of the API. Defaults to Asana's.
 * @property {string} [oauthUrl] URL of the OAuth token endpoint. Defaults to Asana's.
 * @property {Fetch} [fetch] A fetch to use in place of the global one.
 */

/**
 * Query string parameters, such as `opt_fields`, `limit`, or `workspace`.
 * An array is sent as one comma-separated value, which is how Asana reads
 * lists. A parameter that is null or undefined is left out.
 * @typedef {Record<string, string | number | boolean | Array<string | number> | null | undefined>} Query
 */

/**
 * @typedef {object} RequestOptions
 * @property {string} path Path under the base URL, with its leading slash.
 * @property {string} [method] HTTP method. Defaults to GET.
 * @property {Query} [query]
 * @property {unknown} [body] Sent as JSON unless a `content-type` header says otherwise.
 * @property {Record<string, string>} [headers] An `authorization` header here
 *   replaces the client's token for this request, and turns off the refresh.
 * @property {string} [uri] Base URL for this request, in place of the client's.
 */

/**
 * A Node-style callback. Every method returns a promise and also takes one
 * of these last, optionally, for callers written against 1.x.
 * @template [T=any]
 * @callback Callback
 * @param {Error | null} err
 * @param {T} [result]
 * @returns {void}
 */

/**
 * An error response from Asana, or a response that could not be read.
 */
export class AsanaError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, result?: unknown, cause?: unknown }} [details]
   */
  constructor(message, { status, result, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'AsanaError'
    /** HTTP status of the response, when there was one. */
    this.status = status
    /**
     * Body of the response: parsed, usually `{ errors: [...] }`, or the text
     * when it was not JSON.
     * @type {any}
     */
    this.result = result
    /**
     * The task that `tasks.create()` made before it failed to add the task
     * to a project.
     * @type {any}
     */
    this.task = undefined
  }
}

/**
 * Hands the outcome of a promise to a callback when one was given.
 *
 * With a callback, the returned promise waits for the callback and does not
 * reject, so a caller using only the callback has no rejection to handle.
 * @template T
 * @param {Promise<T>} promise
 * @param {Callback<T>} [callback]
 * @returns {Promise<T>}
 */
export function settle(promise, callback) {
  if (typeof callback !== 'function') return promise
  return /** @type {Promise<T>} */ (
    promise.then(
      result => {
        invoke(callback, null, result)
        return result
      },
      err => {
        invoke(callback, err)
      }
    )
  )
}

/**
 * Calls a callback. If it throws, the error is rethrown outside the promise
 * chain, so it surfaces as an uncaught exception as it did in 1.x and not
 * as an unhandled rejection.
 * @template T
 * @param {Callback<T>} callback
 * @param {Error | null} err
 * @param {T} [result]
 */
function invoke(callback, err, result) {
  try {
    callback(err, result)
  } catch (thrown) {
    queueMicrotask(() => {
      throw thrown
    })
  }
}

/**
 * Sorts out the optional trailing arguments shared by the read methods:
 * `(query, callback)`, `(callback)`, `(query)`, or nothing.
 * @param {Query | Callback} [query]
 * @param {Callback} [callback]
 * @returns {[Query | undefined, Callback | undefined]}
 */
export function trailing(query, callback) {
  return typeof query === 'function' ? [undefined, query] : [query, callback]
}

let warnedAboutProxy = false

export class Client {
  /** @type {Promise<void> | undefined} */
  #refreshing

  /**
   * @param {ClientOptions} [options]
   */
  constructor(options = {}) {
    /** @type {OAuthOptions} */
    this.oauth = { ...options.oauth }
    if (options.token) this.oauth.accessToken = options.token

    if (!this.oauth.accessToken) {
      throw new TypeError(
        /** @type {any} */ (options).apiKey
          ? 'asana-api: `apiKey` is not supported. Asana retired API keys; ' +
              'pass a personal access token as `token` instead.'
          : 'asana-api: a `token` or `oauth.accessToken` is required.'
      )
    }

    if ('proxy' in options && !warnedAboutProxy) {
      warnedAboutProxy = true
      process.emitWarning(
        'asana-api: the `proxy` option is ignored. Pass a `fetch` that uses your proxy.'
      )
    }

    this.url = options.url ?? 'https://app.asana.com/api/1.0'
    this.oauthUrl = options.oauthUrl ?? 'https://app.asana.com/-/oauth_token'
    // Looked up on each call, so a global `fetch` replaced later is honoured.
    /** @type {Fetch} */
    this.fetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init))

    this.projects = new Projects(this)
    this.stories = new Stories(this)
    this.tags = new Tags(this)
    this.tasks = new Tasks(this)
    this.users = new Users(this)
    this.workspaces = new Workspaces(this)
  }

  /** Value of the HTTP authorization header for this client. */
  get authHeader() {
    return `Bearer ${this.oauth.accessToken}`
  }

  /**
   * Makes a request against the Asana API and yields the `data` of the
   * response.
   * @param {RequestOptions | string} options A path, or the request to make.
   * @param {Callback} [callback]
   * @returns {Promise<any>}
   */
  request(options, callback) {
    return settle(
      this.#send(options).then(body => body?.data),
      callback
    )
  }

  /**
   * Walks every page of a list endpoint, yielding one item at a time.
   * Asana truncates an unpaginated list, so use this for anything that can
   * grow.
   * @param {RequestOptions | string} options A path, or the request to make.
   * @returns {AsyncGenerator<any, void, void>}
   */
  async *pages(options) {
    const request = typeof options === 'string' ? { path: options } : options
    const sized = request.query?.limit !== undefined || /[?&]limit=/.test(request.path)
    /** @type {string | undefined} */
    let offset
    do {
      const body = await this.#send({
        ...request,
        query: { ...(!sized && { limit: 100 }), ...request.query, ...(offset && { offset }) }
      })
      if (!Array.isArray(body?.data)) {
        throw new AsanaError(`Asana Error: ${request.path} did not return a list`, { result: body })
      }
      yield* body.data
      offset = body.next_page?.offset
    } while (offset)
  }

  /**
   * @param {RequestOptions | string} options
   * @param {boolean} [retried] Whether this is the retry after a token refresh.
   * @returns {Promise<any>} The parsed response body.
   */
  async #send(options, retried = false) {
    const request = typeof options === 'string' ? { path: options } : options

    // Header names are case-insensitive. Fold them so `Authorization` and
    // `Content-Type` replace the defaults instead of joining them.
    /** @type {Record<string, string>} */
    const given = {}
    for (const [name, value] of Object.entries(request.headers ?? {})) {
      given[name.toLowerCase()] = value
    }
    const token = this.oauth.accessToken
    const headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...given
    }

    const url = new URL((request.uri ?? this.url) + request.path)
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.append(key, String(value))
    }

    /** @type {string | undefined} */
    let body
    if (typeof request.body === 'string') {
      body = request.body || undefined
    } else if (request.body !== undefined && request.body !== null) {
      body = headers['content-type'].startsWith('application/json')
        ? JSON.stringify(request.body)
        : new URLSearchParams(/** @type {Record<string, string>} */ (request.body)).toString()
    }

    /** @type {FetchResponse} */
    let response
    /** @type {string} */
    let text
    try {
      response = await this.fetch(url.href, { method: request.method ?? 'GET', headers, body })
      text = await response.text()
    } catch (cause) {
      throw new AsanaError(`Asana request failed: ${describe(cause)}`, { cause })
    }

    const status = response.status
    /** @type {any} */
    let result
    /** @type {unknown} */
    let parseError
    try {
      result = text === '' ? undefined : JSON.parse(text)
    } catch (error) {
      parseError = error
      result = text
    }

    if (!response.ok) {
      // The first 401 may be an expired token. Refresh it once and retry.
      // A request that brought its own authorization is left alone: it asked
      // to act as someone else, and must not be replayed as this client.
      if (status === 401 && this.oauth.refreshToken && !retried && !given.authorization) {
        // Another request may have refreshed the token while this one was
        // in flight. If so, the new token is already here.
        if (this.oauth.accessToken === token) await this.refreshToken()
        return this.#send(request, true)
      }

      throw new AsanaError(`Asana Error (${status}): ${STATUS_CODES[status] ?? 'Unknown'}`, {
        status,
        result,
        cause: parseError
      })
    }

    if (parseError) {
      throw new AsanaError(`Asana Error (${status}): the response was not JSON`, {
        status,
        result,
        cause: parseError
      })
    }

    return result
  }

  /**
   * Refreshes the OAuth access token of this client. Requests that find the
   * token expired at the same time share one refresh.
   * @param {Callback<void>} [callback]
   * @returns {Promise<void>}
   */
  refreshToken(callback) {
    this.#refreshing ??= this.#refresh().finally(() => {
      this.#refreshing = undefined
    })
    return settle(this.#refreshing, callback)
  }

  async #refresh() {
    if (!this.oauth.refreshToken) {
      throw new AsanaError('Asana OAuth Refresh Error: the client has no `oauth.refreshToken`')
    }

    const form = new URLSearchParams({
      client_id: this.oauth.clientId ?? '',
      client_secret: this.oauth.clientSecret ?? '',
      redirect_uri: this.oauth.redirectUrl ?? '',
      grant_type: 'refresh_token',
      refresh_token: this.oauth.refreshToken
    })

    /** @type {FetchResponse} */
    let response
    /** @type {string} */
    let text
    try {
      response = await this.fetch(this.oauthUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      })
      text = await response.text()
    } catch (cause) {
      throw new AsanaError(`Asana OAuth Refresh Error: ${describe(cause)}`, { cause })
    }

    /** @type {any} */
    let body
    try {
      body = JSON.parse(text)
    } catch (cause) {
      throw new AsanaError(
        `Asana OAuth Refresh Error (${response.status}): the response was not JSON`,
        { status: response.status, result: text, cause }
      )
    }

    if (!response.ok || body?.error || !body?.access_token) {
      const reason = body?.error_description ?? body?.error ?? 'no access token returned'
      throw new AsanaError(`Asana OAuth Refresh Error (${response.status}): ${reason}`, {
        status: response.status,
        result: body
      })
    }

    this.oauth.accessToken = body.access_token
    // Some providers issue a new refresh token each time. Keep it if so.
    if (body.refresh_token) this.oauth.refreshToken = body.refresh_token
  }
}

/**
 * @param {unknown} cause
 * @returns {string}
 */
function describe(cause) {
  return cause instanceof Error ? cause.message : String(cause)
}
