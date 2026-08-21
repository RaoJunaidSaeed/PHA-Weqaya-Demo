import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, FileText } from 'lucide-react';

const C = {
  navy: "#0b2545",
  teal: "#0f8b8d",
  card: "#ffffff",
  ink: "#10243e",
  muted: "#5b7083",
  line: "#dde6ea",
  bg: "#eef2f5",
};

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'system',
      text: 'I have ingested 25 emergency documents (SITREPs, Field Emails, and Resource Spreadsheets) in Arabic and English. How can I assist you with the Public Health Events Center data today?',
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const userMsg = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');
    setIsTyping(true);

    // ==========================================
    // PRODUCTION N8N WEBHOOK INTEGRATION (RAG)
    // ==========================================
    try {
        const response = await fetch('https://logicmount.app.n8n.cloud/webhook/pha-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: userMsg })
        });
        
        // n8n Webhook node (lastNode mode) typically returns an array of objects
        const data = await response.json();
        const answer = Array.isArray(data) ? data[0]?.output : data?.output;
        
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'system', text: answer }]);
    } catch (err) {
        console.error(err);
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'system', text: 'Error connecting to the AI endpoint.' }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: 30, right: 30, zIndex: 50,
            width: 60, height: 60, borderRadius: '50%',
            backgroundColor: C.teal, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(15,139,141,0.4)', border: 'none', cursor: 'pointer',
            transition: 'transform 0.2s ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageSquare size={28} />
        </button>
      )}

      {/* Sliding Side Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw',
        backgroundColor: C.card, boxShadow: '-5px 0 25px rgba(0,0,0,0.1)', zIndex: 100,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px', backgroundColor: C.navy, color: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bot size={24} color={C.teal} />
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16 }}>Ask the Corpus</div>
              <div style={{ fontSize: 11, color: C.line, opacity: 0.8 }}>Powered by Self-Hosted RAG</div>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: C.bg, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ 
              display: 'flex', flexDirection: 'column', 
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' 
            }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, 
                color: C.muted, fontSize: 11, fontWeight: 500,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} color={C.teal} />}
                {msg.role === 'user' ? 'You' : 'System Assistant'}
              </div>
              <div style={{
                backgroundColor: msg.role === 'user' ? C.navy : 'white',
                color: msg.role === 'user' ? 'white' : C.ink,
                padding: '12px 16px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.5,
                borderBottomRightRadius: msg.role === 'user' ? 2 : 12,
                borderTopLeftRadius: msg.role === 'system' ? 2 : 12,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)', maxWidth: '90%',
                border: msg.role === 'system' ? `1px solid ${C.line}` : 'none'
              }}>
                {msg.text}
                
                {/* Citations block */}
                {msg.citations && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Sources:</span>
                    {msg.citations.map((cite, cIdx) => (
                      <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.teal }}>
                        <FileText size={12} /> {cite}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: C.muted, fontSize: 11, fontWeight: 500 }}>
                <Bot size={14} color={C.teal} /> System Assistant
              </div>
              <div style={{
                backgroundColor: 'white', padding: '12px 16px', borderRadius: 12, borderTopLeftRadius: 2,
                border: `1px solid ${C.line}`, color: C.muted, fontSize: 13, fontStyle: 'italic'
              }}>
                Searching vector corpus...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '16px', backgroundColor: 'white', borderTop: `1px solid ${C.line}` }}>
          <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about incidents, compliance, or field reports..."
              style={{
                flex: 1, resize: 'none', height: 44, padding: '12px 45px 12px 16px',
                borderRadius: 22, border: `1px solid ${C.line}`, backgroundColor: C.bg,
                fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.ink,
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              style={{
                position: 'absolute', right: 6, top: 6,
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                backgroundColor: inputValue.trim() ? C.teal : 'transparent',
                color: inputValue.trim() ? 'white' : C.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: inputValue.trim() ? 'pointer' : 'default', transition: 'background-color 0.2s'
              }}
            >
              <Send size={16} style={{ marginLeft: inputValue.trim() ? -2 : 0 }} />
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: C.muted }}>
            Shift + Enter for new line
          </div>
        </div>
      </div>
    </>
  );
}
