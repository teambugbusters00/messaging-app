import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  MessageCircle, Mail, Lock, UserRound, Eye, EyeOff, LogIn, UserPlus,
  Search, Plus, Send, Paperclip, Smile, MoreHorizontal, Phone, Video,
  Info, Users, Settings, Archive, CheckCheck, Wifi, WifiOff, ArrowLeft,
  Bell, Shield, Palette, Camera, LogOut, Moon, ChevronRight, X, Menu
} from "lucide-react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const initialChats = [
  { id: "general", name: "General", preview: "Welcome to the conversation", time: "Now", unread: 0, online: true, color: "mint", group: true },
  { id: "design", name: "Design Circle", preview: "Share ideas and feedback", time: "Yesterday", unread: 2, online: false, color: "violet", group: true },
  { id: "product", name: "Product Team", preview: "Planning the next release", time: "Yesterday", unread: 0, online: true, color: "orange", group: true },
  { id: "alex", name: "Alex Morgan", preview: "Sounds good, talk soon!", time: "Mon", unread: 0, online: true, color: "blue" },
  { id: "sam", name: "Sam Wilson", preview: "Sent you a file", time: "Sun", unread: 0, online: false, color: "pink" }
];

function Avatar({ name = "You", color = "mint", small = false }) {
  const initials = name.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase();
  return <div className={`avatar ${color} ${small ? "small" : ""}`}>{initials || "Y"}</div>;
}

