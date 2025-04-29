import { StatusBar } from "expo-status-bar";
import { useState, useRef, useEffect } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import "expo-dev-client";
import WebRTCClient from "./WebRTCClient";
import { RTCView } from "react-native-webrtc";

export default function App() {
  const [myCode, setMyCode] = useState("");
  const [targetCode, setTargetCode] = useState("");
  const clientRef = useRef<WebRTCClient | null>(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState("");

  useEffect(() => {
    const client = new WebRTCClient("ws://192.168.1.50:8080");
    clientRef.current = client;

    client.getSocket().onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message from server:", message);
      if (message.code) {
        setMyCode(message.code);
      }
      console.log("asidjfisajdfi");

      console.log("Received message from:", message.from);
      console.log("Received message data:", message.data);

      if (message.data && message.data.type === "answer") {
        console.log("Received message from:", message.data.remoteStreamUrl);
      }

      console.log("asidjfisajdfasdfi");

      if (message.data && message.data.remoteStreamUrl) {
        setRemoteStreamUrl(message.data.remoteStreamUrl);
      }

      client.onRemoteStream = (stream) => {
        setRemoteStreamUrl(stream.toURL());
      };
    };
  }, []);

  const handleCall = () => {
    if (clientRef.current && targetCode.length > 0) {
      clientRef.current.call(targetCode);
    }
  };

  const handleEndCall = () => {
    if (clientRef.current) {
      clientRef.current.endCall();
      setRemoteStreamUrl("");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Your Code:</Text>
      <Text style={styles.code}>{myCode}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter friend's code"
        onChangeText={setTargetCode}
        value={targetCode}
      />

      <Button title="StartConv" onPress={handleCall} />

      {remoteStreamUrl && (
        <RTCView
          streamURL={remoteStreamUrl}
          style={{ width: 300, height: 300 }}
          objectFit="cover"
        />
      )}

      <Button title="EndConv" color={"red"} onPress={handleEndCall} />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginTop: 20,
    width: "100%",
    borderRadius: 5,
  },
  text: { fontSize: 20, fontWeight: "bold" },
  code: { fontSize: 24, marginBottom: 20, color: "blue" },
  button: {
    marginTop: 20,
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
  },
});
