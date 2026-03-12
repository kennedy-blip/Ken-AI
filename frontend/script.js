/**
 * KENAI V3.7 - PRODUCTION READY
 */

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
const synth = window.speechSynthesis;

// Configuration: REPLACE with your Render URL after deployment
const API_BASE_URL = window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000' 
    : 'https://kenai-backend.onrender.com'; 

// UI Elements
const startBtn = document.getElementById('start-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const transcriptDisplay = document.getElementById('transcript');
const orbWrapper = document.querySelector('.orb-wrapper');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

let isThinking = false;
let isMuted = false;
let abortController = null;
let audioContext, analyser, dataArray;

// --- 1. CONNECTION MONITOR (Heartbeat) ---
async function checkServer() {
    try {
        const res = await fetch(`${API_BASE_URL}/`);
        if (res.ok) {
            statusDot.classList.add('online');
            statusText.innerText = "KenAI Online";
        }
    } catch (e) {
        statusDot.classList.remove('online');
        statusText.innerText = "Connecting to Cloud...";
    }
}
setInterval(checkServer, 5000);

// --- 2. VISUALIZER ---
async function startVisualizer() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 64;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        draw();
    } catch (e) { console.error("Mic Access Denied:", e); }
}

function draw() {
    requestAnimationFrame(draw);
    if (isMuted || !dataArray) return;
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i] / 4;
        ctx.fillStyle = `rgba(0, 242, 255, ${barHeight / 50})`;
        ctx.fillRect(x, canvas.height - barHeight, (canvas.width / dataArray.length) * 2.5, barHeight);
        x += (canvas.width / dataArray.length) * 2.5 + 2;
    }
}

// --- 3. VOICE LOGIC ---
recognition.onresult = (event) => {
    if (isMuted) return;

    // INTERRUPT LOGIC: Shut up and cancel current thinking if new voice is heard
    if (synth.speaking || isThinking) {
        synth.cancel();
        if (abortController) abortController.abort();
        isThinking = false;
    }

    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
    }
    transcriptDisplay.innerText = transcript;

    const lower = transcript.toLowerCase();
    if (lower.includes("hello ken")) {
        const isManualEnd = lower.endsWith("over") || lower.endsWith("send");
        const isFinal = event.results[event.results.length - 1].isFinal;

        if (isManualEnd || isFinal) {
            let command = lower.split("hello ken")[1].trim();
            command = command.replace("over", "").replace("send", "").trim();
            if (command.length > 2) handleAI(command);
        }
    }
};

async function handleAI(command) {
    isThinking = true;
    orbWrapper.classList.add('listening');
    abortController = new AbortController();

    try {
        const res = await fetch(`${API_BASE_URL}/ask`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ text: command }),
            signal: abortController.signal
        });
        const data = await res.json();
        speak(data.reply);
    } catch (e) {
        if (e.name !== 'AbortError') {
            isThinking = false;
            restartMic();
        }
    }
}

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; 

    utterance.onstart = () => { orbWrapper.classList.remove('listening'); };
    utterance.onend = () => {
        isThinking = false;
        transcriptDisplay.innerText = "";
        restartMic();
    };
    synth.speak(utterance);
}

// --- 4. LIFECYCLE ---
function restartMic() {
    try { recognition.stop(); } catch (e) {}
}

recognition.onend = () => {
    if (!isThinking && !isMuted) recognition.start();
};

recognition.onerror = (e) => {
    if (e.error === 'no-speech') restartMic();
};

startBtn.onclick = () => {
    recognition.start();
    startVisualizer();
    checkServer();
    startBtn.style.display = 'none';
};