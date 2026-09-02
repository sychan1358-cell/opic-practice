// ===== 상태 =====
const state = {
  mode: null,            // 'practice' | 'mock'
  difficulty: '5',       // 모의고사 난이도 1~6
  startDifficulty: '5',  // 시험 시작 시 난이도 (2차 자가평가로 변경될 수 있음)
  secondAssessed: false, // 2차 자가평가 완료 여부
  sessionId: null,       // 녹음 기록 세션 묶음용
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
  sttActive: false,
  lastSttError: null,
  whisperPromise: null,
  retakeUsed: false,     // 문항당 다시 녹음 1회
  recToken: 0,           // 다시 녹음 시 이전 AI 받아쓰기 결과 무시용
  finalTranscript: '',
  qTimerId: null,
  qTimeLeft: 0,
  mockResults: [],       // {number, topic, text, transcript, audioBlob}
  questionVisible: true,
};

const $ = (id) => document.getElementById(id);
const views = ['home', 'mock-setup', 'mock-adjust', 'practice', 'question', 'mock-result', 'script', 'history', 'settings', 'expr', 'expr-drill', 'study', 'roleplay'];

const DIFF_INFO = {
  '1': { label: '1단계', prompt: 'Level 1 of 6 (lowest). Only short, simple description and habit tasks plus role-plays were tested — no past narration, comparison, or issue questions. On a real OPIc at this level, ratings above IL are rarely awarded because higher-level functions are never tested; cap your rating at IL and if the student performed well, strongly advise retaking at a higher level.' },
  '2': { label: '2단계', prompt: 'Level 2 of 6. Description, habit, and past-experience tasks plus role-plays were tested — no comparison or issue questions. Ratings above IM1 are rarely awarded at this level; cap your rating at IM1 and advise a higher level if the student did well.' },
  '3': { label: '3단계', prompt: 'Level 3 of 6. Description, habit, and past-experience tasks plus role-plays were tested — no comparison or issue questions. Ratings above IM3 are rarely awarded because advanced tasks are not tested; cap your rating at IM3 and advise level 5+ if the student performed strongly.' },
  '4': { label: '4단계', prompt: 'Level 4 of 6. Comparison tasks were included but no abstract issue questions or advanced 14-15 set. Ratings up to IH are achievable; AL is rarely awarded at this level. If the student handled comparisons well, advise level 5-6 to attempt AL.' },
  '5': { label: '5단계', prompt: 'Level 5 of 6 (targeting IH-AL). The exam included comparison tasks and two advanced questions (14-15). Rate normally across the full scale up to AL.' },
  '6': { label: '6단계', prompt: 'Level 6 of 6 (targeting AL). The exam was weighted toward comparison and issue tasks in every set plus two advanced questions. Hold the student to the highest standard: for AL, expect consistent paragraph-length speech, accurate past narration, and well-supported opinions on abstract issues.' },
};

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
  get sttMode() { return localStorage.getItem('opic_stt_mode') || 'both'; },
  set sttMode(v) { localStorage.setItem('opic_stt_mode', v); },
  get surveyIds() {
    try { return JSON.parse(localStorage.getItem('opic_survey')) || null; } catch (_) { return null; }
  },
  set surveyIds(v) { localStorage.setItem('opic_survey', JSON.stringify(v)); },
};

