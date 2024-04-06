const morgan = require('morgan');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const propertyRouter = require('./routes/propertyRoutes');
const workspaceRouter = require('./routes/workspaceRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

const corsOptions = {
  origin: 'https://brunoaccorsi.github.io/opendesks/pages/', // Set to your front-end application's origin
  credentials: true, // Needed for cookies
};
app.use(cors(corsOptions));
//set security headers
app.use(helmet());

//Development only logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//limit requests from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour window
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api', limiter);

//body parser
app.use(express.json({ limit: '10kb' }));
//parse the data from cookies
app.use(cookieParser());

//data sanitization against noSQL injection
app.use(mongoSanitize());

//Data sanitization against XSS attacks
app.use(xss());

//prevent http param pollution
app.use(
  hpp({
    whitelist: ['onwerId'],
  }),
);

app.use('/api/properties', propertyRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/users', userRouter);

//route error handler
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
