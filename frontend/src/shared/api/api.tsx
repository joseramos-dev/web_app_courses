import axios from 'axios';
import qs from 'qs';

const api = axios.create({
  baseURL: 'http://localhost:8000/', // La URL de su servidor
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' }
});

const apiAuth = axios.create({
  baseURL: 'http://localhost:8000/',
  timeout: 5000,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});

const apiArray = axios.create({
  baseURL: 'http://localhost:8000/',
  timeout: 5000,
  paramsSerializer: (params) => {
    return qs.stringify(params, {arrayFormat: 'repeat'})
  },
})

export { api, apiAuth, apiArray };