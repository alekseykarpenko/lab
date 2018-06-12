(function($){
  //
  // Utility Functions
  //

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
        if (notifies[stick]) notifies[stick].close();

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
  function randomString(strLength) {
    var result = [];
    strLength = strLength || 5;
    var charSet = '0123456789';
    while (strLength--) {
      result.push(charSet.charAt(Math.floor(Math.random() * charSet.length)));
    }
    return result.join('');
  }

  //
  // Signaling Events
  // ------------------------------------

  /**
   * Remote room is full (should be only 2 peers)
   */
  function onRemoteFull() {
    //room already have 2 peers -> disconnect
    trace('Room is full, please try another one.', 'danger')
    $formConnect.find('button, input').prop( "disabled", false ).filter('[type=submit]').text('Connect');
    closeNotification('waitingPartner');
    signallingSocket.close(1000, 'Room is full')
  }

  /**
   * Remote partner connected
   * @param message {{partnerId:{string},isMaster:{boolean},reconnect:{boolean}}}
   */
  function onRemotePair(message){
    //remote partner connected, see message.mode = master/slave
    trace('Remote partner connected', (message.reconnect ? null : 'success'))

    partnerId = message.partnerId;
    isMaster = message.mode === 'master';

    pair()
  }

  /**
   * New ICE Candidate delivered from the partner
   * @param message
   */
  function onRemoteCandidate(message){
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

  /**
   * SDP Offer from master (received if u're in slave mode)
   * @param message
   */
  function onRemoteOffer(message){
    var description = new RTCSessionDescription(message.data)

    peerConnection.setRemoteDescription(description);
    peerConnection.createAnswer().then(
      onSessionDescription,
      onSessionDescriptionError
    );
  }

  /**
   * SDP Answer from slave (received if u're in master mode)
   * @param message
   */
  function onRemoteAnswer(message){
    var description = new RTCSessionDescription(message.data)

    peerConnection.setRemoteDescription(description);
  }

  /**
   * Partner manually disconnected, let's do the same (?)
   * @param message
   */
  function onRemoteUnPair(message){
    trace('Remote partner manually disconnected', 'warning');
    //disconnect();
  }

  //
  // WebRTC Events
  //

  /**
   * New ICE Candidate should be send to the partner
   * @param event {RTCPeerConnectionIceEvent}
   */
  function onIceCandidate(event) {
    trace('Received ICE candidate: \n' + (event.candidate ?
      event.candidate.candidate : '(null)'));

    if (event.candidate) {
      signallingSocket.send(JSON.stringify({type:'candidate', data: event.candidate}));
    }
  }

  /**
   * Successfully added ICE candidate
   */
  function onAddIceCandidateSuccess() {
    trace('AddIceCandidate success.');
  }

  function onAddIceCandidateError(error) {
    trace('Failed to add Ice Candidate: ' + error.toString());
  }

  /**
   * Successfully retrieved SDP
   * @param description
   */
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

  /**
   * Data channel received from master (if u're in slave mode)
   * @param event {RTCDataChannelEvent}
   */
  function onReceiveDataChannel(event) {
    trace({text:'Created data channel from callback', details: event.channel});
    dataChannel = event.channel;
    dataChannel.onmessage = onReceiveMessage;
    dataChannel.onopen = onChannelStateChange;
    dataChannel.onclose = onChannelStateChange;
  }

  /**
   * Data Channel state changed (onopen/onclose)
   */
  function onChannelStateChange() {
    if (!dataChannel) return;
    var readyState = dataChannel.readyState;
    if (readyState === 'open') {
      trace('Data channel state is: ' + readyState);
      $formSend.find('button[type=submit], input').prop( "disabled", false );
      closeNotification('all');
    } else {
      trace('Data channel state is closed. Waiting for partner...', 'warning', 'waitingPartner');
      $formSend.find('button[type=submit], input').prop( "disabled", true );
    }
  }

  /**
   * Message received via RTCDataChannel
   * @param event {MessageEvent}
   */
  function onReceiveMessage(event) {
    trace('Message: ' + event.data, 'info');
  }

  //
  // App Methods
  //

  /**
   * Create p2p connection with RTCPeerConnection
   */
  function pair(){
    $formConnect.hide().find('button, input').prop( "disabled", false ).filter('[type=submit]').text('Connect');;
    $formSend.show().find('button[type=submit], input').prop( "disabled", true );

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

      dataChannel.onopen = onChannelStateChange;
      dataChannel.onclose = onChannelStateChange;
      dataChannel.onmessage = onReceiveMessage;

      peerConnection.createOffer().then(
        onSessionDescription,
        onSessionDescriptionError
      )
    } else {
      peerConnection.ondatachannel = onReceiveDataChannel;
    }
  }

  /**
   * Connect to signaling server with Websocket
   * @param data
   */
  function signalingConnect(data){
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
          onRemoteFull();
          break;
        case 'pair':
          onRemotePair(message);
          break;
        case 'candidate':
          onRemoteCandidate(message)
          break;
        case 'offer':
          onRemoteOffer(message);
          break;
        case 'answer':
          onRemoteAnswer(message);
          break;
        case 'unpair':
          onRemoteUnPair(message);
          break;

      }
      //if (pair.clientId && pair.description) onPairFound(pair);
    }

    signallingSocket.onclose = function(e){
      if (!e.reason) {
        trace({text: 'Signalling WebSocket was closed. Trying to reconnect...', details: e}, 'warning', 'waitingReconnect')

        data.reconnect = true;
        setTimeout(function(){signalingConnect(data)}, 3000);
      }
      $formConnect.find('button, input').prop( "disabled", false ).filter('[type=submit]').text('Connect');
      closeNotification('waitingPartner');
    }
  }

  /**
   * Start connection procedure
   */
  function connect() {
    $formConnect.find('button, input').prop( "disabled", true ).filter('[type=submit]').text('Connecting...')

    roomId = $inputRoom.val();


    var data = {type:'pair', clientId: clientId, roomId: roomId}
    signalingConnect(data);
  }

  /**
   * Send message through RTCDataChannel
   */
  function send(message) {
    if (dataChannel && dataChannel.readyState === 'open' && message) dataChannel.send(message);
  }

  /**
   * Manual disconnect with closing both signaling & p2p connections
   */
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

  //
  // Configuration and Variables
  //

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
    $disconnectButton = $('#disconnect'),
    $randomButton = $('#random');

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
      send($inputMessage.val());
      $inputMessage.val('')
      e.preventDefault()
    })
    $disconnectButton.on('click', function() {
      signallingSocket.send(JSON.stringify({type: 'unpair'}))
      disconnect()
    });
    $randomButton.on('click', function() {
      $inputRoom.val(randomString(6))
    });
  })

})(jQuery)
