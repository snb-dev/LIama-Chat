import React, { useState, useEffect } from "react";
import axios from "axios";
import { marked } from "marked"; // Ensure marked is installed
import DOMPurify from "dompurify"; // Ensure dompurify is installed
import "./App.css";

const App = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState([]); // Store chat list

  const API_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000/api/chat";
  const CHAT_API_URL =
    process.env.REACT_APP_CHAT_API_URL || "http://localhost:5000/api/chats";

  useEffect(() => {
    fetchChats(); // Fetch chats on component load
  }, []);

  const fetchChats = async () => {
    try {
      const response = await axios.get(CHAT_API_URL);
      setChats(response.data); // Update the chat list
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  };

  const handleSend = async () => {
    if (!userInput.trim()) return;

    const newMessages = [...messages, { role: "user", content: userInput }];
    setMessages(newMessages);
    setUserInput("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}`, {
        messages: newMessages,
      });

      const rawReply = response.data.reply;
      const formattedReply = formatAIResponse(rawReply);

      setMessages([
        ...newMessages,
        { role: "assistant", content: formattedReply },
      ]);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to get a response from the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatAIResponse = (rawText) => {
    const mdText = marked(rawText); // Convert to Markdown
    const sanitizedText = DOMPurify.sanitize(mdText); // Sanitize the Markdown-rendered HTML
    return sanitizedText.trim(); // Ensure no extra spaces
  };

  const handleRenameChat = (chatId, newTitle) => {
    const updatedChats = chats.map((chat) =>
      chat.id === chatId ? { ...chat, title: newTitle } : chat
    );
    setChats(updatedChats);

    // Optionally update title in Firebase
    axios
      .doc(`conversations/${chatId}`)
      .update({ title: newTitle })
      .catch((error) => console.error("Error renaming chat:", error));
  };

  const handleSelectChat = (chat) => {
    setMessages(chat.messages); // Load the selected chat's messages
  };

  return (
    <div className="chat-container">
      <h1>LIama SNB</h1>
      <div className="sideBar">
        <div className="list">
          {/* Chat List Section */}
          <div className="chat-sidebar">
            <h2>Chats</h2>
            {chats.length === 0 ? (
              <p>No chats found</p>
            ) : (
              chats.map((chat) => (
                <div key={chat.id} className="chat-list-item">
                  <input
                    value={chat.title || "Untitled Chat"}
                    onChange={(e) => handleRenameChat(chat.id, e.target.value)}
                  />
                  <button onClick={() => handleSelectChat(chat)}>Open</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Box Section */}
        <div className="chat-box">
          {messages.length === 0 && (
            <div className="placeholder">Start the conversation!</div>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.role === "user" ? "user" : "assistant"
              }`}
              dangerouslySetInnerHTML={{
                __html:
                  msg.role === "assistant"
                    ? msg.content
                    : DOMPurify.sanitize(msg.content),
              }}
            />
          ))}
          {isLoading && (
            <div className="message assistant">AI is typing...</div>
          )}
        </div>

        {/* Input Section */}
        <div className="input-container">
          <textarea
            value={userInput}
            onChange={(e) => {
              setUserInput(e.target.value);
              // Adjust height to fit content
              e.target.style.height = "auto"; // Reset height
              e.target.style.height = `${e.target.scrollHeight}px`; // Set new height based on content
            }}
            placeholder="Type your message..."
            onKeyDown={(e) => {
              // Move to the next line on Enter
              if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
                // Allow the default behavior of Enter to create a new line
              } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                // If Ctrl + Enter or Command + Enter is pressed, send the message
                e.preventDefault(); // Prevent adding a new line
                handleSend();
              }
            }}
            rows={1} // Initial height
            style={{ resize: "none", overflow: "hidden" }} // Prevent manual resize
          />
          <button onClick={handleSend} disabled={isLoading}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
