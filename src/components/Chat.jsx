import { useState, useRef, useEffect } from "react";
import "../styles/chat.css";

const prompts = [
  "SUV features",
  "Sedan pricing",
  "Motorcycle availability",
  "Hatchback features",
  "MPV pricing",
  "Other Availabilities"
];

const greetings = ["hello", "hi", "hey", "hii"];

const Chat = () => {
  const [visible, setVisible] = useState(false);
  const [history, setHistory] = useState([
    { role: "bot", text: "Hello! I am EasyRent Assistant. Ask me about vehicle features, availability, or pricing." }
  ]);
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [conversationEnded, setConversationEnded] = useState(false);
  const chatRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [history, typing]);

  // ---------------- Draggable logic ----------------
  useEffect(() => {
    const dragItem = dragRef.current;
    if (!dragItem) return;
    let offsetX = 0, offsetY = 0, isDown = false;

    const mouseDown = e => {
      isDown = true;
      offsetX = dragItem.offsetLeft - e.clientX;
      offsetY = dragItem.offsetTop - e.clientY;
    };
    const mouseMove = e => {
      if (!isDown) return;
      dragItem.style.left = e.clientX + offsetX + "px";
      dragItem.style.top = e.clientY + offsetY + "px";
    };
    const mouseUp = () => { isDown = false; };

    dragItem.addEventListener("mousedown", mouseDown);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);

    return () => {
      dragItem.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    };
  }, []);

  // ---------------- Handle sending messages ----------------
  const handleSend = async (userMsg = query) => {
    if (!userMsg.trim() || conversationEnded) return;

    setHistory(prev => [...prev, { role: "user", text: userMsg }]);
    setQuery("");
    setTyping(true);

    const lowerQuery = userMsg.toLowerCase();

    // ---------------- Stop Conversation ----------------
    if (lowerQuery === "stop") {
      setHistory(prev => [
        ...prev,
        { role: "bot", text: "Conversation ended. Thank you for using EasyRent Assistant!" }
      ]);
      setTyping(false);
      setConversationEnded(true);
      return;
    }

    // ---------------- Greeting ----------------
    if (greetings.includes(lowerQuery)) {
      setTimeout(() => {
        setHistory(prev => [
          ...prev,
          { role: "bot", text: "Hi there! 👋 How can I assist you today?", prompts }
        ]);
        setTyping(false);
      }, 500);
      return;
    }

    // ---------------- Vehicle type ----------------
    let typeFilter = null;
    if (lowerQuery.includes("suv")) typeFilter = "SUV";
    else if (lowerQuery.includes("sedan")) typeFilter = "Sedan";
    else if (lowerQuery.includes("motorcycle")) typeFilter = "Motorcycle";
    else if (lowerQuery.includes("hatchback")) typeFilter = "Hatchback";
    else if (lowerQuery.includes("mpv")) typeFilter = "MPV";
    else if (lowerQuery.includes("other availabilities")) typeFilter = "other";

    // ---------------- Mode ----------------
    let mode = "info"; 
    if (lowerQuery.includes("features")) mode = "features";
    else if (lowerQuery.includes("price") || lowerQuery.includes("pricing")) mode = "pricing";
    else if (lowerQuery.includes("availability")) mode = "availability";

    // ---------------- Fetch vehicles ----------------
    try {
      const res = await fetch("http://localhost:5000/api/vehicles");
      const data = await res.json();

      let vehicles = data.vehicles;

      if (typeFilter && typeFilter !== "other") {
        vehicles = vehicles.filter(v => v.type.toLowerCase() === typeFilter.toLowerCase());
      } else if (typeFilter === "other") {
        vehicles = vehicles.filter(v => v.type.toLowerCase() !== "motorcycle");
      }

      const vehicleCards = vehicles.map(v => {
        let displayText = "";
        if (mode === "features") displayText = `${v.seating_capacity} seats | ${v.transmission} | ${v.fuel_type} | ${v.mileage} km/l`;
        else if (mode === "pricing") displayText = `₹${v.price_per_day}/day`;
        else if (mode === "availability") displayText = v.availability ? "Available ✅" : "Not Available ❌";
        else displayText = `${v.seating_capacity} seats | ${v.transmission} | ${v.fuel_type} | ${v.mileage} km/l | ₹${v.price_per_day}/day | ${v.availability ? "Available ✅" : "Not Available ❌"}`;

        return { id: v.id, name: v.name, image: v.image_url, displayText };
      });

      setTimeout(() => {
        setHistory(prev => [...prev, { role: "bot", vehicles: vehicleCards }]);
        setTyping(false);
      }, 700);

    } catch (err) {
      console.error(err);
      setHistory(prev => [...prev, { role: "bot", text: "Sorry, something went wrong while fetching vehicle data." }]);
      setTyping(false);
    }
  };

  // ---------------- Restart Chat ----------------
  const handleRestart = () => {
    setHistory([{ role: "bot", text: "Hello! I am EasyRent Assistant. Ask me about vehicle features, availability, or pricing." }]);
    setConversationEnded(false);
    setQuery("");
  };

  return (
    <>
      {!visible && <button className="chat-toggle-btn" onClick={() => setVisible(true)}>💬</button>}

      {visible && (
        <div className="chatbot-popup" ref={dragRef}>
          <div className="chat-header">
            <h2>EasyRent Assistant</h2>
            <button onClick={() => setVisible(false)}>×</button>
          </div>

          <div className="chat-body" ref={chatRef}>
            {history.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}-message`}>
                {msg.text && <div className="message-text">{msg.text}</div>}

                {msg.prompts && (
                  <div className="prompts-container">
                    {msg.prompts.map((p, i) => (
                      <button key={i} className="prompt-btn" onClick={() => handleSend(p)}>{p}</button>
                    ))}
                  </div>
                )}

                {msg.vehicles && (
                  <div className="chatbot-vehicles-container">
                    {msg.vehicles.map(vehicle => (
                      <div key={vehicle.id} className="chatbot-vehicle-card">
                        <img src={vehicle.image} alt={vehicle.name} />
                        <h4>{vehicle.name}</h4>
                        <p>{vehicle.displayText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && <div className="message bot-message"><div className="message-text">Typing...</div></div>}
          </div>

          <div className="chat-footer">
            <input 
              type="text" 
              placeholder="Type your message..." 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              onKeyDown={e => e.key === "Enter" && handleSend()} 
              disabled={conversationEnded}
            />
            <button onClick={() => handleSend()} disabled={conversationEnded}>Send</button>
            {conversationEnded && <button onClick={handleRestart} style={{ marginLeft: "6px" }}>Restart Chat</button>}
          </div>
        </div>
      )}
    </>
  );
};

export default Chat;
