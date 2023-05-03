const mongoose = require('mongoose');
const argon2 = require('argon2');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'superuser', 'client', 'guest'],
    default: 'user',
  },
  units: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Unit',
    default: [],
  },
  permissions: {
    type: Map,
    of: Boolean,
    default: {
      stopengine: false,
      maintenances: true,
      alerts: true,
      reports: true,
      commands: false,
      overlays: true,
      active: true
    },
  }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const hashedPassword = await argon2.hash(this.password);

  this.password = hashedPassword;
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return argon2.verify(this.password, candidatePassword);
};

const User = mongoose.model('User', userSchema);

module.exports = User;