// ===== 상태 =====
const state = {
  mode: null,            // 'practice' | 'mock'
  queue: [],             // 현재 질문 목록
  qIndex: 0,
  recording: false,
  mediaRecorder: null,
  audioChunks: [],
  audioBlob: null,
  recDuration: 0,
  stopPromise: null,
  recStartTime: null,
  recTimerId: null,
  recognition: null,
  finalTranscript: '',
  qTimerId: null,
  qTimeLeft: 0,
  mockResults: [],       // {number, topic, text, transcript, audioBlob}
  questionVisible: true,
};

const $ = (id) => document.getElementById(id);
const views = ['home', 'practice', 'question', 'mock-result', 'script', 'history', 'settings'];

function show(view) {
  views.forEach((v) => $(`view-${v}`).classList.toggle('hidden', v !== view));
  window.scrollTo(0, 0);
}

function toast(msg, ms = 2500) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.add('hidden'), ms);
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ===== 설정 =====
const settings = {
  get apiKey() { return localStorage.getItem('opic_api_key') || ''; },
  set apiKey(v) { localStorage.setItem('opic_api_key', v); },
  get timerSec() { return parseInt(localStorage.getItem('opic_timer') || '120', 10); },
  set timerSec(v) { localStorage.setItem('opic_timer', String(v)); },
};

// ===== IndexedDB (녹음 저장) =====
let db = null;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('opic-practice', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function saveRecording(entry) {
  if (!db) return;
  const tx = db.transaction('recordings', 'readwrite');
  tx.objectStore('recordings').add(entry);
}

function getRecordings() {
  return new Promise((resolve) => {
    if (!db) return resolve([]);
    const req = db.transaction('recordings', 'readonly').objectStore('recordings').getAll();
    req.onsuccess = () => resolve(req.result.reverse());
    req.onerror = () => resolve([]);
  });
}

function deleteRecording(id) {
  if (!db) return;
  db.transaction('recordings', 'readwrite').objectStore('recordings').delete(id);
}

// ===== TTS (질문 읽기) =====
let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
}
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function speakQuestion(text) {
  if (!('speechSynthesis' in window)) return toast('이 브라우저는 음성 합성을 지원하지 않습니다');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  const preferred = voices.find((v) => v.lang === 'en-US' && /female|samantha|zira|aria|jenny/i.test(v.name))
    || voices.find((v) => v.lang === 'en-US') || voices[0];
  if (preferred) u.voice = preferred;
  speechSynthesis.speak(u);
}

// ===== 음성 인식 =====
function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) state.finalTranscript += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    const el = $('transcript');
    el.innerHTML = escapeHtml(state.finalTranscript) + (interim ? `<span class="interim">${escapeHtml(interim)}</span>` : '');
  };
  rec.onend = () => {
    // 녹음 중이면 자동 재시작 (Chrome은 침묵 시 인식을 멈춤)
    if (state.recording) { try { rec.start(); } catch (_) {} }
  };
  return rec;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== 녹음 =====
async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    return toast('마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.');
  }
  state.audioChunks = [];
  state.audioBlob = null;
  state.finalTranscript = '';
  $('transcript').textContent = '';
  $('playback').classList.add('hidden');

  const mr = new MediaRecorder(stream);
  mr.ondataavailable = (e) => { if (e.data.size > 0) state.audioChunks.push(e.data); };
  let resolveStop;
  state.stopPromise = new Promise((r) => { resolveStop = r; });
  mr.onstop = () => {
    state.audioBlob = new Blob(state.audioChunks, { type: mr.mimeType || 'audio/webm' });
    const url = URL.createObjectURL(state.audioBlob);
    const player = $('playback');
    player.src = url;
    player.classList.remove('hidden');
    stream.getTracks().forEach((t) => t.stop());
    resolveStop();
  };
  mr.start();
  state.mediaRecorder = mr;
  state.recording = true;
  state.recStartTime = Date.now();
  $('btn-record').classList.add('recording');
  $('rec-label').textContent = '녹음 중지';
  state.recTimerId = setInterval(() => {
    $('rec-time').textContent = fmtTime((Date.now() - state.recStartTime) / 1000);
  }, 250);

  state.recognition = createRecognition();
  if (state.recognition) { try { state.recognition.start(); } catch (_) {} }
  else toast('이 브라우저는 음성 인식을 지원하지 않습니다 (Chrome/Edge 권장). 녹음만 진행됩니다.', 4000);
}

