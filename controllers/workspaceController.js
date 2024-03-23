const multer = require('multer');
const sharp = require('sharp');
const Workspace = require('../models/workspaceModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/workspaces');
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `workspace-${req.params.id}-${Date.now()}.${ext}`);
  },
});

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

exports.uploadWorkspaceImage = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeWorkspaceImages = async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  req.body.imageCover = `workspace-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/workspaces/${req.body.imageCover}`);

  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, index) => {
      const fileName = `workspace-${req.params.id}-${Date.now()}-${index + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/workspaces/${fileName}`);

      req.body.images.push(fileName);
    }),
  );

  next();
};

exports.getAllWorkspaces = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Workspace.find(), req.query)
    .filter()
    .sort()
    .fields()
    .paginate();
  const workspace = await features.query;

  res.status(200).json({
    status: 'success',
    results: workspace.length,
    data: {
      workspace,
    },
  });
});

exports.getWorkspace = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findById(req.params.id);

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      workspace,
    },
  });
});

exports.createWorkspace = catchAsync(async (req, res, next) => {
  const newWorkspace = await Workspace.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      workspace: newWorkspace,
    },
  });
});

exports.updateWorkspace = catchAsync(async (req, res, next) => {
  if (req.file) req.body.imageCover = req.file.filename;
  const workspace = await Workspace.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      workspace,
    },
  });
});

exports.deleteWorkspace = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findByIdAndDelete(req.params.id);

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getWorkspacetats = catchAsync(async (req, res, next) => {
  const stats = await Workspace.aggregate([
    {
      $match: {
        ratingsAverage: {
          $gte: 4.5,
        },
      },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        num: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        averageRating: { $avg: '$ratingsAverage' },
        averagePrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = parseInt(req.params.year, 10);

  const plan = await Workspace.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: {
          $month: '$startDates',
        },
        numWorkspaceStarts: { $sum: 1 },
        Workspace: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numWorkspaceStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});
