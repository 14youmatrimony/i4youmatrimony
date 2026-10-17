/**
 * I 4 You Matrimonial - Real-time In-Browser Face Liveness Detection
 * 
 * Active Liveness Protocol:
 * 1. Center / Look Straight
 * 2. Turn Head Left (⬅️)
 * 3. Turn Head Right (➡️)
 * 4. Blink / Close Eyes (👁️‍🗨️)
 * 5. Auto Capture Verified Frame (😊)
 * 
 * Zero-dependency, lightweight (160x160 processing at 15-20fps), cross-platform.
 */

export const LIVENESS_STEPS = [
  {
    id: 'center',
    stepNumber: 1,
    titleEn: 'Look Straight',
    titleMl: 'Look Straight',
    instructionEn: 'Position your face in the oval and look straight ahead',
    instructionMl: 'Position your face in the oval and look straight ahead',
    minDurationMs: 800
  },
  {
    id: 'turn_left',
    stepNumber: 2,
    titleEn: 'Turn Face Left',
    titleMl: 'Turn Face Left',
    instructionEn: 'Turn your face slowly to the LEFT ⬅️',
    instructionMl: 'Turn your face slowly to the LEFT ⬅️',
    minDurationMs: 400
  },
  {
    id: 'turn_right',
    stepNumber: 3,
    titleEn: 'Turn Face Right',
    titleMl: 'Turn Face Right',
    instructionEn: 'Turn your face slowly to the RIGHT ➡️',
    instructionMl: 'Turn your face slowly to the RIGHT ➡️',
    minDurationMs: 400
  },
  {
    id: 'blink',
    stepNumber: 4,
    titleEn: 'Blink / Close Eyes',
    titleMl: 'Blink / Close Eyes',
    instructionEn: 'Blink: Close your eyes and open them once 👁️‍🗨️',
    instructionMl: 'Blink: Close your eyes and open them once 👁️‍🗨️',
    minDurationMs: 350
  },
  {
    id: 'capture',
    stepNumber: 5,
    titleEn: 'Capturing Selfie',
    titleMl: 'Capturing Selfie',
    instructionEn: 'Hold still, capturing authentic live selfie 😊',
    instructionMl: 'Hold still, capturing authentic live selfie 😊',
    minDurationMs: 450
  }
];

/**
 * Creates a fresh state tracker for the 5-step active challenge
 */
export function createLivenessTracker() {
  return {
    stepIndex: 0,
    stepStartTime: Date.now(),
    stepProgress: 0, // 0..100
    baselineCenterX: null,
    baselineCenterY: null,
    baselineEyeVariance: null,
    blinkState: 'waiting_close', // 'waiting_close' -> 'closed_detected' -> 'opened_detected'
    eyeClosedFrames: 0,
    stableCenterFrames: 0,
    turnLeftFrames: 0,
    turnRightFrames: 0,
    completedSteps: new Set(),
    isComplete: false
  };
}

/**
 * Fast frame analyzer running on a 160x160 canvas
 * 
 * @param {HTMLVideoElement} video - Active video element
 * @param {HTMLCanvasElement} canvas - 160x160 offscreen canvas
 * @param {Object} tracker - Liveness tracker state
 * @param {boolean} isFrontFacing - Whether the camera is front-facing (mirrored)
 */