function stopRecording() {
  if (state.recording && state.recStartTime) {
    state.recDuration = (Date.now() - state.recStartTime) / 1000;
  }
  state.recording = false;
  if (state.recognition) { try { state.recognition.stop(); } catch (_) {} state.recognition = null; }
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop();
  clearInterval(state.recTimerId);
  $('btn-record').classList.remove('recording');
  $('rec-label').textContent = '녹음 시작';
}

// 녹음이 완전히 끝나(blob 생성) 저장 가능할 때까지 대기
function stopAndWait() {
  if (state.recording) stopRecording();
  return state.stopPromise || Promise.resolve();
}

// 말하기 통계: 발화 속도, 필러 단어 등 (AI 유창성 피드백용)
function speechStats(transcript, durationSec) {
  if (!transcript || !durationSec || durationSec < 3) return null;
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wpm = Math.round(words.length / (durationSec / 60));
  const fillerPatterns = /\b(um+|uh+|er+|ah+|like|you know|i mean|well|so)\b/gi;
  const fillers = (transcript.match(fillerPatterns) || []).length;
  return `- Speaking time: ${Math.round(durationSec)} seconds\n- Word count: ${words.length}\n- Speaking pace: ${wpm} words per minute\n- Filler words detected (um, uh, like, you know...): ${fillers}`;
}

// ===== 질문 화면 =====
function startPracticeSession(mode, queue) {
  state.mode = mode;
  state.queue = queue;
  state.qIndex = 0;
  state.mockResults = [];
  show('question');
  renderQuestion();
}

function renderQuestion() {
  stopRecording();
  stopQuestionTimer();
  speechSynthesis.cancel();

  const q = state.queue[state.qIndex];
  $('q-progress').textContent = `문항 ${state.qIndex + 1} / ${state.queue.length}`;
  $('q-topic').textContent = q.topic;
  $('q-text').textContent = q.text;
  $('q-text').classList.remove('blurred');
  state.questionVisible = true;
  $('btn-toggle-text').textContent = '👁️ 질문 숨기기';
  $('transcript').textContent = '';
  state.finalTranscript = '';
  state.recDuration = 0;
  $('rec-time').textContent = '0:00';
  $('playback').classList.add('hidden');
  $('feedback-box').classList.add('hidden');
  $('feedback-content').innerHTML = '';
  $('btn-next-q').textContent = state.qIndex + 1 >= state.queue.length
    ? (state.mode === 'mock' ? '시험 종료 →' : '완료')
    : '다음 문항 →';

  // 모의고사: 질문 자동 재생 + 타이머
  if (state.mode === 'mock') {
    speakQuestion(q.text);
    if (settings.timerSec > 0) startQuestionTimer(settings.timerSec);
    else $('q-timer').classList.add('hidden');
  } else {
    $('q-timer').classList.add('hidden');
  }
}

function startQuestionTimer(sec) {
  state.qTimeLeft = sec;
  const el = $('q-timer');
  el.classList.remove('hidden', 'warning');
  el.textContent = fmtTime(sec);
  state.qTimerId = setInterval(() => {
    state.qTimeLeft--;
    el.textContent = fmtTime(Math.max(0, state.qTimeLeft));
    if (state.qTimeLeft <= 20) el.classList.add('warning');
    if (state.qTimeLeft <= 0) {
      stopQuestionTimer();
      toast('⏰ 시간 종료! 다음 문항으로 넘어가세요.');
      if (state.recording) stopRecording();
    }
  }, 1000);
}

function stopQuestionTimer() {
  clearInterval(state.qTimerId);
  state.qTimerId = null;
}

function currentTranscript() {
  return $('transcript').textContent.trim();
}

function archiveCurrentAnswer() {
  const q = state.queue[state.qIndex];
  const transcript = currentTranscript();
  if (state.audioBlob || transcript) {
    const entry = {
      date: new Date().toISOString(),
      mode: state.mode,
      topic: q.topic,
      question: q.text,
      transcript,
      audio: state.audioBlob,
      duration: state.recDuration,
    };
    saveRecording(entry);
    if (state.mode === 'mock') {
      state.mockResults.push({ ...q, transcript, audioBlob: state.audioBlob, duration: state.recDuration });
    }
  } else if (state.mode === 'mock') {
    state.mockResults.push({ ...q, transcript: '', audioBlob: null, duration: 0 });
  }
}

