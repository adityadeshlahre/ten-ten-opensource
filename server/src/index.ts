import { WebSocket, WebSocketServer, RawData } from "ws";

interface SignalingMessage {
  targetCode: string;
  data: any;
}

class SignalingServer {
  private static instance: SignalingServer;
  private wss: WebSocketServer;
  private users: Map<string, WebSocket>;

  private constructor() {
    this.wss = new WebSocketServer({ port: 8080, host: "0.0.0.0" });
    this.users = new Map();

    this.wss.on("connection", (ws: WebSocket) => {
      const userCode = Math.random().toString(36).substring(2, 10);
      this.users.set(userCode, ws);

      ws.send(JSON.stringify({ code: userCode }));

      console.log(`User connected with code: ${userCode}`);

      ws.on("message", (rawData: RawData) => {
        const message: SignalingMessage = JSON.parse(rawData.toString());

        console.log("Received message:", message);

        if (message.targetCode && this.users.has(message.targetCode)) {
          const targetSocket = this.users.get(message.targetCode);
          targetSocket?.send(
            JSON.stringify({ from: userCode, data: message.data })
          );
        }
      });

      ws.on("close", () => {
        console.log(`User disconnected with code: ${userCode}`);
        this.users.delete(userCode);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });

    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, 30000);
  }

  public static getInstance(): SignalingServer {
    if (!SignalingServer.instance) {
      SignalingServer.instance = new SignalingServer();
    }
    return SignalingServer.instance;
  }
}

// Initialize the signaling server
SignalingServer.getInstance();
