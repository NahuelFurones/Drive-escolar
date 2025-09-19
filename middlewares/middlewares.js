const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');

module.exports = function(app) {
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(session({ secret: 'tu_secreto', resave: false, saveUninitialized: false }));
  app.use(helmet());
  app.use(express.static(path.join(__dirname, 'public')));
};