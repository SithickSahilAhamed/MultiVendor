/* ================================================
   catalog-load-policy.js — CAT-002
   Policy: successful empty API list → empty UI (no demo mix).
   JSON fallback only on transport / non-OK HTTP failures.
   Works in browser (script tag) and Node (module.exports).
   ================================================ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatalogLoadPolicy = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Classify a settled API attempt.
   * @param {{ ok: boolean, status?: number, body?: any, error?: any }} result
   * @returns {'api'|'api-empty'|'transport-failure'}
   */
  function classifyApiResult(result) {
    if (!result || result.ok !== true) return 'transport-failure';
    const body = result.body;
    if (Array.isArray(body) && body.length === 0) return 'api-empty';
    return 'api';
  }

  /**
   * Decide whether static JSON fallback is allowed.
   * Only on transport / HTTP failure — never on successful empty.
   */
  function shouldUseJsonFallback(classification) {
    return classification === 'transport-failure';
  }

  /**
   * Resolve final list + source label for one collection.
   * @param {{ ok: boolean, status?: number, body?: any }} apiResult
   * @param {any[]} jsonFallback
   */
  function resolveCollection(apiResult, jsonFallback) {
    const classification = classifyApiResult(apiResult);
    if (classification === 'api' || classification === 'api-empty') {
      const list = Array.isArray(apiResult.body) ? apiResult.body : [];
      return {
        items: list,
        source: classification === 'api-empty' ? 'api-empty' : 'api',
        usedFallback: false
      };
    }
    const fallback = Array.isArray(jsonFallback) ? jsonFallback : [];
    return {
      items: fallback,
      source: fallback.length ? 'json-fallback' : 'api-error-empty',
      usedFallback: fallback.length > 0
    };
  }

  /**
   * Fetch wrapper helper for browser Data.init.
   * Treats thrown errors and non-ok responses as transport-failure.
   */
  async function tryApiGet(getFn, path) {
    try {
      const body = await getFn(path);
      return { ok: true, status: 200, body };
    } catch (error) {
      return { ok: false, error, body: null };
    }
  }

  return {
    classifyApiResult,
    shouldUseJsonFallback,
    resolveCollection,
    tryApiGet
  };
});
