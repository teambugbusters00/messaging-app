import { randomUUID } from "node:crypto";

const MAX_MESSAGE_LENGTH = 4000;
const DEFAULT_ROOM = "general";

// Temporary in-memory prototype store. Replace with a repository backed by PostgreSQL.
const messagesByRoom = new Map();

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function registerChatHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("chat:join", (payload = {}, ack = () => {}) => {
      const room = cleanText(payload.room) || DEFAULT_ROOM;
      if (room.length > 80) return ack({ ok: false, error: "Room name is too long." });

      socket.join(room);
      const history = messagesByRoom.get(room) || [];
      ack({ ok: true, room, messages: history });
    });

    socket.on("chat:send", (payload = {}, ack = () => {}) => {
      const room = cleanText(payload.room) || DEFAULT_ROOM;
      const text = cleanText(payload.text);
      const sender = cleanText(payload.sender) || "Guest";

      if (!socket.rooms.has(room)) return ack({ ok: false, error: "Join this room before sending messages." });
      if (!text) return ack({ ok: false, error: "Message cannot be empty." });
      if (text.length > MAX_MESSAGE_LENGTH) return ack({ ok: false, error: "Message is too long." });

      const message = {
        id: randomUUID(),
        room,
        sender: sender.slice(0, 40),
        text,
        createdAt: new Date().toISOString()
      };

      const history = messagesByRoom.get(room) || [];
      history.push(message);
      messagesByRoom.set(room, history.slice(-100));

      io.to(room).emit("chat:message", message);
      ack({ ok: true, message });
    });

    socket.on("chat:typing", (payload = {}) => {
      const room = cleanText(payload.room) || DEFAULT_ROOM;
      if (!socket.rooms.has(room)) return;
      socket.to(room).emit("chat:typing", {
        sender: cleanText(payload.sender).slice(0, 40) || "Someone",
        isTyping: Boolean(payload.isTyping)
      });
    });
  });
}
