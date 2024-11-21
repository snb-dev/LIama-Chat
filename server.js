require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { HfInference } = require("@huggingface/inference");
const admin = require("firebase-admin");

// Validate environment variables
if (!process.env.HUGGINGFACE_API_KEY) {
  console.error(
    "Error: HUGGINGFACE_API_KEY is not set in the environment variables."
  );
  process.exit(1);
}

// Firebase initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // Or use a service account key JSON file
    databaseURL: "https://liama-ai-c1647.firebaseio.com",
  });
}
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Root route for health check
app.get("/", (req, res) => {
  res.send("Server is running and ready to handle requests!");
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  try {
    // Send messages to HuggingFace API
    const chatResponse = await hfClient.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct", // Or any other model
      messages,
      max_tokens: 3000,
    });

    // Clean and format the AI's reply
    const rawReply = chatResponse.choices[0].message.content;
    const formattedReply = rawReply.trim().replace(/\n{2,}/g, "\n\n");

    // Add the AI's reply to the conversation
    const updatedMessages = [
      ...messages,
      { role: "assistant", content: formattedReply },
    ];

    // Save the conversation to Firebase
    const chatId = `chat_${Date.now()}`; // Unique ID for each chat session
    await db.collection("conversations").doc(chatId).set({
      title: "Untitled Chat", // Default title
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      messages: updatedMessages,
    });

    res.json({ reply: formattedReply });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Get all chats
app.get("/api/chats", async (req, res) => {
  try {
    const chatsSnapshot = await db.collection("conversations").get();
    const chats = chatsSnapshot.docs.map((doc) => ({
      id: doc.id, // Document ID
      ...doc.data(), // Document fields
    }));
    res.json(chats); // Send the chats list to the frontend
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Failed to fetch chats." });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
