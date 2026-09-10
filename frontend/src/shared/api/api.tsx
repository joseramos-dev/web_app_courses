import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import qs from "qs";
import i18n from "../../i18n";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/?$/, "/") ??
  "http://localhost:8000/";

/**
 * `withCredentials` is required on every instance: the refresh token lives in
 * an HttpOnly cookie set by the backend, and the browser only attaches it to
 * cross-origin requests (5173 -> 8000) when credentials are explicitly opted
 * into. The cookie is scoped to /token, so it is only ever actually sent to
 * the session endpoints.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** Recommendations can take 10–15s+ on large catalogs; do not use the 5s default. */
export const RECOMMENDATIONS_TIMEOUT_MS = 30000;

const apiRecommendations = axios.create({
  baseURL: API_BASE_URL,
  timeout: RECOMMENDATIONS_TIMEOUT_MS,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  paramsSerializer: (params) => {
    return qs.stringify(params, { arrayFormat: "repeat" });
  },
});

const apiAuth = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  withCredentials: true,
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});

const apiArray = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  withCredentials: true,
  paramsSerializer: (params) => {
    return qs.stringify(params, { arrayFormat: "repeat" });
  },
});

const LANGUAGE_INSTANCES = [api, apiAuth, apiArray, apiRecommendations];

function setAcceptLanguage(lng: string) {
  const value = lng.split("-")[0];
  for (const instance of LANGUAGE_INSTANCES) {
    instance.defaults.headers.common["Accept-Language"] = value;
  }
}

setAcceptLanguage(i18n.language ?? "es");
i18n.on("languageChanged", setAcceptLanguage);

export function setAuthHeader(accessToken: string | null) {
  const value = accessToken ? `Bearer ${accessToken}` : undefined;
  if (value) {
    api.defaults.headers.common.Authorization = value;
    apiArray.defaults.headers.common.Authorization = value;
    apiRecommendations.defaults.headers.common.Authorization = value;
  } else {
    delete api.defaults.headers.common.Authorization;
    delete apiArray.defaults.headers.common.Authorization;
    delete apiRecommendations.defaults.headers.common.Authorization;
  }
}

type RefreshHandler = () => Promise<string | null>;
type LogoutHandler = () => void;

let refreshHandler: RefreshHandler | null = null;
let logoutHandler: LogoutHandler | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function registerAuthHandlers(
  onRefresh: RefreshHandler,
  onLogout: LogoutHandler,
) {
  refreshHandler = onRefresh;
  logoutHandler = onLogout;
}

/**
 * Refreshes the access token, collapsing concurrent callers onto a single
 * request.
 *
 * This must be the only way a refresh is triggered. Each refresh rotates the
 * cookie and revokes the previous token, so two overlapping calls make the
 * second one fail with 401 on an already-revoked token and tear down a session
 * that was perfectly valid. It happens on every boot under React StrictMode,
 * which runs effects twice.
 */
export function refreshAccessTokenOnce(): Promise<string | null> {
  if (!refreshHandler) return Promise.resolve(null);
  if (!refreshPromise) {
    refreshPromise = refreshHandler().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function shouldSkipRefresh(url?: string) {
  if (!url) return true;
  return (
    url.includes("/token/refresh") ||
    url.includes("/token/logout") ||
    url.endsWith("/token")
  );
}

function attachRefreshInterceptor(instance: typeof api) {
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };
      if (
        !original ||
        original._retry ||
        error.response?.status !== 401 ||
        shouldSkipRefresh(original.url) ||
        !refreshHandler
      ) {
        return Promise.reject(error);
      }

      const errorCode = error.response?.headers?.["x-error-code"] as
        | string
        | undefined;
      if (
        errorCode === "INVALID_CURRENT_PASSWORD" ||
        errorCode === "INVALID_CREDENTIALS"
      ) {
        return Promise.reject(error);
      }

      original._retry = true;

      const newAccess = await refreshAccessTokenOnce();
      if (!newAccess) {
        logoutHandler?.();
        return Promise.reject(error);
      }

      original.headers.Authorization = `Bearer ${newAccess}`;
      return instance(original);
    },
  );
}

attachRefreshInterceptor(api);
attachRefreshInterceptor(apiArray);
attachRefreshInterceptor(apiRecommendations);

export { api, apiAuth, apiArray, apiRecommendations, API_BASE_URL };
