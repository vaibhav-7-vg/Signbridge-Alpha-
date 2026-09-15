/* ==================================
   SIGNBRIDGE AI
   SIGN RECOGNITION ENGINE
   ================================== */


/* Navigation */

function goBack() {
  window.history.back();
}


function goHome() {
  window.location.href = "index.html";
}


function openCommunication() {
  window.location.href = "communicate.html";
}


function openProfile() {
  window.location.href = "profile.html";
}


/* Camera */

let cameraStream = null;


async function startCamera() {

  const video = document.getElementById("cameraVideo");
  const placeholder = document.getElementById("cameraPlaceholder");
  const guide = document.querySelector(".camera-guide");
  const scanLine = document.getElementById("scanLine");

  const status = document.getElementById("cameraStatus");
  const engineStatus = document.getElementById("engineStatus");
  const resultMessage = document.getElementById("resultMessage");

  try {

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: {
          ideal: 1280
        },
        height: {
          ideal: 720
        }
      },
      audio: false
    });

    video.srcObject = cameraStream;

    video.style.display = "block";

    placeholder.style.display = "none";

    guide.style.display = "block";

    scanLine.style.opacity = "1";

    status.textContent = "Camera Active";

    engineStatus.textContent =
      "Camera connected • ML interface active";

    resultMessage.textContent =
      "Camera is ready. ML model will analyse the sign here.";

    startScanningAnimation();

    console.log("SignBridge AI: Camera started.");

  } catch (error) {

    console.error(error);

    status.textContent = "Camera Permission Required";

    engineStatus.textContent =
      "Camera access was not granted";

    resultMessage.textContent =
      "Please allow camera permission and try again.";

    alert(
      "Camera access is required for Sign Recognition."
    );

  }

}


/* Scanning animation */

function startScanningAnimation() {

  const scanLine = document.getElementById("scanLine");

  let position = 20;

  let direction = 1;

  setInterval(() => {

    position += direction * 0.7;

    if (position >= 80) {
      direction = -1;
    }

    if (position <= 20) {
      direction = 1;
    }

    scanLine.style.top = position + "%";

  }, 30);

}


/* ==================================
   ML RESULT INTERFACE
   ================================== */

function updateRecognitionResult(
  sign,
  confidence,
  alternatives = []
) {

  const recognizedText =
    document.getElementById("recognizedText");

  const confidenceValue =
    document.getElementById("confidenceValue");

  const confidenceBar =
    document.getElementById("confidenceBar");

  const resultMessage =
    document.getElementById("resultMessage");

  recognizedText.textContent = sign;

  confidenceValue.textContent =
    confidence.toFixed(1) + "%";

  confidenceBar.style.width =
    confidence + "%";


  resultMessage.textContent =
    confidence >= 80
      ? "High-confidence ML prediction."
      : confidence >= 50
      ? "Moderate confidence. Please keep the sign clear."
      : "Low confidence. Try showing the sign again.";


  updatePrediction(
    "prediction1",
    "predictionConfidence1",
    alternatives[0]
  );

  updatePrediction(
    "prediction2",
    "predictionConfidence2",
    alternatives[1]
  );

  updatePrediction(
    "prediction3",
    "predictionConfidence3",
    alternatives[2]
  );

}


function updatePrediction(
  nameId,
  confidenceId,
  prediction
) {

  const name =
    document.getElementById(nameId);

  const confidence =
    document.getElementById(confidenceId);

  if (!prediction) {

    name.textContent = "—";

    confidence.textContent = "—";

    return;
  }

  name.textContent =
    prediction.name;

  confidence.textContent =
    prediction.confidence.toFixed(1) + "%";
}


/* ==================================
   DEMO ML OUTPUT
   ==================================
   This is ONLY a UI test.

   The real trained ML model will
   replace this section later.
   ================================== */

function demoRecognition() {

  updateRecognitionResult(
    "HELP",
    96.8,
    [
      {
        name: "HELP",
        confidence: 96.8
      },
      {
        name: "THANK YOU",
        confidence: 1.9
      },
      {
        name: "YES",
        confidence: 0.8
      }
    ]
  );

}


/* Stop camera */

function stopCamera() {

  if (!cameraStream) {
    return;
  }

  cameraStream.getTracks().forEach(
    track => track.stop()
  );

  cameraStream = null;

  const video =
    document.getElementById("cameraVideo");

  video.srcObject = null;

  document.getElementById(
    "cameraStatus"
  ).textContent = "Camera Stopped";

}


/* Initialize */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "SignBridge AI — Sign Recognition module loaded."
    );

    console.log(
      "ML model interface initialized."
    );

  }
);