async function nextQuestion() {
  await stopAndWait();
  archiveCurrentAnswer();
  state.audioBlob = null;
  state.recDuration = 0;
  state.stopPromise = null;
  if (state.qIndex + 1 >= state.queue.length) {
    if (state.mode === 'mock') showMockResult();
    else { toast('연습 완료! 수고했어요 🎉'); show('home'); }
    return;
  }
  state.qIndex++;
  renderQuestion();
}

// ===== 모의고사 결과 =====
function showMockResult() {
  stopQuestionTimer();
  const list = $('mock-result-list');
  list.innerHTML = '';
  state.mockResults.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `
      <div class="r-topic">Q${r.number}. ${escapeHtml(r.topic)}</div>
      <div class="r-q">${escapeHtml(r.text)}</div>
      <div class="r-answer">${r.transcript ? escapeHtml(r.transcript) : '(답변 없음)'}</div>
    `;
    if (r.audioBlob) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = URL.createObjectURL(r.audioBlob);
      div.appendChild(audio);
    }
    if (r.transcript) {
      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.style.marginTop = '10px';
      btn.textContent = '🤖 AI 피드백';
      const fb = document.createElement('div');
      fb.className = 'feedback-content';
      fb.style.marginTop = '10px';
      btn.onclick = () => requestFeedback(r.text, r.transcript, fb, btn, r.duration);
      div.appendChild(btn);
      div.appendChild(fb);
    }
    list.appendChild(div);
  });
  show('mock-result');
}

// ===== Claude API =====
const FEEDBACK_SYSTEM = `You are an expert OPIc (Oral Proficiency Interview - computer) rater and English speaking coach. The student is Korean and aiming for IH (Intermediate High) to AL (Advanced Low).

Given the OPIc question and the student's spoken answer (transcribed, so ignore punctuation/capitalization issues from transcription), provide feedback in Korean. When [Speech stats] are provided (speaking time, pace, filler words), use them to evaluate delivery: a comfortable OPIc pace is roughly 110-150 words per minute; under ~90 suggests hesitation, over ~170 may hurt clarity; a strong answer is usually 45 seconds to 2 minutes. Structure your response in Markdown exactly like this:

## 📊 예상 등급
(IL / IM1 / IM2 / IM3 / IH / AL 중 하나와 한 줄 근거)

## 🗣️ 유창성·전달력
([Speech stats]가 주어진 경우에만 이 섹션 포함: 말하기 속도, 답변 길이, 필러 단어 사용에 대한 평가와 개선 팁 2-3줄. 통계가 없으면 이 섹션 생략)

## 👍 잘한 점
(2-3개, 구체적으로)

## 🔧 문법·표현 교정
(잘못된 문장 → 교정된 문장 형태로, 각 항목에 짧은 한국어 설명. 최대 5개)

## ✨ IH~AL로 올리는 표현
(답변에 쓸 수 있었던 고급 표현/필러/연결어 3-4개와 사용 예문)

## 📝 업그레이드 모범 답안
(학생의 답변 내용을 살리되 IH~AL 수준으로 다듬은 영어 모범 답안. 말하기용이므로 자연스러운 구어체로, 45초~1분 분량)

Keep the total response focused and practical. All explanations in Korean, example sentences in English.`;

const SCRIPT_SYSTEM = `You are an expert OPIc English speaking coach. The student is Korean and aiming for IH to AL. They wrote an English script for an OPIc answer and want corrections.

Respond in Korean with this Markdown structure:

## 🔧 첨삭 결과
(원문에서 고칠 부분을 "원래 문장 → 고친 문장" 형태로 나열, 각각 짧은 한국어 설명. 문법 오류뿐 아니라 어색한 표현도 포함)

## ✨ 수정된 전체 스크립트
(교정 사항을 모두 반영한 전체 영어 스크립트. 자연스러운 구어체로)

## 💡 한 단계 업그레이드
(IH~AL 수준으로 올리기 위해 추가할 수 있는 표현이나 구조 2-3가지 제안)

All explanations in Korean, script in English.`;

