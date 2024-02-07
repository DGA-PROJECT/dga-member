const parsingToken = (token) => {
  const tokenArray = token.split(".");
  return { header: tokenArray[0], payload: tokenArray[1], sig: tokenArray[2] };
};

const decodeValue = (value) => {
  return Buffer.from(value, "base64").toString("utf-8");
};

const getPureTokenValues = (token) => {
  const parsedToken = parsingToken(token);
  return {
    header: decodeValue(parsedToken.header),
    payload: decodeValue(parsedToken.payload),
    sig: decodeValue(parsedToken.sig),
  };
};

module.exports = {
  parsingToken,
  decodeValue,
  getPureTokenValues,
};
