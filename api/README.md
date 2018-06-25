# /api
Signaling server for WebRTC connection between 2 remote partners using WebSocket

## Signaling API
Endpoint for WebSocket connection: `wss://[host]/api/connect`

## Signaling Request Messages
### Connect partner
```javascript
  {
    "type":"pair",
    "clientId": "02e77d3f-1847-4669-8464-6a78dfdfb11e", // uuid4 of current client
    "roomId": "12345" 
  }
```
### Send ICE Candidate to remote partner 
```javascript
  {
    "type": "candidate",
    "data": {
        "candidate": "candidate:919398615 1 udp 2122260223 10.1.203.158 58199 typ host generation 0 ufrag e5rp network-id 2 network-cost 10",
        "sdpMid": "data",
        "sdpMLineIndex": 0
      }
  }
```
### Send SDP offer to slave
```javascript
  {
      "type": "offer",
      "data": {
        "sdp": "v=0\r\no=- 3222060955967055513 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE data\r\na=msid-semantic: WMS\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:BcR9\r\na=ice-pwd:ZUHx2Fra0ezrUTZghpCTATnL\r\na=ice-options:trickle\r\na=fingerprint:sha-256 AB:26:84:E0:44:22:A2:DE:97:E3:82:91:25:5A:E4:2E:C5:1C:9D:BE:71:3B:69:28:B3:6E:82:1B:E4:28:2E:8A\r\na=setup:actpass\r\na=mid:data\r\na=sctpmap:5000 webrtc-datachannel 1024\r\n",
        "type": "offer"
      }
    }
```
### Send SDP answer to master
```javascript
  {
      "type": "answer",
      "data": {
        "sdp": "v=0\r\no=- 2599311244437294424 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE sdparta_0\r\na=msid-semantic: WMS\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\nb=AS:30\r\na=ice-ufrag:6NHw\r\na=ice-pwd:0/PkZAyX0JtrTlzFfF0aq6Mn\r\na=ice-options:trickle\r\na=fingerprint:sha-256 37:BA:B4:60:CF:50:82:3B:3F:E7:92:BD:7A:02:0C:7B:EA:1A:19:59:3F:5C:74:5E:D1:C8:3F:4C:A0:E9:2C:EE\r\na=setup:active\r\na=mid:sdparta_0\r\na=sctpmap:5000 webrtc-datachannel 1024\r\n",
        "type": "answer"
      }
    }
```
### Manual disconnect
```javascript
  {
    "type":"unpair"
  }
```

## Signaling Broadcast Messages
### New partner connected
```javascript
  {
    "type":"pair",
    "mode":"master", // your mode will be: master or slave
    "partnerId": "02e77d3f-1847-4669-8464-6a78dfdfb11e", // uuid4 of remote partner
    "roomId": "12345"
  }
```
### Received ICE Candidate from remote partner
```javascript
  {
    "type": "candidate",
    "data": {
        "candidate": "candidate:919398615 1 udp 2122260223 10.1.203.158 58199 typ host generation 0 ufrag e5rp network-id 2 network-cost 10"
        "sdpMid": "data",
        "sdpMLineIndex": 0
      }
  }
```
### Received SDP offer from master
```javascript
  {
    "type": "offer",
    "data": {
      "sdp": "v=0\r\no=- 3222060955967055513 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE data\r\na=msid-semantic: WMS\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:BcR9\r\na=ice-pwd:ZUHx2Fra0ezrUTZghpCTATnL\r\na=ice-options:trickle\r\na=fingerprint:sha-256 AB:26:84:E0:44:22:A2:DE:97:E3:82:91:25:5A:E4:2E:C5:1C:9D:BE:71:3B:69:28:B3:6E:82:1B:E4:28:2E:8A\r\na=setup:actpass\r\na=mid:data\r\na=sctpmap:5000 webrtc-datachannel 1024\r\n",
      "type": "offer"
    }
  }
```
### Received SDP answer from slave
```javascript
  {
    "type": "answer",
    "data": {
      "sdp": "v=0\r\no=- 2599311244437294424 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE sdparta_0\r\na=msid-semantic: WMS\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\nb=AS:30\r\na=ice-ufrag:6NHw\r\na=ice-pwd:0/PkZAyX0JtrTlzFfF0aq6Mn\r\na=ice-options:trickle\r\na=fingerprint:sha-256 37:BA:B4:60:CF:50:82:3B:3F:E7:92:BD:7A:02:0C:7B:EA:1A:19:59:3F:5C:74:5E:D1:C8:3F:4C:A0:E9:2C:EE\r\na=setup:active\r\na=mid:sdparta_0\r\na=sctpmap:5000 webrtc-datachannel 1024\r\n",
      "type": "answer"
    }
  }
```
### Room is full
```javascript
  {
    "type":"full"
  }
```
### Remote partner manually disconnected
```javascript
  {
    "type":"unpair"
  }
```
