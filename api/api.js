#!/usr/bin/env nodejs
var express = require("express");
var bodyParser = require("body-parser");
const storage = require('node-persist');

//you must first call storage.init
storage.initSync( /* options ... */ );

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api", function(req, res) {
  res.status(200).send("Welcome to our restful API");
});

app.post("/api/connect/", function(req, res) {
  var partner = storage.getItemSync(req.query.room)

  if (partner) {
    if (partner === req.query.candidate) {
      partner = null
    }
  } else {
    storage.setItemSync(req.query.room,req.query.candidate)
    partner = null
  }

  res.status(200).send({
    status: 'ok',
    room: req.query.room,
    partner: partner
  });

});


var server = app.listen(8080, '127.0.0.1', function () {
  console.log("Server running at:", server.address().port);
});
