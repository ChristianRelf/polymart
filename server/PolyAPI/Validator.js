/**
 * PolyAPI · Validator
 *
 * Reusable field-validation library. Build a schema with the chain API,
 * then call `.validate(body)` to get a flat errors array. Pass errors to
 * Protocol.fail() with ERRORS.VALIDATION_ERROR on non-empty.
 *
 * Usage:
 *   import { schema, v } from './Validator.js';
 *
 *   const createPostSchema = schema({
 *     title:    v.string({ min: 1, max: 200, required: true }),
 *     body:     v.string({ min: 1, max: 40_000, required: true }),
 *     post_type: v.enum(['discussion', 'news', 'question'], { required: true }),
 *   });
 *
 *   const errors = createPostSchema.validate(req.body);
 *   if (errors.length) return fail(res, ERRORS.VALIDATION_ERROR, errors[0]);
 */

// ── Field validators ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} FieldError
 * @property {string} field
 * @property {string} message
 */

/**
 * @callback FieldValidator
 * @param {unknown} value   Raw value from the request body
 * @param {string}  field   Field name (used in error messages)
 * @returns {string|null}   Error message, or null if valid
 */

// ── v - validator factory namespace ──────────────────────────────────────────

export const v = {

  /**
   * String field.
   * @param {object} [opts]
   * @param {boolean} [opts.required]  Missing/empty fails (default true)
   * @param {number}  [opts.min]       Min length (inclusive)
   * @param {number}  [opts.max]       Max length (inclusive)
   * @param {RegExp}  [opts.pattern]   Must match pattern
   * @param {string}  [opts.label]     Human-readable label for error messages
   * @returns {FieldValidator}
   */
  string({ required = true, min, max, pattern, label } = {}) {
    return (value, field) => {
      const name = label || field;
      if (value === undefined || value === null || value === '') {
        return required ? `${name} is required` : null;
      }
      if (typeof value !== 'string') return `${name} must be a string`;
      if (min !== undefined && value.length < min)
        return `${name} must be at least ${min} character${min !== 1 ? 's' : ''}`;
      if (max !== undefined && value.length > max)
        return `${name} must be at most ${max} characters`;
      if (pattern && !pattern.test(value))
        return `${name} is in an invalid format`;
      return null;
    };
  },

  /**
   * Number field.
   * @param {object} [opts]
   * @param {boolean} [opts.required]
   * @param {number}  [opts.min]
   * @param {number}  [opts.max]
   * @param {boolean} [opts.integer]   Must be an integer
   * @param {string}  [opts.label]
   * @returns {FieldValidator}
   */
  number({ required = true, min, max, integer = false, label } = {}) {
    return (value, field) => {
      const name = label || field;
      if (value === undefined || value === null) {
        return required ? `${name} is required` : null;
      }
      const n = Number(value);
      if (!isFinite(n)) return `${name} must be a finite number`;
      if (integer && !Number.isInteger(n)) return `${name} must be an integer`;
      if (min !== undefined && n < min) return `${name} must be at least ${min}`;
      if (max !== undefined && n > max) return `${name} must be at most ${max}`;
      return null;
    };
  },

  /**
   * Boolean field.
   * @param {object} [opts]
   * @param {boolean} [opts.required]
   * @param {string}  [opts.label]
   * @returns {FieldValidator}
   */
  boolean({ required = false, label } = {}) {
    return (value, field) => {
      const name = label || field;
      if (value === undefined || value === null) {
        return required ? `${name} is required` : null;
      }
      if (typeof value !== 'boolean') return `${name} must be true or false`;
      return null;
    };
  },

  /**
   * Enum (allowed-values list).
   * @param {readonly unknown[]} values  Allowed values
   * @param {object} [opts]
   * @param {boolean} [opts.required]
   * @param {string}  [opts.label]
   * @returns {FieldValidator}
   */
  enum(values, { required = true, label } = {}) {
    const set = new Set(values);
    return (value, field) => {
      const name = label || field;
      if (value === undefined || value === null) {
        return required ? `${name} is required` : null;
      }
      if (!set.has(value)) {
        return `${name} must be one of: ${[...set].join(', ')}`;
      }
      return null;
    };
  },

  /**
   * URL field.
   * @param {object} [opts]
   * @param {boolean}  [opts.required]
   * @param {string[]} [opts.protocols]  Allowed protocols (default ['https', 'http'])
   * @param {number}   [opts.max]        Max URL length (default 2048)
   * @param {string}   [opts.label]
   * @returns {FieldValidator}
   */
  url({ required = true, protocols = ['https', 'http'], max = 2048, label } = {}) {
    return (value, field) => {
      const name = label || field;
      if (value === undefined || value === null || value === '') {
        return required ? `${name} is required` : null;
      }
      if (typeof value !== 'string') return `${name} must be a string`;
      if (value.length > max) return `${name} must be at most ${max} characters`;
      try {
        const u = new URL(value);
        const proto = u.protocol.replace(':', '');
        if (!protocols.includes(proto)) {
          return `${name} must use one of: ${protocols.join(', ')}`;
        }
      } catch {
        return `${name} must be a valid URL`;
      }
      return null;
    };
  },

  /**
   * Array field.
   * @param {FieldValidator} [itemValidator]  Validator applied to each element
   * @param {object} [opts]
   * @param {boolean} [opts.required]
   * @param {number}  [opts.minLength]
   * @param {number}  [opts.maxLength]
   * @param {string}  [opts.label]
   * @returns {FieldValidator}
   */
  array(itemValidator, { required = true, minLength, maxLength, label } = {}) {
    return (value, field) => {
      const name = label || field;
      if (value === undefined || value === null) {
        return required ? `${name} is required` : null;
      }
      if (!Array.isArray(value)) return `${name} must be an array`;
      if (minLength !== undefined && value.length < minLength)
        return `${name} must have at least ${minLength} item${minLength !== 1 ? 's' : ''}`;
      if (maxLength !== undefined && value.length > maxLength)
        return `${name} must have at most ${maxLength} items`;
      if (itemValidator) {
        for (let i = 0; i < value.length; i++) {
          const err = itemValidator(value[i], `${field}[${i}]`);
          if (err) return err;
        }
      }
      return null;
    };
  },

  /**
   * Optional wrapper - makes any validator treat missing/null values as valid.
   * @param {FieldValidator} validator
   * @returns {FieldValidator}
   */
  optional(validator) {
    return (value, field) => {
      if (value === undefined || value === null || value === '') return null;
      return validator(value, field);
    };
  },
};

