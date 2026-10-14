/**
 * I 4 You Matrimonial - Real-time In-Browser Face Liveness Detection
 * 
 * Active Liveness Protocol:
 * 1. Center / Look Straight
 * 2. Turn Head Left
 * 3. Turn Head Right
 * 4. Blink / Close Eyes
 * 5. Auto Capture Verified Frame
 * 
 * Zero-dependency, lightweight (160x160 processing at 15-20fps), cross-platform.
 */

export const LIVENESS_STEPS = [
  {
    id: 'center',
    stepNumber: 1,
    titleEn: 'Look Straight',
    instructionEn: 'Position your face in the oval and look straight ahead',
    minDurationMs: 900
  },
  {
    id: 'turn_left',
    stepNumber: 2,
    titleEn: 'Turn Face Left',
    instructionEn: 'Turn your face slowly to the LEFT ⬅️',
    minDurationMs: 450
  },
  {
    id: 'turn_right',
    stepNumber: 3,
    titleEn: 'Turn Face Right',
    instructionEn: 'Turn your face slowly to the RIGHT ➡️',
    minDurationMs: 450
  },
  {
    id: 'blink',
    stepNumber: 4,
    titleEn: 'Blink / Close Eyes',
    instructionEn: 'Blink: Close your eyes and open them once 👁️‍🗨️',
    minDurationMs: 400
  },
  {
    id: 'capture',
    stepNumber: 5,
    titleEn: 'Capturing Selfie',
    instructionEn: 'Hold still, capturing authentic live selfie 😊',
    minDurationMs: 500
  }
];

/**
 * Creates a fresh state tracker for the 4-step challenge
 */
