const User = require('../models/user');

async function createUser(user_data) {
  const user = new User(user_data);
  await user.save();
  return user;
}

async function findUserByUsername(username) {
  return await User.findOne({ username });
}
async function findUserByEmail(email) {
  return await User.findOne({ email });
}

async function findUserById(id) {
  return await User.findById(id);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
};