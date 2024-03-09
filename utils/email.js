const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  //create transporer
  const transporter = nodemailer.createTransport({
    // service: 'Gmail',
    // auth: {
    //   user: process.env.GMAIL_USER,
    //   pass: process.env.GMAIL_PASSWORD,
    // },

    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  // define email options
  const mailOptions = {
    from: 'Bruno Accorsi Bergoli <b.bergoli@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
  //Actually send email
};

module.exports = sendEmail;
