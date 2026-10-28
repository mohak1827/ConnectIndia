export function validateBody(requiredFields = []) {
  return (req, res, next) => {
    const missing = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        status: 'invalid_input',
        error: {
          code: 'INVALID_INPUT',
          message: `Check the submitted details. Missing required fields: ${missing.join(', ')}`,
          missingFields: missing,
          requestId: req.id,
        },
      });
    }

    next();
  };
}
