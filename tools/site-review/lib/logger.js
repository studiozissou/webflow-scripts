/**
 * logger.js — DEBUG-gated logger for site-review CLI
 *
 * Creates a logger where log() is gated on the verbose flag,
 * while warn() and error() always write to stderr.
 */

const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

/**
 * Create a logger instance.
 *
 * @param {boolean} verbose - When true, log() outputs to stderr. When false, log() is silent.
 * @returns {{ log: Function, warn: Function, error: Function }}
 */
function createLogger(verbose = false) {
  return {
    log(...args) {
      if (!verbose) return;
      console.error(...args);
    },
    warn(...args) {
      console.error('[WARN]', ...args);
    },
    error(...args) {
      console.error('[ERROR]', ...args);
    },
  };
}

export { createLogger };
