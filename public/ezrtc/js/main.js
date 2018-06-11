(function($){
  function trace(text, notification, stick) {
    var delay = (stick || notification === 'error') ? 0 : 5000
    var details
    if (typeof text === 'object') {
      details = text.details
      text = text.text
    }

    var now = (window.performance.now() / 1000).toFixed(3);
    if (details) {
      console.log(now + ': ', text, details);
    } else {
      console.log(now + ': ', text);

    }
    if (notification) {
      var notify = $.notify({
          message: text
        },
        {
          type: notification,
          animate: {
            enter: 'animated fadeInDown',
            exit: 'animated fadeOutUp'
          },
          placement: {
            from: 'top',
            align: 'center'
          },
          delay: delay,
          allow_dismiss: !stick
        });

      if (typeof stick === 'string') {
        notifies[stick] = notify;
      }
    }
  }
  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function randomString(strLength) {
    var result = [];
    strLength = strLength || 5;
    var charSet = '0123456789';
    while (strLength--) {
      result.push(charSet.charAt(Math.floor(Math.random() * charSet.length)));
    }
    return result.join('');
  }

  function onSignallingFull() {
    //room already have 2 peers -> disconnect
    trace('Room is full, please try another one.', 'danger')
    $formConnect.find('button, input').text('Connect').prop( "disabled", false )
    if (notifies['waitingPartner']) notifies['waitingPartner'].close()
    signallingSocket.close(1000, 'Room is full')
  }

  function onSignallingPair(message){
    //remote partner connected, see message.mode = master/slave
    trace('Remote partner connected', 'success')
    if (notifies['waitingPartner']) notifies['waitingPartner'].close()

    partnerId = message.partnerId;
    isMaster = message.mode === 'master';

    //peerConnection.setRemoteDescription(new RTCSessionDescription(pair.description));

    pair();

  }
  function onSignallingCandidate(message){
    //ICE candidate found -> addIceCandidate
    peerConnection.addIceCandidate(message.data)
      .then(
        function() {
          onAddIceCandidateSuccess();
        },
        function(error) {
          onAddIceCandidateError(error);
        }
      );
    trace('peerConnection ICE candidate: \n' + (message.data ?
      message.data.candidate : '(null)'));
  }

  function onAddIceCandidateSuccess() {
    trace('AddIceCandidate success.');
  }

  function onAddIceCandidateError(error) {
    trace('Failed to add Ice Candidate: ' + error.toString());
  }

  function onSignallingOffer(message){
    //SDP offer from master -> createAnswer
    var description = new RTCSessionDescription(message.data)

    peerConnection.setRemoteDescription(description);
    peerConnection.createAnswer().then(
      onSessionDescription,
      onSessionDescriptionError
    );

  }

  function onSignallingAnswer(message){
    //SDP asnwer from slave
    var description = new RTCSessionDescription(message.data)

    peerConnection.setRemoteDescription(description);
  }

  function onSignallingUnPair(message){
    //Partner manually disconnected, let's do the same
    trace('Session finished', 'warning');
    disconnect();
  }

  function onIceCandidate(event) {
    trace('Received ICE candidate: \n' + (event.candidate ?
      event.candidate.candidate : '(null)'));

    if (event.candidate) {
      signallingSocket.send(JSON.stringify({type:'candidate', data: event.candidate}));
    }
  }

  function onSessionDescription(description) {
    peerConnection.setLocalDescription(description);
    if (isMaster) {
      signallingSocket.send(JSON.stringify({type:'offer', data: description}));
    } else {
      signallingSocket.send(JSON.stringify({type:'answer', data: description}));
    }
    trace({text: isMaster ? 'Offer' : 'Answer' + ' (SDP) from peerConnection:', details: description});
  }

  function onSessionDescriptionError(error) {
    trace('Failed to create session description: ' + error.toString(), 'error');
  }

  function receiveChannelCallback(event) {
    trace('Receive Channel Callback');
    dataChannel = event.channel;
    dataChannel.onmessage = onReceiveMessageCallback;
    dataChannel.onopen = onDataChannelStateChange;
    dataChannel.onclose = onDataChannelStateChange;
  }

  function onDataChannelStateChange() {
    var readyState = dataChannel.readyState;
    if (readyState === 'open') {
      trace('Data channel state is: ' + readyState);
      $formSend.find('button, textarea').prop( "disabled", false );
      if (notifies['waitingPartner']) notifies['waitingPartner'].close()
    } else {
      trace('Data channel state is closed. Waiting for partner...', 'warning', 'waitingPartner');
      $formSend.find('button, textarea').prop( "disabled", true );
    }
  }

  function onReceiveMessageCallback(event) {
    trace('Message: ' + event.data, 'info');
  }

  function pair(){
    $formConnect.hide().find('button, input').text('Connect').prop( "disabled", false );
    $formSend.show();

    peerConnection =
      new RTCPeerConnection(PC_CONFIG, PC_CONSTRAINT);
    trace('Created peer connection object peerConnection');

    peerConnection.onicecandidate = function(e) {
      onIceCandidate(e);
    };

    if (isMaster) {
      dataChannel = peerConnection.createDataChannel('sendDataChannel',
        DATA_CONSTRAINT);
      trace('Created send data channel');

      dataChannel.onopen = onDataChannelStateChange;
      dataChannel.onclose = onDataChannelStateChange;
      dataChannel.onmessage = onReceiveMessageCallback;

      peerConnection.createOffer().then(
        onSessionDescription,
        onSessionDescriptionError
      )
    } else {
      peerConnection.ondatachannel = receiveChannelCallback;
    }
  }

  function connect() {
    $formConnect.find('button, input').text('Connecting...').prop( "disabled", true )

    roomId = $inputRoom.val();

    signallingSocket = new WebSocket((API_HTTPS ? 'wss' : 'ws') +'://'+API_HOST+'/api/connect');

    var data = {type:'pair', clientId: clientId, roomId: roomId}
    trace({text: 'Connecting to pairing server with websocket', details: data});

    signallingSocket.onopen = function(){
      trace('Connected to pairing server. Waiting for remote partner...', 'warning', 'waitingPartner');

      signallingSocket.send(JSON.stringify(data));
    }

    signallingSocket.onmessage = function(e){
      trace({text: 'Received message from pairing server', details: e.data});
      var message = JSON.parse(e.data)

      switch (message.type) {
        case 'full':
          onSignallingFull();
          break;
        case 'pair':
          onSignallingPair(message);
          break;
        case 'candidate':
          onSignallingCandidate(message)
          break;
        case 'offer':
          onSignallingOffer(message);
          break;
        case 'answer':
          onSignallingAnswer(message);
          break;
        case 'unpair':
          onSignallingUnPair(message);
          break;

      }
      //if (pair.clientId && pair.description) onPairFound(pair);
    }

    signallingSocket.onclose = function(e){
      if (!e.reason) {
        trace('Signalling WebSocket was closed', 'warning')
      }
      $formConnect.find('button, input').text('Connect').prop( "disabled", false )
      if (notifies['waitingPartner']) notifies['waitingPartner'].close()
    }

    //TODO: handling of socket.onclose
  }

  function send() {
    var message = $inputMessage.val();
    if (dataChannel.readyState === 'open') dataChannel.send(message);
  }

  function disconnect(){
    peerConnection.close();
    signallingSocket.close(1000, 'Manually closed');
    $formSend.hide();
    $formConnect.show();
  }

  var API_HTTPS = true,
      API_HOST = 'lab.alekseykarpenko.com',
      //API_HOST = 'localhost:8080',
      PC_CONFIG = {},
      PC_CONSTRAINT = null,
      DATA_CONSTRAINT = null;

  var $formConnect = $('form[data-id="form-connect"]'),
    $formSend = $('form[data-id="form-send"]'),
    $inputRoom = $('#inputRoom'),
    $inputMessage = $('#inputMessage'),
    $disconnectButton = $('#disconnect');

  var notifies = {}

  var peerConnection, signallingSocket, dataChannel

  var roomId,
    clientId = sessionStorage.getItem('clientId'),
    partnerId = null,
    isMaster = null


  if (!clientId) {
    clientId = uuidv4()
    sessionStorage.setItem('clientId', clientId)
  }

  $(document).ready(function(){
    $formConnect.on('submit', function(e){
      connect();
      e.preventDefault()
    })
    $formSend.on('submit', function(e){
      send();
      e.preventDefault()
    })
    $disconnectButton.on('click', function() {
      signallingSocket.send(JSON.stringify({type: 'unpair'}))
      disconnect()
    });
  })

})(jQuery)
