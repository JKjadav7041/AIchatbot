// script.js - Fixed version with proper code block alignment
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messagesEl = document.getElementById("messages");
const typingEl = document.getElementById("typing");
const clearBtn = document.getElementById("clearBtn");
const langSelect = document.getElementById("langSelect");
const chatListEl = document.getElementById("chatList");
const newChatBtn = document.getElementById("newChatBtn");
const welcomeMsg = document.getElementById("welcomeMsg");
const currentChatNameEl = document.getElementById("currentChatName");
const modelSelect = document.getElementById("modelSelect");
const charCount = document.getElementById("charCount");

let history = []; // {role:'user'|'assistant', text: '...'}
let chats = [];
let currentChatId = null;

// Initialize character counter
if (input && charCount) {
  input.addEventListener('input', () => {
    charCount.textContent = `${input.value.length}/4000`;
  });
}

// Load chats from localStorage
function loadChats() {
  try {
    const saved = localStorage.getItem("jkchat_chats");
    chats = saved ? JSON.parse(saved) : [];
    if (chats.length === 0) {
      chats.push({ id: genId(), name: "New Chat", history: [] });
    }
    currentChatId = chats[0].id;
    renderChatList();
    loadChat(currentChatId);
  } catch (e) {
    console.error("Error loading chats:", e);
    chats = [{ id: genId(), name: "New Chat", history: [] }];
    currentChatId = chats[0].id;
    renderChatList();
    loadChat(currentChatId);
  }
}

// IMPROVED: appendMessage function with proper code formatting
function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role === "user" ? "user" : "assistant"}`;
  
  // Create avatar
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = role === "user" ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
  
  // Create message content
  const messageContent = document.createElement("div");
  messageContent.className = "message-content";
  messageContent.innerHTML = formatMessage(text);
  
  // Append elements
  div.appendChild(avatar);
  div.appendChild(messageContent);
  messagesEl.appendChild(div);

  // Add copy buttons to code blocks after DOM insertion
  setTimeout(() => {
    div.querySelectorAll("pre").forEach((pre) => {
      // Only add copy button if it doesn't already exist
      if (!pre.querySelector('.copy-btn')) {
        const btn = document.createElement("button");
        btn.className = "copy-btn";
        btn.textContent = "Copy";
        btn.onclick = () => {
          const code = pre.querySelector('code');
          const textToCopy = code ? code.textContent : pre.textContent;
          navigator.clipboard.writeText(textToCopy).then(() => {
            btn.textContent = "Copied!";
            setTimeout(() => btn.textContent = "Copy", 2000);
          }).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            btn.textContent = "Copied!";
            setTimeout(() => btn.textContent = "Copy", 2000);
          });
        };
        pre.appendChild(btn);
      }
    });
  }, 100);

  // Scroll to bottom
  messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
}

// IMPROVED: formatMessage function with better code block handling
function formatMessage(text) {
  // Step 1: Extract and preserve code blocks
  let codeBlocks = [];
  let codeBlockIndex = 0;
  
  // Handle code blocks with language specification
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlockIndex}__`;
    codeBlocks[codeBlockIndex] = {
      lang: lang || 'text',
      code: code.trim()
    };
    codeBlockIndex++;
    return placeholder;
  });

  // Step 2: Format bullet points and bold text (outside code blocks)
  text = text.replace(/^\*\s*\*\*([^*]+?)\*\*\s*:?\s*(.+)$/gm, (m, label, value) => 
    `→ ${label.trim()}: ${value.trim()}`);
  text = text.replace(/^\*\*([^*]+?)\*\*:?$/gm, (m, label) => `→ ${label.trim()}`);
  text = text.replace(/^\*\*([^*]+?)\*\*\s*(.+)$/gm, (m, label, value) => 
    `→ ${label.trim()}: ${value.trim()}`);

  // Step 3: Escape HTML entities (except placeholders)
  text = escapeHtml(text);

  // Step 4: Restore code blocks with proper HTML structure
  text = text.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
    const block = codeBlocks[index];
    if (block) {
      return `<pre><code class="language-${block.lang}">${escapeHtml(block.code)}</code></pre>`;
    }
    return match;
  });

  // Step 5: Handle inline code (backticks)
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Step 6: Convert line breaks to <br> tags, but preserve paragraph structure
  text = text.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags if content doesn't start with a block element
  if (!text.startsWith('<pre>') && !text.startsWith('<p>')) {
    text = `<p>${text}</p>`;
  }

  return text;
}

function setTyping(show) {
  typingEl.style.display = show ? "block" : "none";
  if (show) {
    messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
  }
}

