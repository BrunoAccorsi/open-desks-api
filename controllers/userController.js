const multer = require('multer');
const sharp = require('sharp');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const Workspace = require('../models/workspaceModel');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const filterObj = (obj, ...allowedFields) => {
  Object.keys(obj).forEach((key) => {
    const newObj = {};
    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });
};

exports.uploadUserPhoto = upload.single('photo');
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.fileName = `workspace-${req.params.id}-${Date.now()}.jpeg`;

  //this lib handles images processing
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.fileName}`);

  next();
});

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

  if (req.file) req.body.photo = req.file.filename;

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

exports.getRentedWorkspaces = catchAsync(async (req, res, next) => {
  const rentedWorkspaces = await Workspace.aggregate([
    { $unwind: '$bookedDates' },
    { $match: { 'bookedDates.userId': mongoose.Types.ObjectId(req.user.id) } },
    {
      $group: {
        _id: '$_id',
        doc: { $first: '$$ROOT' },
        bookedDates: { $push: '$bookedDates' },
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: ['$$ROOT.doc', { bookedDates: '$bookedDates' }],
        },
      },
    },
  ]);

  if (!rentedWorkspaces.length) {
    return next(new AppError('No rented workspaces found', 404));
  }

  const data = rentedWorkspaces.flatMap((workspace) =>
    workspace.bookedDates.map((date) => ({
      id: workspace._id,
      startDate: date.startDate,
      endDate: date.endDate,
      leaseTermType: workspace.leaseTermType,
      seatingCapacity: workspace.seatingCapacity,
      workspaceType: workspace.workspaceType,
    })),
  );

  res.status(200).json({
    status: 'success',
    data: data,
  });
});
