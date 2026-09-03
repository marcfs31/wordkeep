// node_modules/hono/dist/adapter/vercel/handler.js
var handle = (app2) => (req) => {
  return app2.fetch(req);
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTING_DEPTH = 32;
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) {
    return convertFormDataToBodyData(
      await request.bodyCache.formData,
      options
    );
  }
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value, nestingState);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".", MAX_NESTING_DEPTH + 2);
  if (keys.length > MAX_NESTING_DEPTH + 1) {
    throwNestingLimitExceeded();
  }
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) {
          throwNestingLimitExceeded();
        }
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) {
    url = url.slice(0, hashIndex);
  }
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = tryDecodeURIComponent(value);
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    for (const anyCachedKey in bodyCache) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    ;
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   // Append multiple headers using the append option (e.g. Vary)
   *   c.header('Vary', 'Accept-Encoding', { append: true })
   *   c.header('Vary', 'User-Agent', { append: true })
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) {
          if (++count > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  // handler index of a dynamic path, or -1 for a static path terminal
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const k in node.#children) {
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
              ) {
                throw PATH_ERROR;
              }
            }
          }
          nextNode = node.#children[regexpStr] = new _Node();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) {
            if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
              throw PATH_ERROR;
            }
          }
          nextNode = node.#children[token] = new _Node();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) {
      throw PATH_ERROR;
    }
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = createNullObject();
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    `^${path.replace(
      /\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g,
      (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ONLY_WILDCARD_REG_EXP_STR : `/:${LABEL_REG_EXP_STR}`
    )}$`
  );
}
function findMiddleware(middleware, path) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: createNullObject() };
    this.#routes = { [METHOD_NAME_ALL]: createNullObject() };
    this.#tries = { [METHOD_NAME_ALL]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap[METHOD_NAME_ALL]) {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path === "/*") {
      path = "*";
    }
    const methods = method === METHOD_NAME_ALL ? Object.keys(middleware) : [method];
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      for (const m of methods) {
        if (!middleware[m][path]) {
          this.#insertPath(m, path);
          middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        }
      }
      for (const handlerMap of [middleware, routes]) {
        for (const m of methods) {
          for (const p in handlerMap[m]) {
            re.test(p) && handlerMap[m][p].push([handler, path]);
          }
        }
      }
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) {
      for (const m of methods) {
        if (!routes[m][path2]) {
          this.#insertPath(m, path2);
          routes[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
        }
        routes[m][path2].push([handler, path2]);
      }
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) {
      matchers[method] = this.#buildMatcher(method);
    }
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) {
      for (const path in r) {
        const handlers = r[path];
        const pathData = trie.paths[path];
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
          continue;
        }
        handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [
          h,
          trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
            map[key] = paramReplacementMap[pathData[1][i][1]];
            return map;
          }, createNullObject())
        ]);
      }
    }
    return [regexp, indexReplacementMap.map((i) => handlerData[i]), staticMap];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node2 = class _Node2 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new _Node2();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) {
        possibleKeys.add(pattern[1]);
      }
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: [...possibleKeys],
        score: ++order
      }
    });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) {
            continue;
          }
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node2();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) {
      this.#node.insert(method, result, handler);
    }
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var relaxedCookieNameRegEx = /^[!#-:<>-[\]-~]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var trimCookieWhitespace = (value) => {
  let start = 0;
  let end = value.length;
  while (start < end) {
    const charCode = value.charCodeAt(start);
    if (charCode !== 32 && charCode !== 9) {
      break;
    }
    start++;
  }
  while (end > start) {
    const charCode = value.charCodeAt(end - 1);
    if (charCode !== 32 && charCode !== 9) {
      break;
    }
    end--;
  }
  return start === 0 && end === value.length ? value : value.slice(start, end);
};
var parse = (cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.split(";");
  const parsedCookie = /* @__PURE__ */ Object.create(null);
  for (const pairStr of pairs) {
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = trimCookieWhitespace(pairStr.substring(0, valueStartPos));
    if (name && name !== cookieName || !relaxedCookieNameRegEx.test(cookieName) || cookieName in parsedCookie) {
      continue;
    }
    let cookieValue = trimCookieWhitespace(pairStr.substring(valueStartPos + 1));
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = tryDecodeURIComponent(cookieValue);
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
};
var _serialize = (name, value, opt = {}) => {
  if (!validCookieNameRegEx.test(name)) {
    throw new Error("Invalid cookie name");
  }
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) {
    throw new Error("__Secure- Cookie must have Secure attributes");
  }
  if (name.startsWith("__Host-")) {
    if (!opt.secure) {
      throw new Error("__Host- Cookie must have Secure attributes");
    }
    if (opt.path !== "/") {
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    }
    if (opt.domain) {
      throw new Error("__Host- Cookie must not have Domain attributes");
    }
  }
  for (const key of ["domain", "path", "sameSite", "priority"]) {
    if (opt[key] && /[;\r\n]/.test(opt[key])) {
      throw new Error(`${key} must not contain ";", "\\r", or "\\n"`);
    }
  }
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 3456e4) {
      throw new Error(
        "Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration."
      );
    }
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 3456e7) {
      throw new Error(
        "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future."
      );
    }
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  }
  if (opt.priority) {
    cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`;
  }
  if (opt.partitioned) {
    if (!opt.secure) {
      throw new Error("Partitioned Cookie must have Secure attributes");
    }
    cookie += "; Partitioned";
  }
  return cookie;
};
var serialize = (name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
};

// node_modules/hono/dist/helper/cookie/index.js
var getCookie = (c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
};
var generateCookie = (name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") {
    cookie = serialize("__Secure-" + name, value, { path: "/", ...opt, secure: true });
  } else if (opt?.prefix === "host") {
    cookie = serialize("__Host-" + name, value, {
      ...opt,
      path: "/",
      secure: true,
      domain: void 0
    });
  } else {
    cookie = serialize(name, value, { path: "/", ...opt });
  }
  return cookie;
};
var setCookie = (c, name, value, opt) => {
  const cookie = generateCookie(name, value, opt);
  c.header("Set-Cookie", cookie, { append: true });
};
var deleteCookie = (c, name, opt) => {
  const deletedCookie = getCookie(c, name, opt?.prefix);
  setCookie(c, name, "", { ...opt, maxAge: 0 });
  return deletedCookie;
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "QUERY"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const exposeHeadersStr = opts.exposeHeaders?.length ? opts.exposeHeaders.join(",") : void 0;
  const allowHeadersStr = opts.allowHeaders?.length ? opts.allowHeaders.join(",") : void 0;
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return async (origin, c) => (await optsAllowMethods(origin, c)).join(",");
    } else if (Array.isArray(optsAllowMethods)) {
      const methodsStr = optsAllowMethods.join(",");
      return () => methodsStr;
    } else {
      return () => "";
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (exposeHeadersStr) {
      set("Access-Control-Expose-Headers", exposeHeadersStr);
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        c.res.headers.append("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods) {
        set("Access-Control-Allow-Methods", allowMethods);
      }
      let headersStr = allowHeadersStr;
      if (!headersStr) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headersStr = requestHeaders.split(",").map((h) => h.trim()).join(",");
        }
      }
      if (headersStr) {
        set("Access-Control-Allow-Headers", headersStr);
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  };
};

// node_modules/hono/dist/middleware/secure-headers/secure-headers.js
var HEADERS_MAP = {
  crossOriginEmbedderPolicy: ["Cross-Origin-Embedder-Policy", "require-corp"],
  crossOriginResourcePolicy: ["Cross-Origin-Resource-Policy", "same-origin"],
  crossOriginOpenerPolicy: ["Cross-Origin-Opener-Policy", "same-origin"],
  originAgentCluster: ["Origin-Agent-Cluster", "?1"],
  referrerPolicy: ["Referrer-Policy", "no-referrer"],
  strictTransportSecurity: ["Strict-Transport-Security", "max-age=15552000; includeSubDomains"],
  xContentTypeOptions: ["X-Content-Type-Options", "nosniff"],
  xDnsPrefetchControl: ["X-DNS-Prefetch-Control", "off"],
  xDownloadOptions: ["X-Download-Options", "noopen"],
  xFrameOptions: ["X-Frame-Options", "SAMEORIGIN"],
  xPermittedCrossDomainPolicies: ["X-Permitted-Cross-Domain-Policies", "none"],
  xXssProtection: ["X-XSS-Protection", "0"]
};
var DEFAULT_OPTIONS = {
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: true,
  crossOriginOpenerPolicy: true,
  originAgentCluster: true,
  referrerPolicy: true,
  strictTransportSecurity: true,
  xContentTypeOptions: true,
  xDnsPrefetchControl: true,
  xDownloadOptions: true,
  xFrameOptions: true,
  xPermittedCrossDomainPolicies: true,
  xXssProtection: true,
  removePoweredBy: true,
  permissionsPolicy: {}
};
var secureHeaders = (customOptions) => {
  const options = { ...DEFAULT_OPTIONS, ...customOptions };
  const headersToSet = getFilteredHeaders(options);
  const callbacks = [];
  if (options.contentSecurityPolicy) {
    const [callback, value] = getCSPDirectives(
      options.contentSecurityPolicy,
      "Content-Security-Policy"
    );
    if (callback) {
      callbacks.push(callback);
    }
    headersToSet.push(["Content-Security-Policy", value]);
  }
  if (options.contentSecurityPolicyReportOnly) {
    const [callback, value] = getCSPDirectives(
      options.contentSecurityPolicyReportOnly,
      "Content-Security-Policy-Report-Only"
    );
    if (callback) {
      callbacks.push(callback);
    }
    headersToSet.push(["Content-Security-Policy-Report-Only", value]);
  }
  if (options.permissionsPolicy && Object.keys(options.permissionsPolicy).length > 0) {
    headersToSet.push([
      "Permissions-Policy",
      getPermissionsPolicyDirectives(options.permissionsPolicy)
    ]);
  }
  if (options.reportingEndpoints) {
    headersToSet.push(["Reporting-Endpoints", getReportingEndpoints(options.reportingEndpoints)]);
  }
  if (options.reportTo) {
    headersToSet.push(["Report-To", getReportToOptions(options.reportTo)]);
  }
  return async function secureHeaders2(ctx, next) {
    const headersToSetForReq = callbacks.length === 0 ? headersToSet : callbacks.reduce((acc, cb) => cb(ctx, acc), headersToSet);
    await next();
    setHeaders(ctx, headersToSetForReq);
    if (options?.removePoweredBy) {
      ctx.res.headers.delete("X-Powered-By");
    }
  };
};
function getFilteredHeaders(options) {
  return Object.entries(HEADERS_MAP).filter(([key]) => options[key]).map(([key, defaultValue]) => {
    const overrideValue = options[key];
    return typeof overrideValue === "string" ? [defaultValue[0], overrideValue] : defaultValue;
  });
}
function getCSPDirectives(contentSecurityPolicy, headerName) {
  const callbacks = [];
  const resultValues = [];
  for (const [directive, value] of Object.entries(contentSecurityPolicy)) {
    const valueArray = Array.isArray(value) ? value : [value];
    valueArray.forEach((value2, i) => {
      if (typeof value2 === "function") {
        const index = i * 2 + 2 + resultValues.length;
        callbacks.push((ctx, values) => {
          values[index] = value2(ctx, directive);
        });
      }
    });
    resultValues.push(
      directive.replace(
        /[A-Z]+(?![a-z])|[A-Z]/g,
        (match2, offset) => offset ? "-" + match2.toLowerCase() : match2.toLowerCase()
      ),
      ...valueArray.flatMap((value2) => [" ", value2]),
      "; "
    );
  }
  resultValues.pop();
  return callbacks.length === 0 ? [void 0, resultValues.join("")] : [
    (ctx, headersToSet) => headersToSet.map((values) => {
      if (values[0] === headerName) {
        const clone = values[1].slice();
        callbacks.forEach((cb) => {
          cb(ctx, clone);
        });
        return [values[0], clone.join("")];
      } else {
        return values;
      }
    }),
    resultValues
  ];
}
function getPermissionsPolicyDirectives(policy) {
  return Object.entries(policy).map(([directive, value]) => {
    const kebabDirective = camelToKebab(directive);
    if (typeof value === "boolean") {
      return `${kebabDirective}=${value ? "*" : "()"}`;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return `${kebabDirective}=()`;
      }
      if (value.length === 1 && value[0] === "*") {
        return `${kebabDirective}=*`;
      }
      if (value.length === 1 && value[0] === "none") {
        return `${kebabDirective}=()`;
      }
      const allowlist = value.map((item) => ["self", "src"].includes(item) ? item : `"${item}"`);
      return `${kebabDirective}=(${allowlist.join(" ")})`;
    }
    return "";
  }).filter(Boolean).join(", ");
}
function camelToKebab(str) {
  return str.replace(/([a-z\d])([A-Z])/g, "$1-$2").toLowerCase();
}
function getReportingEndpoints(reportingEndpoints = []) {
  return reportingEndpoints.map((endpoint) => `${endpoint.name}="${endpoint.url}"`).join(", ");
}
function getReportToOptions(reportTo = []) {
  return reportTo.map((option) => JSON.stringify(option)).join(", ");
}
function setHeaders(ctx, headersToSet) {
  headersToSet.forEach(([header, value]) => {
    ctx.res.headers.set(header, value);
  });
}

// server/src/db.ts
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
var root = dirname(fileURLToPath(import.meta.url));
var dataDir = join(root, "../data");
var dbPath = process.env.WORDKEEP_DB ?? join(dataDir, "wordkeep.db");
if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
var db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS words (
    id TEXT PRIMARY KEY,
    lemma TEXT NOT NULL,
    display_lemma TEXT NOT NULL,
    language TEXT NOT NULL,
    language_name TEXT NOT NULL,
    phonetic TEXT,
    etymology TEXT,
    note TEXT NOT NULL DEFAULT '',
    primary_sense_id TEXT,
    archived_at INTEGER,
    status TEXT NOT NULL DEFAULT 'new',
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days REAL NOT NULL DEFAULT 0,
    repetitions INTEGER NOT NULL DEFAULT 0,
    due_at INTEGER NOT NULL,
    last_reviewed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    forms_json TEXT,
    UNIQUE(lemma, language)
  );

  CREATE TABLE IF NOT EXISTS senses (
    id TEXT PRIMARY KEY,
    word_id TEXT NOT NULL,
    part_of_speech TEXT,
    definition TEXT NOT NULL,
    synonyms_json TEXT,
    antonyms_json TEXT,
    tags_json TEXT,
    examples_json TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS word_links (
    id TEXT PRIMARY KEY,
    from_word_id TEXT NOT NULL,
    to_lemma TEXT NOT NULL,
    to_language TEXT NOT NULL,
    to_language_name TEXT NOT NULL,
    to_word_id TEXT,
    relation TEXT NOT NULL DEFAULT 'translation',
    FOREIGN KEY(from_word_id) REFERENCES words(id) ON DELETE CASCADE,
    UNIQUE(from_word_id, to_lemma, to_language, relation)
  );

  CREATE INDEX IF NOT EXISTS idx_words_due ON words(due_at);
  CREATE INDEX IF NOT EXISTS idx_words_lang ON words(language);
  CREATE INDEX IF NOT EXISTS idx_words_status ON words(status);
  CREATE INDEX IF NOT EXISTS idx_links_to ON word_links(to_lemma, to_language);
`);
function ensureColumn(table, column, sqlType) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlType}`);
  }
}
var linksSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'word_links'`).get()?.sql;
if (linksSql && !linksSql.includes("to_language, relation") && !linksSql.includes("to_language,relation")) {
  db.exec("PRAGMA foreign_keys = OFF");
  db.exec(`
    CREATE TABLE word_links_v2 (
      id TEXT PRIMARY KEY,
      from_word_id TEXT NOT NULL,
      to_lemma TEXT NOT NULL,
      to_language TEXT NOT NULL,
      to_language_name TEXT NOT NULL,
      to_word_id TEXT,
      relation TEXT NOT NULL DEFAULT 'translation',
      FOREIGN KEY(from_word_id) REFERENCES words(id) ON DELETE CASCADE,
      UNIQUE(from_word_id, to_lemma, to_language, relation)
    );
    INSERT OR IGNORE INTO word_links_v2
      (id, from_word_id, to_lemma, to_language, to_language_name, to_word_id, relation)
      SELECT id, from_word_id, to_lemma, to_language, to_language_name, to_word_id,
             COALESCE(relation, 'translation')
      FROM word_links;
    DROP TABLE word_links;
    ALTER TABLE word_links_v2 RENAME TO word_links;
    CREATE INDEX IF NOT EXISTS idx_links_to ON word_links(to_lemma, to_language);
  `);
  db.exec("PRAGMA foreign_keys = ON");
}
ensureColumn("senses", "antonyms_json", "TEXT");
ensureColumn("senses", "tags_json", "TEXT");
ensureColumn("senses", "examples_json", "TEXT");
ensureColumn("words", "forms_json", "TEXT");
try {
  db.exec(`
    UPDATE senses
    SET examples_json = json_array(example)
    WHERE (examples_json IS NULL OR examples_json = '' OR examples_json = '[]')
      AND example IS NOT NULL AND example != ''
  `);
} catch {
}
function normalizeLemma(word, language) {
  const trimmed = word.trim().normalize("NFC");
  try {
    return trimmed.toLocaleLowerCase(language);
  } catch {
    return trimmed.toLocaleLowerCase("en");
  }
}
function findWordId(lemma, language) {
  const row = db.prepare("SELECT id FROM words WHERE lemma = ? AND language = ?").get(normalizeLemma(lemma, language), language);
  return row?.id ?? null;
}

