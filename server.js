'use strict';

const express = require('express');
// Middleware
const bodyParser = require('body-parser');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
// Constants
const app = express();
const port = 8080;
const host = 'localhost';

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('dev'));
app.use(cors());

// API Route
require('./modules/route')(app);

app.listen(port, host, () => {
    console.log(`Running on http://${host}:${port}`);
});

module.exports = app;