async function callClaude(system, userText, targetEl, onDone) {
  const key = settings.apiKey;
  if (!key) {
    toast('설정에서 Anthropic API 키를 먼저 입력해주세요');
    show('settings');
    return;
  }
  targetEl.innerHTML = '<span class="loading-dots">AI가 분석 중입니다</span>';
  let fullText = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-5',
        max_tokens: 8000,
        stream: true,
        fallbacks: 'default',
        system,
        messages: [{ role: 'user', content: userText }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      targetEl.innerHTML = `<span style="color:var(--danger)">오류: ${escapeHtml(msg)}</span>`;
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let stopReason = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let ev;
        try { ev = JSON.parse(line.slice(6)); } catch (_) { continue; }
        if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          fullText += ev.delta.text;
          targetEl.innerHTML = renderMarkdown(fullText);
        } else if (ev.type === 'message_delta' && ev.delta?.stop_reason) {
          stopReason = ev.delta.stop_reason;
        }
      }
    }
    if (stopReason === 'refusal' && !fullText) {
      targetEl.innerHTML = '<span style="color:var(--danger)">요청이 거부되었습니다. 내용을 바꿔 다시 시도해주세요.</span>';
    }
    if (onDone) onDone(fullText);
  } catch (err) {
    targetEl.innerHTML = `<span style="color:var(--danger)">네트워크 오류: ${escapeHtml(err.message)}</span>`;
  }
}

function requestFeedback(question, answer, targetEl, btn, durationSec) {
  if (btn) btn.disabled = true;
  const stats = speechStats(answer, durationSec);
  const user = `[OPIc Question]\n${question}\n\n[Student's spoken answer (transcribed)]\n${answer}`
    + (stats ? `\n\n[Speech stats]\n${stats}` : '');
  callClaude(FEEDBACK_SYSTEM, user, targetEl, () => { if (btn) btn.disabled = false; });
}

// 간단 마크다운 렌더러
function renderMarkdown(md) {
  let html = escapeHtml(md);
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^[-*] (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/^\d+\. (.*)$/gm, '<li>$1</li>');
  html = html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
  html = html.replace(/<\/h(\d)><br>/g, '</h$1>').replace(/<\/ul><br>/g, '</ul>');
  return html;
}

// ===== 주제 그리드 =====
function renderTopicGrids() {
  const make = (topic, onClick) => {
    const btn = document.createElement('button');
    btn.className = 'topic-card';
    btn.innerHTML = `<span class="t-icon">${topic.icon}</span><span>${topic.name}</span>`;
    btn.onclick = onClick;
    return btn;
  };
  const mainGrid = $('topic-grid-main');
  TOPICS.forEach((t) => mainGrid.appendChild(make(t, () => {
    const queue = t.questions.map((q, i) => ({ number: i + 1, topic: `${t.icon} ${t.name}`, text: q.text }));
    startPracticeSession('practice', queue);
  })));
  const surGrid = $('topic-grid-surprise');
  SURPRISE_TOPICS.forEach((t) => surGrid.appendChild(make(t, () => {
    const queue = t.questions.map((q, i) => ({ number: i + 1, topic: `${t.icon} ${t.name} (돌발)`, text: q.text }));
    startPracticeSession('practice', queue);
  })));
  const rpGrid = $('topic-grid-roleplay');
  ROLEPLAYS.forEach((rp) => rpGrid.appendChild(make(rp, () => {
    const queue = [
      { number: 1, topic: `${rp.icon} ${rp.name} · 11번 질문하기`, text: rp.q11 },
      { number: 2, topic: `${rp.icon} ${rp.name} · 12번 문제해결`, text: rp.q12 },
      { number: 3, topic: `${rp.icon} ${rp.name} · 13번 관련경험`, text: rp.q13 },
    ];
    startPracticeSession('practice', queue);
  })));
}

