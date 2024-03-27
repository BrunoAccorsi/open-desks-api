const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A User must have a name'],
    trim: true,
    maxLength: [40, 'A User name cannot be more than 40 characters'],
    minLength: [10, 'A User name cannot be less than 10 characters'],
  },
  email: {
    type: String,
    required: [true, 'A User must have an email'],
    unique: true,
    trim: true,
    lowerCase: true,
    maxLength: [40, 'A User email cannot be more than 40 characters'],
    minLength: [10, 'A User email cannot be less than 10 characters'],
    validate: [validator.isEmail, 'A User email is not valid'],
  },
  photo: {
    type: String,
    default: 'user-default.jpg',
  },
  role: {
    type: String,
    enum: ['coworker', 'owner', 'admin'],
    default: 'coworker',
  },
  password: {
    type: String,
    required: [true, 'A User must have a password'],
    trim: true,
    minLength: [8, 'A User password must be at least 8 characters'],
    select: false,
  },
  // passwordConfirmation: {
  //   type: String,
  //   required: [true, 'Please confirm your password'],
  //   validate: {
  //     validator: function (el) {
  //       // This only works on CREATE and SAVE!!!
  //       return el === this.password;
  //     },
  //     message: 'Passwords are not the same!',
  //   },
  // },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirmation = undefined;

  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });

  next();
});

userSchema.methods.isCorrectPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPassword = async function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimeStamp < changedTimeStamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
