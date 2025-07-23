(async () => {
  if (document.getElementById('meet-monitor-popup')) return;

  try {
    chrome.notifications.create('', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon.png'),
      title: 'Notification',
      message: 'An event has occurred!',
      priority: 2
    });
  } catch (e) {
    console.warn("Error with notification:", e);
  }

  const isParticipantInClass = document.querySelector('[data-participant-status="in-class"]');
  const participantName = "Rony Wahyu Utama";

  chrome.runtime.sendMessage({ name: participantName, status: isParticipantInClass ? "in-class" : "left" });

  // Minta izin kamera dulu
  const stream = await requestCameraPermission();
  if (stream) {
    initializeFaceDetection(stream);
  }
})();

// Fungsi minta izin kamera
async function requestCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"
      },
      audio: false
    });
    return stream;
  } catch (err) {
    console.error("Camera access denied:", err);
    showCameraPermissionUI();
    return null;
  }
}

// UI fallback jika user tolak izin webcam
function showCameraPermissionUI() {
  const permissionDiv = document.createElement('div');
  permissionDiv.style.position = 'fixed';
  permissionDiv.style.bottom = '20px';
  permissionDiv.style.right = '20px';
  permissionDiv.style.padding = '15px';
  permissionDiv.style.background = '#f8d7da';
  permissionDiv.style.border = '1px solid #f5c6cb';
  permissionDiv.style.borderRadius = '5px';
  permissionDiv.style.zIndex = '10000';

  permissionDiv.innerHTML = `
    <p>Ekstensi membutuhkan akses webcam untuk bekerja</p>
    <button id="enable-camera" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
      Izinkan Webcam
    </button>
  `;

  document.body.appendChild(permissionDiv);

  document.getElementById('enable-camera').addEventListener('click', async () => {
    const stream = await requestCameraPermission();
    if (stream) {
      permissionDiv.remove();
      initializeFaceDetection(stream);
    }
  });
}

// Load model TensorFlow
async function loadModels() {
  const faceModel = await tf.loadGraphModel('https://cdn.jsdelivr.net/gh/tensorflow/tfjs-models/facemesh/model.json');
  const expressionModel = await tf.loadGraphModel('path/to/expression/model.json');
  return { faceModel, expressionModel };
}

// Inisialisasi face detection dengan stream video
async function initializeFaceDetection(stream) {
  function monitorCameraAccess(stream) {
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.onended = () => {
      console.warn('Camera access was revoked');
      showCameraPermissionUI();
    };
  }
}
  monitorCameraAccess(stream); // <<== Tambahkan di sini

  const models = await loadModels();

  const video = document.createElement('video');
  video.style.display = 'none';
  document.body.appendChild(video);

  video.srcObject = stream;
  await video.play();

  await new Promise((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  detectFaceAndExpression(video, models);
}

// Panggil fungsi utama
(async function main() {
  const stream = await requestCameraPermission();
  if (stream) {
    initializeFaceDetection(stream);
  }
})();


// Deteksi wajah dan ekspresi
async function detectFaceAndExpression(video, models) {
  const { faceModel, expressionModel } = models;

  const detect = async () => {
    try {
      const predictions = await faceModel.estimateFaces({ input: video });

      if (predictions.length > 0) {
        sendFaceDataToDashboard(predictions);

        const videoTensor = tf.browser.fromPixels(video).expandDims(0);
        const expressionPredictions = await expressionModel.predict(videoTensor);
        sendExpressionDataToDashboard(expressionPredictions);
        tf.dispose(videoTensor);
      }
    } catch (err) {
      console.error("Error in detection:", err);
    }

    requestAnimationFrame(detect);
  };

  detect();
}

// Kirim data ke dashboard
function sendFaceDataToDashboard(predictions) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'faceData', data: predictions }));
  }
}

function sendExpressionDataToDashboard(predictions) {
  if (socket.readyState === WebSocket.OPEN) {
    predictions.array().then(arr => {
      socket.send(JSON.stringify({ type: 'expressionData', data: arr }));
    });
  }
}

// WebSocket connection
const socket = new WebSocket("ws://localhost:8080");
socket.onopen = () => console.log("WebSocket connection opened.");
socket.onerror = (error) => console.error("WebSocket error:", error);
socket.onclose = () => console.log("WebSocket connection closed.");
