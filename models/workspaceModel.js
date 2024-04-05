const mongoose = require('mongoose');

const { Schema } = mongoose;
// const validator = require('validator');

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A workspace must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'A workspace name cannot be more than 40 characters'],
      minLength: [10, 'A workspace name cannot be less than 10 characters'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    type: {
      type: String,
      enum: ['desk', 'meeting-room', 'private_office'],
      required: true,
    },
    price: Number,
    bookedDates: [
      {
        startDate: Date,
        endDate: Date,
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    leaseTerm: {
      type: String,
      enum: ['day', 'week', 'month'],
      default: 'coworker',
      required: true,
    },
    isSmokingAllowed: {
      type: Boolean,
      default: false,
    },
    places: {
      type: Number,
      required: true,
    },
    available: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: 'user-default.jpg',
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

workspaceSchema.post(/^find/, function (docs, next) {
  console.log(`query time ${Date.now() - this.start} ms`);
  console.log(docs);
  next();
});

//agregation middleware
workspaceSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretworkspace: { $ne: true } } });
  next();
});

const workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = workspace;
