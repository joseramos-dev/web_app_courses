import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import qs from "qs";
import i18n from "../../i18n";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/?$/, "/") ??
  "http://localhost:8000/";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});

const apiAuth = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});

const apiArray = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  paramsSerializer: (params) => {
    return qs.stringify(params, { arrayFormat: "repeat" });
  },
});

const LANGUAGE_INSTANCES = [api, apiAuth, apiArray];

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
  } else {
    delete api.defaults.headers.common.Authorization;
    delete apiArray.defaults.headers.common.Authorization;
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

      if (!refreshPromise) {
        refreshPromise = refreshHandler().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccess = await refreshPromise;
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

export { api, apiAuth, apiArray, API_BASE_URL };
