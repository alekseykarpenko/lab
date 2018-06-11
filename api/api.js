#!/usr/bin/env nodejs
var express = require("express");
var expressWs = require('express-ws');
var bodyParser = require("body-parser");

var expressWs = expressWs(express());
var app = expressWs.app;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api", function(req, res) {
  res.status(200).send("Welcome to API ;)))");
});

var signallingWss = expressWs.getWss('/api/connect')

function getPartners(ws){
  return [...signallingWss.clients].filter((client) => {
    return client.readyState && client !== ws && client.roomId === ws.roomId
  })
}

function onMessagePair(ws, message){
  //remote partner connected
  ws.clientId = message.clientId;
  ws.roomId = message.roomId;
  let partners = getPartners(ws)

  if (partners && partners.length) {
    if (partners.length > 1) {
      ws.send(JSON.stringify({type: 'full'}))
    } else {
      partners[0].send(JSON.stringify({type: 'pair', mode: 'master', partnerId: ws.clientId}));
      ws.send(JSON.stringify({type: 'pair', mode: 'slave', partnerId: partners[0].clientId}))
    }
  }

}
function onMessageCandidate(ws, message){
  //ICE candidate found
  let partner = getPartners(ws)[0]

  if (partner) {
    partner.send(JSON.stringify({type: 'candidate', data: message.data}));
  }
}

function onMessageOffer(ws, message){
  //SDP offer from master -> createAnswer
  let partner = getPartners(ws)[0]

  if (partner) {
    partner.send(JSON.stringify({type: 'offer', data: message.data}));
  }
}

function onMessageAnswer(ws, message){
  //SDP asnwer from slave
  let partner = getPartners(ws)[0]

  if (partner) {
    partner.send(JSON.stringify({type: 'answer', data: message.data}));
  }
}

function onMessageUnPair(ws){
  //SDP asnwer from slave
  let partner = getPartners(ws)[0]

  if (partner) {
    partner.send(JSON.stringify({type: 'unpair'}));
  }
}

app.ws('/api/connect', function(ws, req){
  ws.on('message', function(msg){
    console.log("Message:", msg);

    var message = JSON.parse(msg);

    switch (message.type) {
      case 'pair':
        onMessagePair(ws, message);
        break;
      case 'candidate':
        onMessageCandidate(ws, message);
        break;
      case 'offer':
        onMessageOffer(ws, message);
        break;
      case 'answer':
        onMessageAnswer(ws, message);
        break;
      case 'unpair':
        onMessageUnPair(ws, message);
        break;
    }
  })

  ws.on('close', function(){
    console.log('WebSocket connection was closed')
  })
})


var server = app.listen(8080, '127.0.0.1', function () {
  console.log("Server running at:", server.address().port);
});
