/* =========================================================
   SIGNBRIDGE AI
   TWO-HAND SIGN RECOGNITION ENGINE
   Camera + MediaPipe + 126 Features
   ========================================================= */

let cameraStream = null;
let video = null;
let canvas = null;
let canvasContext = null;

let inputCanvas = null;
let inputContext = null;

let hands = null;

let cameraRunning = false;
let processingFrame = false;
let mediaPipeReady = false;

let leftHandFeatures = new Array(63).fill(0);
let rightHandFeatures = new Array(63).fill(0);

let currentTwoHandFeatures =
  new Array(126).fill(0);


/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  console.log("SignBridge Recognition page loaded.");

  video = document.getElementById("cameraVideo");
  canvas = document.getElementById("landmarkCanvas");

  if (canvas) {
    canvasContext = canvas.getContext("2d");
  }

  inputCanvas = document.createElement("canvas");
  inputContext = inputCanvas.getContext("2d");


  /* -------------------------------------------------------
     BACK BUTTON
     ------------------------------------------------------- */

  const backButton =
    document.getElementById("backButton");

  if (backButton) {

    backButton.addEventListener("click", function () {

      console.log("Back button clicked.");

      stopCamera();

      /*
         Always return to dashboard.
         This is more reliable than history.back()
         when the page was opened directly.
      */

      window.location.href = "index.html";

    });

  }


  /* -------------------------------------------------------
     START CAMERA BUTTON
     ------------------------------------------------------- */

  const startButton =
    document.getElementById("startCameraButton");

  if (startButton) {

    startButton.addEventListener("click", function () {

      console.log("Start Camera clicked.");

      startCamera();

    });

  }


  updateFeatureUI();

});


/* =========================================================
   START CAMERA
   ========================================================= */

async function startCamera() {

  console.log("Starting camera...");

  if (cameraRunning) {
    console.log("Camera is already running.");
    return;
  }


  hideCameraError();


  /* -------------------------------------------------------
     CHECK BROWSER CAMERA SUPPORT
     ------------------------------------------------------- */

  if (!navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia) {

    showCameraError(
      "Camera is not supported by this browser."
    );

    return;
  }


  try {

    setCameraStatus(
      "Requesting camera permission...",
      "loading"
    );


    /*
       IMPORTANT:
       Camera starts BEFORE MediaPipe.

       Therefore a MediaPipe/CDN problem will NOT
       stop the camera button from working.
    */

    let stream;

    try {

      stream =
        await navigator.mediaDevices.getUserMedia({

          video: {
            facingMode: {
              ideal: "user"
            },

            width: {
              ideal: 1280
            },

            height: {
              ideal: 720
            }
          },

          audio: false

        });

    } catch (firstError) {

      console.warn(
        "Preferred camera settings failed.",
        firstError
      );


      /*
         Fallback camera request.
      */

      stream =
        await navigator.mediaDevices.getUserMedia({

          video: true,
          audio: false

        });

    }


    cameraStream = stream;


    /* -------------------------------------------------------
       CONNECT CAMERA TO VIDEO
       ------------------------------------------------------- */

    video.srcObject = cameraStream;

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;


    await video.play();


    cameraRunning = true;


    /* -------------------------------------------------------
       SHOW CAMERA
       ------------------------------------------------------- */

    const placeholder =
      document.getElementById("cameraPlaceholder");

    if (placeholder) {
      placeholder.style.display = "none";
    }


    video.style.display = "block";


    if (canvas) {
      canvas.style.display = "block";
    }


    resizeCanvas();


    setCameraStatus(
      "Camera Active",
      "active"
    );


    updateDetectionUI(
      0,
      "Camera is active. Show your hands."
    );


    setEngineStatus(
      "Loading ML Engine",
      "Camera is active. Loading two-hand detection..."
    );


    startScanAnimation();


    console.log(
      "Camera started successfully."
    );


    /* -------------------------------------------------------
       LOAD MEDIAPIPE AFTER CAMERA WORKS
       ------------------------------------------------------- */

    await initializeMediaPipe();


  } catch (error) {

    console.error(
      "Camera startup failed:",
      error
    );


    cameraRunning = false;


    let message =
      "Unable to access the camera.";


    if (error && error.name === "NotAllowedError") {

      message =
        "Camera permission was denied. Allow camera permission in Chrome and try again.";

    } else if (
      error &&
      error.name === "NotFoundError"
    ) {

      message =
        "No camera was found on this device.";

    } else if (
      error &&
      error.name === "NotReadableError"
    ) {

      message =
        "The camera is already being used by another app.";

    } else if (
      error &&
      error.name === "SecurityError"
    ) {

      message =
        "Camera access was blocked by browser security.";

    } else if (error && error.message) {

      message =
        error.message;

    }


    showCameraError(message);

    setCameraStatus(
      "Camera Error",
      "error"
    );

  }

}


