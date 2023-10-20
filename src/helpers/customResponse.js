const ControllerResponse = (res, status, data) => {
  return res.status(status).send({ success: true, data });
};

const ErrorHandler = (res, status, message, errors) => {
  console.log(message, errors);
  return res.status(status).send({ message, success: false, errors });
};

module.exports = { ControllerResponse, ErrorHandler };
