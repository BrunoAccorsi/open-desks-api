const multer = require('multer');
const sharp = require('sharp');
const moment = require('moment');
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
  if (!req.files || !req.files.imageCover || !req.files.images) return next();

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

  const unavailableDates = [];
  workspace.bookedDates.forEach((bookedDate) => {
    const startDate = moment(bookedDate.startDate);
    const endDate = moment(bookedDate.endDate);
    const datesInRange = [];
    while (startDate.isSameOrBefore(endDate)) {
      datesInRange.push(startDate.format('YYYY-MM-DD'));
      startDate.add(1, 'day');
    }
    unavailableDates.push(...datesInRange);
  });

  res.status(200).json({
    status: 'success',
    data: {
      workspace,
      unavailableDates,
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

exports.rentWorkspace = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findById(req.params.id);

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  const startDate = moment(req.body.start, 'YYYY-MM-DD');
  const endDate = moment(startDate).add(
    req.body.quantity,
    workspace.leaseTermType,
  );

  const totalPrice = workspace.price * req.body.quantity;

  // Check if the endDate intersects with another bookedDate
  const intersectingDates = workspace.bookedDates.filter(
    (bookedDate) =>
      moment(startDate).isBetween(
        bookedDate.startDate,
        bookedDate.endDate,
        undefined,
        '[]',
      ) ||
      moment(endDate).isBetween(
        bookedDate.startDate,
        bookedDate.endDate,
        undefined,
        '[]',
      ) ||
      moment(bookedDate.startDate).isBetween(
        startDate,
        endDate,
        undefined,
        '[]',
      ) ||
      moment(bookedDate.endDate).isBetween(startDate, endDate, undefined, '[]'),
  );

  if (intersectingDates.length > 0) {
    return next(
      new AppError(
        'The selected dates are not available. Please choose different dates.',
        400,
      ),
    );
  }

  workspace.bookedDates.push({
    startDate: startDate.toDate(),
    endDate: endDate.toDate(),
    userId: req.user.id,
  });
  await workspace.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      startDate,
      endDate,
      totalPrice,
      leaseTermType: workspace.leaseTermType,
      seatingCapacity: workspace.seatingCapacity,
      workspaceType: workspace.workspaceType,
    },
  });
});

exports.getRentedWorkspaces = catchAsync(async (req, res, next) => {
  // match the userId with the requesting user's ID, and then group the results back.
  const rentedWorkspaces = await Workspace.aggregate([
    { $unwind: '$bookedDates' }, // Split the document per bookedDate entry
    { $match: { 'bookedDates.userId': req.user.id } }, // Find entries where bookedDates.userId matches the user's ID
    {
      $group: {
        _id: '$_id', // Group by the workspace ID to recombine the entries
        doc: { $first: '$$ROOT' }, // Use the first document as the root
        bookedDates: { $push: '$bookedDates' }, // Push matched bookedDates into an array
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

  const data = rentedWorkspaces.map((workspace) => ({
    id: workspace._id,
    startDate: workspace.bookedDates.map((date) => date.startDate),
    endDate: workspace.bookedDates.map((date) => date.endDate),
    leaseTermType: workspace.leaseTermType,
    seatingCapacity: workspace.seatingCapacity,
    workspaceType: workspace.workspaceType,
  }));

  res.status(200).json({
    status: 'success',
    data: data,
  });
});
