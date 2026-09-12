/**
 * Islamic History AI — Frontend
 * Conversations & preferences stored in localStorage.
 * All AI calls go through /api/chat (never expose API keys here).
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'islamic-history-ai-v1';
  const MAX_MESSAGE_LENGTH = 2000;
  const MAX_CONTEXT_MESSAGES = 10;

  /** @type {{ conversations: Array, activeId: string|null }} */
  let state = loadState();

  // DOM
  const els = {
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    menuBtn: document.getElementById('menuBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),
    historyList: document.getElementById('historyList'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    messageList: document.getElementById('messageList'),
    chatStage: document.getElementById('chatStage'),
    chatForm: document.getElementById('chatForm'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    mediaInput: document.getElementById('mediaInput'),
    attachBtn: document.getElementById('attachBtn'),
    mediaPreviewContainer: document.getElementById('mediaPreviewContainer')
  };

  let isSending = false;
  let currentAttachments = [];
  let currentTtsAudio = null;
  let currentTtsBtn = null;

  /* ---------- Storage ---------- */

  function defaultState() {
    return {
      conversations: [],
      activeId: null,
      aiModel: 'auto',
      
      // Phase 1 Data Models: Research Workspaces & Scholarly Features
      researchProjects: [],  // Array of { id, title, tags, created, updated }
      savedSources: [],      // Array of { id, projectId, title, author, url, notes }
      savedEntities: [],     // Array of { id, type (person|place|dynasty), name, data }
      userPreferences: {
        researchLevel: 'scholar', // beginner | student | scholar | researcher
        evidenceMode: false,
        theme: 'auto',
        language: 'en'
      }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // Ensure backward compatibility with Phase 1 data models
      const stateToReturn = { ...defaultState(), ...parsed, userPreferences: { ...defaultState().userPreferences, ...(parsed.userPreferences || {}) } }; 
      stateToReturn.userPreferences.researchLevel = 'scholar';
      return stateToReturn;
    } catch (e) {
      console.warn('Failed to parse local state', e);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid() {
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getActiveConversation() {
    return state.conversations.find((c) => c.id === state.activeId) || null;
  }

  function ensureConversation() {
    let conv = getActiveConversation();
    if (conv) return conv;
    conv = {
      id: uid(),
      title: 'New conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    state.conversations.unshift(conv);
    state.activeId = conv.id;
    saveState();
    return conv;
  }

  /* ---------- UI helpers ---------- */

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function setSidebarOpen(open) {
    if (window.innerWidth <= 900) {
      els.sidebar.classList.toggle('open', open);
      els.sidebarBackdrop.hidden = !open;
    } else {
      const shell = document.querySelector('.app-shell');
      if (open) {
        shell.classList.remove('sidebar-closed');
        localStorage.setItem('turath-sidebar-closed', 'false');
      } else {
        shell.classList.add('sidebar-closed');
        localStorage.setItem('turath-sidebar-closed', 'true');
      }
    }
  }

  function toggleSidebar() {
    if (window.innerWidth <= 900) {
      const isOpen = els.sidebar.classList.contains('open');
      setSidebarOpen(!isOpen);
    } else {
      const shell = document.querySelector('.app-shell');
      const isClosed = shell.classList.contains('sidebar-closed');
      setSidebarOpen(isClosed); // if closed, open it; if open, close it
    }
  }

  function autoResizeTextarea() {
    const el = els.messageInput;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  function setSending(sending) {
    isSending = sending;
    els.sendBtn.disabled = sending;
    els.messageInput.disabled = sending;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      els.chatStage.scrollTop = els.chatStage.scrollHeight;
    });
  }

  function showChatView(hasMessages) {
    els.welcomeScreen.hidden = hasMessages;
    els.messageList.hidden = !hasMessages;
    
    const mainPanel = document.querySelector('.main-panel');
    if (mainPanel) {
      if (hasMessages) {
        mainPanel.classList.remove('is-empty');
      } else {
        mainPanel.classList.add('is-empty');
      }
    }
  }

  function updateRightPanel(extras) {
    const rightPanel = document.getElementById('rightPanel');
    const sourcesList = document.getElementById('sourcesList');
    if (!rightPanel || !sourcesList || !extras) return;

    if (state.userPreferences.researchLevel !== 'scholar') {
      rightPanel.hidden = true;
      return;
    }

    const allSources = [...(extras.sources || []), ...(extras.matchedTopics || [])];
    
    if (allSources.length === 0) {
      sourcesList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No historical sources directly cited for this query.</p>';
    } else {
      sourcesList.innerHTML = allSources.map((src, idx) => {
        let title = src.title || src.work || '';
        if (typeof src === 'string') title = src;
        
        const period = src.period || src.era ? `<div class="source-card-meta">${src.period || src.era}</div>` : '';
        const author = src.source || src.author ? `<div class="source-card-meta">${src.source || src.author}</div>` : '';
        
        return `
          <div class="source-card" style="position: relative;">
            <button type="button" class="btn btn-ghost" onclick="saveSource('${title.replace(/'/g, "\\'")}', '${(src.source || src.author || '').replace(/'/g, "\\'")}')" style="position: absolute; right: 0.5rem; top: 0.5rem; padding: 4px; font-size: 0;" title="Save to Workspace">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </button>
            <h3 class="source-card-title" style="padding-right: 1.5rem;">${title}</h3>
            ${author}
            ${period}
          </div>
        `;
      }).join('');
    }
    
    rightPanel.hidden = false;
  }

  /* ---------- Phase 5: Timeline View ---------- */
  let timelineCache = [];

  async function loadTimelineData() {
    const timelineView = document.getElementById('timelineView');
    const track = document.getElementById('timelineTrack');
    if (!track) return;

    track.innerHTML = '<p style="text-align:center; padding: 2rem;">Loading historical records...</p>';
    try {
      // Use relative path to support file:// protocol and subdirectories
      const res = await fetch('assets/timeline.json?t=' + Date.now());
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      timelineCache = data.entries || [];
    } catch (err) {
      console.warn("Timeline fetch failed, using local fallback data.", err);
      // Fallback data structure in case JSON cannot be loaded
      timelineCache = [
        {
          "id": "fallback-1",
          "title": "Birth of Prophet Muhammad ﷺ",
          "period": "Prophetic Era",
          "year_ce": "570 CE",
          "summary": "Birth in Makkah.",
          "detailed_information": "Known as the Year of the Elephant.",
          "important_people": ["Prophet Muhammad ﷺ"],
          "location": "Makkah"
        },
        {
          "id": "fallback-2",
          "title": "The Hijrah",
          "period": "Prophetic Era",
          "year_hijri": "1 AH",
          "year_ce": "622 CE",
          "summary": "Migration to Madinah.",
          "detailed_information": "Marks the beginning of the Islamic Calendar.",
          "important_people": ["Prophet Muhammad ﷺ", "Abu Bakr"],
          "location": "Makkah to Madinah"
        },
        {
          "id": "fallback-3",
          "title": "Caliphate of Abu Bakr",
          "period": "Rashidun",
          "year_hijri": "11 AH",
          "year_ce": "632 CE",
          "summary": "First Rightly Guided Caliph.",
          "detailed_information": "Consolidated the state and initiated compilation of the Quran.",
          "important_people": ["Abu Bakr as-Siddiq"],
          "location": "Madinah"
        },
        {
          "id": "fallback-4",
          "title": "Establishment of the Umayyad Dynasty",
          "period": "Umayyad",
          "year_hijri": "41 AH",
          "year_ce": "661 CE",
          "summary": "Mu'awiyah becomes Caliph.",
          "detailed_information": "Capital moved to Damascus. Significant territorial expansion.",
          "important_people": ["Mu'awiyah I"],
          "location": "Damascus"
        },
        {
          "id": "fallback-5",
          "title": "House of Wisdom (Bayt al-Hikmah)",
          "period": "Abbasid",
          "year_hijri": "198 AH",
          "year_ce": "813 CE",
          "summary": "Flourishing of science and translation.",
          "detailed_information": "Under Caliph Al-Ma'mun, Baghdad became the intellectual center of the world.",
          "important_people": ["Al-Ma'mun", "Al-Khwarizmi", "Al-Kindi"],
          "location": "Baghdad"
        }
      ];
    }
    
    renderTimeline('all');
    timelineView.setAttribute('data-loaded', 'true');
  }

  function renderTimeline(eraFilter) {
    const track = document.getElementById('timelineTrack');
    if (!track) return;
    
    const filtered = eraFilter === 'all' 
      ? timelineCache 
      : timelineCache.filter(e => e.period && e.period.toLowerCase().includes(eraFilter.toLowerCase()));

    if (filtered.length === 0) {
      track.innerHTML = '<p>No events found for this era.</p>';
      return;
    }

    track.innerHTML = filtered.map(e => {
      const detailed = e.detailed_information ? `<p style="margin-top: 0.75rem; color: var(--text); font-size: 0.95rem; line-height: 1.6;">${e.detailed_information}</p>` : '';
      const significance = e.historical_significance ? `<p style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.9rem;"><strong>Significance:</strong> ${e.historical_significance}</p>` : '';
      const location = e.location ? `<span style="display: inline-block; margin-top: 0.5rem; margin-right: 0.5rem; font-size: 0.75rem; padding: 2px 6px; border: 1px solid var(--border); border-radius: 4px; color: var(--text-muted);">📍 ${e.location}</span>` : '';
      const period = e.period ? `<span style="display: inline-block; margin-top: 0.5rem; font-size: 0.75rem; padding: 2px 6px; border: 1px solid var(--border); border-radius: 4px; color: var(--gold);">${e.period}</span>` : '';
      
      let people = '';
      if (e.important_people && e.important_people.length > 0) {
        people = `<div style="margin-top: 0.5rem;"><strong>Key Figures:</strong> <span style="color: var(--text-muted); font-size: 0.9rem;">${e.important_people.join(', ')}</span></div>`;
      }

      return `
        <div style="position: relative; padding-bottom: 2.5rem;">
          <div style="position: absolute; left: -1.85rem; top: 0.25rem; width: 12px; height: 12px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 0 4px var(--bg-body);"></div>
          <div style="color: var(--gold); font-size: 0.85rem; font-weight: 600; letter-spacing: 0.5px;">${e.year_hijri || ''} / ${e.year_ce || ''}</div>
          <h3 style="margin: 0.25rem 0 0.5rem 0; font-size: 1.25rem; font-family: var(--font-serif);">${e.title}</h3>
          
          <div style="background: var(--surface); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); margin-top: 0.75rem;">
            <p style="color: var(--gold); font-size: 1rem; font-weight: 500; margin: 0 0 0.5rem 0;">Overview</p>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin: 0;">${e.summary}</p>
            ${detailed}
            ${significance}
            ${people}
          </div>
          
          <div style="margin-top: 0.5rem;">
            ${location}
            ${period}
          </div>
        </div>
      `;
    }).join('');
  }


  /* ---------- Phase 6: Workspace ---------- */
  function renderWorkspace() {
    const elEntities = document.getElementById('workspaceEntitiesList');
    const elSourcesSub = document.getElementById('workspaceSourcesSubList');
    const elSourcesMain = document.getElementById('sourcesViewList');

    if (elEntities) {
      if (state.savedEntities.length === 0) {
        elEntities.innerHTML = '<p class="empty-state-text">No saved entities found.</p>';
      } else {
        elEntities.innerHTML = state.savedEntities.map(e => `
          <div style="padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-body); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: var(--text); font-size: 0.95rem;">${e.title}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">${e.type || 'Entity'}</div>
            </div>
            <button type="button" class="btn btn-ghost" onclick="askAboutEntity('${e.title}')" style="font-size: 0.7rem; padding: 0.25rem 0.5rem;">Ask AI</button>
          </div>
        `).join('');
      }
    }

    const renderSources = (container) => {
      if (!container) return;
      if (state.savedSources.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="text-align: center; padding: 3rem 1rem;">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1" style="color: var(--gold); opacity: 0.5; margin-bottom: 1rem;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            <h3 style="color: var(--text); font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 0.5rem;">Your research library is empty</h3>
            <p style="color: var(--text-muted);">Save important sources while researching Islamic history and return to them anytime.</p>
          </div>`;
      } else {
        container.innerHTML = state.savedSources.map((s, index) => {
          const date = new Date(s.savedAt || Date.now()).toLocaleDateString();
          return `
          <div style="position: relative; padding: 1.25rem; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <strong style="color: var(--gold); font-size: 1.1rem; font-family: var(--font-serif); display: block; margin-bottom: 0.25rem;">${s.title}</strong>
                ${s.author ? `<div style="font-size: 0.9rem; color: var(--text); margin-bottom: 0.5rem;">${s.author}</div>` : ''}
              </div>
              <button type="button" class="icon-btn" onclick="removeSource(${index})" title="Remove Bookmark" style="color: var(--text-muted); opacity: 0.7;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              </button>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; border-top: 1px solid var(--border); padding-top: 0.5rem;">
              Saved on ${date}
            </div>
          </div>
        `}).join('');
      }
    };

    renderSources(elSourcesSub);
    renderSources(elSourcesMain);
  }

  window.removeSource = function(index) {
    state.savedSources.splice(index, 1);
    saveState();
    renderWorkspace();
  };

  // Global helper for workspace buttons
  window.askAboutEntity = function(title) {
    document.querySelector('.nav-item[data-view="chat"]').click();
    sendMessage(`Tell me everything you know about ${title}, focusing on its historical significance and primary sources.`);
  };
  
  window.saveSource = function(title, author) {
    if (!state.savedSources.some(s => s.title === title)) {
      state.savedSources.push({ title, author, savedAt: Date.now() });
      saveState();
      renderWorkspace();
      alert('Saved to Workspace!');
    } else {
      alert('Source already saved!');
    }
  };

  /* ---------- Render ---------- */



  function renderHistory() {
    els.historyList.innerHTML = '';
    if (!state.conversations.length) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'No saved conversations yet.';
      els.historyList.appendChild(empty);
      return;
    }

    state.conversations.forEach((conv) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item' + (conv.id === state.activeId ? ' active' : '');
      btn.setAttribute('role', 'listitem');
      btn.textContent = conv.title || 'Conversation';
      btn.addEventListener('click', () => {
        state.activeId = conv.id;
        saveState();
        renderAll();
        setSidebarOpen(false);
      });
      els.historyList.appendChild(btn);
    });
  }

  function createAvatar(role) {
    const div = document.createElement('div');
    div.className = 'avatar ' + (role === 'user' ? 'user' : 'ai');
    div.setAttribute('aria-hidden', 'true');
    div.style.overflow = 'hidden';
    div.style.padding = '0';
    div.style.background = 'transparent';
    div.style.border = 'none';

    if (role === 'ai') {
      div.style.width = '40px';
      div.innerHTML = `<img src="assets/turath-logo.jpg" alt="AI" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px; border: 1px solid var(--border-strong);">`;
    } else {
      if (state.userAvatar) {
        div.style.width = '40px';
        div.innerHTML = `<img src="${state.userAvatar}" alt="User" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px; border: 1px solid var(--border-strong);">`;
      } else {
        let userNameText = 'YOU';
        if (window.netlifyIdentity && window.netlifyIdentity.currentUser()) {
          const user = window.netlifyIdentity.currentUser();
          userNameText = (user.user_metadata?.full_name || user.email.split('@')[0]).toUpperCase();
        }
        div.style.width = 'max-content';
        div.style.minWidth = '40px';
        div.innerHTML = `<div style="width: 100%; height: 100%; display: grid; place-items: center; background: var(--user-bubble); color: var(--parchment); border-radius: 12px; font-size: 0.75rem; font-weight: 700; border: 1px solid var(--border); padding: 0 0.6rem;">${userNameText}</div>`;
      }
    }
    return div;
  }

  function appendMessageElement(message) {
    const row = document.createElement('article');
    row.className = 'message ' + message.role;
    row.setAttribute('aria-label', message.role === 'user' ? 'Your message' : 'AI response');

    const bubbleWrap = document.createElement('div');
    bubbleWrap.className = 'bubble-wrap';
    bubbleWrap.setAttribute('dir', 'auto');

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    // Render Attachments
    if (message.attachments && message.attachments.length > 0) {
      const attContainer = document.createElement('div');
      attContainer.style.display = 'flex';
      attContainer.style.gap = '8px';
      attContainer.style.marginBottom = message.content ? '8px' : '0';
      attContainer.style.flexWrap = 'wrap';
      
      message.attachments.forEach(att => {
        if (att.type.startsWith('image/')) {
          const img = document.createElement('img');
          img.src = att.data;
          img.style.width = '64px';
          img.style.height = '64px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '6px';
          img.style.border = '1px solid var(--border)';
          attContainer.appendChild(img);
        } else {
          const docBadge = document.createElement('div');
          docBadge.style.width = '64px';
          docBadge.style.height = '64px';
          docBadge.style.display = 'flex';
          docBadge.style.alignItems = 'center';
          docBadge.style.justifyContent = 'center';
          docBadge.style.background = 'var(--bg-elevated)';
          docBadge.style.border = '1px solid var(--border)';
          docBadge.style.borderRadius = '6px';
          docBadge.style.fontSize = '0.75rem';
          docBadge.style.color = 'var(--text-muted)';
          docBadge.style.fontWeight = 'bold';
          docBadge.textContent = 'PDF';
          attContainer.appendChild(docBadge);
        }
      });
      bubble.appendChild(attContainer);
    }
    
    const textNode = document.createElement('div');
    if (message.role === 'assistant' && typeof marked !== 'undefined') {
      textNode.innerHTML = marked.parse(message.content);
    } else {
      textNode.textContent = message.content;
    }
    bubble.appendChild(textNode);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.style.display = 'flex';
    meta.style.alignItems = 'center';
    meta.style.gap = '8px';
    
    const timeSpan = document.createElement('span');
    timeSpan.textContent = formatTime(message.timestamp || Date.now());
    meta.appendChild(timeSpan);

    if (message.role === 'assistant') {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-ghost';
      copyBtn.style.padding = '2px 6px';
      copyBtn.style.fontSize = '0.7rem';
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy';
      
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(message.content);
          const originalHtml = copyBtn.innerHTML;
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied';
          setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
        } catch (err) {
          console.error('Failed to copy text:', err);
        }
      });
      meta.appendChild(copyBtn);

      const ttsBtn = document.createElement('button');
      ttsBtn.type = 'button';
      ttsBtn.className = 'btn btn-ghost';
      ttsBtn.style.padding = '2px 6px';
      ttsBtn.style.fontSize = '0.7rem';
      
      const playIcon = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Read Aloud';
      const stopIcon = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 2px;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Stop';
      
      ttsBtn.innerHTML = playIcon;
      
      ttsBtn.addEventListener('click', () => {
        // If this button's audio is currently playing, stop it
        if (currentTtsBtn === ttsBtn) {
          if (ttsBtn._stopTts) ttsBtn._stopTts();
          ttsBtn.innerHTML = playIcon;
          currentTtsAudio = null;
          currentTtsBtn = null;
          return;
        }

        // If another audio is playing, stop it and reset its button
        if (currentTtsBtn && currentTtsBtn._stopTts) {
          currentTtsBtn._stopTts();
          currentTtsBtn.innerHTML = playIcon;
        }

        // Native Browser TTS Fallback
        const cleanText = message.content.replace(/[#*`_\[\]]/g, '').trim();
        
        ttsBtn.innerHTML = stopIcon;
        currentTtsBtn = ttsBtn;
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        // Try to find a good male English voice
        const voices = window.speechSynthesis.getVoices();
        
        const preferredVoice = voices.find(v => 
          v.name.includes('Google UK English Male') || 
          v.name.includes('Microsoft George') || 
          v.name.includes('Microsoft David') || 
          v.name.includes('Microsoft Mark') ||
          v.name.includes('Daniel') || 
          v.name.includes('Arthur')
        ) || voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male'))
          || voices.find(v => v.lang.startsWith('en-GB'))
          || voices.find(v => v.lang.startsWith('en'))
          || voices[0];
          
        if (preferredVoice) utterance.voice = preferredVoice;
        
        // Medium / conversational speed
        utterance.rate = 0.9;
        utterance.pitch = 0.95; // slightly deeper for a more natural male tone
        
        utterance.onend = () => {
          ttsBtn.innerHTML = playIcon;
          if (currentTtsBtn === ttsBtn) {
            currentTtsBtn = null;
          }
        };
        
        utterance.onerror = () => {
          ttsBtn.innerHTML = playIcon;
          currentTtsBtn = null;
          alert('Text-to-speech failed or was interrupted.');
        };
        
        ttsBtn._stopTts = () => {
          window.speechSynthesis.cancel();
        };

        window.speechSynthesis.cancel(); // stop any current speech
        window.speechSynthesis.speak(utterance);
      });
      
      meta.appendChild(ttsBtn);
    }

    bubbleWrap.appendChild(bubble);
    bubbleWrap.appendChild(meta);

    if (message.role === 'assistant' && message.extras) {
      bubbleWrap.appendChild(renderExtras(message.extras));
    }

    if (message.role === 'user') {
      row.appendChild(bubbleWrap);
      row.appendChild(createAvatar('user'));
    } else {
      row.appendChild(createAvatar('ai'));
      row.appendChild(bubbleWrap);
    }

    els.messageList.appendChild(row);
    return row;
  }

  function renderExtras(extras) {
    const wrap = document.createElement('div');
    wrap.className = 'message-extras';

    // Historical uncertainty badge
    if (extras.historicalUncertainty) {
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = 'Historical accounts vary on this topic.';
      wrap.appendChild(badge);
    }

    const topics = extras.matchedTopics || [];
    const webSources = extras.webSources || [];

    // Render Topics as Clickable Entities (Phase 4)
    if (topics.length > 0) {
      const entityGroup = document.createElement('div');
      entityGroup.className = 'entity-pills';
      entityGroup.style.display = 'flex';
      entityGroup.style.flexWrap = 'wrap';
      entityGroup.style.gap = '0.5rem';
      entityGroup.style.marginTop = '0.5rem';

      topics.forEach(({ title, period, source }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-ghost';
        btn.style.fontSize = '0.75rem';
        btn.style.padding = '0.2rem 0.6rem';
        btn.style.border = '1px solid var(--border)';
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><circle cx="12" cy="12" r="10"></circle></svg>${title}`;
        
        btn.addEventListener('click', () => {
          document.getElementById('entityModalTitle').textContent = title;
          document.getElementById('entityModalType').textContent = period ? 'Era' : 'Entity';
          document.getElementById('entityModalPeriod').textContent = period || 'Various periods';
          document.getElementById('entityModalBody').innerHTML = `<p><strong>Primary Source:</strong> ${source || 'General historical consensus'}</p><p>This entity was retrieved from the Turath knowledge base as relevant to your query.</p>`;
          
          document.getElementById('entityModal').showModal();
        });
        
        entityGroup.appendChild(btn);
      });
      wrap.appendChild(entityGroup);
    }

    if (webSources.length > 0) {
      const box = document.createElement('div');
      box.className = 'sources-box';
      const h = document.createElement('h3');
      h.textContent = 'Web Sources';
      const ul = document.createElement('ul');
      ul.className = 'web-sources-list';


      // Web Search citations
      webSources.forEach((s) => {
        const li = document.createElement('li');
        li.className = 'source-item web-source';
        const a = document.createElement('a');
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = s.title;
        a.className = 'web-source-link';
        
        const badge = document.createElement('span');
        badge.className = 'tag-era';
        badge.style.marginLeft = '0.5rem';
        badge.textContent = 'Web';
        
        li.appendChild(a);
        li.appendChild(badge);
        ul.appendChild(li);
      });

      box.appendChild(h);
      box.appendChild(ul);
      wrap.appendChild(box);
    }

    // Explore further has been removed per user request


    // Provider attribution
    if (extras.provider) {
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = extras.fallbackUsed
        ? `Answered via ${extras.provider} (fallback)`
        : `Answered via ${extras.provider}`;
      wrap.appendChild(meta);
    }

    return wrap;
  }

  function renderMessages() {
    els.messageList.innerHTML = '';
    const conv = getActiveConversation();
    const messages = conv?.messages || [];
    showChatView(messages.length > 0);
    messages.forEach((m) => appendMessageElement(m));
    scrollToBottom();
  }

  function renderAll() {
    renderHistory();
    renderMessages();
  }

  function showTyping() {
    const row = document.createElement('article');
    row.className = 'message assistant';
    row.id = 'typingRow';
    
    const avatar = createAvatar('ai');
    row.appendChild(avatar);
    
    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap';
    
    const bubble = document.createElement('div');
    bubble.className = 'bubble typing-bubble';
    bubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    
    wrap.appendChild(bubble);
    row.appendChild(wrap);
    
    els.messageList.appendChild(row);
    showChatView(true);
    scrollToBottom();
  }

  function removeTyping() {
    document.getElementById('typingRow')?.remove();
  }

  function showError(text) {
    removeTyping();
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.setAttribute('role', 'alert');
    banner.textContent = text;
    els.messageList.appendChild(banner);
    scrollToBottom();
    setTimeout(() => banner.remove(), 8000);
  }

  /* ---------- Chat actions ---------- */

  function titleFromMessage(text) {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > 48 ? clean.slice(0, 48) + '…' : clean;
  }

  async function startTopic(prompt) {
    state.activeId = null;
    ensureConversation();
    renderAll();
    await sendMessage(prompt);
  }

  function newConversation() {
    state.activeId = null;
    ensureConversation();
    renderAll();
    els.messageInput.focus();
    setSidebarOpen(false);
  }

  function clearCurrentChat() {
    const conv = getActiveConversation();
    if (!conv) {
      showChatView(false);
      return;
    }
    conv.messages = [];
    conv.title = 'New conversation';
    conv.updatedAt = Date.now();
    saveState();
    renderAll();
  }

  function clearAllHistory() {
    if (!confirm('Clear all recent research history?')) return;
    state.conversations = [];
    state.activeId = null;
    saveState();
    renderAll();
  }

  async function sendMessage(text) {
    if (isSending) return;

    const message = String(text || '').trim();
    if (!message) return;
    if (message.length > MAX_MESSAGE_LENGTH) {
      showError(`Please keep messages under ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    const conv = ensureConversation();
    showChatView(true);

    const userMsg = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    if (currentAttachments.length > 0) {
      userMsg.attachments = [...currentAttachments];
    }
    conv.messages.push(userMsg);
    if (conv.messages.filter((m) => m.role === 'user').length === 1) {
      conv.title = titleFromMessage(message);
    }
    conv.updatedAt = Date.now();
    saveState();
    renderHistory();
    appendMessageElement(userMsg);
    els.messageInput.value = '';
    autoResizeTextarea();
    scrollToBottom();

    setSending(true);
    showTyping();

    const conversationPayload = conv.messages
      .slice(0, -1)
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content }));

    const payload = {
      message,
      conversation: conversationPayload,
      preferredProvider: state.aiModel !== 'auto' ? state.aiModel : undefined,
      researchLevel: state.userPreferences.researchLevel,
      language: state.userPreferences.language || 'en'
    };

    if (currentAttachments.length > 0) {
      payload.attachments = [...currentAttachments];
      currentAttachments = [];
      renderMediaPreview();
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      removeTyping();

      if (!response.ok || !data.success) {
        showError(data.error || 'Something went wrong. Please try again.');
        setSending(false);
        return;
      }

      const assistantMsg = {
        role: 'assistant',
        content: data.answer || '',
        timestamp: Date.now(),
        extras: {
          sources: data.sources || [],
          webSources: data.webSources || [],
          matchedTopics: data.matchedTopics || [],
          relatedQuestions: data.relatedQuestions || [],
          historicalUncertainty: Boolean(data.historicalUncertainty),
          provider: data.provider,
          fallbackUsed: Boolean(data.fallbackUsed)
        }
      };

      conv.messages.push(assistantMsg);
      conv.updatedAt = Date.now();
      saveState();
      appendMessageElement(assistantMsg);
      renderHistory();
      scrollToBottom();
      
      // Phase 3: Populate right panel
      updateRightPanel(assistantMsg.extras);
    } catch {
      removeTyping();
      showError('Network error. Check your connection or local server, then try again.');
    } finally {
      setSending(false);
      els.messageInput.focus();
    }
  }

  /* ---------- Events ---------- */
  function renderMediaPreview() {
    if (!els.mediaPreviewContainer) return;
    els.mediaPreviewContainer.innerHTML = '';
    
    if (currentAttachments.length === 0) {
      els.mediaPreviewContainer.hidden = true;
      return;
    }
    
    els.mediaPreviewContainer.hidden = false;
    currentAttachments.forEach((att, idx) => {
      const item = document.createElement('div');
      item.className = 'media-preview-item';
      
      if (att.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = att.data;
        item.appendChild(img);
      } else {
        const docIcon = document.createElement('div');
        docIcon.style.color = 'var(--text-muted)';
        docIcon.style.fontSize = '0.75rem';
        docIcon.style.display = 'flex';
        docIcon.style.alignItems = 'center';
        docIcon.style.justifyContent = 'center';
        docIcon.style.width = '100%';
        docIcon.style.height = '100%';
        docIcon.style.fontWeight = 'bold';
        docIcon.textContent = 'PDF';
        item.appendChild(docIcon);
      }
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.onclick = () => {
        currentAttachments.splice(idx, 1);
        renderMediaPreview();
      };
      
      item.appendChild(removeBtn);
      els.mediaPreviewContainer.appendChild(item);
    });
  }

  function bindEvents() {
    els.themeToggleBtn?.addEventListener('click', toggleTheme);
    els.menuBtn.addEventListener('click', toggleSidebar);
    els.sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));
    els.newChatBtn.addEventListener('click', newConversation);
    els.clearChatBtn.addEventListener('click', clearCurrentChat);
    els.clearAllHistoryBtn.addEventListener('click', clearAllHistory);

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (!state.currentChatId || !state.history[state.currentChatId]) {
          alert('No active conversation to export.');
          return;
        }
        
        const chat = state.history[state.currentChatId];
        let md = `# Turath Research Export\n\n**Date:** ${new Date().toLocaleDateString()}\n**Topic:** ${chat.title}\n\n---\n\n`;
        
        chat.messages.forEach(m => {
          const role = m.role === 'user' ? '### You' : '### Turath (AI)';
          md += `${role}\n\n${m.content}\n\n`;
        });
        
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Turath_Export_${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    if (els.attachBtn && els.mediaInput) {
      els.attachBtn.addEventListener('click', () => els.mediaInput.click());
      
      els.mediaInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
          if (file.size > 4 * 1024 * 1024) {
            alert(`File ${file.name} is too large. Max size is 4MB.`);
            continue;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            currentAttachments.push({
              name: file.name,
              type: file.type,
              data: ev.target.result
            });
            renderMediaPreview();
          };
          reader.readAsDataURL(file);
        }
        els.mediaInput.value = '';
      });
    }

    els.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      document.querySelector('.nav-item[data-view="chat"]').click(); // Auto-switch to chat view
      sendMessage(els.messageInput.value);
    });

    els.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.querySelector('.nav-item[data-view="chat"]').click(); // Auto-switch to chat view
        sendMessage(els.messageInput.value);
      }
    });

    els.messageInput.addEventListener('input', autoResizeTextarea);
    window.addEventListener('resize', autoResizeTextarea);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        const rightPanel = document.getElementById('rightPanel');
        if (rightPanel) rightPanel.hidden = true;
      }
    });

    // Welcome Screen Quick Actions
    const welcomeActionBtns = document.querySelectorAll('.quick-actions button, .quick-action-card');
    const welcomePrompts = [
      "I'd like to research a topic in Islamic history: ",
      "Tell me about the historical figure ",
      "Trace the history and timeline of ",
      "What primary sources cover "
    ];
    welcomeActionBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const chatNav = document.querySelector('.nav-item[data-view="chat"]');
        if (chatNav) chatNav.click();
        const prompt = welcomePrompts[index] || "Tell me about Islamic history: ";
        els.messageInput.value = prompt;
        autoResizeTextarea();
        els.messageInput.focus();
        // Place cursor at the end of the text
        els.messageInput.selectionStart = els.messageInput.selectionEnd = els.messageInput.value.length;
      });
    });

    // View Navigation (Phase 5)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        
        // Update active state
        navItems.forEach(n => n.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // Hide all views
        document.getElementById('chatStage').hidden = true;
        const timelineView = document.getElementById('timelineView');
        if (timelineView) timelineView.hidden = true;
        const exploreView = document.getElementById('exploreView');
        if (exploreView) exploreView.hidden = true;
        const sourcesView = document.getElementById('sourcesView');
        if (sourcesView) sourcesView.hidden = true;
        const workspaceView = document.getElementById('workspaceView');
        if (workspaceView) workspaceView.hidden = true;
        
        // Close right panel
        document.getElementById('rightPanel').hidden = true;
        
        // Show target view
        if (view === 'chat') {
          document.getElementById('chatStage').hidden = false;
        } else if (view === 'timeline') {
          if (timelineView) {
            timelineView.hidden = false;
            if (timelineView.getAttribute('data-loaded') !== 'true') {
              loadTimelineData();
            }
          }
        } else if (view === 'explore' && exploreView) {
          exploreView.hidden = false;
        } else if (view === 'sources' && sourcesView) {
          sourcesView.hidden = false;
        } else if (view === 'workspace' && workspaceView) {
          workspaceView.hidden = false;
        }
        
        // On mobile, close sidebar after navigating
        if (window.innerWidth <= 900) {
          setSidebarOpen(false);
        }
      });
    });

    // Timeline Filters (Phase 5)
    const timelineFilters = document.querySelectorAll('.timeline-filters .btn');
    timelineFilters.forEach(btn => {
      btn.addEventListener('click', (e) => {
        timelineFilters.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const era = e.currentTarget.getAttribute('data-era');
        renderTimeline(era);
      });
    });

    // Right Panel Logic
    const closeRightPanelBtn = document.getElementById('closeRightPanelBtn');
    if (closeRightPanelBtn) {
      closeRightPanelBtn.addEventListener('click', () => {
        document.getElementById('rightPanel').hidden = true;
      });
    }

    // Entity Modal Logic
    const closeEntityBtn = document.getElementById('closeEntityBtn');
    if (closeEntityBtn) {
      closeEntityBtn.addEventListener('click', () => {
        document.getElementById('entityModal').close();
      });
    }
    
    const entityAskBtn = document.getElementById('entityAskBtn');
    if (entityAskBtn) {
      entityAskBtn.addEventListener('click', () => {
        const title = document.getElementById('entityModalTitle').textContent;
        document.getElementById('entityModal').close();
        sendMessage(`Tell me everything you know about ${title}, focusing on its historical significance and primary sources.`);
      });
    }

    const entitySaveBtn = document.getElementById('entitySaveBtn');
    if (entitySaveBtn) {
      entitySaveBtn.addEventListener('click', () => {
        const title = document.getElementById('entityModalTitle').textContent;
        const type = document.getElementById('entityModalType').textContent;
        
        if (!state.savedEntities.some(e => e.title === title)) {
          state.savedEntities.push({ title, type, savedAt: Date.now() });
          saveState();
          renderWorkspace();
        }
        
        const originalHtml = entitySaveBtn.innerHTML;
        entitySaveBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg> Saved';
        setTimeout(() => { entitySaveBtn.innerHTML = originalHtml; }, 2000);
      });
    }

    const sidebarAboutBtn = document.getElementById('sidebarAboutBtn');
    const aboutModal = document.getElementById('aboutModal');
    const closeAboutBtn = document.getElementById('closeAboutBtn');

    if (sidebarAboutBtn && aboutModal && closeAboutBtn) {
      sidebarAboutBtn.addEventListener('click', () => aboutModal.showModal());
      closeAboutBtn.addEventListener('click', () => aboutModal.close());
    }

    const sidebarContactBtn = document.getElementById('sidebarContactBtn');
    const contactModal = document.getElementById('contactModal');
    const closeContactBtn = document.getElementById('closeContactBtn');

    if (sidebarContactBtn && contactModal && closeContactBtn) {
      sidebarContactBtn.addEventListener('click', () => contactModal.showModal());
      closeContactBtn.addEventListener('click', () => contactModal.close());
    }

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const avatarUpload = document.getElementById('avatarUpload');
    const userAvatarEl = document.getElementById('userAvatar');

    function updateAvatarDisplay() {
      if (!userAvatarEl) return;
      if (state.userAvatar) {
        userAvatarEl.innerHTML = `<img src="${state.userAvatar}" alt="User Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
      } else {
        userAvatarEl.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      }
    }

    // Call once on load
    updateAvatarDisplay();

    const settingsThemeSelect = document.getElementById('settingsThemeSelect');
    const settingsLangSelect = document.getElementById('settingsLangSelect');
    const settingsExportDataBtn = document.getElementById('settingsExportDataBtn');
    const settingsWipeDataBtn = document.getElementById('settingsWipeDataBtn');

    if (settingsBtn && settingsModal && closeSettingsBtn) {
      settingsBtn.addEventListener('click', () => {
        // Sync selects with current state
        if (settingsThemeSelect) {
          settingsThemeSelect.value = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
        }
        if (settingsLangSelect && state.userPreferences && state.userPreferences.language) {
          settingsLangSelect.value = state.userPreferences.language;
        }
        settingsModal.showModal();
      });
      closeSettingsBtn.addEventListener('click', () => settingsModal.close());
    }

    if (settingsThemeSelect) {
      settingsThemeSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
      });
    }

    if (settingsLangSelect) {
      settingsLangSelect.addEventListener('change', (e) => {
        state.userPreferences.language = e.target.value;
        saveState();
      });
    }

    if (settingsExportDataBtn) {
      settingsExportDataBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Turath_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    if (settingsWipeDataBtn) {
      settingsWipeDataBtn.addEventListener('click', () => {
        if (confirm('Are you absolutely sure you want to wipe ALL research, saved sources, entities, and chat history? This cannot be undone.')) {
          localStorage.removeItem('turath_state');
          localStorage.removeItem('turath_theme');
          location.reload();
        }
      });
    }

    const avatarDropZone = document.getElementById('avatarDropZone');
    const avatarFileName = document.getElementById('avatarFileName');
    
    function handleAvatarFile(file) {
      if (file && file.type.startsWith('image/')) {
        if (avatarFileName) avatarFileName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(event) {
          state.userAvatar = event.target.result;
          saveState();
          updateAvatarDisplay();
        };
        reader.readAsDataURL(file);
      }
    }

    if (avatarUpload && avatarDropZone) {
      // Click to trigger input
      avatarDropZone.addEventListener('click', () => {
        avatarUpload.click();
      });

      // Handle standard file input change
      avatarUpload.addEventListener('change', (e) => {
        handleAvatarFile(e.target.files[0]);
      });

      // Drag and Drop events
      avatarDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        avatarDropZone.classList.add('drag-active');
      });

      avatarDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        avatarDropZone.classList.remove('drag-active');
      });

      avatarDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        avatarDropZone.classList.remove('drag-active');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          avatarUpload.files = e.dataTransfer.files;
          handleAvatarFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Initialize logic
    renderHistory();
  }

  /* ---------- Theme Handling ---------- */
  function initTheme() {
    const savedTheme = localStorage.getItem('theme_preference');
    if (savedTheme) {
      applyTheme(savedTheme);
    } else {
      applyTheme('dark');
    }
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      localStorage.setItem('theme_preference', 'light');
      if (els.themeToggleBtn) {
        els.themeToggleBtn.querySelector('.sun-icon').style.display = 'none';
        els.themeToggleBtn.querySelector('.moon-icon').style.display = 'block';
      }
    } else {
      document.documentElement.classList.remove('theme-light');
      localStorage.setItem('theme_preference', 'dark');
      if (els.themeToggleBtn) {
        els.themeToggleBtn.querySelector('.sun-icon').style.display = 'block';
        els.themeToggleBtn.querySelector('.moon-icon').style.display = 'none';
      }
    }
  }

  function toggleTheme() {
    const isLight = document.documentElement.classList.contains('theme-light');
    applyTheme(isLight ? 'dark' : 'light');
  }

  function updateWelcomeTitle(name = '') {
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle) {
      const hour = new Date().getHours();
      let timeGreeting = 'Good evening';
      if (hour < 12) timeGreeting = 'Good morning';
      else if (hour < 18) timeGreeting = 'Good afternoon';
      
      const greetingName = name ? `, ${name.toUpperCase()}` : '';
      welcomeTitle.textContent = `${timeGreeting}${greetingName}`;
    }
  }
  
  updateWelcomeTitle();

  /* ---------- Netlify Identity ---------- */
  function initAuth() {
    if (window.netlifyIdentity) {
      window.netlifyIdentity.init();
      const authBtn = document.getElementById('authBtn');

      function updateAuthUI(user) {
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');
        
        let nameToDisplay = '';
        
        if (user) {
          const name = user.user_metadata?.full_name || user.email.split('@')[0];
          nameToDisplay = name;
          userName.textContent = name;
          userEmail.textContent = user.email;
          userAvatar.innerHTML = name.charAt(0).toUpperCase();
        } else {
          userName.textContent = 'Sign In';
          userEmail.textContent = 'Create an account';
          userAvatar.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        }
        
        updateWelcomeTitle(nameToDisplay);
      }

      // Initial check
      updateAuthUI(window.netlifyIdentity.currentUser());

      // Event listeners
      window.netlifyIdentity.on('init', user => updateAuthUI(user));
      window.netlifyIdentity.on('login', user => updateAuthUI(user));
      window.netlifyIdentity.on('logout', () => updateAuthUI(null));

      authBtn.addEventListener('click', () => {
        // Always open the identity widget so users can see their profile and click log out
        window.netlifyIdentity.open();
      });

      // Hack to inject a "show password" toggle into the Netlify Identity iframe
      // Using setInterval is more reliable here because React renders the inputs dynamically
      // *after* the iframe is already attached to the main document.
      setInterval(() => {
        const iframe = document.getElementById('netlify-identity-widget');
        if (iframe && iframe.contentDocument) {
          const iframeDoc = iframe.contentDocument;
          const passInputs = iframeDoc.querySelectorAll('input[type="password"]');
          
          passInputs.forEach(input => {
            // Check if we already added the toggle to this specific input
            if (!input.parentElement.querySelector('.pw-toggle')) {
              input.parentElement.style.position = 'relative';
              
              const toggleBtn = iframeDoc.createElement('button');
              toggleBtn.type = 'button';
              toggleBtn.className = 'pw-toggle';
              toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              `;
              toggleBtn.style.position = 'absolute';
              toggleBtn.style.right = '10px';
              toggleBtn.style.top = '50%';
              toggleBtn.style.transform = 'translateY(-50%)';
              toggleBtn.style.background = 'none';
              toggleBtn.style.border = 'none';
              toggleBtn.style.cursor = 'pointer';
              toggleBtn.style.color = '#7a8090';
              toggleBtn.style.padding = '0';
              toggleBtn.style.zIndex = '10';
              
              toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (input.type === 'password') {
                  input.type = 'text';
                  toggleBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  `;
                } else {
                  input.type = 'password';
                  toggleBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  `;
                }
              });
              
              input.parentNode.insertBefore(toggleBtn, input.nextSibling);
            }
          });
        }
      }, 500);
    }
  }

  /* ---------- Init ---------- */

  function init() {
    initTheme();
    initAuth();

    // Restore most recent conversation if it has messages
    if (!state.activeId && state.conversations.length) {
      state.activeId = state.conversations[0].id;
    }

    renderAll();
    bindEvents();
    autoResizeTextarea();

    // Restore desktop sidebar state
    if (window.innerWidth > 900) {
      const isClosed = localStorage.getItem('turath-sidebar-closed') === 'true';
      if (isClosed) {
        document.querySelector('.app-shell').classList.add('sidebar-closed');
      }
    }

    // Hide Initial Loader
    setTimeout(() => {
      const loader = document.getElementById('initialLoader');
      if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 600); // Remove from DOM after fade
      }
    }, 800);

    // Settings Modal
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsCloseBtn = document.getElementById('settingsCloseBtn');
    const settingsClearBtn = document.getElementById('settingsClearBtn');

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        settingsModal.showModal();
        setSidebarOpen(false); // Close sidebar on mobile when opening modal
      });
    }

    if (settingsCloseBtn) {
      settingsCloseBtn.addEventListener('click', () => {
        settingsModal.close();
      });
    }

    if (settingsClearBtn) {
      settingsClearBtn.addEventListener('click', () => {
        clearAllHistory();
        settingsModal.close();
      });
    }
  }

  init();
})();

// Pre-warm the TTS voices
if (typeof window !== 'undefined' && window.speechSynthesis) { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); }; }

window.startTopicChat = function(topic) { document.querySelector('.nav-item[data-view="chat"]').click(); document.getElementById('messageInput').value = 'Tell me about ' + topic; document.getElementById('chatForm').dispatchEvent(new Event('submit')); };
