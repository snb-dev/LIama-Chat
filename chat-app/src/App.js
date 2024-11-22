import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { marked } from "marked";
import DOMPurify from "dompurify";
import "./App.css";

const App = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState([]);
  const [isFetchingChats, setIsFetchingChats] = useState(false);

  const chatBoxRef = useRef(null);

  const API_URL =
    process.env.REACT_APP_API_URL ||
    "https://liama-chat-back-end.onrender.com/api/chat";
  const CHAT_API_URL =
    process.env.REACT_APP_CHAT_API_URL ||
    "https://liama-chat-back-end.onrender.com/api/chats";

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChats = async () => {
    setIsFetchingChats(true);
    try {
      const response = await axios.get(CHAT_API_URL);
      setChats(response.data);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    } finally {
      setIsFetchingChats(false);
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
      const rawReply = response.data.reply || "I didn't understand that.";
      setMessages([
        ...newMessages,
        { role: "assistant", content: formatAIResponse(rawReply) },
      ]);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to get a response from the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatAIResponse = (rawText) => {
    const mdText = marked(rawText);
    return DOMPurify.sanitize(mdText).trim();
  };

  const handleRenameChat = async (chatId, newTitle) => {
    if (!newTitle.trim()) {
      alert("Chat title cannot be empty.");
      return;
    }

    try {
      await axios.patch(`${CHAT_API_URL}/${chatId}`, { title: newTitle });
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === chatId ? { ...chat, title: newTitle } : chat
        )
      );
    } catch (error) {
      console.error("Error renaming chat:", error);
    }
  };

  const handleSelectChat = (chat) => {
    setMessages(chat.messages || []);
  };

  return (
    <div className="chat-container">
      <h1>LIama SNB</h1>
      <div className="sideBar">
        <div className="chat-sidebar">
          <h2>Chats</h2>
          {isFetchingChats ? (
            <p>Loading chats...</p>
          ) : chats.length === 0 ? (
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

        <div className="chat-box" ref={chatBoxRef}>
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

        <div className="input-container">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
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
