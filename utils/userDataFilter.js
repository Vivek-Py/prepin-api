const _ = require("lodash");

const userDataFilter = (result) => {
  return _.pick(result, [
    "id",
    "firstName",
    "lastName",
    "email",
    "bio",
    "image",
    "sessionsAttended",
    "tags",
  ]);
};

module.exports = userDataFilter;