/* =========================================================
   DYNAMICALLY LOAD MEDIAPIPE
   ========================================================= */

function loadScript(url) {

  return new Promise(function (resolve, reject) {

    /*
       If the script is already loaded,
       do not load it again.
    */

    if (
      url.includes("hands.js") &&
      typeof window.Hands !== "undefined"
    ) {

      resolve();
      return;

    }


    if (
      url.includes("drawing_utils.js") &&
      typeof window.drawConnectors !== "undefined"
    ) {

      resolve();
      return;

    }


    const script =
      document.createElement("script");

    script.src = url;
    script.async = true;


    script.onload = function () {

      console.log(
        "Loaded:",
        url
      );

      resolve();

    };


    script.onerror = function () {

      reject(
        new Error(
          "Failed to load ML library."
        )
      );

    };


    document.head.appendChild(script);

  });

}


/* =========================================================
   INITIALIZE MEDIAPIPE
   ========================================================= */

async function initializeMediaPipe() {

  try {

    setEngineStatus(
      "Loading ML Engine",
      "Preparing two-hand landmark detection..."
    );


    await loadScript(
      "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
    );


    await loadScript(
      "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
    );


    if (typeof window.Hands === "undefined") {

      throw new Error(
        "MediaPipe Hands could not be loaded."
      );

    }


    hands =
      new window.Hands({

        locateFile: function (file) {

          return (
            "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" +
            file
          );

        }

      });


    /*
       TWO-HAND PIPELINE
    */

    hands.setOptions({

      maxNumHands: 2,

      modelComplexity: 1,

      minDetectionConfidence: 0.65,

      minTrackingConfidence: 0.65

    });


    hands.onResults(
      handleHandResults
    );


    mediaPipeReady = true;


    setEngineStatus(
      "Two-Hand ML Ready",
      "Detecting left and right hand landmarks."
    );


    console.log(
      "Two-hand MediaPipe engine ready."
    );


    processCameraFrame();


  } catch (error) {

    console.error(
      "MediaPipe initialization failed:",
      error
    );


    mediaPipeReady = false;


    /*
       IMPORTANT:
       Camera remains ON even if ML fails.
    */

    setEngineStatus(
      "Camera Active",
      "Camera works, but the ML engine could not load. Check your internet connection and refresh."
    );


    processCameraFrame();

  }

}


/* =========================================================
   CAMERA FRAME PROCESSING
   ========================================================= */

async function processCameraFrame() {

  if (!cameraRunning) {
    return;
  }


  if (!mediaPipeReady || !hands) {

    requestAnimationFrame(
      processCameraFrame
    );

    return;

  }


  if (
    video.readyState <
    HTMLMediaElement.HAVE_CURRENT_DATA
  ) {

    requestAnimationFrame(
      processCameraFrame
    );

    return;

  }


  if (processingFrame) {

    requestAnimationFrame(
      processCameraFrame
    );

    return;

  }


  processingFrame = true;


  try {

    const width =
      video.videoWidth ||
      640;

    const height =
      video.videoHeight ||
      480;


    inputCanvas.width = width;
    inputCanvas.height = height;


    /*
       Mirror input.

       This keeps the camera experience natural
       for selfie-style sign recognition and keeps
       MediaPipe handedness aligned with the
       displayed camera view.
    */

    inputContext.save();

    inputContext.clearRect(
      0,
      0,
      width,
      height
    );


    inputContext.translate(
      width,
      0
    );

    inputContext.scale(
      -1,
      1
    );


    inputContext.drawImage(
      video,
      0,
      0,
      width,
      height
    );


    inputContext.restore();


    await hands.send({
      image: inputCanvas
    });


  } catch (error) {

    console.error(
      "Frame processing error:",
      error
    );

  }


  processingFrame = false;


  if (cameraRunning) {

    requestAnimationFrame(
      processCameraFrame
    );

  }

}


/* =========================================================
   MEDIAPIPE RESULTS
   ========================================================= */

