'use strict';
const _ = require('lodash');

/**
 * pass through the user (from req.user) if it's a person,
 * or return a user object for api keys
 * @param  {object} [user]
 * @return {object}
 */
module.exports = function userOrRobot(user) {
  if (user && _.get(user, 'username') && _.get(user, 'provider')) {
    return user;
  } else {
    // no actual user, this was an api key
    return {
      username: 'robot',
      provider: 'clay',
      imageUrl: 'kiln-clay-avatar', // kiln will supply a clay avatar
      name: 'Clay',
      auth: 'admin'
    };
  }
};