// ===== 녹음 기록 =====
async function renderHistory() {
  const list = $('history-list');
  list.innerHTML = '';
  const recs = await getRecordings();
  if (recs.length === 0) {
    list.innerHTML = '<div class="empty-msg">아직 녹음 기록이 없습니다.<br>연습을 시작해보세요!</div>';
    return;
  }
  recs.forEach((r) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const date = new Date(r.date);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    div.innerHTML = `
      <div class="h-meta">${dateStr} · ${r.mode === 'mock' ? '모의고사' : '주제연습'} · ${escapeHtml(r.topic || '')}${r.duration ? ` · 🎙️ ${fmtTime(r.duration)}` : ''}</div>
      <div class="h-q">${escapeHtml(r.question || '')}</div>
      ${r.transcript ? `<div class="r-answer">${escapeHtml(r.transcript)}</div>` : ''}
    `;
    if (r.audio) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = URL.createObjectURL(r.audio);
      div.appendChild(audio);
    }
    const actions = document.createElement('div');
    actions.className = 'h-actions';
    if (r.transcript) {
      const fbBtn = document.createElement('button');
      fbBtn.className = 'btn primary';
      fbBtn.textContent = '🤖 AI 피드백';
      const fb = document.createElement('div');
      fb.className = 'feedback-content';
      fb.style.marginTop = '10px';
      fbBtn.onclick = () => requestFeedback(r.question, r.transcript, fb, fbBtn, r.duration);
      actions.appendChild(fbBtn);
      div.appendChild(fb);
    }
    const delBtn = document.createElement('button');
    delBtn.className = 'btn ghost';
    delBtn.textContent = '🗑️ 삭제';
    delBtn.onclick = () => { deleteRecording(r.id); div.remove(); };
    actions.appendChild(delBtn);
    div.appendChild(actions);
    list.appendChild(div);
  });
}

// ===== 이벤트 바인딩 =====
function bind() {
  $('brand-home').onclick = () => { stopRecording(); stopQuestionTimer(); show('home'); };
  $('btn-settings').onclick = () => {
    $('api-key-input').value = settings.apiKey;
    $('timer-select').value = String(settings.timerSec);
    show('settings');
  };
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.onclick = () => {
      const nav = btn.dataset.nav;
      if (nav === 'mock') {
        startPracticeSession('mock', buildMockExam());
      } else if (nav === 'history') {
        renderHistory();
        show('history');
      } else {
        show(nav);
      }
    };
  });
  $('btn-save-settings').onclick = () => {
    settings.apiKey = $('api-key-input').value.trim();
    settings.timerSec = parseInt($('timer-select').value, 10);
    toast('저장되었습니다 ✅');
    show('home');
  };
  $('btn-listen').onclick = () => speakQuestion(state.queue[state.qIndex].text);
  $('btn-toggle-text').onclick = () => {
    state.questionVisible = !state.questionVisible;
    $('q-text').classList.toggle('blurred', !state.questionVisible);
    $('btn-toggle-text').textContent = state.questionVisible ? '👁️ 질문 숨기기' : '👁️ 질문 보기';
  };
  $('btn-record').onclick = () => state.recording ? stopRecording() : startRecording();
  $('btn-next-q').onclick = nextQuestion;
  $('btn-finish').onclick = async () => {
    await stopAndWait();
    stopQuestionTimer();
    archiveCurrentAnswer();
    if (state.mode === 'mock' && state.mockResults.length > 0) showMockResult();
    else show('home');
  };
  $('btn-feedback').onclick = () => {
    const answer = currentTranscript();
    if (!answer) return toast('먼저 녹음하거나 답변을 입력해주세요');
    stopRecording();
    $('feedback-box').classList.remove('hidden');
    requestFeedback(state.queue[state.qIndex].text, answer, $('feedback-content'), $('btn-feedback'), state.recDuration);
  };
  $('btn-correct').onclick = () => {
    const script = $('script-input').value.trim();
    if (!script) return toast('첨삭받을 스크립트를 입력해주세요');
    const question = $('script-question').value.trim();
    const user = (question ? `[OPIc Question]\n${question}\n\n` : '') + `[Student's script]\n${script}`;
    $('script-feedback-box').classList.remove('hidden');
    const btn = $('btn-correct');
    btn.disabled = true;
    callClaude(SCRIPT_SYSTEM, user, $('script-feedback-content'), () => { btn.disabled = false; });
  };
  $('btn-mock-home').onclick = () => show('home');
}

// ===== 초기화 =====
(async function init() {
  await openDB().catch(() => {});
  renderTopicGrids();
  bind();
  const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const notices = [];
  if (!navigator.mediaDevices?.getUserMedia) notices.push('⚠️ 이 브라우저에서는 마이크 녹음이 지원되지 않습니다.');
  if (!hasSR) notices.push('⚠️ 음성 자동 인식(받아쓰기)은 Chrome 또는 Edge에서 지원됩니다.');
  if (!settings.apiKey) notices.push('💡 AI 피드백을 쓰려면 ⚙️ 설정에서 Anthropic API 키를 입력하세요.');
  $('mic-notice').innerHTML = notices.join('<br>');
})();