function handleHandResults(results) {

  if (!canvas || !canvasContext) {
    return;
  }


  resizeCanvas();


  canvasContext.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  leftHandFeatures =
    new Array(63).fill(0);

  rightHandFeatures =
    new Array(63).fill(0);


  const detectedHands =
    results.multiHandLandmarks || [];


  const handedness =
    results.multiHandedness || [];


  let leftDetected = false;
  let rightDetected = false;


  /* -------------------------------------------------------
     PROCESS EACH DETECTED HAND
     ------------------------------------------------------- */

  for (
    let i = 0;
    i < detectedHands.length;
    i++
  ) {

    const landmarks =
      detectedHands[i];


    const handedLabel =
      handedness[i] &&
      handedness[i].classification &&
      handedness[i].classification[0]
        ? handedness[i].classification[0].label
        : "";


    /*
       MediaPipe returns "Left" / "Right"
       based on the mirrored input.
    */

    const features =
      extractHandFeatures(
        landmarks
      );


    if (handedLabel === "Left") {

      leftHandFeatures =
        features;

      leftDetected = true;

    } else if (
      handedLabel === "Right"
    ) {

      rightHandFeatures =
        features;

      rightDetected = true;

    }


    drawHand(
      landmarks,
      handedLabel
    );

  }


  /*
     Safety fallback:
     If MediaPipe handedness is unavailable,
     preserve two-hand architecture.
  */

  if (
    detectedHands.length === 1 &&
    !leftDetected &&
    !rightDetected
  ) {

    leftHandFeatures =
      extractHandFeatures(
        detectedHands[0]
      );

    leftDetected = true;

  }


  /* -------------------------------------------------------
     BUILD 126-FEATURE VECTOR
     ------------------------------------------------------- */

  currentTwoHandFeatures =
    leftHandFeatures.concat(
      rightHandFeatures
    );


  window.currentLeftHandFeatures =
    leftHandFeatures;

  window.currentRightHandFeatures =
    rightHandFeatures;

  window.currentTwoHandFeatures =
    currentTwoHandFeatures;


  /* -------------------------------------------------------
     UPDATE UI
     ------------------------------------------------------- */

  const count =
    detectedHands.length;


  updateDetectionUI(
    count,
    getDetectionMessage(
      count
    )
  );


  updateHandStatus(
    leftDetected,
    rightDetected
  );


  updateFeatureUI(
    leftDetected,
    rightDetected
  );

}


/* =========================================================
   EXTRACT 63 FEATURES FROM ONE HAND
   ========================================================= */

function extractHandFeatures(
  landmarks
) {

  const features = [];


  for (
    let i = 0;
    i < 21;
    i++
  ) {

    const point =
      landmarks[i];


    features.push(
      point.x
    );

    features.push(
      point.y
    );

    features.push(
      point.z
    );

  }


  return features;

}


/* =========================================================
   DRAW HAND LANDMARKS
   ========================================================= */

function drawHand(
  landmarks,
  handedLabel
) {

  if (
    typeof window.drawConnectors ===
      "undefined" ||
    typeof window.drawLandmarks ===
      "undefined" ||
    typeof window.HAND_CONNECTIONS ===
      "undefined"
  ) {

    return;

  }


  const lineColor =
    handedLabel === "Left"
      ? "#22c55e"
      : "#3b82f6";


  window.drawConnectors(
    canvasContext,
    landmarks,
    window.HAND_CONNECTIONS,
    {
      color: lineColor,
      lineWidth: 3
    }
  );


  window.drawLandmarks(
    canvasContext,
    landmarks,
    {
      color: "#ffffff",
      lineWidth: 1,
      radius: 3
    }
  );

}


/* =========================================================
   RESIZE CANVAS
   ========================================================= */

function resizeCanvas() {

  if (!video || !canvas) {
    return;
  }


  const width =
    video.clientWidth ||
    video.videoWidth ||
    640;


  const height =
    video.clientHeight ||
    video.videoHeight ||
    480;


  canvas.width =
    width;

  canvas.height =
    height;

}


/* =========================================================
   DETECTION UI
   ========================================================= */

function updateDetectionUI(
  count,
  message
) {

  const countElement =
    document.getElementById(
      "handsCount"
    );


  const title =
    document.getElementById(
      "detectionTitle"
    );


  const messageElement =
    document.getElementById(
      "detectionMessage"
    );


  const progress =
    document.getElementById(
      "detectionProgress"
    );


  if (countElement) {

    countElement.textContent =
      count + "/2";

  }


  if (title) {

    if (count === 0) {

      title.textContent =
        "No hands detected";

    } else if (count === 1) {

      title.textContent =
        "1 hand detected";

    } else {

      title.textContent =
        "Two hands detected";

    }

  }


  if (messageElement) {

    messageElement.textContent =
      message;

  }


  if (progress) {

    const percentage =
      Math.min(
        100,
        (count / 2) * 100
      );


    progress.style.width =
      percentage + "%";

  }

}