function saveChats() {
  try {
    localStorage.setItem("jkchat_chats", JSON.stringify(chats));
  } catch (e) {
    console.error("Error saving chats:", e);
  }
}

function genId() {
  return "c" + Math.random().toString(36).slice(2, 10);
}

function renderChatList() {
  chatListEl.innerHTML = "";
  chats.forEach(chat => {
    const li = document.createElement("li");
    li.className = chat.id === currentChatId ? "active" : "";
    li.onclick = () => {
      if (currentChatId !== chat.id) {
        saveCurrentChatHistory();
        currentChatId = chat.id;
        loadChat(chat.id);
        renderChatList();
      }
    };

    // Editable chat name
    const nameInput = document.createElement("input");
    nameInput.value = chat.name;
    nameInput.className = "chat-name";
    nameInput.readOnly = true;
    nameInput.onblur = () => {
      nameInput.readOnly = true;
      const newName = nameInput.value.trim();
      if (newName && newName !== chat.name) {
        chat.name = newName;
        saveChats();
        if (chat.id === currentChatId) {
          currentChatNameEl.textContent = chat.name;
        }
      } else {
        nameInput.value = chat.name; // Restore original if empty
      }
    };
    nameInput.onkeydown = (e) => {
      if (e.key === "Enter") nameInput.blur();
      if (e.key === "Escape") {
        nameInput.value = chat.name;
        nameInput.blur();
      }
    };

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.title = "Edit name";
    editBtn.innerHTML = "✎";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      nameInput.readOnly = false;
      nameInput.focus();
      nameInput.select();
    };

    // Delete button
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.title = "Delete chat";
    delBtn.innerHTML = "🗑";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm("Delete this chat?")) {
        const idx = chats.findIndex(c => c.id === chat.id);
        chats.splice(idx, 1);
        if (chats.length === 0) {
          chats.push({ id: genId(), name: "New Chat", history: [] });
        }
        if (currentChatId === chat.id) {
          currentChatId = chats[0].id;
        }
        saveChats();
        renderChatList();
        loadChat(currentChatId);
      }
    };

    li.appendChild(nameInput);
    li.appendChild(editBtn);
    li.appendChild(delBtn);
    chatListEl.appendChild(li);
  });
  
  // Set current chat name in header
  const current = chats.find(c => c.id === currentChatId);
  if (current && currentChatNameEl) {
    currentChatNameEl.textContent = current.name;
  }
}

function saveCurrentChatHistory() {
  const chat = chats.find(c => c.id === currentChatId);
  if (chat) {
    chat.history = [...history]; // Create a copy
    saveChats();
  }
}

function loadChat(id) {
  const chat = chats.find(c => c.id === id);
  messagesEl.innerHTML = "";
  history = chat ? [...chat.history] : []; // Create a copy
  
  // Set current chat name in header
  if (currentChatNameEl) {
    currentChatNameEl.textContent = chat ? chat.name : "New Chat";
  }
  
  if (!history.length) {
    welcomeMsg.style.display = "block";
  } else {
    welcomeMsg.style.display = "none";
    history.forEach(msg => appendMessage(msg.role, msg.text));
  }
}

// IMPROVED: typeReply function with better formatting
async function typeReply(text) {
  const div = document.createElement("div");
  div.className = "msg assistant";
  
  // Create avatar
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = '<i class="fas fa-robot"></i>';
  
  // Create message content container
  const messageContent = document.createElement("div");
  messageContent.className = "message-content";
  
  div.appendChild(avatar);
  div.appendChild(messageContent);
  messagesEl.appendChild(div);
  
  // Typing animation
  let i = 0;
  const typeSpeed = 12;
  
  const typeInterval = setInterval(() => {
    if (i <= text.length) {
      messageContent.innerHTML = formatMessage(text.slice(0, i));
      messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
      i++;
    } else {
      clearInterval(typeInterval);
      
      // Add copy buttons after typing is complete
      setTimeout(() => {
        div.querySelectorAll("pre").forEach((pre) => {
          if (!pre.querySelector('.copy-btn')) {
            const btn = document.createElement("button");
            btn.className = "copy-btn";
            btn.textContent = "Copy";
            btn.onclick = () => {
              const code = pre.querySelector('code');
              const textToCopy = code ? code.textContent : pre.textContent;
              navigator.clipboard.writeText(textToCopy).then(() => {
                btn.textContent = "Copied!";
                setTimeout(() => btn.textContent = "Copy", 2000);
              }).catch(() => {
                // Fallback
                const textarea = document.createElement('textarea');
                textarea.value = textToCopy;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                btn.textContent = "Copied!";
                setTimeout(() => btn.textContent = "Copy", 2000);
              });
            };
            pre.appendChild(btn);
          }
        });
      }, 100);
    }
  }, typeSpeed);
}