function Brand() {
  return <div className="auth-brand"><div className="auth-brand-icon"><MessageCircle size={34} strokeWidth={2.4} /></div><div><strong>ChatAI</strong><span>Real-time Messaging</span></div></div>;
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault(); setError("");
    if (!email.trim() || !password) return setError("Enter your email and password to continue.");
    if (mode === "signup" && !name.trim()) return setError("Enter your full name.");
    if (mode === "signup" && password !== confirm) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Use a password with at least 6 characters.");
    onLogin({ name: mode === "signup" ? name.trim() : (email.split("@")[0] || "You"), email });
  }
  const signup = mode === "signup";
  return <main className="auth-shell"><div className="auth-glow glow-one" /><div className="auth-glow glow-two" /><div className="auth-mountains" />
    <section className={`auth-card ${signup ? "signup-card" : ""}`}>
      <Brand />
      <div className="auth-heading"><h1>{signup ? "Create Account" : "Welcome Back"}</h1><p>{signup ? "Join and start messaging in real time" : "Sign in to continue your conversations"}</p></div>
      <form className="auth-form" onSubmit={submit}>
        {signup && <label className="auth-input"><UserRound size={20}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Full Name" autoComplete="name" /></label>}
        <label className="auth-input"><Mail size={20}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" autoComplete="email" /></label>
        <label className="auth-input"><Lock size={20}/><input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" autoComplete={signup ? "new-password" : "current-password"} /><button type="button" className="password-toggle" onClick={()=>setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button></label>
        {signup && <label className="auth-input"><Lock size={20}/><input type={showPassword ? "text" : "password"} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm Password" autoComplete="new-password" /></label>}
        {!signup && <div className="auth-options"><label className="remember"><input type="checkbox" defaultChecked/> <span>Remember me</span></label><button type="button" className="text-link" onClick={()=>setError("Password recovery needs an authentication service to be configured.")}>Forgot password?</button></div>}
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-submit" type="submit">{signup ? <><UserPlus size={20}/> Sign Up</> : <><LogIn size={20}/> Login</>}</button>
      </form>
      <div className="auth-divider"><span>or continue with</span></div>
      <div className="social-row"><button type="button" onClick={()=>setError("Google sign-in is not configured yet.")}><b className="google-g">G</b> Google</button><button type="button" onClick={()=>setError("GitHub sign-in is not configured yet.")}><b className="github-mark">●</b> GitHub</button></div>
      <p className="auth-switch">{signup ? "Already have an account?" : "Don’t have an account?"} <button onClick={()=>{setMode(signup ? "login" : "signup");setError("");}}>{signup ? "Login" : "Sign Up"}</button></p>
    </section>
    <div className="auth-footnote">A calmer space for better conversations.</div>
  </main>;
}

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("message-user")); } catch { return null; } });
  const [page, setPage] = useState("chats");
  const [active, setActive] = useState("general");
  const [chats, setChats] = useState(initialChats);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState("");
  const [search, setSearch] = useState("");
  const [mobileChat, setMobileChat] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || "You");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const joinedRoom = useRef(null);
  const current = chats.find(c => c.id === active) || chats[0];
  const filteredChats = useMemo(() => chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase())), [chats, search]);

  useEffect(() => {
    if (!user) return;
    const socket = io(SERVER_URL, { reconnection: true, reconnectionAttempts: Infinity });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat:message", message => setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]));
    socket.on("chat:typing", payload => setTyping(payload.isTyping ? `${payload.sender} is typing…` : ""));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user]);
  useEffect(() => {
    if (!socketRef.current || !connected || page !== "chats") return;
    if (joinedRoom.current && joinedRoom.current !== active) socketRef.current.emit("chat:leave", { room: joinedRoom.current });
    joinedRoom.current = active; setMessages([]);
    socketRef.current.emit("chat:join", { room: active }, response => { if (response?.ok) setMessages(response.messages || []); });
  }, [active, connected, page]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
  function login(details) {
    const next = { ...details, name: details.name || "You" };
    localStorage.setItem("message-user", JSON.stringify(next)); setUser(next); setProfileName(next.name); setPage("chats");
  }
  function logout() { localStorage.removeItem("message-user"); setUser(null); setMessages([]); setPage("chats"); }
  function sendMessage(event) {
    event.preventDefault(); const value = text.trim();
    if (!value || !socketRef.current) return;
    socketRef.current.emit("chat:send", { room: active, sender: profileName || "You", text: value }, response => { if (response?.ok) setText(""); });
  }
  function updateTyping(value) {
    setText(value); if (!socketRef.current) return;
    socketRef.current.emit("chat:typing", { room: active, sender: profileName || "You", isTyping: Boolean(value.trim()) });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit("chat:typing", { room: active, sender: profileName || "You", isTyping: false }), 900);
  }
  if (!user) return <AuthScreen onLogin={login}/>;

  const navItems = [
    { id: "chats", label: "Messages", icon: MessageCircle },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "archived", label: "Archived", icon: Archive },
    { id: "profile", label: "My profile", icon: UserRound },
    { id: "settings", label: "Settings", icon: Settings }
  ];
  return <main className="app-shell">
    <aside className={`sidebar ${mobileChat ? "hide-mobile" : ""} ${mobileNav ? "mobile-nav-open" : ""}`}>
      <div className="brand-row"><div className="brand-mark"><MessageCircle size={21} strokeWidth={2.5}/></div><span className="brand-name">m<span>essage</span></span><button className="icon-button settings-button" aria-label="Settings" onClick={()=>setPage("settings")}><Settings size={19}/></button></div>
      <div className="profile-row"><Avatar name={profileName} color="mint"/><div className="profile-copy"><strong>{profileName}</strong><span>{user.email}</span></div><span className={`connection-dot ${connected ? "live" : ""}`} title={connected ? "Connected" : "Connecting"}/></div>
      <div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conversations"/></div>
      <div className="section-heading"><span>WORKSPACE</span><button className="icon-button" aria-label="New chat" onClick={()=>setPage("contacts")}><Plus size={18}/></button></div>
      <nav className="chat-list">{navItems.map(item=>{const Icon=item.icon;return <button key={item.id} className={`chat-item nav-item ${page===item.id ? "selected" : ""}`} onClick={()=>{setPage(item.id);setMobileChat(false);setMobileNav(false);}}><span className="nav-icon"><Icon size={18}/></span><div className="chat-item-copy"><strong>{item.label}</strong></div>{page===item.id&&<ChevronRight size={15}/>}</button>;})}</nav>
      <div className="section-heading contact-heading"><span>RECENT CHATS</span></div>
      <nav className="chat-list recent-list">{filteredChats.map(chat=><button key={chat.id} className={`chat-item ${active===chat.id&&page==="chats"?"selected":""}`} onClick={()=>{setActive(chat.id);setPage("chats");setMobileChat(true);}}><div className="avatar-wrap"><Avatar name={chat.name} color={chat.color}/><span className={`presence ${chat.online?"online":""}`}/></div><div className="chat-item-copy"><div className="chat-title-line"><strong>{chat.name}</strong><time>{chat.time}</time></div><div className="chat-preview">{chat.preview}</div></div>{chat.unread>0&&<span className="unread">{chat.unread}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button onClick={()=>setPage("contacts")}><Users size={18}/> Communities <span>Explore</span></button><button onClick={()=>setPage("archived")}><Archive size={18}/> Archived</button></div>
      <div className="sidebar-footer"><div className="secure-icon"><Wifi size={15}/></div><span>Connected conversations<br/><b>Private by design</b></span><button className="icon-button" onClick={logout} aria-label="Log out"><LogOut size={17}/></button></div>
    </aside>

    {page==="chats" ? <section className={`conversation ${mobileChat?"show-mobile":""}`}>
      <header className="conversation-header"><button className="back-button" onClick={()=>setMobileChat(false)}><ArrowLeft size={20}/></button><Avatar name={current.name} color={current.color} small/><div className="header-copy"><strong>{current.name}</strong><span>{current.group?"Group conversation":current.online?"Online now":"Last seen recently"}</span></div><div className="header-actions"><button className="icon-button" aria-label="Audio call"><Phone size={18}/></button><button className="icon-button" aria-label="Video call"><Video size={19}/></button><button className="icon-button" aria-label="Conversation info"><Info size={19}/></button></div></header>
      <div className="message-area"><div className="date-divider"><span>Today</span></div>{messages.length===0&&<div className="empty-state"><div className="empty-icon"><MessageCircle size={25}/></div><h2>Start a conversation</h2><p>This is the beginning of your chat. Say hello.</p></div>}{messages.map((message,index)=>{const mine=message.sender===(profileName||"You");const previous=messages[index-1];return <div key={message.id} className={`message-row ${mine?"mine":""}`}>{!mine&&<Avatar name={message.sender} color="violet" small/>}<div className="message-content">{!mine&&(!previous||previous.sender!==message.sender)&&<span className="sender-name">{message.sender}</span>}<div className="bubble">{message.text}</div><div className="message-meta"><time>{new Date(message.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time>{mine&&<CheckCheck size={14}/>}</div></div></div>;})}{typing&&<div className="typing-label">{typing}</div>}<div ref={bottomRef}/></div>
      <form className="composer" onSubmit={sendMessage}><button type="button" className="icon-button attach-button" aria-label="Attach file"><Paperclip size={19}/></button><input value={text} onChange={e=>updateTyping(e.target.value)} placeholder={connected?"Write a message...":"Connecting to server..."} disabled={!connected}/><button type="button" className="icon-button emoji-button" aria-label="Emoji"><Smile size={19}/></button><button className="send-button" type="submit" disabled={!connected||!text.trim()} aria-label="Send message"><Send size={17}/></button></form>
      <div className="connection-status">{connected?<><span className="status-live"/> Live connection</>:<><WifiOff size={12}/> Reconnecting…</>}</div>
    </section> : <section className="page-panel">
      <header className="page-header"><button className="mobile-menu-button" onClick={()=>setMobileNav(!mobileNav)}><Menu size={20}/></button><div><span className="eyebrow">WORKSPACE</span><h1>{navItems.find(x=>x.id===page)?.label || "Workspace"}</h1></div><span className={`page-connection ${connected?"live":""}`}>{connected?"Connected":"Connecting"}</span></header>
      {page==="contacts"&&<div className="page-content"><div className="page-intro"><div><h2>Your people</h2><p>Start a conversation with someone in your workspace.</p></div><div className="search-box compact-search"><Search size={16}/><input placeholder="Find a contact" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="contact-grid">{chats.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())).map(c=><article className="contact-card" key={c.id}><Avatar name={c.name} color={c.color}/><div><strong>{c.name}</strong><span>{c.group?"Community":"Direct message"} · {c.online?"Online":"Away"}</span></div><button className="outline-action" onClick={()=>{setActive(c.id);setPage("chats");setMobileChat(true);}}>Message</button></article>)}</div></div>}
      {page==="archived"&&<div className="page-content"><div className="empty-page"><div className="empty-icon"><Archive size={25}/></div><h2>No archived conversations</h2><p>Chats you archive will appear here.</p><button className="primary-action" onClick={()=>setPage("chats")}>Back to messages</button></div></div>}
      {page==="profile"&&<div className="page-content"><div className="settings-card profile-card"><div className="profile-hero"><Avatar name={profileName} color="violet"/><div><h2>{profileName}</h2><p>{user.email}</p></div><button className="outline-action" onClick={()=>setPage("settings")}>Edit profile</button></div><div className="form-field"><label>Display name</label><input value={profileName} onChange={e=>setProfileName(e.target.value)} /></div><div className="form-field"><label>Email address</label><input value={user.email} disabled /></div><button className="primary-action" onClick={()=>{const next={...user,name:profileName};setUser(next);localStorage.setItem("message-user",JSON.stringify(next));}}>Save changes</button></div></div>}
      {page==="settings"&&<div className="page-content settings-layout"><div className="settings-card"><h2>Preferences</h2><p>Make your messaging space feel right.</p><div className="setting-row"><span className="setting-icon"><Bell size={18}/></span><div><strong>Notifications</strong><small>Message and activity alerts</small></div><input type="checkbox" defaultChecked/></div><div className="setting-row"><span className="setting-icon"><Moon size={18}/></span><div><strong>Dark appearance</strong><small>Use the dark interface</small></div><input type="checkbox" defaultChecked/></div><div className="setting-row"><span className="setting-icon"><Shield size={18}/></span><div><strong>Privacy</strong><small>Your presence is visible to contacts</small></div><span className="setting-value">On</span></div><div className="setting-row"><span className="setting-icon"><Palette size={18}/></span><div><strong>Theme</strong><small>Violet glass · Midnight</small></div><span className="setting-value">Default</span></div></div><div className="settings-card danger-card"><h2>Account</h2><p>Sign out of this device.</p><button className="logout-action" onClick={logout}><LogOut size={17}/> Log out</button></div></div>}
    </section>}
  </main>;
}