// ===== IndexedDB (녹음 저장) =====
let db = null;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('opic-practice', 2);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('recordings')) {
        d.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
      }
      if (!d.objectStoreNames.contains('expressions')) {
        d.createObjectStore('expressions', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

async function saveRecording(entry) {
  if (!db) return;
  const e = { ...entry };
  // 일부 모바일 브라우저는 Blob 저장이 불안정해서 ArrayBuffer로 변환해 저장
  if (e.audio) {
    try {
      e.audioBuf = await e.audio.arrayBuffer();
      e.audioType = e.audio.type || 'audio/webm';
    } catch (_) {}
    delete e.audio;
  }
  const tx = db.transaction('recordings', 'readwrite');
  const req = tx.objectStore('recordings').add(e);
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

// 저장된 기록에 필드 추가/수정 (피드백 저장용)
function updateRecording(id, patch) {
  if (!db || id == null) return;
  const store = db.transaction('recordings', 'readwrite').objectStore('recordings');
  const req = store.get(id);
  req.onsuccess = () => {
    if (req.result) store.put({ ...req.result, ...patch });
  };
}

function getRecording(id) {
  return new Promise((resolve) => {
    if (!db || id == null) return resolve(null);
    const req = db.transaction('recordings', 'readonly').objectStore('recordings').get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

function recordingBlob(r) {
  if (r.audio instanceof Blob) return r.audio; // 예전 형식 호환
  if (r.audioBuf) return new Blob([r.audioBuf], { type: r.audioType || 'audio/webm' });
  return null;
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

// ===== 표현 노트 (IndexedDB) =====
function getExpressions() {
  return new Promise((resolve) => {
    if (!db) return resolve([]);
    const req = db.transaction('expressions', 'readonly').objectStore('expressions').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
}

async function saveExpressions(items, source) {
  if (!db || !items.length) return 0;
  const existing = await getExpressions();
  const seen = new Set(existing.map((e) => e.text.toLowerCase()));
  const store = db.transaction('expressions', 'readwrite').objectStore('expressions');
  let added = 0;
  for (const it of items) {
    const key = it.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    store.add({ ...it, source, date: new Date().toISOString(), correct: 0, wrong: 0 });
    added++;
  }
  return added;
}

function updateExpression(id, patch) {
  if (!db || id == null) return;
  const store = db.transaction('expressions', 'readwrite').objectStore('expressions');
  const req = store.get(id);
  req.onsuccess = () => { if (req.result) store.put({ ...req.result, ...patch }); };
}

function deleteExpression(id) {
  if (!db) return;
  db.transaction('expressions', 'readwrite').objectStore('expressions').delete(id);
}

// 피드백 본문에서 '## 💾 연습 표현 목록' 섹션을 파싱해 표현 노트에 저장하고, 표시/저장용 본문에서는 제거
async function harvestExpressions(fullText, source, targetEl) {
  const idx = fullText.indexOf('## 💾');
  if (idx === -1) return fullText;
  const section = fullText.slice(idx);
  const stripped = fullText.slice(0, idx).trim();
  const items = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^[-*]\s*(.+?)\s*::\s*(.+?)\s*::\s*(.+)$/);
    if (m) items.push({ text: m[1].trim(), example: m[2].trim(), meaning: m[3].trim() });
  }
  if (items.length) {
    const added = await saveExpressions(items, source);
    if (added > 0) toast(`💪 새 표현 ${added}개가 '표현 연습'에 저장됐어요`, 3500);
  }
  if (targetEl) targetEl.innerHTML = renderMarkdown(stripped);
  return stripped;
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

function speakQuestion(text, onEnd) {
  if (!('speechSynthesis' in window)) return toast('이 브라우저는 음성 합성을 지원하지 않습니다');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  const preferred = voices.find((v) => v.lang === 'en-US' && /female|samantha|zira|aria|jenny/i.test(v.name))
    || voices.find((v) => v.lang === 'en-US') || voices[0];
  if (preferred) u.voice = preferred;
  if (onEnd) u.onend = onEnd;
  speechSynthesis.speak(u);
}

// ===== Whisper AI 받아쓰기 (브라우저 내 실행, 무료) =====
let whisperPipeline = null;
let whisperLoading = null;

function getWhisper(onStatus) {
  if (whisperPipeline) return Promise.resolve(whisperPipeline);
  if (!whisperLoading) {
    whisperLoading = (async () => {
      if (onStatus) onStatus('🤖 AI 받아쓰기 모듈 로딩 중...');
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
      env.allowLocalModels = false; // 모델은 항상 원격(HuggingFace)에서 받고 브라우저 캐시에 저장
      const seen = {};
      const pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        progress_callback: (p) => {
          if (p.status === 'progress' && p.file && onStatus) {
            seen[p.file] = p.progress || 0;
            const files = Object.values(seen);
            const avg = Math.round(files.reduce((a, b) => a + b, 0) / files.length);
            onStatus(`🤖 AI 모델 다운로드 중 ${avg}% (첫 사용 시 한 번만)`);
          }
        },
      });
      whisperPipeline = pipe;
      return pipe;
    })();
    whisperLoading.catch(() => { whisperLoading = null; });
  }
  return whisperLoading;
}

// 녹음 blob → 16kHz 모노 PCM
async function blobToPCM(blob) {
  const arrayBuf = await blob.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  const audio = await ac.decodeAudioData(arrayBuf);
  ac.close();
  if (audio.sampleRate === 16000 && audio.numberOfChannels === 1) {
    return audio.getChannelData(0);
  }
  const off = new OfflineAudioContext(1, Math.ceil(audio.duration * 16000), 16000);
  const src = off.createBufferSource();
  src.buffer = audio;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  return rendered.getChannelData(0);
}

async function transcribeBlob(blob, onStatus) {
  const pipe = await getWhisper(onStatus);
  if (onStatus) onStatus('🤖 AI 받아쓰기 중... (답변 길이에 따라 시간이 걸려요)');
  const pcm = await blobToPCM(blob);
  const out = await pipe(pcm, { chunk_length_s: 30, stride_length_s: 5 });
  return (out.text || '').trim();
}

// ===== 음성 인식 =====
function setSttStatus(text, isError) {
  const el = $('stt-status');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('error', !!isError);
}

function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.onstart = () => setSttStatus('🎤 인식 중...');
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) state.finalTranscript += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    const el = $('transcript');
    el.innerHTML = escapeHtml(state.finalTranscript) + (interim ? `<span class="interim">${escapeHtml(interim)}</span>` : '');
    setSttStatus('🎤 인식 중 ✓');
  };
  rec.onerror = (e) => {
    state.lastSttError = e.error;
    // no-speech/aborted는 재시작으로 회복되므로 무시, 나머지는 원인 안내
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      setSttStatus('⚠️ 마이크 권한 거부됨', true);
      toast('음성 인식 권한이 거부됐어요. 브라우저 설정에서 마이크를 허용해주세요.', 4000);
    } else if (e.error === 'audio-capture') {
      setSttStatus('⚠️ 마이크 사용 불가', true);
      toast('음성 인식이 마이크를 사용할 수 없어요. 설정에서 "받아쓰기 전용" 모드를 켜보세요.', 4500);
    } else if (e.error === 'network') {
      setSttStatus('⚠️ 네트워크 오류', true);
      toast('음성 인식 서버에 연결할 수 없어요 (인터넷 연결 확인).', 4000);
    } else if (e.error === 'language-not-supported') {
      setSttStatus('⚠️ 영어 인식 미지원 기기', true);
      toast('이 기기의 음성인식이 영어를 지원하지 않아요. 폰 설정에서 Google 음성인식 영어 팩을 설치해보세요.', 5000);
    }
  };
  rec.onend = () => {
    // 인식이 켜져 있어야 하는 동안 끊기면 자동 재시작 (Chrome은 침묵/마이크 경합 시 인식을 멈춤)
    if (state.sttActive) {
      setTimeout(() => {
        if (state.sttActive && state.recognition === rec) { try { rec.start(); } catch (_) {} }
      }, 250);
    } else {
      setSttStatus('');
    }
  };
  return rec;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== 녹음 =====
async function startRecording() {
  const sttOnly = settings.sttMode === 'stt-only';
  state.audioChunks = [];
  state.audioBlob = null;
  state.finalTranscript = '';
  $('transcript').textContent = '';
  const useWhisper = settings.sttMode === 'whisper';
  state.sttActive = !useWhisper;
  state.lastSttError = null;
  state.whisperPromise = null;
  $('btn-retake').classList.add('hidden');

  if (useWhisper) {
    // Whisper 모드: 실시간 인식 없이 녹음만, 끝나면 AI가 받아쓰기
    state.recognition = null;
    setSttStatus('🎙️ 녹음 중 — 끝나면 AI가 받아써줘요');
  } else {
    // 음성 인식을 먼저 시작 (일부 안드로이드에서 녹음이 먼저면 인식이 마이크를 못 잡음)
    state.recognition = createRecognition();
    if (state.recognition) { try { state.recognition.start(); } catch (_) {} }
    else if (sttOnly) return toast('이 브라우저는 음성 인식을 지원하지 않습니다. 설정에서 "AI 받아쓰기 (Whisper)" 모드를 사용해보세요.', 4500);
    else toast('이 브라우저는 실시간 음성 인식을 지원하지 않아요. 설정에서 "AI 받아쓰기 (Whisper)" 모드를 켜면 받아쓰기가 됩니다.', 4500);
  }

  if (!sttOnly) {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      state.sttActive = false;
      if (state.recognition) { try { state.recognition.stop(); } catch (_) {} state.recognition = null; }
      return toast('마이크 권한이 필요합니다. 브라우저 설정에서 허용해주세요.');
    }
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data.size > 0) state.audioChunks.push(e.data); };
    let resolveStop;
    state.stopPromise = new Promise((r) => { resolveStop = r; });
    mr.onstop = () => {
      state.audioBlob = new Blob(state.audioChunks, { type: mr.mimeType || 'audio/webm' });
      stream.getTracks().forEach((t) => t.stop());
      resolveStop();
    };
    mr.start();
    state.mediaRecorder = mr;
  } else {
    state.mediaRecorder = null;
    state.stopPromise = Promise.resolve();
  }

  state.recording = true;
  state.recStartTime = Date.now();
  $('btn-record').classList.add('recording');
  $('rec-label').textContent = sttOnly ? '받아쓰기 중지' : '녹음 중지';
  state.recTimerId = setInterval(() => {
    $('rec-time').textContent = fmtTime((Date.now() - state.recStartTime) / 1000);
  }, 250);
  // 모의고사 제한시간은 녹음하는 동안만 흐름
  if (state.mode === 'mock' && settings.timerSec > 0) startQuestionTimer(settings.timerSec);
}

function stopRecording() {
  const wasRecording = state.recording;
  const hadRecognition = !!state.recognition;
  if (state.recording && state.recStartTime) {
    state.recDuration = (Date.now() - state.recStartTime) / 1000;
  }
  state.recording = false;
  state.sttActive = false;
  if (settings.sttMode !== 'whisper') setSttStatus('');
  if (state.recognition) { try { state.recognition.stop(); } catch (_) {} state.recognition = null; }
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop();
  clearInterval(state.recTimerId);
  // 녹음 완료 후 AI 받아쓰기: Whisper 모드는 항상 실행,
  // 기본 모드는 실시간 받아쓰기가 비어 있으면 자동으로 Whisper로 전환 (기기 인식 실패 대비)
  if (wasRecording && settings.sttMode !== 'stt-only' && state.recDuration >= 2) {
    const token = state.recToken;
    state.whisperPromise = (async () => {
      await (state.stopPromise || Promise.resolve());
      if (token !== state.recToken) return; // 다시 녹음으로 리셋됨 → 이전 결과 무시
      if (!state.audioBlob) return;
      if (settings.sttMode === 'both') {
        // 실시간 인식의 마지막 결과가 늦게 도착할 수 있어 잠깐 기다린 뒤 확인
        await new Promise((r) => setTimeout(r, 600));
        if (currentTranscript().trim()) return; // 실시간 인식 성공 → Whisper 불필요
        toast('실시간 받아쓰기가 비어 있어 AI 받아쓰기로 자동 전환합니다 🤖', 3500);
      }
      try {
        const text = await transcribeBlob(state.audioBlob, setSttStatus);
        if (token !== state.recToken) return; // 변환 중에 다시 녹음으로 리셋됨
        if (currentTranscript().trim()) return; // 그 사이 사용자가 직접 입력했으면 유지
        if (text) {
          state.finalTranscript = text + ' ';
          $('transcript').textContent = text;
          setSttStatus('✅ AI 받아쓰기 완료');
        } else {
          setSttStatus('⚠️ 음성을 인식하지 못했어요. 답변 칸에 직접 입력할 수 있어요.', true);
        }
      } catch (e) {
        setSttStatus(`⚠️ AI 받아쓰기 실패: ${e && e.message ? e.message : e}`, true);
        toast('AI 받아쓰기에 실패했어요. 인터넷 연결을 확인하고 다시 녹음해보세요.', 5000);
      }
    })();
  }
  $('btn-record').classList.remove('recording');
  stopQuestionTimer(); // 제한시간은 녹음 중에만 흐름 (남은 시간은 화면에 그대로 유지)
  if (wasRecording) {
    // 녹음 완료: 재시도는 '다시 녹음'(1회)으로만 가능
    $('btn-record').disabled = true;
    $('rec-label').textContent = '✅ 녹음 완료';
    if (!state.retakeUsed) $('btn-retake').classList.remove('hidden');
  } else {
    $('rec-label').textContent = settings.sttMode === 'stt-only' ? '받아쓰기 시작' : '녹음 시작';
  }
}

