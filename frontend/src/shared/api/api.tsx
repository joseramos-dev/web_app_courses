import axios from 'axios';

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

export { api, apiAuth };