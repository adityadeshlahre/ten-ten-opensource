import { StatusBar } from "expo-status-bar";
import { useState, useRef, useEffect } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import "expo-dev-client";
import WebRTCClient from "./WebRTCClient";

export default function App() {
  const [myCode, setMyCode] = useState("");
  const [targetCode, setTargetCode] = useState("");
  const clientRef = useRef<WebRTCClient | null>(null);

  useEffect(() => {
    const client = new WebRTCClient("ws://192.168.1.50:8080");
    clientRef.current = client;

    client.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.code) {
        setMyCode(message.code);
      }
      // Already handled other messages inside WebRTCClient
    };
  }, []);

  const handleCall = () => {
    if (clientRef.current && targetCode.length > 0) {
      clientRef.current.call(targetCode);
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

      <Button title="Call" onPress={handleCall} />

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