// 다시 녹음 (문항당 1회): 이전 녹음·받아쓰기를 지우고 새로 녹음
function retakeRecording() {
  if (state.retakeUsed) return toast('다시 녹음은 문항당 1회만 가능해요');
  if (state.recording) stopRecording();
  state.retakeUsed = true;
  state.recToken++;
  state.audioBlob = null;
  state.audioChunks = [];
  state.finalTranscript = '';
  state.recDuration = 0;
  state.stopPromise = null;
  state.whisperPromise = null;
  $('transcript').textContent = '';
  $('rec-time').textContent = '0:00';
  setSttStatus('');
  $('btn-retake').classList.add('hidden');
  // 녹음 버튼 다시 활성화 + 제한시간 새로 부여 (녹음 시작 때부터 흐름)
  $('btn-record').disabled = false;
  $('rec-label').textContent = settings.sttMode === 'stt-only' ? '받아쓰기 시작' : '녹음 시작';
  if (state.mode === 'mock' && settings.timerSec > 0) showTimerIdle(settings.timerSec);
  toast('이전 녹음을 지웠어요. 제한시간도 새로 주어집니다 (재녹음은 1회만 가능)', 3500);
}

// 녹음이 완전히 끝나(blob 생성, AI 받아쓰기까지) 저장 가능할 때까지 대기
async function stopAndWait() {
  if (state.recording) stopRecording();
  await (state.stopPromise || Promise.resolve());
  if (state.whisperPromise) {
    toast('🤖 AI 받아쓰기가 끝날 때까지 잠시 기다려주세요...', 3000);
    await state.whisperPromise;
  }
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
  state.startDifficulty = state.difficulty;
  state.secondAssessed = false;
  state.sessionId = Date.now();
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
  $('rec-label').textContent = settings.sttMode === 'stt-only' ? '받아쓰기 시작' : '녹음 시작';
  setSttStatus('');
  state.retakeUsed = false;
  state.recToken++;
  $('btn-retake').classList.add('hidden');
  $('btn-next-q').textContent = state.qIndex + 1 >= state.queue.length
    ? (state.mode === 'mock' ? '시험 종료 →' : '완료')
    : '다음 문항 →';

  // 새 문항: 녹음 버튼 활성화 (녹음 완료 후엔 '다시 녹음'으로만 재시도 가능)
  $('btn-record').disabled = false;

  // 모의고사: 질문 자동 재생 + 제한시간 표시 (타이머는 녹음 시작 버튼을 누를 때부터 흐름)
  if (state.mode === 'mock') {
    speakQuestion(q.text);
    if (settings.timerSec > 0) showTimerIdle(settings.timerSec);
    else $('q-timer').classList.add('hidden');
  } else {
    $('q-timer').classList.add('hidden');
  }
}

// 제한시간을 멈춘 상태로 표시 (녹음 시작 전 / 다시 녹음 후)
function showTimerIdle(sec) {
  stopQuestionTimer();
  state.qTimeLeft = sec;
  const el = $('q-timer');
  el.classList.remove('hidden', 'warning');
  el.textContent = fmtTime(sec);
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

async function archiveCurrentAnswer() {
  const q = state.queue[state.qIndex];
  const transcript = currentTranscript();
  if (state.audioBlob || transcript) {
    const entry = {
      date: new Date().toISOString(),
      mode: state.mode,
      sessionId: state.sessionId,
      difficulty: state.mode === 'mock' ? state.difficulty : null,
      number: q.number,
      topic: q.topic,
      question: q.text,
      transcript,
      audio: state.audioBlob,
      duration: state.recDuration,
    };
    const recId = await saveRecording(entry);
    state.mockResults.push({ ...q, transcript, duration: state.recDuration, recId });
  } else {
    state.mockResults.push({ ...q, transcript: '', duration: 0, recId: null });
  }
}

async function nextQuestion() {
  await stopAndWait();
  await archiveCurrentAnswer();
  state.audioBlob = null;
  state.recDuration = 0;
  state.stopPromise = null;
  state.whisperPromise = null;
  if (state.qIndex + 1 >= state.queue.length) {
    showSessionResult();
    return;
  }
  state.qIndex++;
  // 실제 오픽처럼 7문항 후 2차 자가평가 (남은 문항 난이도 조정)
  if (state.mode === 'mock' && state.qIndex === 7 && !state.secondAssessed) {
    stopQuestionTimer();
    $('adjust-current').textContent = state.difficulty;
    show('mock-adjust');
    return;
  }
  renderQuestion();
}

function applyDifficultyAdjust(delta) {
  state.secondAssessed = true;
  const newDiff = String(Math.min(6, Math.max(1, parseInt(state.difficulty, 10) + delta)));
  if (delta !== 0 && newDiff !== state.difficulty) {
    state.difficulty = newDiff;
    // 남은 문항(8~15번)을 새 난이도로 재생성
    const fresh = buildMockExam(newDiff, settings.surveyIds);
    state.queue = [...state.queue.slice(0, 7), ...fresh.slice(7)];
    toast(`난이도가 ${newDiff}단계로 변경됐어요`);
  }
  show('question');
  renderQuestion();
}

// ===== 세션 결과 (모의고사 / 주제별 연습 공용) =====
function showSessionResult() {
  stopQuestionTimer();
  const isMock = state.mode === 'mock';
  $('result-title').textContent = isMock
    ? `📊 모의고사 완료! (난이도 ${DIFF_INFO[state.difficulty]?.label || '5-5'})`
    : '🎯 주제 연습 완료!';
  $('btn-overall-grade').textContent = isMock ? '🏆 종합 등급 예측 받기' : '🏆 주제 종합 피드백 받기';
  $('overall-grade-box').classList.add('hidden');
  $('overall-grade-content').innerHTML = '';
  $('btn-overall-grade').disabled = false;
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
    if (r.transcript) {
      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.style.marginTop = '10px';
      btn.textContent = '🤖 AI 피드백';
      const fb = document.createElement('div');
      fb.className = 'feedback-content';
      fb.style.marginTop = '10px';
      btn.onclick = () => requestFeedback(r.text, r.transcript, fb, btn, r.duration,
        (fullText) => { if (fullText) updateRecording(r.recId, { feedback: fullText }); });
      div.appendChild(btn);
      div.appendChild(fb);
    } else if (r.recId != null) {
      // 녹음은 있는데 받아쓰기가 비어 있으면 결과 화면에서 바로 AI 받아쓰기
      const sttBtn = document.createElement('button');
      sttBtn.className = 'btn';
      sttBtn.style.marginTop = '10px';
      sttBtn.textContent = '🤖 AI 받아쓰기 (녹음에서 텍스트 추출)';
      sttBtn.onclick = async () => {
        sttBtn.disabled = true;
        try {
          const rec = await getRecording(r.recId);
          const blob = rec ? recordingBlob(rec) : null;
          if (!blob) { sttBtn.textContent = '⚠️ 저장된 녹음이 없어요'; return; }
          const text = await transcribeBlob(blob, (s) => { sttBtn.textContent = s; });
          if (!text) { sttBtn.textContent = '⚠️ 음성을 인식하지 못했어요'; return; }
          r.transcript = text;
          updateRecording(r.recId, { transcript: text });
          toast('받아쓰기 완료!');
          showSessionResult(); // 갱신된 답변과 피드백 버튼 표시
        } catch (e) {
          sttBtn.textContent = `⚠️ 실패: ${e && e.message ? e.message : e}`;
          sttBtn.disabled = false;
        }
      };
      div.appendChild(sttBtn);
    }
    list.appendChild(div);
  });
  show('mock-result');
}