// server/src/backup.ts
function exportLexicon() {
  return {
    version: 1,
    exportedAt: Date.now(),
    words: db.prepare("SELECT * FROM words").all(),
    senses: db.prepare("SELECT * FROM senses").all(),
    links: db.prepare("SELECT * FROM word_links").all()
  };
}
function isBackup(value) {
  if (!value || typeof value !== "object") return false;
  const body = value;
  return body.version === 1 && Array.isArray(body.words) && Array.isArray(body.senses) && Array.isArray(body.links);
}
function placeholders(count) {
  return Array.from({ length: count }, () => "?").join(", ");
}
function insertRows(table, rows, or) {
  for (const row of rows) {
    const keys = Object.keys(row);
    if (!keys.length) continue;
    const sql = `INSERT OR ${or} INTO ${table} (${keys.join(", ")}) VALUES (${placeholders(keys.length)})`;
    db.prepare(sql).run(...keys.map((key) => row[key]));
  }
}
function importLexicon(raw2, mode = "merge") {
  if (!isBackup(raw2)) throw new Error("Invalid backup file");
  if (mode === "replace") {
    db.exec("DELETE FROM word_links");
    db.exec("DELETE FROM senses");
    db.exec("DELETE FROM words");
  }
  const or = mode === "replace" ? "REPLACE" : "IGNORE";
  insertRows("words", raw2.words, or);
  insertRows("senses", raw2.senses, or);
  insertRows("word_links", raw2.links, or);
  return { words: raw2.words.length, senses: raw2.senses.length, links: raw2.links.length };
}

// shared/sm2.ts
var MINUTE = 6e4;
var DAY = 864e5;
function initialRecall(now = Date.now()) {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: now,
    lastReviewedAt: null,
    status: "new"
  };
}
function applyGrade(state, grade, now = Date.now()) {
  let { easeFactor, intervalDays, repetitions } = state;
  if (grade === "again") {
    return {
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      intervalDays: 1 / 1440,
      repetitions: 0,
      dueAt: now + MINUTE,
      lastReviewedAt: now,
      status: "learning"
    };
  }
  if (repetitions === 0) {
    intervalDays = grade === "easy" ? 4 : 1;
  } else if (repetitions === 1) {
    intervalDays = grade === "easy" ? 10 : grade === "hard" ? 3 : 6;
  } else if (grade === "hard") {
    intervalDays = Math.max(1, intervalDays * 1.2);
  } else if (grade === "easy") {
    intervalDays = intervalDays * easeFactor * 1.3;
  } else {
    intervalDays = intervalDays * easeFactor;
  }
  if (grade === "hard") easeFactor = Math.max(1.3, easeFactor - 0.15);
  if (grade === "easy") easeFactor += 0.15;
  repetitions += 1;
  const status = intervalDays >= 21 ? "mastered" : repetitions < 2 ? "learning" : "review";
  return {
    easeFactor,
    intervalDays,
    repetitions,
    dueAt: now + Math.round(intervalDays * DAY),
    lastReviewedAt: now,
    status
  };
}