/* =========================================================
   DETECTION MESSAGE
   ========================================================= */

function getDetectionMessage(
  count
) {

  if (count === 0) {

    return "Show one or both hands clearly inside the camera area.";

  }


  if (count === 1) {

    return "One hand detected. Add the second hand for two-hand signs.";

  }


  return "Both hands detected. ML feature vector is ready.";

}


/* =========================================================
   HAND STATUS
   ========================================================= */

function updateHandStatus(
  leftDetected,
  rightDetected
) {

  const left =
    document.getElementById(
      "leftHandStatus"
    );


  const right =
    document.getElementById(
      "rightHandStatus"
    );


  if (left) {

    left.textContent =
      leftDetected
        ? "Detected"
        : "Not detected";

  }


  if (right) {

    right.textContent =
      rightDetected
        ? "Detected"
        : "Not detected";

  }

}


/* =========================================================
   FEATURE UI
   ========================================================= */

function updateFeatureUI(
  leftDetected = false,
  rightDetected = false
) {

  const featureCount =
    document.getElementById(
      "featureCount"
    );


  let activeFeatures = 0;


  if (leftDetected) {

    activeFeatures += 63;

  }


  if (rightDetected) {

    activeFeatures += 63;

  }


  if (featureCount) {

    featureCount.textContent =
      activeFeatures +
      " / 126";

  }

}


/* =========================================================
   ENGINE STATUS
   ========================================================= */

function setEngineStatus(
  title,
  message
) {

  const titleElement =
    document.getElementById(
      "engineStatus"
    );


  const messageElement =
    document.getElementById(
      "engineMessage"
    );


  if (titleElement) {

    titleElement.textContent =
      title;

  }


  if (messageElement) {

    messageElement.textContent =
      message;

  }

}


/* =========================================================
   CAMERA STATUS
   ========================================================= */

function setCameraStatus(
  text,
  state
) {

  const statusText =
    document.getElementById(
      "cameraStatusText"
    );


  const statusDot =
    document.getElementById(
      "cameraStatusDot"
    );


  if (statusText) {

    statusText.textContent =
      text;

  }


  if (statusDot) {

    statusDot.className =
      "status-dot " +
      state;

  }

}


/* =========================================================
   CAMERA ERROR
   ========================================================= */

function showCameraError(
  message
) {

  const errorElement =
    document.getElementById(
      "cameraError"
    );


  const placeholder =
    document.getElementById(
      "cameraPlaceholder"
    );


  if (placeholder) {

    placeholder.style.display =
      "flex";

  }


  if (video) {

    video.style.display =
      "none";

  }


  if (canvas) {

    canvas.style.display =
      "none";

  }


  if (errorElement) {

    errorElement.textContent =
      message;

    errorElement.style.display =
      "block";

  }


  const startButton =
    document.getElementById(
      "startCameraButton"
    );


  if (startButton) {

    startButton.textContent =
      "Try Again";

  }


  setEngineStatus(
    "Camera unavailable",
    message
  );

}


/* =========================================================
   HIDE ERROR
   ========================================================= */

function hideCameraError() {

  const errorElement =
    document.getElementById(
      "cameraError"
    );


  if (errorElement) {

    errorElement.style.display =
      "none";

  }


  const startButton =
    document.getElementById(
      "startCameraButton"
    );


  if (startButton) {

    startButton.textContent =
      "Start Camera";

  }

}

/* =========================================================
   SCAN ANIMATION
   ========================================================= */

function startScanAnimation() {

  const scanLine =
    document.querySelector(
      ".scan-line"
    );


  if (scanLine) {

    scanLine.style.display =
      "block";

  }

}


/* =========================================================
   STOP CAMERA
   ========================================================= */

function stopCamera() {

  cameraRunning = false;
  mediaPipeReady = false;


  if (cameraStream) {

    cameraStream
      .getTracks()
      .forEach(function (track) {

        track.stop();

      });

  }


  cameraStream = null;


  if (video) {

    video.srcObject = null;

  }


  if (canvasContext && canvas) {

    canvasContext.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

  }


  console.log(
    "Camera stopped."
  );

}


/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  function () {

    stopCamera();

  }
);


/* =========================================================
   MAKE FUNCTIONS AVAILABLE GLOBALLY
   ========================================================= */

window.startCamera =
  startCamera;

window.stopCamera =
  stopCamera;
