(() => {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    .enhanced-recorder{margin-top:14px;padding:16px;border:1px solid rgba(160,183,201,.18);border-radius:18px;background:rgba(7,15,22,.72)}
    .enhanced-recorder-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .enhanced-recorder-title{font-size:.82rem;font-weight:750;color:#dfeaf4}
    .enhanced-recorder-time{font-variant-numeric:tabular-nums;color:#66e8ff;font-weight:800}
    .enhanced-recorder-controls{display:flex;flex-wrap:wrap;gap:8px}
    .enhanced-recorder-controls .btn{padding:.68rem .9rem;font-size:.72rem}
    .enhanced-meter{height:7px;margin:12px 0 8px;border-radius:999px;background:rgba(160,183,201,.12);overflow:hidden}
    .enhanced-meter-fill{width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,#86f7b5,#66e8ff,#7d8dff);transition:width .08s linear}
    .enhanced-recorder-status{min-height:1.4em;margin:0;color:#9ab0bf;font-size:.72rem;line-height:1.45}
    .enhanced-recorder audio{width:100%;height:40px;margin-top:10px;accent-color:#66e8ff}
    @media(max-width:560px){.enhanced-recorder-head{align-items:flex-start}.enhanced-recorder-controls .btn{flex-basis:100%}}
  `;
  document.head.appendChild(style);

  const container = document.querySelector('.recording-panel');
  if (!container) return;

  const panel = document.createElement('section');
  panel.className = 'enhanced-recorder';
  panel.setAttribute('aria-label', 'Улучшенная запись голоса');
  panel.innerHTML = `
    <div class="enhanced-recorder-head">
      <span class="enhanced-recorder-title">Новая запись · до 5 минут</span>
      <span class="enhanced-recorder-time" id="enhanced-time">00:00</span>
    </div>
    <div class="enhanced-meter" aria-label="Уровень микрофона"><div class="enhanced-meter-fill" id="enhanced-meter-fill"></div></div>
    <div class="enhanced-recorder-controls">
      <button class="btn primary" id="enhanced-start" type="button">Начать запись</button>
      <button class="btn" id="enhanced-pause" type="button" disabled>Пауза</button>
      <button class="btn" id="enhanced-stop" type="button" disabled>Остановить</button>
      <button class="btn" id="enhanced-download" type="button" disabled>Скачать</button>
    </div>
    <p class="enhanced-recorder-status" id="enhanced-status" role="status" aria-live="polite">Разрешите доступ к микрофону для записи.</p>
    <audio id="enhanced-playback" controls hidden></audio>
  `;
  container.appendChild(panel);

  const startButton = panel.querySelector('#enhanced-start');
  const pauseButton = panel.querySelector('#enhanced-pause');
  const stopButton = panel.querySelector('#enhanced-stop');
  const downloadButton = panel.querySelector('#enhanced-download');
  const status = panel.querySelector('#enhanced-status');
  const time = panel.querySelector('#enhanced-time');
  const meter = panel.querySelector('#enhanced-meter-fill');
  const playback = panel.querySelector('#enhanced-playback');

  let stream;
  let recorder;
  let chunks = [];
  let startedAt = 0;
  let elapsedBeforePause = 0;
  let timer;
  let audioContext;
  let analyser;
  let animationFrame;
  let outputUrl;
  let outputMime = '';
  const MAX_SECONDS = 300;

  const formatTime = (seconds) => {
    const safe = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  };

  const getSupportedMime = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    return types.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';
  };

  const stopMeter = () => {
    cancelAnimationFrame(animationFrame);
    meter.style.width = '0%';
  };

  const drawMeter = () => {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const average = data.reduce((sum, value) => sum + value, 0) / data.length;
    meter.style.width = `${Math.min(100, average * 1.35)}%`;
    animationFrame = requestAnimationFrame(drawMeter);
  };

  const updateTimer = () => {
    if (!startedAt) return;
    const elapsed = elapsedBeforePause + (Date.now() - startedAt) / 1000;
    time.textContent = formatTime(elapsed);
    if (elapsed >= MAX_SECONDS) {
      stopRecording();
      status.textContent = 'Запись остановлена: достигнут лимит 5 минут.';
    }
  };

  const cleanUpStream = () => {
    clearInterval(timer);
    stopMeter();
    if (audioContext) audioContext.close().catch(() => {});
    if (stream) stream.getTracks().forEach((track) => track.stop());
    audioContext = undefined;
    stream = undefined;
  };

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      status.textContent = 'Запись не поддерживается этим браузером.';
      return;
    }

    try {
      startButton.disabled = true;
      status.textContent = 'Запрашиваем доступ к микрофону…';
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        }
      });

      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      drawMeter();

      chunks = [];
      outputMime = getSupportedMime();
      recorder = new MediaRecorder(stream, outputMime ? { mimeType: outputMime, audioBitsPerSecond: 128000 } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        const blob = new Blob(chunks, { type: recorder.mimeType || outputMime || 'audio/webm' });
        outputUrl = URL.createObjectURL(blob);
        playback.src = outputUrl;
        playback.hidden = false;
        downloadButton.disabled = false;
        const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        downloadButton.dataset.extension = extension;
        status.textContent = `Готово: запись сохранена локально (${formatTime(elapsedBeforePause)}).`;
        cleanUpStream();
      };

      elapsedBeforePause = 0;
      startedAt = Date.now();
      recorder.start(250);
      timer = setInterval(updateTimer, 250);
      time.textContent = '00:00';
      pauseButton.disabled = false;
      stopButton.disabled = false;
      status.textContent = 'Идёт запись. Разговор сохраняется только в браузере.';
    } catch (error) {
      startButton.disabled = false;
      status.textContent = error.name === 'NotAllowedError'
        ? 'Доступ к микрофону запрещён. Разрешите его в настройках браузера.'
        : 'Не удалось запустить микрофон.';
    }
  }

  function pauseRecording() {
    if (!recorder) return;
    if (recorder.state === 'recording') {
      recorder.pause();
      elapsedBeforePause += (Date.now() - startedAt) / 1000;
      startedAt = 0;
      pauseButton.textContent = 'Продолжить';
      status.textContent = 'Запись на паузе.';
    } else if (recorder.state === 'paused') {
      recorder.resume();
      startedAt = Date.now();
      pauseButton.textContent = 'Пауза';
      status.textContent = 'Запись продолжается.';
    }
  }

  function stopRecording() {
    if (!recorder || recorder.state === 'inactive') return;
    if (startedAt) elapsedBeforePause += (Date.now() - startedAt) / 1000;
    startedAt = 0;
    clearInterval(timer);
    recorder.stop();
    pauseButton.disabled = true;
    stopButton.disabled = true;
    startButton.disabled = false;
    pauseButton.textContent = 'Пауза';
    status.textContent = 'Обрабатываем запись…';
  }

  startButton.addEventListener('click', startRecording);
  pauseButton.addEventListener('click', pauseRecording);
  stopButton.addEventListener('click', stopRecording);
  downloadButton.addEventListener('click', () => {
    if (!outputUrl) return;
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `aiproduct-studio-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${downloadButton.dataset.extension || 'webm'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });

  window.addEventListener('beforeunload', () => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
  });
})();
