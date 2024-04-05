const mongoose = require('mongoose');

const { Schema } = mongoose;
// const validator = require('validator');

const propertySchema = new mongoose.Schema(
  {
    buildingName: {
      type: String,
      required: [true, 'A property must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'A property name cannot be more than 40 characters'],
      minLength: [5, 'A property name cannot be less than 5 characters'],
    },
    workspaceTypes: {
      type: [String],
      enum: ['desk', 'meeting_room', 'private_office'],
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
    neighborhood: {
      type: String,
      required: [true, 'A property must have a neighborhood'],
    },
    hasParkingGarage: {
      type: Boolean,
      default: false,
    },
    hasPublicTransportNearBy: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      required: [true, 'A property must have an image cover'],
    },
    squareFeet: {
      type: Number,
      required: [true, 'A property must have a square feet'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
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