export function createLivenessTracker() {
  return {
    stepIndex: 0,
    stepStartTime: Date.now(),
    stepProgress: 0, // 0..100
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
 */
export function analyzeLivenessFrame(video, canvas, tracker) {
  if (!video || !canvas || video.readyState < 2) {
    return { hasFace: false, tracker, feedback: 'Waiting for camera feed...' };
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
  ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, width, height);

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
  const rx = width * 0.38;
  const ry = height * 0.44;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Check if inside oval guide
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const inOval = (dx * dx + dy * dy) <= 1.05;

      // Robust skin tone detection in RGB
      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      const isSkin = r > 65 && g > 40 && b > 20 && (maxVal - minVal) > 12 && r > g && r > (b * 0.9);

      if (isSkin) {
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
  const hasFace = skinRatio >= 0.12;

  if (!hasFace) {
    return {
      hasFace: false,
      tracker,
      feedbackEn: 'No face detected. Position yourself inside the oval.'
    };
  }

  // Calculate face center of mass
  const faceCenterX = sumX / (skinCount * width);
  const faceCenterY = sumY / (skinCount * height);

  // 2. Eye-band Luminance Variance (for blink detection)
  // Eye band is located approximately between Y 30% and 48% of the frame
  const eyeYStart = Math.floor(height * 0.30);
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

  // Initialize baseline eye variance when eyes are open in center mode
  if (tracker.baselineEyeVariance === null && tracker.stepIndex === 0 && Math.abs(faceCenterX - 0.5) < 0.1) {
    tracker.baselineEyeVariance = eyeVariance;
  } else if (tracker.baselineEyeVariance !== null && tracker.stepIndex < 3 && Math.abs(faceCenterX - 0.5) < 0.12) {
    // Smooth moving average
    tracker.baselineEyeVariance = tracker.baselineEyeVariance * 0.9 + eyeVariance * 0.1;
  }

  // 3. Process Active Challenge Step
  const currentStep = LIVENESS_STEPS[tracker.stepIndex] || LIVENESS_STEPS[0];
  const now = Date.now();
  const timeInStep = now - tracker.stepStartTime;
  let stepJustFinished = false;
  let feedbackEn = currentStep.instructionEn;

  // -- STEP 1: Center & Look Straight
  if (currentStep.id === 'center') {
    const isCentered = Math.abs(faceCenterX - 0.5) < 0.11 && Math.abs(faceCenterY - 0.5) < 0.14;
    if (isCentered) {
      tracker.stableCenterFrames++;
      tracker.stepProgress = Math.min(100, Math.round((tracker.stableCenterFrames / 10) * 100));
      feedbackEn = 'Great! Looking straight...';

      if (tracker.stableCenterFrames >= 10 && timeInStep >= currentStep.minDurationMs) {
        stepJustFinished = true;
      }
    } else {
      tracker.stableCenterFrames = Math.max(0, tracker.stableCenterFrames - 1);
      tracker.stepProgress = Math.max(0, tracker.stepProgress - 8);
      feedbackEn = 'Center your face inside the oval';
    }
  }

  // -- STEP 2: Turn Face Left
  else if (currentStep.id === 'turn_left') {
    // When mirrored, user turning to their left shifts face towards left of screen
    const isLeftShifted = faceCenterX < 0.43;
    const isLeftMassHigher = (leftSkin / (rightSkin || 1)) > 1.25;

    if (isLeftShifted || isLeftMassHigher) {
      tracker.turnLeftFrames++;
      tracker.stepProgress = Math.min(100, Math.round((tracker.turnLeftFrames / 5) * 100));
      feedbackEn = 'Left turn confirmed! ✅';

      if (tracker.turnLeftFrames >= 5 && timeInStep >= currentStep.minDurationMs) {
        stepJustFinished = true;
      }
    } else {
      tracker.stepProgress = Math.max(0, tracker.stepProgress - 5);
      feedbackEn = 'Turn your face slowly to the LEFT ⬅️';
    }
  }

  // -- STEP 3: Turn Face Right
  else if (currentStep.id === 'turn_right') {
    const isRightShifted = faceCenterX > 0.57;
    const isRightMassHigher = (rightSkin / (leftSkin || 1)) > 1.25;

    if (isRightShifted || isRightMassHigher) {
      tracker.turnRightFrames++;
      tracker.stepProgress = Math.min(100, Math.round((tracker.turnRightFrames / 5) * 100));
      feedbackEn = 'Right turn confirmed! ✅';

      if (tracker.turnRightFrames >= 5 && timeInStep >= currentStep.minDurationMs) {
        stepJustFinished = true;
      }
    } else {
      tracker.stepProgress = Math.max(0, tracker.stepProgress - 5);
      feedbackEn = 'Turn your face slowly to the RIGHT ➡️';
    }
  }

  // -- STEP 4: Blink / Close Eyes
  else if (currentStep.id === 'blink') {
    const baseVariance = tracker.baselineEyeVariance || 30;
    // When eyes are closed, variance in eye band drops below 70% of baseline
    const eyesAreClosed = eyeVariance < (baseVariance * 0.72) || eyeVariance < 16;
    const eyesAreOpen = eyeVariance >= (baseVariance * 0.85) || eyeVariance >= 22;

    if (tracker.blinkState === 'waiting_close') {
      if (eyesAreClosed) {
        tracker.eyeClosedFrames++;
        if (tracker.eyeClosedFrames >= 2) {
          tracker.blinkState = 'closed_detected';
          tracker.stepProgress = 50;
          feedbackEn = 'Eyes closed. Now open your eyes...';
        }
      }
    } else if (tracker.blinkState === 'closed_detected') {
      if (eyesAreOpen) {
        tracker.blinkState = 'opened_detected';
        tracker.stepProgress = 100;
        feedbackEn = 'Blink verified! ✅';
        stepJustFinished = true;
      }
    }
  }

  // -- STEP 5: Center & Ready for capture
  else if (currentStep.id === 'capture') {
    const isCentered = Math.abs(faceCenterX - 0.5) < 0.12 && Math.abs(faceCenterY - 0.5) < 0.15;
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
    completedSteps: tracker.completedSteps,
    isComplete: tracker.isComplete,
    feedbackMl,
    feedbackEn
  };
}