// New chat button handler
newChatBtn.onclick = () => {
  saveCurrentChatHistory();
  const newChat = { id: genId(), name: "New Chat", history: [] };
  chats.unshift(newChat);
  currentChatId = newChat.id;
  saveChats();
  renderChatList();
  loadChat(currentChatId);
};

// Clear chat button handler
clearBtn.onclick = () => {
  if (confirm("Clear this conversation?")) {
    messagesEl.innerHTML = "";
    history = [];
    saveCurrentChatHistory();
    welcomeMsg.style.display = "block";
  }
};

// IMPROVED: Form submission handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  
  // Disable form during processing
  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;
  input.disabled = true;
  
  appendMessage("user", message);
  history.push({ role: "user", text: message });
  input.value = "";
  if (charCount) charCount.textContent = "0/4000";
  setTyping(true);
  welcomeMsg.style.display = "none";

  // Update chat name if this is the first message
  const currentChat = chats.find(c => c.id === currentChatId);
  if (currentChat && currentChat.history.length === 1) {
    currentChat.name = message.slice(0, 30) + (message.length > 30 ? "..." : "");
    renderChatList();
  }

  try {
    const provider = modelSelect.value || "gemini";
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ 
        message, 
        history: history.slice(0, -1), // Don't include the current message
        lang: langSelect.value || "en", 
        provider 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    setTyping(false);
    
    if (data.error) {
      appendMessage("assistant", `Error: ${data.error}`);
    } else {
      const reply = data.reply || "I'm sorry, I couldn't generate a response.";
      await typeReply(reply);
      history.push({ role: "assistant", text: reply });
      saveCurrentChatHistory();
    }
  } catch (err) {
    setTyping(false);
    console.error("Chat error:", err);
    appendMessage("assistant", `Network error: ${err.message}\n\nPlease check your connection and try again.`);
  } finally {
    // Re-enable form
    sendBtn.disabled = false;
    input.disabled = false;
    input.focus();
  }
});

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Enhanced input handling
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!e.target.disabled && e.target.value.trim()) {
      form.requestSubmit();
    }
  }
});

// Theme toggle functionality
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.onclick = () => {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    const icon = themeToggle.querySelector('i');
    if (icon) {
      icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
    }
    
    // Save theme preference
    localStorage.setItem("jkchat_theme", isDark ? "dark" : "light");
  };
  
  // Load saved theme
  const savedTheme = localStorage.getItem("jkchat_theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    const icon = themeToggle.querySelector('i');
    if (icon) icon.className = "fas fa-sun";
  }
}

// Search functionality
const chatSearch = document.getElementById("chatSearch");
if (chatSearch) {
  chatSearch.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const chatItems = chatListEl.querySelectorAll('li');
    
    chatItems.forEach(item => {
      const nameInput = item.querySelector('.chat-name');
      const chatName = nameInput ? nameInput.value.toLowerCase() : '';
      item.style.display = chatName.includes(query) ? 'flex' : 'none';
    });
  });
}

// Suggestion chips functionality
document.addEventListener('DOMContentLoaded', () => {
  const suggestionChips = document.querySelectorAll('.suggestion-chip');
  
  suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.textContent.trim();
      // Remove emoji and create a proper prompt
      const cleanText = text.replace(/^[^\w\s]+\s*/, '');
      let prompt = '';
      
      switch(cleanText) {
        case 'Get creative ideas':
          prompt = 'Help me brainstorm creative ideas for a project';
          break;
        case 'Analyze data':
          prompt = 'I need help analyzing some data. Can you guide me?';
          break;
        case 'Help with writing':
          prompt = 'I need assistance with writing. Can you help me improve my text?';
          break;
        case 'Solve problems':
          prompt = 'I have a problem I need help solving. Can you assist me?';
          break;
        default:
          prompt = `Help me ${cleanText.toLowerCase()}`;
      }
      
      input.value = prompt;
      input.focus();
    });
  });
});

// Initialize app
window.addEventListener('load', () => {
  loadChats();
  
  // Focus input on load
  if (input) {
    input.focus();
  }
  
  // Initialize character counter
  if (input && charCount) {
    charCount.textContent = `${input.value.length}/4000`;
  }
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && input) {
    input.focus();
  }
});

// Auto-save current chat when page unloads
window.addEventListener('beforeunload', () => {
  saveCurrentChatHistory();
});