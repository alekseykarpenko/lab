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
    "sdp": "v=0\r\no=mozilla...THIS_IS_SDPARTA-60.0.1 5751569431645675269 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=fingerprint:sha-256 49:FE:A4:D5:95:2E:A6:7B:DD:B4:84:43:E5:FA:99:49:18:E7:19:4D:98:D8:70:4D:AC:5F:BD:39:03:35:FA:61\r\na=group:BUNDLE sdparta_0\r\na=ice-options:trickle\r\na=msid-semantic:WMS *\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\na=sendrecv\r\na=ice-pwd:49a707f4b59a45a79ed94105c5dcff9b\r\na=ice-ufrag:2a597dd7\r\na=mid:sdparta_0\r\na=sctpmap:5000 webrtc-datachannel 256\r\na=setup:actpass\r\na=max-message-size:1073741823\r\n"
  }
```
### Send SDP answer to master
```javascript
  {
    "type": "answer",
    "sdp": "v=0\r\no=mozilla...THIS_IS_SDPARTA-60.0.1 1313851118965678380 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=fingerprint:sha-256 74:CD:B1:F0:62:20:1A:4E:9D:AE:91:9B:4A:02:30:CD:7A:8A:A9:65:C3:7F:81:36:75:F8:F9:E5:6B:D3:44:8B\r\na=group:BUNDLE data\r\na=ice-options:trickle\r\na=msid-semantic:WMS *\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\na=sendrecv\r\na=ice-pwd:5f857ab5642cd24cc7ef8190ab0db8b2\r\na=ice-ufrag:b841a2ac\r\na=mid:data\r\na=sctpmap:5000 webrtc-datachannel 256\r\na=setup:active\r\na=max-message-size:1073741823\r\n"
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
    "sdp": "v=0\r\no=mozilla...THIS_IS_SDPARTA-60.0.1 5751569431645675269 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=fingerprint:sha-256 49:FE:A4:D5:95:2E:A6:7B:DD:B4:84:43:E5:FA:99:49:18:E7:19:4D:98:D8:70:4D:AC:5F:BD:39:03:35:FA:61\r\na=group:BUNDLE sdparta_0\r\na=ice-options:trickle\r\na=msid-semantic:WMS *\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\na=sendrecv\r\na=ice-pwd:49a707f4b59a45a79ed94105c5dcff9b\r\na=ice-ufrag:2a597dd7\r\na=mid:sdparta_0\r\na=sctpmap:5000 webrtc-datachannel 256\r\na=setup:actpass\r\na=max-message-size:1073741823\r\n"
  }
```
### Received SDP answer from slave
```javascript
  {
    "type": "answer",
    "sdp": "v=0\r\no=mozilla...THIS_IS_SDPARTA-60.0.1 1313851118965678380 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=fingerprint:sha-256 74:CD:B1:F0:62:20:1A:4E:9D:AE:91:9B:4A:02:30:CD:7A:8A:A9:65:C3:7F:81:36:75:F8:F9:E5:6B:D3:44:8B\r\na=group:BUNDLE data\r\na=ice-options:trickle\r\na=msid-semantic:WMS *\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\na=sendrecv\r\na=ice-pwd:5f857ab5642cd24cc7ef8190ab0db8b2\r\na=ice-ufrag:b841a2ac\r\na=mid:data\r\na=sctpmap:5000 webrtc-datachannel 256\r\na=setup:active\r\na=max-message-size:1073741823\r\n"
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
