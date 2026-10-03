export const emoji = {
  "check": "✅",
  "info": "ℹ️",
  "cross": "❌",
  "add": "➕",
  "reset": "🔄",
  "folder": "📁",
  "openfolder": "📂",
  "music": "🎵",
  "right": "▶️",
  "left": "◀️",
  "loading": "⏳",
  "play": "▶️",
  "pause": "⏸️",
  "skip": "⏭️",
  "previous": "⏮️",
  "stop": "⏹️",
  "volume": "🔊",
  "shuffle": "🔀",
  "loop": "🔁",
  "link": "🔗",
  "trash": "🗑️",
  "sparkles": "✨",
  get(name, fallback = '✨') {
    return this[name] || fallback;
  },
};

export default emoji;