// ===== Claude API =====
// 모든 피드백 끝에 붙는 기계 파싱용 표현 섹션 (앱이 추출해 '표현 연습'에 저장)
const EXPR_SECTION = `

At the very end, always include this final section for the app to parse (exact format, one line per item):

## 💾 연습 표현 목록
- expression :: short example sentence :: 한국어 뜻

Pick the 3-6 expressions from your feedback that are most worth memorizing and practicing. Follow the "A :: B :: C" line format exactly — the app parses it automatically.`;

const FEEDBACK_SYSTEM_BASE = `You are an expert OPIc (Oral Proficiency Interview - computer) rater and English speaking coach. The student is Korean and aiming for IH (Intermediate High) to AL (Advanced Low).

Given the OPIc question and the student's spoken answer (transcribed, so ignore punctuation/capitalization issues from transcription), provide feedback in Korean. When [Speech stats] are provided (speaking time, pace, filler words), use them to evaluate delivery: a comfortable OPIc pace is roughly 110-150 words per minute; under ~90 suggests hesitation, over ~170 may hurt clarity; a strong answer is usually 45 seconds to 2 minutes. Structure your response in Markdown exactly like this:

## 📊 예상 등급
(IL / IM1 / IM2 / IM3 / IH / AL 중 하나와 한 줄 근거)

## 🗣️ 유창성·전달력
([Speech stats]가 주어진 경우에만 이 섹션 포함: 말하기 속도, 답변 길이, 필러 단어 사용에 대한 평가와 개선 팁 2-3줄. 통계가 없으면 이 섹션 생략)

## 👍 잘한 점
(2-3개, 구체적으로)

## 🔧 문법·표현 교정
(잘못된 문장 → 교정된 문장 형태로, 각 항목에 짧은 한국어 설명. 최대 5개)

## 🎯 등급 상승 구체 코칭
This section is the heart of the feedback. Act like a private speaking coach who just listened to this exact answer. Every point MUST quote the student's actual words — never give generic advice that could apply to anyone's answer. Cover only the categories that genuinely apply to this answer, choosing from:
- **🔁 반복 표현 다양화**: 학생이 2번 이상 반복한 단어·표현을 찾아 인용하고, 각각을 대체할 표현 2-3개를 제시 (예: 학생이 "good"을 4번 썼다면 → amazing / decent / worthwhile 등 문맥별 대체)
- **🗣️ 발음 주의 포인트**: 학생이 실제로 사용한 단어 중 한국인 학습자가 흔히 어색하게 발음하는 것을 골라, 어떻게 발음해야 하는지 구체적으로 (강세 위치, 주의할 소리)
- **🔗 연음(linking)**: 학생의 실제 문장에서 이어 말해야 자연스러운 구간을 인용해 표시 (예: "I want to go" → "I wanna go", "not at all" → "no-ta-tall"처럼 소리 나는 대로)
- **🎵 리듬·강세**: 학생의 실제 문장 하나를 골라 어떤 단어에 강세를 두고 어디서 끊어 말할지 표시 (예: "I REALLY love it / because it helps me RELAX")
- **🏗️ 문장 구조 다양화**: 문장 시작 패턴이 단조로우면 (예: 계속 "I..."로 시작) 인용해서 지적하고 다른 시작법 예시
Note: the transcript has no audio, so pronunciation/linking/rhythm advice should target likely pitfalls for Korean speakers based on the specific words and sentences the student actually used.

## ✨ IH~AL로 올리는 표현
(답변에 쓸 수 있었던 고급 표현/필러/연결어 3-4개와 사용 예문)

## 📝 업그레이드 모범 답안
(학생의 답변 내용을 살리되 IH~AL 수준으로 다듬은 영어 모범 답안. 말하기용이므로 자연스러운 구어체로, 45초~1분 분량)

Keep the total response focused and practical. All explanations in Korean, example sentences in English.`;
const FEEDBACK_SYSTEM = FEEDBACK_SYSTEM_BASE + EXPR_SECTION;

// 목표 등급별 첨삭 기준
const SCRIPT_GRADE_GUIDE = {
  IM1: 'Target grade: IM1. Priorities: grammatical accuracy in simple sentences (subject-verb agreement, articles, basic tenses). Keep vocabulary simple and attainable — do NOT suggest advanced idioms or complex structures the student cannot deliver. The revised script must use short, clear sentences an IM1 speaker can memorize and say naturally, about 30-45 seconds long.',
  IM2: 'Target grade: IM2. Priorities: accuracy plus basic connectors (first of all, also, so, because) and consistent tense control. Vocabulary should stay simple; suggest only mild upgrades. The revised script should be clear multi-sentence speech an IM2 speaker can deliver, about 45 seconds long.',
  IM3: 'Target grade: IM3. Priorities: reliable past-tense narration, varied sentence starters, paragraph-length flow with clear organization (intro → details → wrap-up). Introduce a few natural spoken expressions. The revised script should be a solid one-minute answer at IM3 level.',
  IH: 'Target grade: IH. Priorities: natural spoken English — fillers and discourse markers (you know, actually, to be honest), varied tenses, specific details and mild comparisons, self-correction patterns. Point out stiff "written-style" sentences and make them conversational. The revised script should sound like a fluent 1-1.5 minute spoken answer at IH level.',
  AL: 'Target grade: AL. Priorities: sophisticated and idiomatic language — collocations, phrasal verbs, hedging (I would say, it depends), complex sentences with relative clauses and conditionals, and well-supported opinions. Be strict: correct not only errors but anything unnatural or flat. The revised script should demonstrate AL-level range and precision, 1.5-2 minutes of speech.',
};

function scriptSystem(grade) {
  const guide = SCRIPT_GRADE_GUIDE[grade] || SCRIPT_GRADE_GUIDE.IH;
  return `You are an expert OPIc English speaking coach. The student is Korean. They wrote an English script for an OPIc answer and want corrections tailored to their target grade.

${guide}

Respond in Korean with this Markdown structure:

## 🎯 목표 등급: ${grade}
(이 스크립트가 현재 목표 등급 기준에 어느 정도인지 한두 문장 진단)

## 🔧 첨삭 결과
(원문에서 고칠 부분을 "원래 문장 → 고친 문장" 형태로 나열, 각각 짧은 한국어 설명. 목표 등급 기준에서 중요한 것부터)

## ✨ 수정된 전체 스크립트
(교정 사항을 모두 반영한 전체 영어 스크립트. 반드시 목표 등급 ${grade} 수준에 맞는 어휘·문장으로 — 그 이상으로 어렵게 쓰지 말 것. 자연스러운 구어체로)

## 💡 ${grade} 달성 팁
(목표 등급에 도달하기 위해 이 스크립트에서 연습할 포인트 2-3가지)

All explanations in Korean, script in English.` + EXPR_SECTION;
}

