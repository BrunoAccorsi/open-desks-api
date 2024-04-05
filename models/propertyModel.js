const mongoose = require('mongoose');

const { Schema } = mongoose;
// const validator = require('validator');

const propertySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A property must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'A property name cannot be more than 40 characters'],
      minLength: [10, 'A property name cannot be less than 10 characters'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // This is the reference to the User model
      required: true,
    },
    address: {
      type: String,
      required: [true, 'A property must have a address'],
    },
    neibornhood: {
      type: String,
      required: [true, 'A property must have a neibornhood'],
    },
    parkingAvailability: {
      type: Boolean,
      default: false,
    },
    publicTransitAvailability: {
      type: Boolean,
      default: false,
    },
    imageCover: {
      type: String,
      required: [true, 'A property must have an image cover'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretproperty: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

propertySchema.virtual('duratonWeeks').get(function () {
  return this.duration / 7;
});

//query middleware
propertySchema.pre(/^find/, function (next) {
  this.find({ secretproperty: { $ne: true } });
  this.start = Date.now();
  next();
});

propertySchema.post(/^find/, function (docs, next) {
  console.log(`query time ${Date.now() - this.start} ms`);
  console.log(docs);
  next();
});

//agregation middleware
propertySchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretproperty: { $ne: true } } });
  next();
});

const property = mongoose.model('Property', propertySchema);

module.exports = property;
