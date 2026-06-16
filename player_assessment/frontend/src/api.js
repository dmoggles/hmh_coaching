import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({ baseURL: BASE_URL })

export const coachApi = (apiKey) =>
  axios.create({ baseURL: BASE_URL, headers: { 'x-api-key': apiKey } })

export const getSkillMatrix = () => api.get('/skill-matrix').then(r => r.data)
export const getPeriods = () => api.get('/periods').then(r => r.data)

export const submitPlayerAssessment = (payload) =>
  api.post('/assessments/player', payload).then(r => r.data)

export const submitCoachAssessment = (payload, apiKey) =>
  coachApi(apiKey).post('/assessments/coach', payload).then(r => r.data)

export const getPlayersForPeriod = (periodId, apiKey) =>
  coachApi(apiKey).get(`/assessments/period/${periodId}/players`).then(r => r.data)

export const createPeriod = (payload, apiKey) =>
  coachApi(apiKey).post('/periods', payload).then(r => r.data)
