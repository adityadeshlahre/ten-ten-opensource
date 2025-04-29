import {
  RTCPeerConnection,
  mediaDevices,
  RTCSessionDescription,
  MediaStream,
} from "react-native-webrtc";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

class WebRTCClient {
  private peerConnection: RTCPeerConnection;
  private socket: WebSocket;
  private localStream!: MediaStream;
  private targetCode: string = "";
  private myCode: string = "";
  private remoteStream!: MediaStream;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;

  constructor(signalingServerUrl: string) {
    this.socket = new WebSocket(signalingServerUrl);
    this.peerConnection = new RTCPeerConnection(configuration);

    this.init();
  }

  private async init() {
    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    this.localStream.getTracks().forEach((track: any) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    this.socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.code) {
        this.myCode = message.code;
        return;
      }

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
        this.socket.send(
          JSON.stringify({
            from: this.myCode,
            targetCode: this.targetCode,
            data: event.candidate,
          })
        );
      }
    });

    this.peerConnection.addEventListener("track", (event: any) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      if (event.track) {
        this.remoteStream.addTrack(event.track);
      }

      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }

      if (this.remoteStream) {
        const remoteStreamUrl = this.remoteStream.toURL();
        console.log("Remote stream URL:", remoteStreamUrl);
        this.socket.send(
          JSON.stringify({
            from: this.myCode,
            targetCode: this.targetCode,
            data: { remoteStreamUrl },
          })
        );
      }
    });
  }

  public async call(targetCode: string) {
    try {
      this.targetCode = targetCode;
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      try {
        await this.peerConnection.setLocalDescription(offer);
      } catch (err) {
        console.error("Error in setLocalDescription:", err);
        return;
      }

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(
          JSON.stringify({
            targetCode,
            data: {
              type: offer.type,
              sdp: offer.sdp,
            },
          })
        );
      } else {
        console.warn("WebSocket not open. Cannot send offer.");
      }
    } catch (error) {
      console.error("Error during call():", error);
    }
  }
  public async endCall() {
    try {
      this.peerConnection.close();

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (this.remoteStream) {
        if (this.onRemoteStream) {
          this.onRemoteStream(new MediaStream());
        }
      }

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(
          JSON.stringify({
            from: this.myCode,
            targetCode: this.targetCode,
            data: { type: "endCall" },
          })
        );
      } else {
        console.warn("WebSocket not open. Cannot send end call signal.");
      }

      this.targetCode = "";
      this.remoteStream = undefined as any;
      this.localStream = undefined as any;
    } catch (error) {
      console.error("Error during endCall():", error);
    }
  }

  public getLocalStream() {
    return this.localStream;
  }

  public getRemoteStream() {
    return this.remoteStream;
  }

  public getSocket() {
    return this.socket;
  }
}

export default WebRTCClient;
