// src/components/ChatbotButton.jsx
import React from "react";
import { FaRobot } from "react-icons/fa";
import "../styles/ChatbotButton.css";

const ChatbotButton = ({ onClick }) => {
  return (
    <button className="chatbot-btn" onClick={onClick}>
      <FaRobot size={24} />
    </button>
  );
};

export default ChatbotButton;
