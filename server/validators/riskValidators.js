export const validateRiskSubmission = (req, res, next) => {
  const body = req.body || {};

  if (
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, 'answers') ||
    !body.answers ||
    typeof body.answers !== 'object' ||
    Array.isArray(body.answers)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Submit only an answers object; score and profile are calculated by the server',
    });
  }

  return next();
};

export const rejectRiskRecalculationBody = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Risk recalculation uses your saved answers and does not accept request data',
    });
  }

  return next();
};