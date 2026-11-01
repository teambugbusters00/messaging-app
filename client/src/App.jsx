import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Search, Plus, Send, Paperclip, Smile, MoreHorizontal, Phone, Video, Info, MessageCircle, Users, Settings, Archive, CheckCheck, Wifi, WifiOff } from "lucide-react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const ROOM = "general";
const initialChats = [
  { id: "general", name: "General", preview: "Welcome to the conversation", time: "Now", unread: 0, online: true, color: "mint", group: true },
  { id: "design", name: "Design Circle", preview: "Share ideas and feedback", time: "Yesterday", unread: 2, online: false, color: "violet", group: true },
  { id: "product", name: "Product Team", preview: "Planning the next release", time: "Yesterday", unread: 0, online: true, color: "orange", group: true },
  { id: "alex", name: "Alex Morgan", preview: "Sounds good, talk soon!", time: "Mon", unread: 0, online: true, color: "blue" },
  { id: "sam", name: "Sam Wilson", preview: "Sent you a file", time: "Sun", unread: 0, online: false, color: "pink" }
];

function Avatar({ name, color = "mint", small = false }) {
  return <div className={`avatar ${color} ${small ? "small" : ""}`}>{name.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase()}</div>;
}

export default function App() {
  const [active, setActive] = useState("general");
  const [chats, setChats] = useState(initialChats);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState("");
  const [search, setSearch] = useState("");
  const [mobileChat, setMobileChat] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const joinedRoom = useRef(null);

  const current = chats.find(c => c.id === active) || chats[0];
  const filteredChats = useMemo(() => chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase())), [chats, search]);

  useEffect(() => {
    const socket = io(SERVER_URL, { reconnection: true, reconnectionAttempts: Infinity });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat:message", message => setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]));
    socket.on("chat:typing", payload => {
      setTyping(payload.isTyping ? `${payload.sender} is typing…` : "");
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!socketRef.current || !connected) return;
    if (joinedRoom.current && joinedRoom.current !== active) {
      socketRef.current.emit("chat:leave", { room: joinedRoom.current });
    }
    joinedRoom.current = active;
    setMessages([]);
    socketRef.current.emit("chat:join", { room: active }, response => {
      if (response?.ok) setMessages(response.messages || []);
    });
  }, [active, connected]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, typing]);

  function sendMessage(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value || !socketRef.current) return;
    socketRef.current.emit("chat:send", { room: active, sender: "You", text: value }, response => {
      if (response?.ok) setText("");
    });
  }

  function updateTyping(value) {
    setText(value);
    if (!socketRef.current) return;
    socketRef.current.emit("chat:typing", { room: active, sender: "You", isTyping: Boolean(value.trim()) });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit("chat:typing", { room: active, sender: "You", isTyping: false }), 900);
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileChat ? "hide-mobile" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><MessageCircle size={21} strokeWidth={2.5} /></div>
          <span className="brand-name">m<span>essage</span></span>
          <button className="icon-button settings-button" aria-label="Settings"><Settings size={19} /></button>
        </div>
        <div className="profile-row">
          <Avatar name="You" color="mint" />
          <div className="profile-copy"><strong>Your workspace</strong><span>Personal account</span></div>
          <span className={`connection-dot ${connected ? "live" : ""}`} title={connected ? "Connected" : "Connecting"} />
        </div>
        <div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations" /></div>
        <div className="section-heading"><span>MESSAGES</span><button className="icon-button" aria-label="New chat"><Plus size={18} /></button></div>
        <nav className="chat-list">
          {filteredChats.map(chat => (
            <button key={chat.id} className={`chat-item ${active === chat.id ? "selected" : ""}`} onClick={() => { setActive(chat.id); setMobileChat(true); }}>
              <div className="avatar-wrap"><Avatar name={chat.name} color={chat.color} /><span className={`presence ${chat.online ? "online" : ""}`} /></div>
              <div className="chat-item-copy"><div className="chat-title-line"><strong>{chat.name}</strong><time>{chat.time}</time></div><div className="chat-preview">{chat.preview}</div></div>
              {chat.unread > 0 && <span className="unread">{chat.unread}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button><Users size={18} /> Communities <span>Explore</span></button>
          <button><Archive size={18} /> Archived</button>
        </div>
        <div className="sidebar-footer"><div className="secure-icon"><Wifi size={15} /></div><span>Connected conversations<br /><b>Private by design</b></span><MoreHorizontal size={18} /></div>
      </aside>

      <section className={`conversation ${mobileChat ? "show-mobile" : ""}`}>
        <header className="conversation-header">
          <button className="back-button" onClick={() => setMobileChat(false)}>‹</button>
          <Avatar name={current.name} color={current.color} small />
          <div className="header-copy"><strong>{current.name}</strong><span>{current.group ? "Group conversation" : current.online ? "Online now" : "Last seen recently"}</span></div>
          <div className="header-actions"><button className="icon-button" aria-label="Audio call"><Phone size={18} /></button><button className="icon-button" aria-label="Video call"><Video size={19} /></button><button className="icon-button" aria-label="Conversation info"><Info size={19} /></button></div>
        </header>

        <div className="message-area">
          <div className="date-divider"><span>Today</span></div>
          {messages.length === 0 && <div className="empty-state"><div className="empty-icon"><MessageCircle size={25} /></div><h2>Start a conversation</h2><p>This is the beginning of your chat. Say hello.</p></div>}
          {messages.map((message, index) => {
            const mine = message.sender === "You";
            const previous = messages[index - 1];
            return <div key={message.id} className={`message-row ${mine ? "mine" : ""}`}>
              {!mine && <Avatar name={message.sender} color="violet" small />}
              <div className="message-content">
                {!mine && (!previous || previous.sender !== message.sender) && <span className="sender-name">{message.sender}</span>}
                <div className="bubble">{message.text}</div>
                <div className="message-meta"><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>{mine && <CheckCheck size={14} />}</div>
              </div>
            </div>;
          })}
          {typing && <div className="typing-label">{typing}</div>}
          <div ref={bottomRef} />
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <button type="button" className="icon-button attach-button" aria-label="Attach file"><Paperclip size={19} /></button>
          <input value={text} onChange={e => updateTyping(e.target.value)} placeholder={connected ? "Write a message..." : "Connecting to server..."} disabled={!connected} />
          <button type="button" className="icon-button emoji-button" aria-label="Emoji"><Smile size={19} /></button>
          <button className="send-button" type="submit" disabled={!connected || !text.trim()} aria-label="Send message"><Send size={17} /></button>
        </form>
        <div className="connection-status">{connected ? <><span className="status-live" /> Live connection</> : <><WifiOff size={12} /> Reconnecting…</>}</div>
      </section>
    </main>
  );
}
