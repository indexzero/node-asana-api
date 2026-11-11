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
 * @typedef {object} ClientOptions
 * @property {string} [token] A personal access token or an OAuth access token.
 * @property {OAuthOptions} [oauth] OAuth credentials, when the token should be refreshed.
 * @property {string} [url] Base URL of the API. Defaults to Asana's.
 * @property {string} [oauthUrl] URL of the OAuth token endpoint. Defaults to Asana's.
 * @property {typeof globalThis.fetch} [fetch] A fetch to use in place of the global one.
 */

/**
 * Query string parameters, such as `opt_fields`, `limit`, or `workspace`.
 * @typedef {Record<string, string | number | boolean | null | undefined>} Query
 */

/**
 * @typedef {object} RequestOptions
 * @property {string} path Path under the base URL, with its leading slash.
 * @property {string} [method] HTTP method. Defaults to GET.
 * @property {Query} [query]
 * @property {unknown} [body] Sent as JSON unless a `content-type` header says otherwise.
 * @property {Record<string, string>} [headers]
 * @property {string} [uri] Base URL for this request, in place of the client's.
 */

/**
 * A Node-style callback. Every method takes one last and optionally: with
 * it the method returns nothing, without it the method returns a promise.
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
    /** Parsed body of the response, usually `{ errors: [...] }`. */
    this.result = result
  }
}

/**
 * Settles a promise into a callback when one was given.
 * @template T
 * @param {Promise<T>} promise
 * @param {Callback<T>} [callback]
 * @returns {Promise<T> | undefined}
 */
export function settle(promise, callback) {
  if (typeof callback !== 'function') return promise
  promise.then(
    result => callback(null, result),
    err => callback(err)
  )
  return undefined
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
    if ('apiKey' in options) {
      throw new TypeError(
        'asana-api: `apiKey` is not supported. Asana retired API keys; ' +
          'pass a personal access token as `token` instead.'
      )
    }

    /** @type {OAuthOptions} */
    this.oauth = { ...options.oauth }
    if (options.token) this.oauth.accessToken = options.token

    if (!this.oauth.accessToken) {
      throw new TypeError('asana-api: a `token` or `oauth.accessToken` is required.')
    }

    if ('proxy' in options && !warnedAboutProxy) {
      warnedAboutProxy = true
      process.emitWarning(
        'asana-api: the `proxy` option is ignored. Pass a `fetch` that uses your proxy.'
      )
    }

    this.url = options.url ?? 'https://app.asana.com/api/1.0'
    this.oauthUrl = options.oauthUrl ?? 'https://app.asana.com/-/oauth_token'
    this.fetch = options.fetch ?? globalThis.fetch

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
   * @returns {Promise<any> | undefined}
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
    /** @type {string | undefined} */
    let offset
    do {
      const body = await this.#send({
        ...request,
        query: { limit: 100, ...request.query, ...(offset && { offset }) }
      })
      yield* body?.data ?? []
      offset = body?.next_page?.offset
    } while (offset)
  }

  /**
   * @param {RequestOptions | string} options
   * @param {boolean} [retried] Whether this is the retry after a token refresh.
   * @returns {Promise<any>} The parsed response body.
   */
  async #send(options, retried = false) {
    const request = typeof options === 'string' ? { path: options } : options
    const headers = {
      'content-type': 'application/json',
      ...request.headers,
      authorization: request.headers?.authorization ?? this.authHeader
    }

    const url = new URL((request.uri ?? this.url) + request.path)
    for (const [key, value] of Object.entries(request.query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.append(key, String(value))
    }

    /** @type {string | undefined} */
    let body
    if (typeof request.body === 'string') {
      body = request.body
    } else if (request.body !== undefined) {
      body =
        headers['content-type'] === 'application/json'
          ? JSON.stringify(request.body)
          : new URLSearchParams(/** @type {Record<string, string>} */ (request.body)).toString()
    }

    /** @type {Response} */
    let response
    /** @type {string} */
    let text
    try {
      response = await this.fetch(url, { method: request.method ?? 'GET', headers, body })
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
    }

    if (!response.ok) {
      // The first 401 may be an expired token. Refresh it once and retry.
      if (status === 401 && this.oauth.refreshToken && !retried) {
        await this.refreshToken()
        return this.#send({ ...request, headers: withoutAuthorization(request.headers) }, true)
      }

      throw new AsanaError(`Asana Error (${status}): ${STATUS_CODES[status] ?? 'Unknown'}`, {
        status,
        result: parseError ?? result
      })
    }

    if (parseError) {
      throw new AsanaError(`Asana Error (${status}): the response was not JSON`, {
        status,
        result: text,
        cause: parseError
      })
    }

    return result
  }

  /**
   * Refreshes the OAuth access token of this client. Requests that find the
   * token expired at the same time share one refresh.
   * @param {Callback<void>} [callback]
   * @returns {Promise<void> | undefined}
   */
  refreshToken(callback) {
    this.#refreshing ??= this.#refresh().finally(() => {
      this.#refreshing = undefined
    })
    return settle(this.#refreshing, callback)
  }

  async #refresh() {
    const form = new URLSearchParams({
      client_id: this.oauth.clientId ?? '',
      client_secret: this.oauth.clientSecret ?? '',
      redirect_uri: this.oauth.redirectUrl ?? '',
      grant_type: 'refresh_token',
      refresh_token: this.oauth.refreshToken ?? ''
    })

    /** @type {Response} */
    let response
    /** @type {any} */
    let body
    try {
      response = await this.fetch(this.oauthUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      })
      body = await response.json()
    } catch (cause) {
      throw new AsanaError(`Asana OAuth Refresh Error: ${describe(cause)}`, { cause })
    }

    if (!response.ok || body?.error || !body?.access_token) {
      throw new AsanaError(
        `Asana OAuth Refresh Error (${response.status}): ${body?.error_description ?? body?.error ?? 'no access token returned'}`,
        { status: response.status, result: body }
      )
    }

    this.oauth.accessToken = body.access_token
  }
}

/**
 * @param {unknown} cause
 * @returns {string}
 */
function describe(cause) {
  return cause instanceof Error ? cause.message : String(cause)
}

/**
 * Drops a caller's authorization header so the retry uses the new token.
 * @param {Record<string, string>} [headers]
 * @returns {Record<string, string>}
 */
function withoutAuthorization(headers = {}) {
  const { authorization: _stale, ...rest } = headers
  return rest
}
