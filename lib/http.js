import fetch from 'node-fetch'

const MAX_BODY_LOG = 200

const buildError = async (response) => {
  const snippet = await response
    .text()
    .then((text) => text.slice(0, MAX_BODY_LOG))
    .catch(() => '')

  const detail = snippet ? ` - ${snippet}` : ''
  return new Error(`HTTP ${response.status} ${response.statusText}${detail}`)
}

const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw await buildError(response)
    }
    return response
  } catch (error) {
    console.error('❌ HTTP request failed:', error)
    throw error
  }
}

export const fetchJson = async (url, options = {}) => {
  const response = await safeFetch(url, options)
  return response.json()
}

export default safeFetch
