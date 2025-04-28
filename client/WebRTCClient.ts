import {
  RTCPeerConnection,
  mediaDevices,
  RTCSessionDescription,
  MediaStream,
} from "react-native-webrtc";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, // Use Google's public STUN server
  ],
};

class WebRTCClient {
  private peerConnection: RTCPeerConnection;
  public socket: WebSocket;
  private localStream!: MediaStream;
  private targetCode: string = "";

  constructor(signalingServerUrl: string) {
    this.socket = new WebSocket(signalingServerUrl);
    this.peerConnection = new RTCPeerConnection(configuration);

    this.init();
  }

  private async init() {
    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    this.localStream.getTracks().forEach((track: any) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    this.socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("Signaling message received", message);

      if (message.data.type === "offer") {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(message.data)
        );
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.socket.send(
          JSON.stringify({ targetCode: message.from, data: answer })
        );
      }

      if (message.data.type === "answer") {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(message.data)
        );
      }

      if (message.data.candidate) {
        try {
          await this.peerConnection.addIceCandidate(message.data);
        } catch (e) {
          console.error("Error adding ICE candidate", e);
        }
      }
    };

    this.peerConnection.addEventListener("icecandidate", (event: any) => {
      if (event.candidate) {
        this.socket.send(JSON.stringify({ data: event.candidate }));
        this.socket.send(
          JSON.stringify({
            targetCode: this.targetCode,
            data: event.candidate,
          })
        );
      }
    });
  }

  public async call(targetCode: string) {
    this.targetCode = targetCode;
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await this.peerConnection.setLocalDescription(offer);

    this.socket.send(JSON.stringify({ targetCode, data: offer }));
  }

  public getLocalStream() {
    return this.localStream;
  }
}

export default WebRTCClient;
