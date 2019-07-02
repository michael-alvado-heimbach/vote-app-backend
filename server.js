'use strict';

import express from 'express';
// Middleware
import bodyParser from 'body-parser';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';
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