const MOCK_EVAL_SYSTEM = `You are an official OPIc (Oral Proficiency Interview - computer) rater. The student is Korean and aiming for IH (Intermediate High) to AL (Advanced Low). You are given a full 15-question mock OPIc exam: each question, the student's transcribed spoken answer, and speech stats where available (ignore punctuation/capitalization issues from transcription; a comfortable pace is roughly 110-150 words per minute).

Rate holistically the way a real OPIc rater would: consistency across tasks matters more than one good answer. Description/habit questions test sustained paragraph-length speech; past-experience questions test narration in past tenses; role-plays test interactive functions (asking questions, resolving a problem); the final questions test comparison and supporting an opinion on an abstract issue. Unanswered questions should lower the rating.

Important: on the real OPIc, question 1 (self-introduction) is NOT scored. Exclude Q1 entirely from the rating — do not let its quality or absence raise or lower the grade. You may give Q1 a brief comment in the per-question section, clearly marked (채점 제외).

Respond in Korean with this Markdown structure:

## 🏆 종합 예상 등급
**(NL / NM / NH / IL / IM1 / IM2 / IM3 / IH / AL 중 하나)** — 한두 문장으로 핵심 근거. 등급이 경계선이면 "IM3~IH"처럼 범위로 표기.

## 📋 영역별 평가
- **묘사·습관 (선택/돌발 주제)**: 한두 줄 평가
- **과거 경험 말하기**: 한두 줄 평가
- **롤플레이 (11~13번)**: 한두 줄 평가
- **비교·이슈 (14~15번)**: 한두 줄 평가
- **유창성·전달력**: 속도, 답변 길이, 필러 사용 종합 평가

## 📈 등급을 올리는 우선순위 3가지
(현재 답변에서 드러난 약점 중 등급에 가장 큰 영향을 주는 순서로. 각 항목은 반드시 학생 답변의 실제 문장이나 단어를 인용하며, 반복 어휘 대체·발음 주의 단어·연음할 구간·리듬과 강세·문장 구조 다양화처럼 바로 고칠 수 있는 구체적 행동으로 제시할 것 — 누구에게나 통하는 일반론 금지)

## 💬 문항별 한줄평
(답변한 문항만: "Q3: ..." 형태로 각 한 줄. 답변 안 한 문항은 묶어서 언급)

All explanations in Korean, example English phrases in English.` + EXPR_SECTION;

const TOPIC_EVAL_SYSTEM = `You are an expert OPIc (Oral Proficiency Interview - computer) coach. The student is Korean and aiming for IH (Intermediate High) to AL (Advanced Low). They just finished practicing one topic with several questions of increasing difficulty (description, habits, past experience, comparison, issue). You are given each question, the student's transcribed spoken answer, and speech stats where available (ignore punctuation/capitalization issues from transcription; a comfortable pace is roughly 110-150 words per minute).

Respond in Korean with this Markdown structure:

## 🏆 이 주제 종합 평가
**(현재 수준: IL / IM1 / IM2 / IM3 / IH / AL 중 추정)** — 이 주제에서의 강점과 약점을 두세 문장으로.

## 💬 문항별 피드백
(답변한 문항마다 "Q1: ..." 형태로 — 가장 중요한 문법/표현 교정 1-2개("잘못된 표현 → 교정" 형식)와, 그 답변에서 반복된 어휘·연음할 구간·강세 둘 단어 같은 구체적 개선 포인트 1개. 반드시 학생의 실제 문장을 인용할 것. 답변 안 한 문항은 생략)

## ✨ 이 주제 필수 표현
(이 주제의 답변에서 바로 쓸 수 있는 IH~AL급 영어 표현·콜로케이션 6-8개, 각각 짧은 예문과 함께. 학생이 이미 쓴 표현 말고 업그레이드가 되는 것들로)

## 📈 다음 연습 포인트
(이 주제를 다시 연습할 때 집중할 것 2-3가지, 구체적으로)

All explanations in Korean, example sentences in English.` + EXPR_SECTION;

// results: [{number, topic, text, transcript, duration}] — 세션 결과 화면과 녹음 기록 양쪽에서 사용
function buildEvalPrompt(results, mode, difficulty, startDifficulty) {
  const lines = results.map((r) => {
    let block = `[Q${r.number}] (${(r.topic || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()})\n${r.text}\n`;
    if (r.transcript) {
      block += `Answer: ${r.transcript}`;
      const stats = speechStats(r.transcript, r.duration);
      if (stats) block += `\nStats:\n${stats}`;
    } else {
      block += 'Answer: (no answer given)';
    }
    return block;
  });
  let intro = mode === 'mock'
    ? "Here is the student's full mock OPIc exam:"
    : "Here is the student's topic practice session:";
  if (mode === 'mock' && DIFF_INFO[difficulty]) {
    let diffNote = `[Exam difficulty] Self-assessment level ${DIFF_INFO[difficulty].prompt}`;
    if (startDifficulty && startDifficulty !== difficulty) {
      diffNote += ` (Note: the student started at level ${startDifficulty} and changed to level ${difficulty} at the mid-exam self-assessment; questions 8-15 follow the new level.)`;
    }
    intro = `${diffNote}\n\n${intro}`;
  }
  return `${intro}\n\n${lines.join('\n\n')}`;
}

function buildMockEvalPrompt() {
  return buildEvalPrompt(state.mockResults, state.mode, state.difficulty, state.startDifficulty);
}

// 파일 다운로드 (녹음 파일, 텍스트 내보내기)
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function audioExt(type) {
  if (!type) return 'webm';
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  return 'webm';
}

