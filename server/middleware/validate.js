/**
 * Zod Validation Middleware
 * Validates request body against a Zod schema.
 * Returns 400 with field-level errors on failure.
 */

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      console.log('[Validation] Rejected:', req.method, req.originalUrl, errors);
      return res.status(400).json({ error: 'Validation failed', errors });
    }
    req.body = result.data; // Use parsed/cleaned data
    next();
  };
}

module.exports = { validate };
