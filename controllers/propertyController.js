const Property = require('../models/propertyModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

///ROUTES
exports.aliasTopProperties = async (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllProperties = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Property.find(), req.query)
    .filter()
    .sort()
    .fields()
    .paginate();
  const properties = await features.query;

  res.status(200).json({
    status: 'success',
    results: properties.length,
    data: {
      properties,
    },
  });
});

exports.getProperty = catchAsync(async (req, res, next) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return next(new AppError('Property not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      property,
    },
  });
});

exports.createProperty = catchAsync(async (req, res, next) => {
  const newProperty = await Property.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      Property: newProperty,
    },
  });
});

exports.updateProperty = catchAsync(async (req, res, next) => {
  const property = await Property.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!property) {
    return next(new AppError('Property not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      property,
    },
  });
});

exports.deleteProperty = catchAsync(async (req, res, next) => {
  const property = await Property.findByIdAndDelete(req.params.id);

  if (!property) {
    return next(new AppError('Property not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getPropertyStats = catchAsync(async (req, res, next) => {
  const stats = await Property.aggregate([
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

  const plan = await Property.aggregate([
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
        numPropertysStarts: { $sum: 1 },
        Propertys: { $push: '$name' },
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
      $sort: { numPropertysStarts: -1 },
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
