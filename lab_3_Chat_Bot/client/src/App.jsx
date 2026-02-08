import { useState } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    departure: '',
    destination: '',
    style: '',
    budget: '',
    interests: '',
  });

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🌍 Travel Planner Chat Bot</h1>
          <p>Plan your perfect 3-day trip with AI assistance</p>
        </header>

        <div className="travel-form">
          <h3>Trip Details (Optional)</h3>
          <div className="form-grid">
            <input
              type="text"
              name="departure"
              placeholder="Departure City"
              value={formData.departure}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="destination"
              placeholder="Destination City"
              value={formData.destination}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="style"
              placeholder="Travel Style (e.g., adventure, relaxed)"
              value={formData.style}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="budget"
              placeholder="Budget (low, medium, high)"
              value={formData.budget}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="interests"
              placeholder="Special Interests"
              value={formData.interests}
              onChange={handleInputChange}
              className="full-width"
            />
          </div>
        </div>

        <div className="chat-container">
          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome-message">
                <p>👋 Welcome! I'm your travel planning assistant.</p>
                <p>Fill in the trip details above or just start chatting to plan your perfect trip!</p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-content">
                  <strong>{msg.role === 'user' ? 'You' : msg.role === 'error' ? 'Error' : 'Travel Agent'}:</strong>
                  <p>{msg.content}</p>
                </div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message assistant loading">
                <div className="message-content">
                  <strong>Travel Agent:</strong>
                  <p>Thinking... ✈️</p>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your trip or request an itinerary..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}




export default App;