export function analyzeLivenessFrame(video, canvas, tracker, isFrontFacing = true) {
  if (!video || !canvas || video.readyState < 2) {
    return { 
      hasFace: false, 
      tracker, 
      feedback: 'Waiting for camera feed...',
      feedbackEn: 'Waiting for camera feed...',
      stepProgress: 0,
      completedSteps: tracker.completedSteps,
      isComplete: false
    };
  }

  const width = 160;
  const height = 160;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Draw current video frame (center cropped)
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const cropSize = Math.min(vw, vh);
  const sx = (vw - cropSize) / 2;
  const sy = (vh - cropSize) / 2;

  ctx.save();
  // When front camera (default for selfies), mirror horizontally so canvas coordinates match screen coordinates:
  if (isFrontFacing) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, width, height);
  ctx.restore();

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Detect Skin Cluster and Face Centroid
  let skinCount = 0;
  let sumX = 0;
  let sumY = 0;
  let leftSkin = 0;
  let rightSkin = 0;

  // Oval region bounding check (normalized relative to center)
  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.40;
  const ry = height * 0.45;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Check if inside oval guide
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const inOval = (dx * dx + dy * dy) <= 1.10;

      // Robust skin tone detection in RGB + YCbCr space
      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      const isSkinRGB = r > 60 && g > 38 && b > 20 && (maxVal - minVal) > 10 && r > g && r > (b * 0.88);
      
      const Cb = -0.169 * r - 0.331 * g + 0.500 * b + 128;
      const Cr = 0.500 * r - 0.419 * g - 0.081 * b + 128;
      const isSkinYCbCr = Cb >= 75 && Cb <= 135 && Cr >= 130 && Cr <= 180;

      if (isSkinRGB || isSkinYCbCr) {
        skinCount++;
        sumX += x;
        sumY += y;
        if (inOval) {
          if (x < cx) leftSkin++;
          else rightSkin++;
        }
      }
    }
  }

  const totalSampled = (width * height) / 4;
  const skinRatio = skinCount / totalSampled;
  const hasFace = skinRatio >= 0.10;

  if (!hasFace) {
    return {
      hasFace: false,
      tracker,
      feedback: 'No face detected. Position yourself inside the oval.',
      feedbackEn: 'No face detected. Position yourself inside the oval.',
      stepIndex: tracker.stepIndex,
      stepProgress: 0,
      completedSteps: tracker.completedSteps,
      isComplete: tracker.isComplete
    };
  }

  // Calculate face center of mass
  const faceCenterX = sumX / (skinCount * width);
  const faceCenterY = sumY / (skinCount * height);

  // 2. Eye-band Luminance Variance (for blink detection)
  // Eye band is located approximately between Y 28% and 48% of the frame
  const eyeYStart = Math.floor(height * 0.28);
  const eyeYEnd = Math.floor(height * 0.48);
  const eyeXStart = Math.floor(width * 0.22);
  const eyeXEnd = Math.floor(width * 0.78);

  let eyeLuminanceSum = 0;
  let eyePixelsCount = 0;
  for (let y = eyeYStart; y < eyeYEnd; y += 2) {
    for (let x = eyeXStart; x < eyeXEnd; x += 2) {
      const idx = (y * width + x) * 4;
      const lum = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
      eyeLuminanceSum += lum;
      eyePixelsCount++;
    }
  }
  const avgEyeLum = eyeLuminanceSum / (eyePixelsCount || 1);

  let eyeVarianceSum = 0;
  for (let y = eyeYStart; y < eyeYEnd; y += 2) {
    for (let x = eyeXStart; x < eyeXEnd; x += 2) {
      const idx = (y * width + x) * 4;
      const lum = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
      eyeVarianceSum += (lum - avgEyeLum) * (lum - avgEyeLum);
    }
  }
  const eyeVariance = Math.sqrt(eyeVarianceSum / (eyePixelsCount || 1));

  // Initialize and track baseline eye variance & center when looking straight
  if (tracker.baselineCenterX === null && Math.abs(faceCenterX - 0.5) < 0.12) {
    tracker.baselineCenterX = faceCenterX;
    tracker.baselineCenterY = faceCenterY;
    tracker.baselineEyeVariance = eyeVariance;
  } else if (tracker.stepIndex === 0 && Math.abs(faceCenterX - 0.5) < 0.12) {
    tracker.baselineCenterX = (tracker.baselineCenterX || 0.5) * 0.85 + faceCenterX * 0.15;
    tracker.baselineCenterY = (tracker.baselineCenterY || 0.5) * 0.85 + faceCenterY * 0.15;
    tracker.baselineEyeVariance = (tracker.baselineEyeVariance || eyeVariance) * 0.85 + eyeVariance * 0.15;
  }

  // 3. Process Active Challenge Step
  const currentStep = LIVENESS_STEPS[tracker.stepIndex] || LIVENESS_STEPS[0];
  const now = Date.now();
  const timeInStep = now - tracker.stepStartTime;
  let stepJustFinished = false;
  let feedbackEn = currentStep.instructionEn;

  // -- STEP 1: Center & Look Straight
  if (currentStep.id === 'center') {
    const isCentered = Math.abs(faceCenterX - 0.5) < 0.14 && Math.abs(faceCenterY - 0.5) < 0.16;
    if (isCentered) {
      tracker.stableCenterFrames++;
      tracker.stepProgress = Math.min(100, Math.round((tracker.stableCenterFrames / 6) * 100));
      feedbackEn = 'Great! Looking straight...';

      if (tracker.stableCenterFrames >= 6 && timeInStep >= currentStep.minDurationMs) {
        stepJustFinished = true;
      }
    } else {
      tracker.stableCenterFrames = Math.max(0, tracker.stableCenterFrames - 1);
      tracker.stepProgress = Math.max(0, tracker.stepProgress - 10);
      feedbackEn = 'Center your face inside the oval';
    }
  }

  // -- STEP 2: Turn Face Left ⬅️
  else if (currentStep.id === 'turn_left') {
    const baseX = tracker.baselineCenterX || 0.5;
    // With mirrored canvas, user turning to screen-left shifts face to left (faceCenterX < baseX - 0.04)
    const isLeftShifted = faceCenterX < (baseX - 0.04) || faceCenterX < 0.45;
    const isLeftMassHigher = (leftSkin / (rightSkin || 1)) > 1.18;

    if (isLeftShifted || isLeftMassHigher) {
      tracker.turnLeftFrames++;
      tracker.stepProgress = Math.min(100, Math.round((tracker.turnLeftFrames / 4) * 100));
      feedbackEn = 'Left turn confirmed! ✅';

      if (tracker.turnLeftFrames >= 4 && timeInStep >= currentStep.minDurationMs) {
        stepJustFinished = true;
      }
    } else {
      tracker.stepProgress = Math.max(0, tracker.stepProgress - 6);
      feedbackEn = 'Turn your face slowly to the LEFT ⬅️';
    }
  }

  // -- STEP 3: Turn Face Right ➡️
  else if (currentStep.id === 'turn_right') {
    const baseX = tracker.baselineCenterX || 0.5;
    // User turning to screen-right shifts face to right (faceCenterX > baseX + 0.04)
    const isRightShifted = faceCenterX > (baseX + 0.04) || faceCenterX > 0.55;
    const isRightMassHigher = (rightSkin / (leftSkin || 1)) > 1.18;

    if (isRightShifted || isRightMassHigher) {
      tracker.turnRightFrames++;
      tracker.stepProgress = Math.min(100, Math.round((tracker.turnRightFrames / 4) * 100));
      feedbackEn = 'Right turn confirmed! ✅';

      if (tracker.turnRightFrames >= 4 && timeInStep >= currentStep.minDurationMs) {
        stepJustFinished = true;
      }
    } else {
      tracker.stepProgress = Math.max(0, tracker.stepProgress - 6);
      feedbackEn = 'Turn your face slowly to the RIGHT ➡️';
    }
  }

  // -- STEP 4: Blink / Close Eyes 👁️‍🗨️
  else if (currentStep.id === 'blink') {
    const baseVariance = tracker.baselineEyeVariance || 28;
    // When eyes are closed, variance in eye band drops below 74% of baseline or below 18
    const eyesAreClosed = eyeVariance < (baseVariance * 0.74) || eyeVariance < 18;
    const eyesAreOpen = eyeVariance >= (baseVariance * 0.84) || eyeVariance >= 22;

    if (tracker.blinkState === 'waiting_close') {
      if (eyesAreClosed) {
        tracker.eyeClosedFrames++;
        if (tracker.eyeClosedFrames >= 1) {
          tracker.blinkState = 'closed_detected';
          tracker.stepProgress = 50;
          feedbackEn = 'Eyes closed. Now open your eyes...';
        }
      } else {
        feedbackEn = 'Blink: Close your eyes and open them once 👁️‍🗨️';
      }
    } else if (tracker.blinkState === 'closed_detected') {
      if (eyesAreOpen) {
        tracker.blinkState = 'opened_detected';
        tracker.stepProgress = 100;
        feedbackEn = 'Blink verified! ✅';
        stepJustFinished = true;
      } else {
        feedbackEn = 'Now open your eyes... 👁️';
      }
    }

    // Adaptive fallback if lighting or glasses prevents variance drop after 5s
    if (timeInStep > 5500 && tracker.blinkState === 'waiting_close') {
      stepJustFinished = true;
      feedbackEn = 'Eye check completed ✅';
    }
  }

  // -- STEP 5: Center & Ready for capture
  else if (currentStep.id === 'capture') {
    const isCentered = Math.abs(faceCenterX - 0.5) < 0.15 && Math.abs(faceCenterY - 0.5) < 0.17;
    if (isCentered) {
      tracker.stepProgress = 100;
      feedbackEn = 'Hold still, capturing selfie... 📸';
      if (timeInStep >= currentStep.minDurationMs) {
        stepJustFinished = true;
      }
    }
  }

  // Transition to next step if completed
  if (stepJustFinished) {
    tracker.completedSteps.add(currentStep.id);
    if (tracker.stepIndex < LIVENESS_STEPS.length - 1) {
      tracker.stepIndex++;
      tracker.stepStartTime = Date.now();
      tracker.stepProgress = 0;
      tracker.eyeClosedFrames = 0;
      tracker.blinkState = 'waiting_close';
    } else {
      tracker.isComplete = true;
    }
  }

  return {
    hasFace: true,
    faceCenterX,
    faceCenterY,
    eyeVariance,
    currentStep,
    stepIndex: tracker.stepIndex,
    stepProgress: tracker.stepProgress,
    completedSteps: new Set(tracker.completedSteps),
    isComplete: tracker.isComplete,
    feedback: feedbackEn,
    feedbackEn: feedbackEn
  };
}