// ── Schema builder ────────────────────────────────────────────────────────────

/**
 * Build a schema from a map of field validators.
 *
 * @param {Record<string, FieldValidator>} fields
 * @returns {{ validate: (body: object) => string[] }}
 */
export function schema(fields) {
  return {
    /**
     * Validate a request body against the schema.
     * @param {object} body  Typically req.body
     * @returns {string[]}   Array of error messages (empty = valid)
     */
    validate(body) {
      const errors = [];
      const safe = body && typeof body === 'object' ? body : {};
      for (const [field, validator] of Object.entries(fields)) {
        const err = validator(safe[field], field);
        if (err) errors.push(err);
      }
      return errors;
    },

    /**
     * Like validate() but returns only the first error (for fail() message).
     * @param {object} body
     * @returns {string|null}
     */
    first(body) {
      const errors = this.validate(body);
      return errors.length ? errors[0] : null;
    },
  };
}

// ── Standalone helpers ────────────────────────────────────────────────────────

/** True if the string is non-empty after trimming. */
export function isNonEmpty(v) { return typeof v === 'string' && v.trim().length > 0; }

/** True if v is a finite positive number. */
export function isPositive(v) { return typeof v === 'number' && isFinite(v) && v > 0; }

/** True if v is a valid absolute URL. */
export function isURL(v) {
  try { new URL(v); return true; } catch { return false; }
}