// server/src/words.ts
function parseList(raw2) {
  if (!raw2) return [];
  try {
    const value = JSON.parse(raw2);
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
function glossFor(wordId, primarySenseId) {
  if (primarySenseId) {
    const primary = db.prepare("SELECT definition FROM senses WHERE id = ?").get(primarySenseId);
    if (primary) return primary.definition;
  }
  const first = db.prepare("SELECT definition FROM senses WHERE word_id = ? ORDER BY sort_order ASC LIMIT 1").get(wordId);
  return first?.definition ?? "";
}
function toSummary(row) {
  return {
    id: row.id,
    lemma: row.lemma,
    displayLemma: row.display_lemma,
    language: row.language,
    languageName: row.language_name,
    phonetic: row.phonetic,
    gloss: glossFor(row.id, row.primary_sense_id),
    status: row.status,
    dueAt: row.due_at,
    archivedAt: row.archived_at,
    lastReviewedAt: row.last_reviewed_at,
    createdAt: row.created_at
  };
}
function sensesFor(wordId) {
  const rows = db.prepare(
    `SELECT id, part_of_speech, definition, synonyms_json, antonyms_json, tags_json, examples_json, sort_order
       FROM senses WHERE word_id = ? ORDER BY sort_order ASC`
  ).all(wordId);
  return rows.map((row) => ({
    id: row.id,
    partOfSpeech: row.part_of_speech ?? "",
    definition: row.definition,
    examples: parseList(row.examples_json),
    synonyms: parseList(row.synonyms_json),
    antonyms: parseList(row.antonyms_json),
    tags: parseList(row.tags_json),
    sortOrder: row.sort_order
  }));
}
function formsFor(row) {
  if (!row.forms_json) return [];
  try {
    const value = JSON.parse(row.forms_json);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function linksFor(wordId) {
  const rows = db.prepare(
    "SELECT id, to_lemma, to_language, to_language_name, to_word_id, relation FROM word_links WHERE from_word_id = ? ORDER BY to_language_name ASC"
  ).all(wordId);
  return rows.map((row) => ({
    id: row.id,
    lemma: row.to_lemma,
    language: row.to_language,
    languageName: row.to_language_name,
    toWordId: row.to_word_id,
    relation: row.relation
  }));
}
function upsertLink(input) {
  const toLemma = normalizeLemma(input.toLemma, input.toLanguage);
  const existing = input.toWordId ?? findWordId(input.toLemma, input.toLanguage);
  db.prepare(
    `INSERT OR IGNORE INTO word_links (id, from_word_id, to_lemma, to_language, to_language_name, to_word_id, relation)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    input.fromId,
    toLemma,
    input.toLanguage,
    input.toLanguageName,
    existing,
    input.relation
  );
  if (existing && input.fromLemma && input.fromLanguage) {
    db.prepare(
      `INSERT OR IGNORE INTO word_links (id, from_word_id, to_lemma, to_language, to_language_name, to_word_id, relation)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      existing,
      normalizeLemma(input.fromLemma, input.fromLanguage),
      input.fromLanguage,
      input.fromLanguageName ?? input.fromLanguage,
      input.fromId,
      input.relation
    );
    db.prepare(
      `UPDATE word_links SET to_word_id = ? WHERE from_word_id = ? AND to_lemma = ? AND to_language = ? AND relation = ?`
    ).run(input.fromId, existing, normalizeLemma(input.fromLemma, input.fromLanguage), input.fromLanguage, input.relation);
  }
}
function toDetail(row) {
  return {
    ...toSummary(row),
    etymology: row.etymology,
    note: row.note,
    primarySenseId: row.primary_sense_id,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    updatedAt: row.updated_at,
    forms: formsFor(row),
    senses: sensesFor(row.id),
    links: linksFor(row.id)
  };
}
function getWord(id) {
  const row = db.prepare("SELECT * FROM words WHERE id = ?").get(id);
  return row ? toDetail(row) : null;
}
function listWords(opts) {
  const clauses = [];
  const params = [];
  if (opts.archived) clauses.push("archived_at IS NOT NULL");
  else if (opts.status !== "archived") clauses.push("archived_at IS NULL");
  if (opts.status && opts.status !== "all" && opts.status !== "archived") {
    clauses.push("status = ?");
    params.push(opts.status);
  }
  if (opts.due === "today") {
    clauses.push("due_at <= ? AND archived_at IS NULL");
    params.push(Date.now());
  }
  if (opts.language) {
    clauses.push("language = ?");
    params.push(opts.language);
  }
  if (opts.q) {
    clauses.push("(display_lemma LIKE ? OR lemma LIKE ? OR note LIKE ?)");
    const like = `%${opts.q}%`;
    params.push(like, like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM words ${where} ORDER BY display_lemma COLLATE NOCASE ASC`).all(...params);
  return rows.map(toSummary);
}
function insertFromLookup(lookup, note, primarySenseIndex) {
  const now = Date.now();
  const recall = initialRecall(now);
  const id = crypto.randomUUID();
  const lemma = lookup.lemma || normalizeLemma(lookup.displayLemma, lookup.language);
  db.prepare(
    `INSERT INTO words (
      id, lemma, display_lemma, language, language_name, phonetic, etymology, note, forms_json,
      status, ease_factor, interval_days, repetitions, due_at, last_reviewed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    lemma,
    lookup.displayLemma.trim(),
    lookup.language,
    lookup.languageName,
    lookup.phonetic,
    lookup.etymology,
    note,
    JSON.stringify(lookup.forms ?? []),
    recall.status,
    recall.easeFactor,
    recall.intervalDays,
    recall.repetitions,
    recall.dueAt,
    recall.lastReviewedAt,
    now,
    now
  );
  const senseIds = [];
  const insertSense = db.prepare(
    `INSERT INTO senses (id, word_id, part_of_speech, definition, synonyms_json, antonyms_json, tags_json, examples_json, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  lookup.senses.forEach((sense, index) => {
    const senseId = crypto.randomUUID();
    senseIds.push(senseId);
    insertSense.run(
      senseId,
      id,
      sense.partOfSpeech,
      sense.definition,
      JSON.stringify(sense.synonyms ?? []),
      JSON.stringify(sense.antonyms ?? []),
      JSON.stringify(sense.tags ?? []),
      JSON.stringify(sense.examples ?? []),
      index
    );
  });
  const primary = senseIds[primarySenseIndex] ?? senseIds[0] ?? null;
  if (primary) {
    db.prepare("UPDATE words SET primary_sense_id = ? WHERE id = ?").run(primary, id);
  }
  for (const translation of lookup.translations.slice(0, 40)) {
    if (!translation.lemma.trim()) continue;
    upsertLink({
      fromId: id,
      toLemma: translation.lemma,
      toLanguage: translation.language,
      toLanguageName: translation.languageName,
      relation: "translation",
      fromLemma: lookup.displayLemma,
      fromLanguage: lookup.language,
      fromLanguageName: lookup.languageName
    });
  }
  const syns = /* @__PURE__ */ new Set();
  const ants = /* @__PURE__ */ new Set();
  for (const sense of lookup.senses) {
    for (const term of sense.synonyms ?? []) syns.add(term);
    for (const term of sense.antonyms ?? []) ants.add(term);
  }
  for (const term of [...syns].slice(0, 12)) {
    upsertLink({
      fromId: id,
      toLemma: term,
      toLanguage: lookup.language,
      toLanguageName: lookup.languageName,
      relation: "synonym",
      fromLemma: lookup.displayLemma,
      fromLanguage: lookup.language,
      fromLanguageName: lookup.languageName
    });
  }
  for (const term of [...ants].slice(0, 12)) {
    upsertLink({
      fromId: id,
      toLemma: term,
      toLanguage: lookup.language,
      toLanguageName: lookup.languageName,
      relation: "antonym",
      fromLemma: lookup.displayLemma,
      fromLanguage: lookup.language,
      fromLanguageName: lookup.languageName
    });
  }
  return getWord(id);
}
function updateWord(id, patch) {
  const current = db.prepare("SELECT * FROM words WHERE id = ?").get(id);
  if (!current) return null;
  const archivedAt = patch.archived === void 0 ? current.archived_at : patch.archived ? Date.now() : null;
  db.prepare(
    `UPDATE words SET note = ?, primary_sense_id = ?, etymology = ?, archived_at = ?, updated_at = ? WHERE id = ?`
  ).run(
    patch.note ?? current.note,
    patch.primarySenseId ?? current.primary_sense_id,
    patch.etymology ?? current.etymology,
    archivedAt,
    Date.now(),
    id
  );
  return getWord(id);
}
function deleteWord(id) {
  return Number(db.prepare("DELETE FROM words WHERE id = ?").run(id).changes) > 0;
}
function reviewQueue() {
  const rows = db.prepare(
    `SELECT * FROM words WHERE archived_at IS NULL AND due_at <= ? ORDER BY due_at ASC, created_at ASC`
  ).all(Date.now());
  return rows.map(toDetail);
}
function gradeWord(id, grade) {
  const row = db.prepare("SELECT * FROM words WHERE id = ?").get(id);
  if (!row || row.archived_at) return null;
  const next = applyGrade(
    {
      easeFactor: row.ease_factor,
      intervalDays: row.interval_days,
      repetitions: row.repetitions,
      dueAt: row.due_at,
      lastReviewedAt: row.last_reviewed_at,
      status: row.status
    },
    grade
  );
  db.prepare(
    `UPDATE words SET
      ease_factor = ?, interval_days = ?, repetitions = ?, due_at = ?,
      last_reviewed_at = ?, status = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    next.easeFactor,
    next.intervalDays,
    next.repetitions,
    next.dueAt,
    next.lastReviewedAt,
    next.status,
    Date.now(),
    id
  );
  return getWord(id);
}
function stats() {
  const now = Date.now();
  const lexiconCount = db.prepare("SELECT COUNT(*) AS n FROM words WHERE archived_at IS NULL").get().n;
  const dueToday = db.prepare("SELECT COUNT(*) AS n FROM words WHERE archived_at IS NULL AND due_at <= ?").get(now).n;
  const newCount = db.prepare("SELECT COUNT(*) AS n FROM words WHERE archived_at IS NULL AND status = ?").get("new").n;
  const languageCount = db.prepare("SELECT COUNT(DISTINCT language) AS n FROM words WHERE archived_at IS NULL").get().n;
  return { dueToday, newCount, lexiconCount, languageCount };
}
function recentWords(limit = 6) {
  const rows = db.prepare("SELECT * FROM words WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT ?").all(limit);
  return rows.map(toSummary);
}
function allActiveWordRows() {
  return db.prepare("SELECT * FROM words WHERE archived_at IS NULL").all();
}

// server/src/graph.ts
function nodeIdFor(wordId, lemma, language) {
  return wordId ? `word:${wordId}` : `ghost:${language}:${lemma}`;
}
function wordGraph(centerId) {
  if (centerId) {
    let addNeighbor2 = function(lemma, language, languageName2, relation, toWordId) {
      const id = nodeIdFor(toWordId, lemma, language);
      if (!seenNode.has(id)) {
        seenNode.add(id);
        const kind = relation === "synonym" || relation === "antonym" || relation === "translation" || relation === "related" ? relation : toWordId ? "saved" : "related";
        nodes2.push({
          id,
          label: lemma,
          language,
          languageName: languageName2,
          saved: Boolean(toWordId),
          wordId: toWordId,
          kind
        });
      }
      const edgeKey = [centerNodeId, id, relation].sort().join("|");
      if (seenEdge.has(edgeKey)) return;
      seenEdge.add(edgeKey);
      edges2.push({ source: centerNodeId, target: id, relation });
    };
    var addNeighbor = addNeighbor2;
    const center = getWord(centerId);
    if (!center) return { nodes: [], edges: [] };
    const centerNodeId = `word:${center.id}`;
    const nodes2 = [
      {
        id: centerNodeId,
        label: center.displayLemma,
        language: center.language,
        languageName: center.languageName,
        saved: true,
        wordId: center.id,
        kind: "center"
      }
    ];
    const edges2 = [];
    const seenNode = /* @__PURE__ */ new Set([centerNodeId]);
    const seenEdge = /* @__PURE__ */ new Set();
    for (const link of center.links) {
      addNeighbor2(link.lemma, link.language, link.languageName, link.relation, link.toWordId);
    }
    return { nodes: nodes2, edges: edges2 };
  }
  const words = allActiveWordRows();
  const nodes = words.map((row) => ({
    id: `word:${row.id}`,
    label: row.display_lemma,
    language: row.language,
    languageName: row.language_name,
    saved: true,
    wordId: row.id,
    kind: "saved"
  }));
  const byKey = new Map(
    words.map((row) => [`${row.language}:${normalizeLemma(row.display_lemma, row.language)}`, row.id])
  );
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = [];
  const edgeSeen = /* @__PURE__ */ new Set();
  function pushEdge(sourceId, targetId, relation) {
    const source = `word:${sourceId}`;
    const target = `word:${targetId}`;
    if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return;
    const key = [source, target, relation].sort().join("|");
    if (edgeSeen.has(key)) return;
    edgeSeen.add(key);
    edges.push({ source, target, relation });
  }
  const links = db.prepare(
    "SELECT from_word_id, to_word_id, to_lemma, to_language, relation FROM word_links"
  ).all();
  for (const link of links) {
    const targetId = link.to_word_id ?? byKey.get(`${link.to_language}:${link.to_lemma}`) ?? null;
    if (!targetId) continue;
    pushEdge(link.from_word_id, targetId, link.relation || "translation");
  }
  const senseRows = db.prepare("SELECT word_id, synonyms_json, antonyms_json FROM senses").all();
  const wordLang = new Map(words.map((row) => [row.id, row.language]));
  function parse2(raw2) {
    if (!raw2) return [];
    try {
      const value = JSON.parse(raw2);
      return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
    } catch {
      return [];
    }
  }
  for (const row of senseRows) {
    const language = wordLang.get(row.word_id);
    if (!language) continue;
    for (const term of parse2(row.synonyms_json).slice(0, 8)) {
      const other = byKey.get(`${language}:${normalizeLemma(term, language)}`);
      if (other) pushEdge(row.word_id, other, "synonym");
    }
    for (const term of parse2(row.antonyms_json).slice(0, 8)) {
      const other = byKey.get(`${language}:${normalizeLemma(term, language)}`);
      if (other) pushEdge(row.word_id, other, "antonym");
    }
  }
  return { nodes, edges };
}

// server/src/languages.ts
var FALLBACK = [
  { code: "en", name: "English", words: 1365322 },
  { code: "la", name: "Latin", words: 833841 },
  { code: "es", name: "Spanish", words: 763354 },
  { code: "it", name: "Italian", words: 587857 },
  { code: "ru", name: "Russian", words: 426409 },
  { code: "pt", name: "Portuguese", words: 407005 },
  { code: "fr", name: "French", words: 387833 },
  { code: "de", name: "German", words: 347627 },
  { code: "sv", name: "Swedish", words: 301212 },
  { code: "fi", name: "Finnish", words: 250939 },
  { code: "zh", name: "Chinese", words: 173379 },
  { code: "pl", name: "Polish", words: 169363 },
  { code: "nl", name: "Dutch", words: 136677 },
  { code: "ja", name: "Japanese", words: 121124 },
  { code: "el", name: "Greek", words: 81634 },
  { code: "hu", name: "Hungarian", words: 72302 },
  { code: "cs", name: "Czech", words: 69100 },
  { code: "uk", name: "Ukrainian", words: 53936 },
  { code: "da", name: "Danish", words: 53327 },
  { code: "ko", name: "Korean", words: 48578 },
  { code: "tr", name: "Turkish", words: 40986 },
  { code: "vi", name: "Vietnamese", words: 38735 },
  { code: "hi", name: "Hindi", words: 34564 },
  { code: "ar", name: "Arabic", words: 25489 },
  { code: "th", name: "Thai", words: 17239 },
  { code: "he", name: "Hebrew", words: 13707 },
  { code: "id", name: "Indonesian", words: 32970 },
  { code: "ca", name: "Catalan", words: 188895 },
  { code: "ro", name: "Romanian", words: 124905 },
  { code: "nb", name: "Norwegian Bokm\xE5l", words: 70120 }
];
var cache = FALLBACK;
var fetchedAt = 0;
async function getLanguages(force = false) {
  const fresh = Date.now() - fetchedAt < 24 * 60 * 60 * 1e3;
  if (!force && fetchedAt && fresh && cache.length > FALLBACK.length) return cache;
  try {
    const res = await fetch("https://freedictionaryapi.com/api/v1/languages", {
      headers: { Accept: "application/json", "User-Agent": "Wordkeep/1.0" },
      signal: AbortSignal.timeout(12e3)
    });
    if (!res.ok) return cache;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      cache = data.filter((item) => item?.code && item?.name).sort((a, b) => b.words - a.words || a.name.localeCompare(b.name));
      fetchedAt = Date.now();
    }
  } catch {
  }
  return cache;
}
function languageName(code) {
  return cache.find((item) => item.code === code)?.name ?? code;
}

// server/src/etymology.ts
var UA = "Wordkeep/1.0 (personal lexicon; local app)";
function wikiLinks(text) {
  return text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");
}
function expandTemplate(inner) {
  const parts = inner.split("|").map((part) => part.trim());
  const name = (parts[0] ?? "").toLowerCase();
  const positional = parts.slice(1).filter((part) => part && !part.includes("=") && part !== "en");
  const named = Object.fromEntries(
    parts.slice(1).filter((part) => part.includes("=")).map((part) => {
      const at = part.indexOf("=");
      return [part.slice(0, at).trim(), part.slice(at + 1).trim()];
    })
  );
  if (name === "w" || name === "wikipedia" || name === "l" || name === "m" || name === "lang") {
    return positional[1] || positional[0] || named.alt || "";
  }
  if (name === "csem" || name === "ambito" || name === "uso") return "";
  if (name.startsWith("etimolog") || name === "\xE9tyl" || name === "etymon") {
    return positional.filter((part) => part.length > 1).join(" ");
  }
  if (name === "plm") {
    const word = positional[0] ?? "";
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : "";
  }
  if (name.startsWith("coin")) {
    const who = positional.find((part) => part.length > 2) ?? positional[0];
    return who ? `Coined by ${who}` : "";
  }
  if (name === "suffix" || name === "prefix" || name === "affix" || name === "compound") {
    const bits = positional.filter((part) => part.length < 48);
    if (name === "suffix" && bits.length >= 2) {
      return `${bits[0]} + -${bits[bits.length - 1]}`;
    }
    return bits.join(" + ");
  }
  if (name === "der" || name === "inh" || name === "bor" || name === "borrowed" || name === "calque") {
    return positional.slice(1).join(" ");
  }
  if (name === "cog" || name === "cognate") {
    return positional.length ? `cognate with ${positional.join(", ")}` : "";
  }
  if (name === "ety" || name === "was wotd" || name === "cln" || name === "root") return "";
  if (named.t1) return named.t1;
  if (positional.length) return positional[positional.length - 1] ?? "";
  return "";
}
function replaceTemplates(text) {
  let out = text;
  for (let i = 0; i < 8; i += 1) {
    const next = out.replace(/\{\{([^{}]+)\}\}/g, (_, inner) => expandTemplate(inner));
    if (next === out) break;
    out = next;
  }
  return out.replace(/\{\{|\}\}/g, " ");
}
function cleanWiki(text) {
  let out = wikiLinks(text);
  out = replaceTemplates(out);
  out = out.replace(/'{2,}/g, "");
  out = out.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "");
  out = out.replace(/<[^>]+>/g, " ");
  out = out.replace(/^=+\s*\w[\w\s]*\s*=+$/gm, "");
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return out.replace(/[ ]{2,}/g, " ").trim();
}
function languageSection(wikitext, languageName2) {
  const escaped = languageName2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = new RegExp(`^==\\s*${escaped}\\s*==\\s*$`, "im");
  const match2 = heading.exec(wikitext);
  if (!match2) return null;
  const start = match2.index + match2[0].length;
  const rest = wikitext.slice(start);
  const next = rest.search(/^\s*==[^=].*==\s*$/m);
  return next === -1 ? rest : rest.slice(0, next);
}
function etymologyFrom(section) {
  const heading = /===+\s*(?:\{\{\s*S\s*\|[^}]*étymolog[^}]*\}\}|Etimolog[íi]a|Etymologie|Etymology)[^=]*===+\s*([\s\S]*?)(?=\n===+|$)/gi;
  const parts = [];
  let match2;
  while (match2 = heading.exec(section)) {
    const cleaned = cleanWiki(match2[1] ?? "");
    if (cleaned.length > 8) parts.push(cleaned);
  }
  if (!parts.length) {
    const herkunft = /\{\{Herkunft\}\}\s*([\s\S]*?)(?=\n\{\{[A-ZÄÖÜ]|\n===+)/i.exec(section);
    if (herkunft?.[1]) {
      const cleaned = cleanWiki(herkunft[1]);
      if (cleaned.length > 8) parts.push(cleaned);
    }
  }
  if (!parts.length) return null;
  return parts.join("\n\n").slice(0, 1400);
}
function translationsFrom(section, originLang) {
  const byLanguage = /* @__PURE__ */ new Map();
  const re = /\{\{t(?:t|\+)?(?:-simple|-check|\+check)?\|([^|}]+)\|([^|}]+)/g;
  let match2;
  while (match2 = re.exec(section)) {
    const language = match2[1]?.trim();
    const lemma = match2[2]?.trim();
    if (!language || !lemma || language === originLang || byLanguage.has(language)) continue;
    byLanguage.set(language, {
      lemma,
      language,
      languageName: languageName(language)
    });
    if (byLanguage.size >= 160) break;
  }
  return [...byLanguage.values()];
}
function termsFromTemplates(section, names) {
  const nameRe = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`\\{\\{(?:${nameRe})\\|([^}]+)\\}\\}`, "gi");
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  let match2;
  while (match2 = re.exec(section)) {
    const parts = (match2[1] ?? "").split("|");
    for (const raw2 of parts.slice(1)) {
      const term = raw2.trim();
      if (!term || term.includes("=") || term.length > 42) continue;
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(term);
      if (out.length >= 24) return out;
    }
  }
  return out;
}
async function fetchWikiExtras(word, langName, langCode) {
  const url = new URL("https://en.wiktionary.org/w/api.php");
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", word);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("redirects", "1");
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) return { etymology: null, translations: [], synonyms: [], antonyms: [] };
    const data = await res.json();
    const wikitext = data.parse?.wikitext;
    if (!wikitext) return { etymology: null, translations: [], synonyms: [], antonyms: [] };
    const section = languageSection(wikitext, langName) ?? wikitext;
    const local = translationsFrom(section, langCode);
    return {
      etymology: etymologyFrom(section) ?? etymologyFrom(wikitext),
      translations: local.length ? local : translationsFrom(wikitext, langCode),
      synonyms: termsFromTemplates(section, ["syn", "synonyms"]),
      antonyms: termsFromTemplates(section, ["ant", "antonyms"])
    };
  } catch {
    return { etymology: null, translations: [], synonyms: [], antonyms: [] };
  }
}

// server/src/native-defs.ts
var UA2 = "Wordkeep/1.0 (personal lexicon; local app)";
var WIKI_EDITION = {
  nb: "no",
  nn: "no",
  "pt-br": "pt",
  "zh-cn": "zh",
  "zh-tw": "zh",
  "zh-hans": "zh",
  "zh-hant": "zh"
};
function wikiLang(code) {
  const base = (code.split("-")[0] ?? code).toLowerCase();
  return WIKI_EDITION[code.toLowerCase()] ?? WIKI_EDITION[base] ?? base;
}
function posFromHeading(heading) {
  const text = heading.replace(/[{}|]/g, " ").toLowerCase();
  if (/sustant|substantiv|sostant|noun|\bnom\b|\bnomen\b/.test(text)) return "noun";
  if (/adjet|adject|aggiunt|adjektiv/.test(text)) return "adjective";
  if (/\bverb/.test(text)) return "verb";
  if (/adverb/.test(text)) return "adverb";
  if (/pronoun|pronombre|pronom/.test(text)) return "pronoun";
  if (/prepos/.test(text)) return "preposition";
  if (/interjec/.test(text)) return "interjection";
  if (/conjunc/.test(text)) return "conjunction";
  if (/article|artikel|articolo/.test(text)) return "article";
  return "";
}
function isolateSection(wikitext, lang) {
  const patterns = [
    new RegExp(`^==\\s*\\{\\{lengua\\|${lang}\\}\\}\\s*==\\s*$`, "im"),
    new RegExp(`^==\\s*\\{\\{langue\\|${lang}\\}\\}\\s*==\\s*$`, "im"),
    new RegExp(`^==\\s*\\{\\{lingua\\|${lang}\\}\\}\\s*==\\s*$`, "im"),
    new RegExp(`^==\\s*\\{\\{-?${lang}-?\\}\\}\\s*==\\s*$`, "im"),
    /^==[^=]*\{\{Sprache\|[^}]+\}\}[^=]*==\s*$/im
  ];
  for (const re of patterns) {
    const match2 = re.exec(wikitext);
    if (!match2 || match2.index === void 0) continue;
    const start = match2.index + match2[0].length;
    const rest = wikitext.slice(start);
    const next = rest.search(/^\s*==[^=].*==\s*$/m);
    return next === -1 ? rest : rest.slice(0, next);
  }
  return wikitext;
}
function polishDefinition(raw2) {
  let text = cleanWiki(raw2);
  text = text.replace(/^[\d.;:]+/, "").trim();
  text = text.replace(/^[a-z]{2,12}:\s+/i, "");
  text = text.replace(/\s+/g, " ").trim();
  if (text.endsWith(".")) text = text.slice(0, -1).trim();
  return text;
}
function parseNativeSenses(wikitext, lang) {
  const section = isolateSection(wikitext, lang);
  const senses = [];
  const seen = /* @__PURE__ */ new Set();
  let pos = "";
  let inBedeutungen = false;
  function push(raw2) {
    const definition = polishDefinition(raw2);
    if (definition.length < 8 || definition.length > 420) return;
    const key = `${pos}:${definition.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    senses.push({
      partOfSpeech: pos,
      definition,
      examples: [],
      synonyms: [],
      antonyms: [],
      tags: []
    });
  }
  for (const rawLine of section.split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^===+\s*(.+?)\s*===+\s*$/);
    if (heading) {
      const next = posFromHeading(heading[1] ?? "");
      if (next) pos = next;
      inBedeutungen = false;
      continue;
    }
    if (/^\{\{Bedeutungen\}\}/i.test(line)) {
      inBedeutungen = true;
      continue;
    }
    if (inBedeutungen && /^\{\{[A-ZÄÖÜa-z]/.test(line) && !line.startsWith(":{")) {
      inBedeutungen = false;
    }
    if (inBedeutungen) {
      const german = line.match(/^:\s*\[[0-9]+[^\]]*\]\s*(.+)/);
      if (german?.[1]) push(german[1]);
      continue;
    }
    const spanish = line.match(/^;\s*\d+\s*(.*)$/);
    if (spanish?.[1]) {
      push(spanish[1].replace(/^:\s*/, ""));
      continue;
    }
    const hash = line.match(/^#(?![*:])\s*(.+)/);
    if (hash?.[1] && !/\{\{exemple/i.test(hash[1])) push(hash[1]);
  }
  return senses.slice(0, 24);
}
async function fetchNativeWiki(word, lang) {
  const edition = wikiLang(lang);
  if (!edition || edition === "en" || edition === "mul" || edition === "simple") {
    return { senses: [], etymology: null };
  }
  const body = new URLSearchParams({
    action: "parse",
    page: word,
    prop: "wikitext",
    format: "json",
    formatversion: "2",
    redirects: "1"
  });
  try {
    const res = await fetch(`https://${edition}.wiktionary.org/w/api.php`, {
      method: "POST",
      headers: {
        "User-Agent": UA2,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body,
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) return { senses: [], etymology: null };
    const data = await res.json();
    const wikitext = data.parse?.wikitext;
    if (!wikitext) return { senses: [], etymology: null };
    const section = isolateSection(wikitext, edition);
    return {
      senses: parseNativeSenses(wikitext, edition),
      etymology: etymologyFrom(section) ?? etymologyFrom(wikitext)
    };
  } catch {
    return { senses: [], etymology: null };
  }
}