function safeName(s) {
  return (s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}️]/gu, '').replace(/[\\/:*?"<>|]/g, '').trim().replace(/\s+/g, '_').slice(0, 30);
}

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

function requestFeedback(question, answer, targetEl, btn, durationSec, onDone) {
  if (btn) btn.disabled = true;
  const stats = speechStats(answer, durationSec);
  const user = `[OPIc Question]\n${question}\n\n[Student's spoken answer (transcribed)]\n${answer}`
    + (stats ? `\n\n[Speech stats]\n${stats}` : '');
  callClaude(FEEDBACK_SYSTEM, user, targetEl, async (fullText) => {
    if (btn) btn.disabled = false;
    const stripped = await harvestExpressions(fullText, question.split(/[.?]/)[0].slice(0, 60), targetEl);
    if (onDone) onDone(stripped);
  });
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
  ROLEPLAYS.forEach((rp) => rpGrid.appendChild(make(rp, () => startRoleplaySession(rp))));
  const rpOnlyGrid = $('roleplay-only-grid');
  ROLEPLAYS.forEach((rp) => rpOnlyGrid.appendChild(make(rp, () => startRoleplaySession(rp))));
}

function startRoleplaySession(rp) {
  const queue = [
    { number: 1, topic: `${rp.icon} ${rp.name} · 11번 질문하기`, text: rp.q11 },
    { number: 2, topic: `${rp.icon} ${rp.name} · 12번 문제해결`, text: rp.q12 },
    { number: 3, topic: `${rp.icon} ${rp.name} · 13번 관련경험`, text: rp.q13 },
  ];
  startPracticeSession('practice', queue);
}

// ===== 녹음 기록 =====
async function renderHistory(filter = 'all') {
  const list = $('history-list');
  list.innerHTML = '';
  let recs = await getRecordings();
  if (filter !== 'all') recs = recs.filter((r) => r.mode === filter);
  if (recs.length === 0) {
    list.innerHTML = '<div class="empty-msg">기록이 없습니다.<br>연습을 시작해보세요!</div>';
    return;
  }
  // 세션(모의고사/연습 1회)별로 묶기
  const groups = [];
  for (const r of recs) {
    const key = r.sessionId || `single-${r.id}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(r);
    else groups.push({ key, items: [r] });
  }
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
  let lastDay = null;
  groups.forEach((g) => {
    const first = g.items[0];
    const date = new Date(first.date);

    // 날짜별 구분 헤더
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (dayKey !== lastDay) {
      lastDay = dayKey;
      const dayEl = document.createElement('div');
      dayEl.className = 'day-label';
      dayEl.textContent = `📅 ${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${DAY_NAMES[date.getDay()]})`;
      list.appendChild(dayEl);
    }

    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const modeLabel = first.mode === 'mock'
      ? `📝 모의고사${first.difficulty ? ` (${first.difficulty}단계)` : ''}`
      : '🎯 주제 연습';
    const header = document.createElement('h3');
    header.className = 'group-label';
    header.textContent = `${modeLabel} · ${timeStr} · ${g.items.length}문항`;
    list.appendChild(header);

    const sorted = [...g.items].sort((a, b) => (a.number || 0) - (b.number || 0));
    const dateTag = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${timeStr.replace(':', '')}`;
    const sessionName = `${first.mode === 'mock' ? '모의고사' : '주제연습'}_${dateTag}`;

    // 세션 단위 액션: 종합 피드백 / 텍스트 저장
    const sessionActions = document.createElement('div');
    sessionActions.className = 'h-actions';
    sessionActions.style.marginBottom = '10px';
    const withSession = g.items.find((r) => r.sessionFeedback);
    const sessionFbBox = document.createElement('div');
    sessionFbBox.className = 'history-item';
    sessionFbBox.innerHTML = `<div class="h-meta">🏆 종합 평가</div><div class="feedback-content" id="sfb-${g.key}"></div>`;
    if (withSession) sessionFbBox.querySelector('.feedback-content').innerHTML = renderMarkdown(withSession.sessionFeedback);
    else sessionFbBox.classList.add('hidden');

    if (g.items.some((r) => r.transcript)) {
      const sBtn = document.createElement('button');
      sBtn.className = 'btn primary';
      sBtn.textContent = withSession ? '🏆 종합 피드백 다시 받기' : (first.mode === 'mock' ? '🏆 종합 등급 예측' : '🏆 주제 종합 피드백');
      sBtn.onclick = () => {
        sBtn.disabled = true;
        sessionFbBox.classList.remove('hidden');
        const target = sessionFbBox.querySelector('.feedback-content');
        const results = sorted.map((r) => ({ number: r.number, topic: r.topic, text: r.question, transcript: r.transcript || '', duration: r.duration }));
        const system = first.mode === 'mock' ? MOCK_EVAL_SYSTEM : TOPIC_EVAL_SYSTEM;
        callClaude(system, buildEvalPrompt(results, first.mode, first.difficulty, null), target, async (fullText) => {
          sBtn.disabled = false;
          const stripped = await harvestExpressions(fullText, first.mode === 'mock' ? '모의고사 종합 평가' : '주제 종합 피드백', target);
          if (stripped) { updateRecording(first.id, { sessionFeedback: stripped }); first.sessionFeedback = stripped; }
        });
      };
      sessionActions.appendChild(sBtn);
    }
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn ghost';
    exportBtn.textContent = '📄 텍스트로 저장';
    exportBtn.onclick = () => {
      const parts = [`# OPIc ${modeLabel.replace(/[📝🎯]/g, '').trim()} — ${date.toLocaleString('ko-KR')}`, ''];
      const sf = g.items.find((r) => r.sessionFeedback);
      if (sf) parts.push('## 🏆 종합 평가', '', sf.sessionFeedback, '', '---', '');
      sorted.forEach((r) => {
        parts.push(`## Q${r.number || '?'}. ${r.topic || ''}`, '', `**질문:** ${r.question || ''}`, '',
          `**내 답변${r.duration ? ` (${fmtTime(r.duration)})` : ''}:** ${r.transcript || '(답변 없음)'}`, '');
        if (r.feedback) parts.push('### 🤖 AI 피드백', '', r.feedback, '');
        parts.push('---', '');
      });
      downloadBlob(new Blob([parts.join('\n')], { type: 'text/markdown;charset=utf-8' }), `${sessionName}.md`);
    };
    sessionActions.appendChild(exportBtn);
    list.appendChild(sessionActions);
    list.appendChild(sessionFbBox);

    // 세션 안에서는 문항 순서대로
    sorted.forEach((r) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div class="h-meta">${r.number ? `Q${r.number} · ` : ''}${escapeHtml(r.topic || '')}${r.duration ? ` · 🎙️ ${fmtTime(r.duration)}` : ''}</div>
        <div class="h-q">${escapeHtml(r.question || '')}</div>
        ${r.transcript ? `<div class="r-answer">${escapeHtml(r.transcript)}</div>` : ''}
      `;
      const blob = recordingBlob(r);
      if (blob) {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = URL.createObjectURL(blob);
        div.appendChild(audio);
      }
      // 저장된 피드백이 있으면 표시
      const fb = document.createElement('div');
      fb.className = 'feedback-content saved-feedback';
      if (r.feedback) fb.innerHTML = renderMarkdown(r.feedback);
      else fb.classList.add('hidden');
      const actions = document.createElement('div');
      actions.className = 'h-actions';
      const answerEl = div.querySelector('.r-answer');
      const runFeedback = (fbBtn) => {
        fb.classList.remove('hidden');
        requestFeedback(r.question, r.transcript, fb, fbBtn, r.duration,
          (fullText) => { if (fullText) { updateRecording(r.id, { feedback: fullText }); r.feedback = fullText; } });
      };
      if (r.transcript) {
        const fbBtn = document.createElement('button');
        fbBtn.className = 'btn primary';
        fbBtn.textContent = r.feedback ? '🤖 피드백 다시 받기' : '🤖 AI 피드백';
        fbBtn.onclick = () => runFeedback(fbBtn);
        actions.appendChild(fbBtn);
      } else if (blob) {
        // 받아쓰기가 없는 녹음: AI 받아쓰기 → 바로 피드백까지 한 번에
        const chainBtn = document.createElement('button');
        chainBtn.className = 'btn primary';
        chainBtn.textContent = '🤖 받아쓰기 후 AI 피드백';
        chainBtn.onclick = async () => {
          chainBtn.disabled = true;
          try {
            const text = await transcribeBlob(blob, (s) => { chainBtn.textContent = s; });
            if (!text) { chainBtn.textContent = '⚠️ 음성을 인식하지 못했어요'; return; }
            r.transcript = text;
            updateRecording(r.id, { transcript: text });
            const ans = document.createElement('div');
            ans.className = 'r-answer';
            ans.textContent = text;
            div.insertBefore(ans, div.querySelector('audio'));
            chainBtn.textContent = '🤖 AI 피드백';
            chainBtn.disabled = false;
            runFeedback(chainBtn);
          } catch (e) {
            chainBtn.textContent = '⚠️ 실패 — 다시 시도';
            chainBtn.disabled = false;
          }
        };
        actions.appendChild(chainBtn);
      }
      if (blob) {
        const dlBtn = document.createElement('button');
        dlBtn.className = 'btn ghost';
        dlBtn.textContent = '⬇️ 녹음 다운로드';
        dlBtn.onclick = () => downloadBlob(blob, `${sessionName}_Q${r.number || 0}_${safeName(r.topic)}.${audioExt(blob.type)}`);
        actions.appendChild(dlBtn);
      }
      const delBtn = document.createElement('button');
      delBtn.className = 'btn ghost';
      delBtn.textContent = '🗑️ 삭제';
      delBtn.onclick = () => { deleteRecording(r.id); div.remove(); };
      actions.appendChild(delBtn);
      div.appendChild(fb);
      div.appendChild(actions);
      list.appendChild(div);
    });
  });
}

// ===== 표현 연습 (암기 카드) =====
const drill = { items: [], idx: 0 };

async function renderExprList() {
  const list = $('expr-list');
  list.innerHTML = '';
  const items = (await getExpressions()).reverse();
  $('btn-start-drill').disabled = items.length === 0;
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-msg">저장된 표현이 없습니다.<br>AI 피드백이나 스크립트 첨삭을 받으면 추천 표현이 자동으로 저장돼요!</div>';
    return;
  }
  items.forEach((e) => {
    const div = document.createElement('div');
    div.className = 'expr-item';
    div.innerHTML = `
      <div class="e-text">${escapeHtml(e.text)}</div>
      <div class="e-meaning">${escapeHtml(e.meaning)}</div>
      <div class="e-example">"${escapeHtml(e.example)}"</div>
      <div class="e-meta">출처: ${escapeHtml(e.source || '')} · 🙆 ${e.correct || 0} / 🙅 ${e.wrong || 0}</div>
    `;
    const actions = document.createElement('div');
    actions.className = 'h-actions';
    const listenBtn = document.createElement('button');
    listenBtn.className = 'btn ghost';
    listenBtn.textContent = '🔊 듣기';
    listenBtn.onclick = () => speakQuestion(`${e.text}. ${e.example}`);
    const delBtn = document.createElement('button');
    delBtn.className = 'btn ghost';
    delBtn.textContent = '🗑️ 삭제';
    delBtn.onclick = () => { deleteExpression(e.id); div.remove(); };
    actions.appendChild(listenBtn);
    actions.appendChild(delBtn);
    div.appendChild(actions);
    list.appendChild(div);
  });
}

async function startDrill() {
  const items = await getExpressions();
  if (!items.length) return toast('저장된 표현이 없어요. 먼저 AI 피드백을 받아보세요!');
  // 틀린 횟수가 많고 맞춘 횟수가 적은 표현 우선, 최대 10개
  drill.items = items
    .sort((a, b) => ((a.correct || 0) - (a.wrong || 0)) - ((b.correct || 0) - (b.wrong || 0)) || Math.random() - 0.5)
    .slice(0, 10)
    .sort(() => Math.random() - 0.5);
  drill.idx = 0;
  show('expr-drill');
  renderDrillCard();
}

function renderDrillCard() {
  const e = drill.items[drill.idx];
  $('drill-progress').textContent = `카드 ${drill.idx + 1} / ${drill.items.length}`;
  $('drill-source').textContent = e.source || '';
  $('drill-meaning').textContent = e.meaning;
  $('drill-expr').textContent = e.text;
  $('drill-example').textContent = `"${e.example}"`;
  $('drill-answer').classList.add('hidden');
  $('btn-reveal').classList.remove('hidden');
  $('btn-listen-expr').classList.add('hidden');
  $('btn-know').classList.add('hidden');
  $('btn-again').classList.add('hidden');
}

function revealDrill() {
  $('drill-answer').classList.remove('hidden');
  $('btn-reveal').classList.add('hidden');
  $('btn-listen-expr').classList.remove('hidden');
  $('btn-know').classList.remove('hidden');
  $('btn-again').classList.remove('hidden');
  const e = drill.items[drill.idx];
  speakQuestion(`${e.text}. ${e.example}`);
}

function answerDrill(known) {
  const e = drill.items[drill.idx];
  updateExpression(e.id, known
    ? { correct: (e.correct || 0) + 1, lastPracticed: new Date().toISOString() }
    : { wrong: (e.wrong || 0) + 1, lastPracticed: new Date().toISOString() });
  if (!known) drill.items.push(e); // 틀린 카드는 이번 라운드 끝에 한 번 더
  drill.idx++;
  if (drill.idx >= drill.items.length) {
    toast('🎉 연습 완료! 수고했어요');
    renderExprList();
    show('expr');
    return;
  }
  renderDrillCard();
}

// ===== 학습 자료 =====
function renderStudy(sectionId) {
  const section = STUDY_SECTIONS.find((s) => s.id === sectionId) || STUDY_SECTIONS[0];
  $('study-desc').textContent = section.desc;
  const tabs = $('study-tabs');
  tabs.innerHTML = '';
  STUDY_SECTIONS.forEach((s) => {
    const btn = document.createElement('button');
    btn.className = 'btn' + (s.id === section.id ? ' active' : '');
    btn.textContent = `${s.icon} ${s.name}`;
    btn.onclick = () => renderStudy(s.id);
    tabs.appendChild(btn);
  });
  const list = $('study-list');
  list.innerHTML = '';
  let lastGroup = null;
  section.items.forEach((item) => {
    if (item.group && item.group !== lastGroup) {
      lastGroup = item.group;
      const g = document.createElement('h3');
      g.className = 'group-label';
      g.textContent = item.group;
      list.appendChild(g);
    }
    const div = document.createElement('div');
    div.className = 'expr-item';
    div.innerHTML = `
      <div class="e-text">${escapeHtml(item.text)}</div>
      <div class="e-meaning">${escapeHtml(item.meaning)}</div>
      <div class="e-example">"${escapeHtml(item.example)}"</div>
    `;
    const actions = document.createElement('div');
    actions.className = 'h-actions';
    const listenBtn = document.createElement('button');
    listenBtn.className = 'btn ghost';
    listenBtn.textContent = '🔊 듣기';
    listenBtn.onclick = () => speakQuestion(`${item.text}. ${item.example}`);
    const addBtn = document.createElement('button');
    addBtn.className = 'btn ghost';
    addBtn.textContent = '💪 표현 연습에 추가';
    addBtn.onclick = async () => {
      const added = await saveExpressions(
        [{ text: item.text, example: item.example, meaning: item.meaning }],
        `학습 자료 · ${section.name}`
      );
      toast(added ? '💪 표현 연습에 추가됐어요' : '이미 표현 연습에 있는 표현이에요');
      if (added) { addBtn.disabled = true; addBtn.textContent = '✅ 추가됨'; }
    };
    actions.appendChild(listenBtn);
    actions.appendChild(addBtn);
    div.appendChild(actions);
    list.appendChild(div);
  });
}

// ===== 설정: 서베이 주제 선택 =====
function renderSurveyGrid() {
  const grid = $('survey-grid');
  grid.innerHTML = '';
  const selected = settings.surveyIds || TOPICS.map((t) => t.id);
  TOPICS.forEach((t) => {
    const btn = document.createElement('button');
    btn.className = 'topic-card' + (selected.includes(t.id) ? ' checked' : '');
    btn.dataset.topicId = t.id;
    btn.innerHTML = `<span class="t-icon">${t.icon}</span><span>${t.name}</span>`;
    btn.onclick = () => btn.classList.toggle('checked');
    grid.appendChild(btn);
  });
}

// ===== 스크립트 문장별 발음 듣기 =====
const scriptPlay = { sentences: [], spans: [] };

function splitSentences(text) {
  return (text.match(/[^.!?\n]+[.!?]*/g) || []).map((s) => s.trim()).filter(Boolean);
}

function highlightSentence(idx) {
  scriptPlay.spans.forEach((el, i) => el.classList.toggle('active', i === idx));
}

function renderScriptSentences() {
  const script = $('script-input').value.trim();
  if (!script) return toast('스크립트를 먼저 입력해주세요');
  scriptPlay.sentences = splitSentences(script);
  scriptPlay.spans = [];
  const box = $('script-sentences');
  box.innerHTML = '';
  scriptPlay.sentences.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'sent-item';
    div.innerHTML = `<span class="s-num">${i + 1}</span><span class="s-text">${escapeHtml(s)}</span>`;
    div.onclick = () => { highlightSentence(i); speakQuestion(s, () => highlightSentence(-1)); };
    scriptPlay.spans.push(div);
    box.appendChild(div);
  });
  $('script-sentences-box').classList.remove('hidden');
}

function playAllSentences(i = 0) {
  if (i >= scriptPlay.sentences.length) return highlightSentence(-1);
  highlightSentence(i);
  speakQuestion(scriptPlay.sentences[i], () => playAllSentences(i + 1));
}

// ===== 음성인식 진단 =====
function runSttTest() {
  const box = $('stt-test-box');
  const log = $('stt-test-log');
  box.classList.remove('hidden');
  const lines = [];
  const add = (s) => { lines.push(s); log.textContent = lines.join('\n'); };
  log.textContent = '';

  add(`브라우저: ${navigator.userAgent.includes('SamsungBrowser') ? '삼성 인터넷 ⚠️' : navigator.userAgent.includes('Chrome') ? 'Chrome 계열' : '기타'}`);
  add(`보안 컨텍스트(HTTPS): ${window.isSecureContext ? '✅' : '❌ (음성인식 불가 원인)'}`);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return add('❌ 이 브라우저에는 음성인식 API가 아예 없습니다. Chrome 앱으로 직접 열어주세요.');
  add('✅ 음성인식 API 존재');

  const rec = new SR();
  rec.lang = 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  let gotAudio = false, gotSpeech = false, gotResult = false, ended = false;
  rec.onstart = () => add('✅ 인식 시작됨 — 지금 영어로 말해보세요!');
  rec.onaudiostart = () => { gotAudio = true; add('✅ 마이크 소리 입력 감지'); };
  rec.onspeechstart = () => { gotSpeech = true; add('✅ 말소리 감지'); };
  rec.onresult = (e) => {
    gotResult = true;
    const last = e.results[e.results.length - 1];
    add(`✅ 인식됨: "${last[0].transcript.trim()}"`);
  };
  rec.onerror = (e) => add(`❌ 오류 발생: ${e.error}`);
  rec.onend = () => { if (!ended) { ended = true; finish(); } };
  const finish = () => {
    try { rec.stop(); } catch (_) {}
    add('--- 진단 종료 ---');
    if (gotResult) add('🎉 음성인식이 정상 동작합니다! 문제가 계속되면 이 진단 결과를 알려주세요.');
    else if (gotSpeech || gotAudio) add('⚠️ 소리는 들어오는데 텍스트 변환이 안 됩니다. 폰의 Google 음성인식에 영어(미국) 언어팩이 없을 가능성이 큽니다.\n→ 폰 설정 > 시스템 > 언어 및 입력 > 음성인식 (또는 Google 앱 > 설정 > 음성) 에서 English (US) 오프라인 팩을 설치해보세요.');
    else add('⚠️ 마이크 입력 자체가 감지되지 않았습니다. 사이트 마이크 권한과 폰 마이크를 확인해주세요.');
  };
  try { rec.start(); } catch (e) { add(`❌ 시작 실패: ${e.message}`); return; }
  setTimeout(() => { if (!ended) { ended = true; finish(); } }, 7000);
}

// ===== 이벤트 바인딩 =====
function bind() {
  $('brand-home').onclick = () => { stopRecording(); stopQuestionTimer(); show('home'); };
  $('btn-settings').onclick = () => {
    $('api-key-input').value = settings.apiKey;
    $('timer-select').value = String(settings.timerSec);
    $('stt-mode-select').value = settings.sttMode;
    renderSurveyGrid();
    show('settings');
  };
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.onclick = () => {
      const nav = btn.dataset.nav;
      if (nav === 'mock') {
        show('mock-setup');
      } else if (nav === 'history') {
        document.querySelectorAll('[data-hfilter]').forEach((b) => b.classList.toggle('active', b.dataset.hfilter === 'all'));
        renderHistory();
        show('history');
      } else if (nav === 'expr') {
        renderExprList();
        show('expr');
      } else if (nav === 'study') {
        renderStudy();
        show('study');
      } else if (nav === 'roleplay') {
        show('roleplay');
      } else {
        show(nav);
      }
    };
  });
  document.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.onclick = () => {
      state.difficulty = btn.dataset.diff;
      localStorage.setItem('opic_difficulty', state.difficulty);
      startPracticeSession('mock', buildMockExam(state.difficulty, settings.surveyIds));
    };
  });
  document.querySelectorAll('[data-adjust]').forEach((btn) => {
    btn.onclick = () => applyDifficultyAdjust(parseInt(btn.dataset.adjust, 10));
  });
  state.difficulty = localStorage.getItem('opic_difficulty') || '5';
  $('btn-save-settings').onclick = () => {
    const checked = [...document.querySelectorAll('#survey-grid .topic-card.checked')].map((b) => b.dataset.topicId);
    if (checked.length > 0 && checked.length < 3) {
      return toast('서베이 주제는 3개 이상 선택해주세요 (실제 오픽처럼 두 주제 + 예비가 필요해요)');
    }
    if (checked.length > 0) settings.surveyIds = checked;
    settings.apiKey = $('api-key-input').value.trim();
    settings.timerSec = parseInt($('timer-select').value, 10);
    settings.sttMode = $('stt-mode-select').value;
    toast('저장되었습니다 ✅');
    // Whisper 모드 선택 시 모델을 미리 다운로드 (첫 녹음 때 기다리지 않도록)
    if (settings.sttMode === 'whisper' && !whisperPipeline) {
      toast('🤖 AI 받아쓰기 모델을 미리 받아둘게요 (약 40MB, 한 번만)', 4000);
      getWhisper(() => {}).then(() => toast('✅ AI 받아쓰기 준비 완료!')).catch(() => {});
    }
    show('home');
  };
  $('btn-listen').onclick = () => speakQuestion(state.queue[state.qIndex].text);
  $('btn-toggle-text').onclick = () => {
    state.questionVisible = !state.questionVisible;
    $('q-text').classList.toggle('blurred', !state.questionVisible);
    $('btn-toggle-text').textContent = state.questionVisible ? '👁️ 질문 숨기기' : '👁️ 질문 보기';
  };
  $('btn-record').onclick = () => state.recording ? stopRecording() : startRecording();
  $('btn-retake').onclick = retakeRecording;
  $('btn-next-q').onclick = nextQuestion;
  $('btn-finish').onclick = async () => {
    await stopAndWait();
    stopQuestionTimer();
    await archiveCurrentAnswer();
    if (state.mockResults.some((r) => r.transcript || r.recId != null)) showSessionResult();
    else show('home');
  };
  document.querySelectorAll('[data-hfilter]').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('[data-hfilter]').forEach((b) => b.classList.toggle('active', b === btn));
      renderHistory(btn.dataset.hfilter);
    };
  });
  $('btn-stt-test').onclick = runSttTest;
  $('btn-random-roleplay').onclick = () => {
    startRoleplaySession(ROLEPLAYS[Math.floor(Math.random() * ROLEPLAYS.length)]);
  };
  $('btn-script-listen').onclick = renderScriptSentences;
  $('btn-script-play-all').onclick = () => {
    if (!scriptPlay.sentences.length) return;
    playAllSentences(0);
  };
  $('script-grade').value = localStorage.getItem('opic_script_grade') || 'IH';
  $('btn-correct').onclick = () => {
    const script = $('script-input').value.trim();
    if (!script) return toast('첨삭받을 스크립트를 입력해주세요');
    const grade = $('script-grade').value;
    localStorage.setItem('opic_script_grade', grade);
    const question = $('script-question').value.trim();
    const user = (question ? `[OPIc Question]\n${question}\n\n` : '') + `[Student's script]\n${script}`;
    $('script-feedback-box').classList.remove('hidden');
    const btn = $('btn-correct');
    btn.disabled = true;
    callClaude(scriptSystem(grade), user, $('script-feedback-content'), async (fullText) => {
      btn.disabled = false;
      await harvestExpressions(fullText, `스크립트 첨삭 (${grade})`, $('script-feedback-content'));
    });
  };
  $('btn-mock-home').onclick = () => show('home');
  $('btn-start-drill').onclick = startDrill;
  $('btn-reveal').onclick = revealDrill;
  $('btn-listen-expr').onclick = () => {
    const e = drill.items[drill.idx];
    speakQuestion(`${e.text}. ${e.example}`);
  };
  $('btn-know').onclick = () => answerDrill(true);
  $('btn-again').onclick = () => answerDrill(false);
  $('btn-drill-quit').onclick = () => { speechSynthesis.cancel(); renderExprList(); show('expr'); };
  $('btn-overall-grade').onclick = () => {
    const answered = state.mockResults.filter((r) => r.transcript).length;
    if (answered === 0) return toast('답변한 문항이 없어 종합 평가를 할 수 없어요');
    if (state.mode === 'mock' && answered < 5) toast(`답변한 문항이 ${answered}개뿐이라 예측 정확도가 낮을 수 있어요`, 3500);
    const btn = $('btn-overall-grade');
    btn.disabled = true;
    $('overall-grade-box').classList.remove('hidden');
    const system = state.mode === 'mock' ? MOCK_EVAL_SYSTEM : TOPIC_EVAL_SYSTEM;
    callClaude(system, buildMockEvalPrompt(), $('overall-grade-content'), async (fullText) => {
      btn.disabled = false;
      const stripped = await harvestExpressions(fullText, state.mode === 'mock' ? '모의고사 종합 평가' : '주제 종합 피드백', $('overall-grade-content'));
      // 종합 평가도 녹음 기록(세션 첫 문항)에 저장
      const firstRec = state.mockResults.find((r) => r.recId != null);
      if (stripped && firstRec) updateRecording(firstRec.recId, { sessionFeedback: stripped });
    });
  };
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
