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
  function closeNotification(id) {
    if (id === 'all') {
      for(var key in notifies) {
        notifies[key].close()
        delete notifies[key]
      }
    } else {
      if (notifies[id]) {
        notifies[id].close()
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
    closeNotification('waitingPartner');
    signallingSocket.close(1000, 'Room is full')
  }

  function onSignallingPair(message){
    //remote partner connected, see message.mode = master/slave
    trace('Remote partner connected', (message.reconnect ? null : 'success'))

    partnerId = message.partnerId;
    isMaster = message.mode === 'master';

    pair()

  }
  function onSignallingCandidate(message){
    //ICE candidate found -> addIceCandidate
    console.log(peerConnection);
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
    //Partner manually disconnected, let's do the same (?)
    trace('Remote partner manually disconnected', 'warning');
    //disconnect();
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
    trace('Failed to create session description: ' + error.toString(), 'danger');
  }

  function receiveChannelCallback(event) {
    trace({text:'Created data channel from callback', details: event.channel});
    dataChannel = event.channel;
    dataChannel.onmessage = onReceiveMessageCallback;
    dataChannel.onopen = onDataChannelStateChange;
    dataChannel.onclose = onDataChannelStateChange;
  }

  function onDataChannelStateChange() {
    if (!dataChannel) return;
    var readyState = dataChannel.readyState;
    if (readyState === 'open') {
      trace('Data channel state is: ' + readyState);
      $formSend.find('button[type=submit], textarea').prop( "disabled", false );
      closeNotification('all');
    } else {
      trace('Data channel state is closed. Waiting for partner...', 'warning', 'waitingPartner');
      $formSend.find('button[type=submit], textarea').prop( "disabled", true );
    }
  }

  function onReceiveMessageCallback(event) {
    trace('Message: ' + event.data, 'info');
  }

  function pair(){
    $formConnect.hide().find('button, input').text('Connect').prop( "disabled", false );
    $formSend.show().find('button[type=submit], textarea').prop( "disabled", true );

    peerConnection =
      new RTCPeerConnection(PC_CONFIG, PC_CONSTRAINT);
    trace('Created peer connection object peerConnection');

    peerConnection.onicecandidate = function(e) {
      onIceCandidate(e);
    };

    if (isMaster) {
      dataChannel = peerConnection.createDataChannel('sendDataChannel',
        DATA_CONSTRAINT);
      trace({text: 'Created data channel as master', details: dataChannel});

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

  function signallingConnect(data){
    closeNotification('all');
    trace({text: 'Connecting to pairing server with websocket', details: data});

    signallingSocket = new WebSocket((API_HTTPS ? 'wss' : 'ws') +'://'+API_HOST+'/api/connect');

    signallingSocket.onopen = function(){
      closeNotification('waitingReconnect');

      trace('Connected to pairing server. Waiting for remote partner...', 'warning', 'waitingPartner');

      signallingSocket.send(JSON.stringify(data));
    }

    signallingSocket.onmessage = function(e){
      var message = JSON.parse(e.data)
      trace({text: 'Received message from pairing server', details: message});


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
        trace({text: 'Signalling WebSocket was closed. Trying to reconnect...', details: e}, 'warning', 'waitingReconnect')

        data.reconnect = true;
        setTimeout(function(){signallingConnect(data)}, 3000);
      }
      $formConnect.find('button, input').text('Connect').prop( "disabled", false )
      closeNotification('waitingPartner');
    }
  }

  function connect() {
    $formConnect.find('button, input').text('Connecting...').prop( "disabled", true )

    roomId = $inputRoom.val();


    var data = {type:'pair', clientId: clientId, roomId: roomId}
    signallingConnect(data);
  }

  function send() {
    var message = $inputMessage.val();
    if (dataChannel && dataChannel.readyState === 'open') dataChannel.send(message);
  }

  function disconnect(){
    peerConnection.close();
    signallingSocket.close(1000, 'Manually closed');
    $formSend.hide();
    $formConnect.show();
    closeNotification('all');
    peerConnection = null;
    signallingSocket = null;
    dataChannel = null;
    partnerId = null;
    isMaster = null;

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
    isMaster = null,
    isSafari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/)


  if (!clientId) {
    clientId = uuidv4()
    sessionStorage.setItem('clientId', clientId)
  }

  $(document).ready(function(){
    $formConnect.on('submit', function(e){
      // HACK FOR SAFARI @see https://bugs.webkit.org/show_bug.cgi?id=173052
      if (isSafari) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(function(stream) {
            trace({text:'User granted access to audio/video', details: stream})

            connect()
          })
      } else {
        connect()
      }
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