// server/src/suggest.ts
import { existsSync, mkdirSync as mkdirSync2, readFileSync, writeFileSync } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var bankDir = join2(dirname2(fileURLToPath2(import.meta.url)), "../data/banks");
mkdirSync2(bankDir, { recursive: true });
var memory = /* @__PURE__ */ new Map();
var FREQ_ALIAS = {
  zh: "zh_cn",
  cmn: "zh_cn",
  yue: "zh_tw",
  nb: "no",
  nn: "no",
  no: "no",
  "pt-br": "pt_br",
  "pt-BR": "pt_br"
};
function freqCode(lang) {
  return FREQ_ALIAS[lang] ?? lang.split("-")[0] ?? lang;
}
function parseSuggestList(text) {
  const seen = /* @__PURE__ */ new Set();
  const words = [];
  for (const line of text.split(/\r?\n/)) {
    const word = line.trim().split(/\s+/)[0]?.normalize("NFC");
    if (!word || /\d/.test(word) || /[._/\\]/.test(word)) continue;
    if ([...word].length < 2) continue;
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(word);
    if (words.length >= 8040) break;
  }
  return words.slice(40, 8040);
}
async function downloadSuggestList(lang) {
  const code = freqCode(lang);
  const urls = [
    `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${code}/${code}_50k.txt`,
    `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/${code}/${code}_50k.txt`
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Wordkeep/1.0", Accept: "text/plain" },
        signal: AbortSignal.timeout(15e3)
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.startsWith("<") || text.length < 1e3) continue;
      const words = parseSuggestList(text);
      if (words.length >= 200) return words;
    } catch {
    }
  }
  return [];
}
async function getSuggestBank(lang) {
  const cached = memory.get(lang);
  if (cached?.length) return cached;
  const path = join2(bankDir, `suggest-${lang}.json`);
  if (existsSync(path)) {
    try {
      const words2 = JSON.parse(readFileSync(path, "utf8"));
      if (Array.isArray(words2) && words2.length) {
        memory.set(lang, words2);
        return words2;
      }
    } catch {
    }
  }
  const words = await downloadSuggestList(lang);
  if (words.length) {
    writeFileSync(path, JSON.stringify(words));
    memory.set(lang, words);
  }
  return words;
}
function isLatin(q) {
  return /^[\p{Script=Latin}\p{M}'’-]+$/u.test(q);
}
function fold(q) {
  return q.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}
function detectLanguages(q) {
  const found = [];
  const add = (code) => {
    if (!found.includes(code)) found.push(code);
  };
  if (/[\u3040-\u30ff]/.test(q)) add("ja");
  if (/[\uac00-\ud7af]/.test(q)) add("ko");
  if (/[\u4e00-\u9fff]/.test(q)) {
    add("zh");
    add("ja");
  }
  if (/[\u0600-\u06ff]/.test(q)) {
    add("ar");
    add("fa");
    add("ur");
  }
  if (/[\u0400-\u04ff]/.test(q)) {
    add("ru");
    add("uk");
    add("bg");
  }
  if (/[\u0590-\u05ff]/.test(q)) add("he");
  if (/[\u0e00-\u0e7f]/.test(q)) add("th");
  if (/[\u0900-\u097f]/.test(q)) add("hi");
  if (/[\u0c00-\u0c7f]/.test(q)) add("te");
  if (/[\u0b80-\u0bff]/.test(q)) add("ta");
  if (/[ñ¡¿]/i.test(q) || /(?:ción|sión|ñol)\b/i.test(q)) add("es");
  if (/[ãõ]/i.test(q) || /ção\b/i.test(q)) add("pt");
  if (/ß|[äöü]/.test(q)) add("de");
  if (/[àâæçêëïîôùûÿœ]/i.test(q) || /(?:eau|eux|ée)\b/i.test(q)) add("fr");
  if (/[ąćęłńśźż]/i.test(q)) add("pl");
  if (/[őű]/.test(q)) add("hu");
  if (/[åæø]/i.test(q)) {
    add("da");
    add("nb");
    add("sv");
  }
  if (/[ìò]/i.test(q)) add("it");
  return found;
}
function prefixHits(bank, q, limit) {
  const needle = fold(q);
  const exact = [];
  const prefix = [];
  for (const word of bank) {
    const lower = fold(word);
    if (lower === needle) exact.push({ word, exact: true });
    else if (lower.startsWith(needle)) prefix.push({ word, exact: false });
    if (prefix.length >= limit && exact.length) break;
  }
  return [...exact, ...prefix].slice(0, limit);
}
async function suggestWords(q, preferred) {
  const query = q.trim();
  const detectedCodes = detectLanguages(query);
  const langs = [];
  const add = (code) => {
    const clean = (code.split("-")[0] ?? code).toLowerCase();
    if (clean && !langs.includes(clean)) langs.push(clean);
  };
  for (const code of detectedCodes) add(code);
  for (const code of preferred) add(code);
  if (isLatin(query)) {
    if (query.length >= 3) {
      for (const code of ["es", "fr", "it", "pt", "de", "en"]) add(code);
    } else {
      add("en");
    }
  }
  const searchLangs = langs.slice(0, 7);
  const banks = await Promise.all(
    searchLangs.map(async (lang) => ({ lang, words: await getSuggestBank(lang) }))
  );
  const suggestions = [];
  const seen = /* @__PURE__ */ new Set();
  const preferredSet = new Set(preferred.map((code) => (code.split("-")[0] ?? code).toLowerCase()));
  const detectedSet = new Set(detectedCodes);
  const ranked = [];
  for (const { lang, words } of banks) {
    if (!words.length) continue;
    const hits = prefixHits(words, query, 6);
    for (const hit of hits) {
      const key = `${lang}:${hit.word.toLocaleLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let score = hit.exact ? 120 : 80;
      if (preferredSet.has(lang)) score += 18;
      if (detectedSet.has(lang)) score += 14;
      ranked.push({
        lemma: hit.word,
        language: lang,
        languageName: languageName(lang),
        exact: hit.exact,
        score
      });
    }
  }
  ranked.sort((a, b) => b.score - a.score || a.lemma.localeCompare(b.lemma));
  for (const item of ranked.slice(0, 12)) {
    suggestions.push({
      lemma: item.lemma,
      language: item.language,
      languageName: item.languageName,
      exact: item.exact
    });
  }
  return {
    query,
    detected: detectedCodes.map((code) => ({ code, name: languageName(code) })),
    suggestions
  };
}

// server/src/lookup.ts
var lookupCache = /* @__PURE__ */ new Map();
var MAX_CACHE = 200;
var MAX_TRANSLATIONS = 160;
function cacheSet(key, value) {
  if (lookupCache.size >= MAX_CACHE) {
    const first = lookupCache.keys().next().value;
    if (first) lookupCache.delete(first);
  }
  lookupCache.set(key, value);
}
function firstIpa(entries) {
  for (const entry of entries) {
    const ipa = entry.pronunciations?.find((item) => item.type === "ipa" && item.text);
    if (ipa?.text) return ipa.text;
    const any = entry.pronunciations?.find((item) => item.text);
    if (any?.text) return any.text;
  }
  return null;
}
function cleanTerms(terms, self, limit = 14) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const selfKey = self.trim().toLowerCase();
  for (const raw2 of terms) {
    const term = raw2.trim();
    if (!term || term.length > 42) continue;
    const key = term.toLowerCase();
    if (key === selfKey || seen.has(key)) continue;
    seen.add(key);
    out.push(term);
    if (out.length >= limit) break;
  }
  return out;
}
function pickTerms(primary, fallbacks, self) {
  const first = cleanTerms(primary, self);
  if (first.length) return first;
  for (const extra of fallbacks) {
    const next = cleanTerms(extra, self);
    if (next.length) return next;
  }
  return [];
}
function collectForms(entries) {
  const seen = /* @__PURE__ */ new Set();
  const forms = [];
  for (const entry of entries) {
    for (const form of entry.forms ?? []) {
      const word = form.word?.trim();
      if (!word) continue;
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      forms.push({ word, tags: (form.tags ?? []).filter(Boolean).slice(0, 4) });
      if (forms.length >= 10) return forms;
    }
  }
  return forms;
}
function attachTerms(senses, donors) {
  if (!senses.length) return senses;
  const byPos = new Map(donors.map((sense) => [sense.partOfSpeech.toLowerCase(), sense]));
  return senses.map((sense) => {
    const donor = byPos.get(sense.partOfSpeech.toLowerCase()) ?? donors[0];
    if (!donor) return sense;
    return {
      ...sense,
      synonyms: sense.synonyms.length ? sense.synonyms : donor.synonyms,
      antonyms: sense.antonyms.length ? sense.antonyms : donor.antonyms,
      tags: sense.tags.length ? sense.tags : donor.tags,
      examples: sense.examples.length ? sense.examples : donor.examples
    };
  });
}
function collectSenses(entries, lemma, wiki) {
  const senses = [];
  const seen = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    const entrySyn = entry.synonyms ?? [];
    const entryAnt = entry.antonyms ?? [];
    for (const sense of entry.senses ?? []) {
      const definition = sense.definition?.trim();
      if (!definition) continue;
      const key = `${entry.partOfSpeech ?? ""}:${definition}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const examples = (sense.examples ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 4);
      senses.push({
        partOfSpeech: entry.partOfSpeech?.trim() ?? "",
        definition,
        examples,
        synonyms: pickTerms(sense.synonyms ?? [], [entrySyn, wiki.synonyms], lemma),
        antonyms: pickTerms(sense.antonyms ?? [], [entryAnt, wiki.antonyms], lemma),
        tags: (sense.tags ?? []).filter(Boolean).slice(0, 6)
      });
    }
  }
  return senses.slice(0, 40);
}
function mergeTranslations(primary, extra) {
  const byLanguage = /* @__PURE__ */ new Map();
  for (const item of [...primary, ...extra]) {
    if (!item.language || !item.lemma || byLanguage.has(item.language)) continue;
    byLanguage.set(item.language, item);
  }
  return [...byLanguage.values()].slice(0, MAX_TRANSLATIONS);
}
function collectTranslations(entries, originLang) {
  const byLanguage = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    for (const sense of entry.senses ?? []) {
      for (const item of sense.translations ?? []) {
        const language = item.language?.code?.trim();
        const lemma = item.word?.trim();
        if (!language || !lemma || language === originLang) continue;
        if (byLanguage.has(language)) continue;
        byLanguage.set(language, {
          lemma,
          language,
          languageName: item.language?.name?.trim() || language
        });
        if (byLanguage.size >= MAX_TRANSLATIONS) return [...byLanguage.values()];
      }
    }
  }
  return [...byLanguage.values()];
}
async function fetchFreeDictionary(word, lang) {
  const url = `https://freedictionaryapi.com/api/v1/entries/${encodeURIComponent(lang)}/${encodeURIComponent(word)}?translations=true`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Wordkeep/1.0" },
    signal: AbortSignal.timeout(12e3)
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Dictionary lookup failed (${res.status})`);
  return await res.json();
}
async function lookupOnce(rawWord, lang) {
  const displayLemma = rawWord.trim();
  if (!displayLemma) return null;
  const lemma = normalizeLemma(displayLemma, lang);
  const cacheKey = `${lang}:${lemma}`;
  const cached = lookupCache.get(cacheKey);
  if (cached) {
    return { ...cached, existing: findWordId(lemma, lang) ? { id: findWordId(lemma, lang) } : null };
  }
  const guessedName = languageName(lang);
  const [payload, wiki, native] = await Promise.all([
    fetchFreeDictionary(displayLemma, lang),
    fetchWikiExtras(displayLemma, guessedName, lang),
    fetchNativeWiki(displayLemma, lang)
  ]);
  const entries = (payload?.entries ?? []).filter((entry) => {
    const code = entry.language?.code;
    return !code || code === lang || lang === "mul";
  });
  const usable = entries.length ? entries : payload?.entries ?? [];
  const glossary = collectSenses(usable, lemma, wiki);
  const senses = native.senses.length ? attachTerms(native.senses, glossary) : glossary;
  if (!senses.length) return null;
  const langName = usable[0]?.language?.name || guessedName;
  const result = {
    lemma,
    displayLemma: payload?.word?.trim() || displayLemma,
    language: lang,
    languageName: langName,
    phonetic: firstIpa(usable),
    etymology: native.etymology ?? wiki.etymology,
    fallbackFrom: null,
    forms: collectForms(usable),
    senses,
    translations: mergeTranslations(collectTranslations(usable, lang), wiki.translations),
    existing: findWordId(lemma, lang) ? { id: findWordId(lemma, lang) } : null
  };
  cacheSet(cacheKey, result);
  return result;
}
async function lookupWord(rawWord, lang) {
  const tried = /* @__PURE__ */ new Set();
  async function attempt(code) {
    if (!code || tried.has(code)) return null;
    tried.add(code);
    return lookupOnce(rawWord, code);
  }
  const primary = await attempt(lang);
  if (primary) return primary;
  const extras = [];
  const add = (code) => {
    const clean = (code.split("-")[0] ?? code).toLowerCase();
    if (clean && !tried.has(clean) && !extras.includes(clean)) extras.push(clean);
  };
  for (const code of detectLanguages(rawWord)) add(code);
  try {
    const hints = await suggestWords(rawWord, [lang, ...extras]);
    for (const item of hints.suggestions) {
      if (item.exact) add(item.language);
    }
    for (const item of hints.suggestions) add(item.language);
  } catch {
  }
  for (const code of extras.slice(0, 5)) {
    const hit = await attempt(code);
    if (hit) return { ...hit, fallbackFrom: lang === hit.language ? null : lang };
  }
  return null;
}

// server/src/play.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync3, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname3, join as join3 } from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var bankDir2 = join3(dirname3(fileURLToPath3(import.meta.url)), "../data/banks");
mkdirSync3(bankDir2, { recursive: true });
var memory2 = /* @__PURE__ */ new Map();
var NEED = 2e3;
var FREQ_ALIAS2 = {
  zh: "zh_cn",
  cmn: "zh_cn",
  yue: "zh_tw",
  nb: "no",
  nn: "no",
  no: "no",
  "pt-br": "pt_br",
  "pt-BR": "pt_br"
};
function freqCode2(lang) {
  return FREQ_ALIAS2[lang] ?? lang.split("-")[0] ?? lang;
}
function looksLexical(word, lang) {
  if (/\d/.test(word)) return false;
  if (/[._/\\]/.test(word)) return false;
  const script = lang.split("-")[0] ?? lang;
  if (["zh", "ja", "ko", "cmn", "yue"].includes(script) || script.startsWith("zh")) {
    return [...word].length >= 2;
  }
  return word.length >= 7;
}
function parseFrequency(text, lang) {
  const lines = text.split(/\r?\n/);
  const all = [];
  const seen = /* @__PURE__ */ new Set();
  for (const line of lines) {
    const word = line.trim().split(/\s+/)[0]?.normalize("NFC");
    if (!word) continue;
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(word);
  }
  const skip = Math.min(8e3, Math.floor(all.length * 0.18));
  const picked = [];
  for (let i = skip; i < all.length && picked.length < NEED + 400; i += 1) {
    const word = all[i];
    if (word && looksLexical(word, lang)) picked.push(word);
  }
  if (picked.length < NEED) {
    for (const word of all) {
      if (picked.length >= NEED) break;
      if (looksLexical(word, lang) && !picked.includes(word)) picked.push(word);
    }
  }
  return picked.slice(0, Math.max(NEED, picked.length));
}
async function downloadBank(lang) {
  const code = freqCode2(lang);
  const urls = [
    `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${code}/${code}_50k.txt`,
    `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/${code}/${code}_50k.txt`
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Wordkeep/1.0", Accept: "text/plain" },
        signal: AbortSignal.timeout(2e4)
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.startsWith("<") || text.length < 1e3) continue;
      const words = parseFrequency(text, lang);
      if (words.length >= NEED) return words;
      if (words.length >= 800) return words;
    } catch {
    }
  }
  return [];
}
async function getBank(lang) {
  const cached = memory2.get(lang);
  if (cached && cached.length >= NEED) return cached;
  const path = join3(bankDir2, `${lang}.json`);
  if (existsSync2(path)) {
    try {
      const words2 = JSON.parse(readFileSync2(path, "utf8"));
      if (Array.isArray(words2) && words2.length >= NEED) {
        memory2.set(lang, words2);
        return words2;
      }
    } catch {
    }
  }
  const words = await downloadBank(lang);
  if (words.length >= NEED) {
    writeFileSync2(path, JSON.stringify(words));
    memory2.set(lang, words);
  }
  return words;
}
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === void 0 || b === void 0) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}
function shortDefinition(definition) {
  const clipped = definition.replace(/\s+/g, " ").trim();
  if (clipped.length <= 180) return clipped;
  return `${clipped.slice(0, 177).replace(/\s+\S*$/, "")}\u2026`;
}
async function buildRound(lang) {
  const bank = await getBank(lang);
  if (bank.length < NEED) return null;
  const pool = shuffle(bank);
  const cards = [];
  const used = /* @__PURE__ */ new Set();
  for (const lemma of pool) {
    if (cards.length >= 5) break;
    if (used.has(lemma.toLowerCase())) continue;
    try {
      const lookup = await lookupWord(lemma, lang);
      const sense = lookup?.senses[0];
      const definition = sense?.definition?.trim();
      if (!lookup || !definition || definition.length < 24) continue;
      used.add(lemma.toLowerCase());
      cards.push({
        id: crypto.randomUUID(),
        lemma: lookup.displayLemma,
        definition: shortDefinition(definition),
        partOfSpeech: sense?.partOfSpeech ?? ""
      });
    } catch {
      continue;
    }
  }
  if (cards.length < 5) return null;
  return {
    lang,
    languageName: languageName(lang),
    bankSize: bank.length,
    cards
  };
}

// server/src/app.ts
var app = new Hono2();
app.use(secureHeaders());
var corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173").split(",").map((item) => item.trim()).filter(Boolean);
app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) return corsOrigins[0] ?? "";
      if (corsOrigins.includes(origin)) return origin;
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return origin;
      return corsOrigins[0] ?? "";
    },
    credentials: true
  })
);
var accessKey = process.env.WORDKEEP_ACCESS_KEY?.trim() ?? "";
function isPublicPath(path) {
  return path === "/api/health" || path === "/api/login" || path === "/api/session";
}
function isSignedIn(c) {
  if (!accessKey) return true;
  const cookie = getCookie(c, "wordkeep_key");
  const header = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  return cookie === accessKey || header === accessKey;
}
app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (isPublicPath(path) || isSignedIn(c)) return next();
  return c.json({ error: "Unauthorized" }, 401);
});
var GRADES = ["again", "hard", "good", "easy"];
app.get("/api/health", (c) => c.json({ ok: true, version: "1.0.0" }));
app.get(
  "/api/session",
  (c) => c.json({ ok: true, locked: Boolean(accessKey), signedIn: isSignedIn(c) })
);
app.post("/api/login", async (c) => {
  if (!accessKey) return c.json({ ok: true });
  const body = await c.req.json().catch(() => ({}));
  if (body.key !== accessKey) return c.json({ error: "Wrong key" }, 401);
  setCookie(c, "wordkeep_key", accessKey, {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30
  });
  return c.json({ ok: true });
});
app.post("/api/logout", (c) => {
  deleteCookie(c, "wordkeep_key", { path: "/" });
  return c.json({ ok: true });
});
app.get("/api/languages", async (c) => c.json(await getLanguages()));
app.get("/api/suggest", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q) return c.json({ query: "", detected: [], suggestions: [] });
  const lang = c.req.query("lang")?.trim() || "en";
  const ui = c.req.query("ui")?.trim() || "";
  const preferred = [lang, ui].filter(Boolean);
  try {
    return c.json(await suggestWords(q, preferred));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suggest failed";
    return c.json({ error: message }, 502);
  }
});
app.get("/api/lookup", async (c) => {
  const q = c.req.query("q")?.trim();
  const lang = c.req.query("lang")?.trim() || "en";
  if (!q) return c.json({ error: "Missing q" }, 400);
  try {
    const result = await lookupWord(q, lang);
    if (!result) return c.json({ error: "No definitions found", q, lang }, 404);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    return c.json({ error: message }, 502);
  }
});
app.get("/api/stats", (c) => c.json(stats()));
app.get("/api/words", (c) => {
  const q = c.req.query("q") ?? void 0;
  const status = c.req.query("status") ?? void 0;
  const due = c.req.query("due") ?? void 0;
  const language = c.req.query("language") ?? void 0;
  const archived = status === "archived";
  return c.json(listWords({ q, status, due, language, archived }));
});
app.get("/api/words/recent", (c) => c.json(recentWords()));
app.get("/api/words/:id", (c) => {
  const word = getWord(c.req.param("id"));
  if (!word) return c.json({ error: "Not found" }, 404);
  return c.json(word);
});
app.post("/api/words", async (c) => {
  const body = await c.req.json();
  const q = body.q?.trim();
  const lang = body.lang?.trim();
  if (!q || !lang) return c.json({ error: "q and lang are required" }, 400);
  const lookup = await lookupWord(q, lang);
  if (!lookup) return c.json({ error: "No definitions found" }, 404);
  const existingId = lookup.existing?.id ?? findWordId(lookup.displayLemma, lookup.language);
  if (existingId) {
    const existing = getWord(existingId);
    return c.json({ alreadyKept: true, word: existing });
  }
  const word = insertFromLookup(lookup, body.note ?? "", body.primarySenseIndex ?? 0);
  return c.json({ alreadyKept: false, word }, 201);
});
app.patch("/api/words/:id", async (c) => {
  const body = await c.req.json();
  const word = updateWord(c.req.param("id"), body);
  if (!word) return c.json({ error: "Not found" }, 404);
  return c.json(word);
});
app.delete("/api/words/:id", (c) => {
  const ok = deleteWord(c.req.param("id"));
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});
app.get("/api/review/queue", (c) => c.json(reviewQueue()));
app.post("/api/review/:id/grade", async (c) => {
  const body = await c.req.json();
  if (!body.grade || !GRADES.includes(body.grade)) {
    return c.json({ error: "grade must be again | hard | good | easy" }, 400);
  }
  const word = gradeWord(c.req.param("id"), body.grade);
  if (!word) return c.json({ error: "Not found" }, 404);
  return c.json(word);
});
app.get("/api/play/bank", async (c) => {
  const lang = c.req.query("lang")?.trim() || "en";
  const bank = await getBank(lang);
  return c.json({ lang, languageName: bank.length ? lang : lang, bankSize: bank.length });
});
app.get("/api/play/round", async (c) => {
  const lang = c.req.query("lang")?.trim() || "en";
  try {
    const round = await buildRound(lang);
    if (!round) {
      return c.json(
        {
          error: `No 2,000-word discovery bank for \u201C${lang}\u201D yet. Try English or another major language.`
        },
        404
      );
    }
    return c.json(round);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build a round";
    return c.json({ error: message }, 502);
  }
});
app.get("/api/graph", (c) => {
  const wordId = c.req.query("wordId") ?? void 0;
  return c.json(wordGraph(wordId));
});
app.get("/api/export", (c) => {
  const backup = exportLexicon();
  c.header("Content-Disposition", `attachment; filename="wordkeep-backup.json"`);
  return c.json(backup);
});
app.post("/api/import", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON" }, 400);
  const mode = "mode" in body && body.mode === "replace" ? "replace" : "merge";
  const payload = body && "backup" in body && body.backup ? body.backup : body;
  try {
    return c.json(importLexicon(payload, mode));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return c.json({ error: message }, 400);
  }
});

// server/src/seed-graph.ts
var LANG = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German"
};
function w(lemma, language, definition, extras = {}) {
  return {
    lemma,
    language,
    languageName: LANG[language],
    definition,
    partOfSpeech: extras.pos ?? "adjective",
    synonyms: extras.synonyms ?? [],
    antonyms: extras.antonyms ?? [],
    related: extras.related ?? []
  };
}
var WORDS = [
  w("happy", "en", "Feeling or showing pleasure or contentment.", {
    synonyms: ["glad", "joyful", "cheerful"],
    antonyms: ["sad", "unhappy"],
    related: ["love"]
  }),
  w("glad", "en", "Pleased; delighted.", {
    synonyms: ["happy", "joyful"],
    antonyms: ["sad"]
  }),
  w("joyful", "en", "Feeling or causing great pleasure.", {
    synonyms: ["happy", "glad", "cheerful"],
    antonyms: ["sad"]
  }),
  w("cheerful", "en", "Noticeably happy and optimistic.", {
    synonyms: ["happy", "joyful"],
    antonyms: ["unhappy"]
  }),
  w("sad", "en", "Feeling or showing sorrow.", {
    synonyms: ["unhappy"],
    antonyms: ["happy", "glad", "joyful"],
    related: ["hate"]
  }),
  w("unhappy", "en", "Not happy; sad or dissatisfied.", {
    synonyms: ["sad"],
    antonyms: ["happy", "cheerful"]
  }),
  w("hot", "en", "Having a high temperature.", {
    synonyms: ["warm"],
    antonyms: ["cold", "chilly"]
  }),
  w("warm", "en", "Of a fairly high temperature; comfortably heated.", {
    synonyms: ["hot"],
    antonyms: ["cold", "chilly"]
  }),
  w("cold", "en", "Of or at a low temperature.", {
    synonyms: ["chilly"],
    antonyms: ["hot", "warm"]
  }),
  w("chilly", "en", "Uncomfortably cool or cold.", {
    synonyms: ["cold"],
    antonyms: ["hot", "warm"]
  }),
  w("big", "en", "Of considerable size or extent.", {
    synonyms: ["large"],
    antonyms: ["small", "tiny"]
  }),
  w("large", "en", "Of considerable or relatively great size.", {
    synonyms: ["big"],
    antonyms: ["small", "tiny"]
  }),
  w("small", "en", "Of a size that is less than normal or usual.", {
    synonyms: ["tiny"],
    antonyms: ["big", "large"]
  }),
  w("tiny", "en", "Very small.", {
    synonyms: ["small"],
    antonyms: ["big", "large"]
  }),
  w("light", "en", "Having a lot of light; not dark.", {
    synonyms: ["bright"],
    antonyms: ["dark", "dim"]
  }),
  w("bright", "en", "Giving out or reflecting much light.", {
    synonyms: ["light"],
    antonyms: ["dark", "dim"]
  }),
  w("dark", "en", "With little or no light.", {
    synonyms: ["dim"],
    antonyms: ["light", "bright"]
  }),
  w("dim", "en", "Not shining brightly or clearly.", {
    synonyms: ["dark"],
    antonyms: ["light", "bright"]
  }),
  w("love", "en", "An intense feeling of deep affection.", {
    synonyms: ["adore"],
    antonyms: ["hate"],
    related: ["happy"],
    pos: "noun"
  }),
  w("adore", "en", "Love and respect deeply.", {
    synonyms: ["love"],
    antonyms: ["hate"],
    pos: "verb"
  }),
  w("hate", "en", "Intense dislike.", {
    synonyms: [],
    antonyms: ["love", "adore"],
    related: ["sad"],
    pos: "noun"
  }),
  w("fast", "en", "Moving or able to move at high speed.", {
    synonyms: ["quick"],
    antonyms: ["slow"]
  }),
  w("quick", "en", "Moving fast or doing something in a short time.", {
    synonyms: ["fast"],
    antonyms: ["slow"]
  }),
  w("slow", "en", "Moving or operating at a low speed.", {
    synonyms: [],
    antonyms: ["fast", "quick"]
  }),
  w("begin", "en", "Start; perform the first part of an action.", {
    synonyms: ["start"],
    antonyms: ["end", "finish"],
    pos: "verb"
  }),
  w("start", "en", "Begin or be begun.", {
    synonyms: ["begin"],
    antonyms: ["end", "finish"],
    pos: "verb"
  }),
  w("end", "en", "The final part of something; to bring to a close.", {
    synonyms: ["finish"],
    antonyms: ["begin", "start"],
    pos: "verb"
  }),
  w("finish", "en", "Bring a task or activity to an end.", {
    synonyms: ["end"],
    antonyms: ["begin", "start"],
    pos: "verb"
  }),
  w("know", "en", "Be aware of through observation, inquiry, or information.", {
    related: ["learn"],
    pos: "verb"
  }),
  w("learn", "en", "Gain knowledge of or skill in by study or experience.", {
    related: ["know"],
    pos: "verb"
  }),
  w("feliz", "es", "Que siente o causa felicidad.", {
    synonyms: ["alegre"],
    antonyms: ["triste"],
    related: ["amor"]
  }),
  w("alegre", "es", "Lleno de alegr\xEDa.", {
    synonyms: ["feliz"],
    antonyms: ["triste"]
  }),
  w("triste", "es", "Afligido, pesaroso.", {
    synonyms: [],
    antonyms: ["feliz", "alegre"]
  }),
  w("caliente", "es", "Que tiene o produce calor.", {
    antonyms: ["fr\xEDo"]
  }),
  w("fr\xEDo", "es", "De temperatura baja.", {
    antonyms: ["caliente"]
  }),
  w("grande", "es", "Que supera el tama\xF1o habitual.", {
    antonyms: ["peque\xF1o"]
  }),
  w("peque\xF1o", "es", "De tama\xF1o reducido.", {
    antonyms: ["grande"]
  }),
  w("amor", "es", "Sentimiento de afecto profundo.", {
    antonyms: ["odio"],
    related: ["feliz"],
    pos: "noun"
  }),
  w("odio", "es", "Antipat\xEDa y aversi\xF3n hacia algo o alguien.", {
    antonyms: ["amor"],
    pos: "noun"
  }),
  w("heureux", "fr", "Qui \xE9prouve du bonheur.", {
    synonyms: ["joyeux"],
    antonyms: ["malheureux"],
    related: ["amour"]
  }),
  w("joyeux", "fr", "Qui exprime la joie.", {
    synonyms: ["heureux"],
    antonyms: ["malheureux"]
  }),
  w("malheureux", "fr", "Qui n\u2019est pas heureux; infortun\xE9.", {
    antonyms: ["heureux", "joyeux"]
  }),
  w("chaud", "fr", "De temp\xE9rature \xE9lev\xE9e.", {
    antonyms: ["froid"]
  }),
  w("froid", "fr", "De temp\xE9rature basse.", {
    antonyms: ["chaud"]
  }),
  w("grand", "fr", "De dimensions importantes.", {
    antonyms: ["petit"]
  }),
  w("petit", "fr", "De faible dimension.", {
    antonyms: ["grand"]
  }),
  w("amour", "fr", "Sentiment d\u2019affection profonde.", {
    antonyms: ["haine"],
    related: ["heureux"],
    pos: "noun"
  }),
  w("haine", "fr", "Sentiment violent de r\xE9pulsion.", {
    antonyms: ["amour"],
    pos: "noun"
  }),
  w("gl\xFCcklich", "de", "Von Gl\xFCck erf\xFCllt; froh.", {
    antonyms: ["traurig"],
    related: ["Liebe"]
  }),
  w("traurig", "de", "Von Trauer erf\xFCllt.", {
    antonyms: ["gl\xFCcklich"]
  }),
  w("hei\xDF", "de", "Von hoher Temperatur.", {
    antonyms: ["kalt"]
  }),
  w("kalt", "de", "Von niedriger Temperatur.", {
    antonyms: ["hei\xDF"]
  }),
  w("gro\xDF", "de", "Von betr\xE4chtlicher Gr\xF6\xDFe.", {
    antonyms: ["klein"]
  }),
  w("klein", "de", "Von geringem Ausma\xDF.", {
    antonyms: ["gro\xDF"]
  }),
  w("Liebe", "de", "Innige Zuneigung.", {
    antonyms: ["Hass"],
    related: ["gl\xFCcklich"],
    pos: "noun"
  }),
  w("Hass", "de", "Starke Abneigung.", {
    antonyms: ["Liebe"],
    pos: "noun"
  })
];
var CROSS = [
  { from: "happy", fromLang: "en", to: "feliz", toLang: "es", relation: "translation" },
  { from: "happy", fromLang: "en", to: "heureux", toLang: "fr", relation: "translation" },
  { from: "happy", fromLang: "en", to: "gl\xFCcklich", toLang: "de", relation: "translation" },
  { from: "sad", fromLang: "en", to: "triste", toLang: "es", relation: "translation" },
  { from: "sad", fromLang: "en", to: "malheureux", toLang: "fr", relation: "translation" },
  { from: "sad", fromLang: "en", to: "traurig", toLang: "de", relation: "translation" },
  { from: "hot", fromLang: "en", to: "caliente", toLang: "es", relation: "translation" },
  { from: "hot", fromLang: "en", to: "chaud", toLang: "fr", relation: "translation" },
  { from: "hot", fromLang: "en", to: "hei\xDF", toLang: "de", relation: "translation" },
  { from: "cold", fromLang: "en", to: "fr\xEDo", toLang: "es", relation: "translation" },
  { from: "cold", fromLang: "en", to: "froid", toLang: "fr", relation: "translation" },
  { from: "cold", fromLang: "en", to: "kalt", toLang: "de", relation: "translation" },
  { from: "big", fromLang: "en", to: "grande", toLang: "es", relation: "translation" },
  { from: "big", fromLang: "en", to: "grand", toLang: "fr", relation: "translation" },
  { from: "big", fromLang: "en", to: "gro\xDF", toLang: "de", relation: "translation" },
  { from: "small", fromLang: "en", to: "peque\xF1o", toLang: "es", relation: "translation" },
  { from: "small", fromLang: "en", to: "petit", toLang: "fr", relation: "translation" },
  { from: "small", fromLang: "en", to: "klein", toLang: "de", relation: "translation" },
  { from: "love", fromLang: "en", to: "amor", toLang: "es", relation: "translation" },
  { from: "love", fromLang: "en", to: "amour", toLang: "fr", relation: "translation" },
  { from: "love", fromLang: "en", to: "Liebe", toLang: "de", relation: "translation" },
  { from: "hate", fromLang: "en", to: "odio", toLang: "es", relation: "translation" },
  { from: "hate", fromLang: "en", to: "haine", toLang: "fr", relation: "translation" },
  { from: "hate", fromLang: "en", to: "Hass", toLang: "de", relation: "translation" },
  { from: "feliz", fromLang: "es", to: "heureux", toLang: "fr", relation: "translation" },
  { from: "feliz", fromLang: "es", to: "gl\xFCcklich", toLang: "de", relation: "translation" },
  { from: "heureux", fromLang: "fr", to: "gl\xFCcklich", toLang: "de", relation: "translation" }
];
var SEED_NOTE = "graph demo seed";
function upsertWord(seed) {
  const existing = findWordId(seed.lemma, seed.language);
  if (existing) {
    const row = db.prepare("SELECT note, primary_sense_id FROM words WHERE id = ?").get(existing);
    if (row?.note === SEED_NOTE && row.primary_sense_id) {
      db.prepare(
        `UPDATE senses SET part_of_speech = ?, definition = ?, synonyms_json = ?, antonyms_json = ?
         WHERE id = ?`
      ).run(
        seed.partOfSpeech,
        seed.definition,
        JSON.stringify(seed.synonyms),
        JSON.stringify(seed.antonyms),
        row.primary_sense_id
      );
    }
    return existing;
  }
  const now = Date.now();
  const recall = initialRecall(now);
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO words (
      id, lemma, display_lemma, language, language_name, phonetic, etymology, note, forms_json,
      status, ease_factor, interval_days, repetitions, due_at, last_reviewed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    normalizeLemma(seed.lemma, seed.language),
    seed.lemma,
    seed.language,
    seed.languageName,
    null,
    null,
    SEED_NOTE,
    "[]",
    recall.status,
    recall.easeFactor,
    recall.intervalDays,
    recall.repetitions,
    recall.dueAt,
    recall.lastReviewedAt,
    now,
    now
  );
  const senseId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO senses (id, word_id, part_of_speech, definition, synonyms_json, antonyms_json, tags_json, examples_json, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    senseId,
    id,
    seed.partOfSpeech,
    seed.definition,
    JSON.stringify(seed.synonyms),
    JSON.stringify(seed.antonyms),
    "[]",
    "[]"
  );
  db.prepare("UPDATE words SET primary_sense_id = ? WHERE id = ?").run(senseId, id);
  return id;
}
function linkPair(fromId, from, toLemma, toLanguage, relation) {
  upsertLink({
    fromId,
    toLemma,
    toLanguage,
    toLanguageName: LANG[toLanguage] ?? toLanguage,
    relation,
    fromLemma: from.lemma,
    fromLanguage: from.language,
    fromLanguageName: from.languageName
  });
}
function seedGraphDemo() {
  const ids = /* @__PURE__ */ new Map();
  for (const word of WORDS) {
    ids.set(`${word.language}:${normalizeLemma(word.lemma, word.language)}`, upsertWord(word));
  }
  let linked = 0;
  for (const word of WORDS) {
    const fromId = ids.get(`${word.language}:${normalizeLemma(word.lemma, word.language)}`);
    if (!fromId) continue;
    for (const term of word.synonyms) {
      linkPair(fromId, word, term, word.language, "synonym");
      linked += 1;
    }
    for (const term of word.antonyms) {
      linkPair(fromId, word, term, word.language, "antonym");
      linked += 1;
    }
    for (const term of word.related) {
      linkPair(fromId, word, term, word.language, "related");
      linked += 1;
    }
  }
  for (const link of CROSS) {
    const fromId = ids.get(`${link.fromLang}:${normalizeLemma(link.from, link.fromLang)}`);
    if (!fromId) continue;
    const from = WORDS.find(
      (word) => word.language === link.fromLang && normalizeLemma(word.lemma, word.language) === normalizeLemma(link.from, link.fromLang)
    );
    if (!from) continue;
    linkPair(fromId, from, link.to, link.toLang, link.relation);
    linked += 1;
  }
  return { created: WORDS.length, linked };
}
var runningDirect = process.argv[1]?.includes("seed-graph");
if (runningDirect) {
  const result = seedGraphDemo();
  console.log(`Graph seed: ${result.created} words, ${result.linked} links`);
}

// server/src/vercel-handler.ts
if (process.env.WORDKEEP_SEED === "1") {
  try {
    seedGraphDemo();
  } catch (error) {
    console.error("Graph seed skipped", error);
  }
}
var vercel_handler_default = handle(app);
export {
  vercel_handler_default as default
};
