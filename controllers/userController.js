const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const filterObj = (obj, ...allowedFields) => {
  Object.keys(obj).forEach((key) => {
    const newObj = {};
    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

exports.createUser = (req, res) => {
  res
    .status(500)
    .json({ status: 'error', message: 'This route is not implemented' });
};

exports.updateUsers = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirmation) {
    return next(
      new AppError('This route is not used for password update', 400),
    );
  }

  //filter out unwanted fields from the request body
  const filteredBody = filterObj(req.body, ['name', 'email', 'photo']);
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.getUser = (req, res) => {
  res
    .status(500)
    .json({ status: 'error', message: 'This route is not implemented' });
};

exports.updateUser = (req, res) => {
  res
    .status(500)
    .json({ status: 'error', message: 'This route is not implemented' });
};

exports.deleteUser = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
