/*
 * asana-api.js: Top-level include for the `asana-api` module.
 *
 * (C) 2012 Charlie Robbins
 *
 */

var Client = require('./asana-api/client').Client;

exports.createClient = function (options) {
  return new Client(options); 
};