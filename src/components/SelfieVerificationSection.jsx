import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  SwitchCamera, 
  Scan, 
  X, 
  Smile, 
  Upload, 
  Check, 
  Zap, 
  Lock 
} from 'lucide-react';
import { verifyFaceMatch } from '../services/faceVerificationService';
import { optimizeImageFile } from '../utils/imageOptimizer';

/**
 * SelfieVerificationSection
 * 
 * Provides live camera selfie capture and AI face verification comparing
 * the user's primary uploaded profile portrait with their live camera selfie.
 */
export default function SelfieVerificationSection({
  profilePhoto,
  onVerificationComplete,
  isVerified = false,
  verifiedScore = null,
  verifiedSelfie = null
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [capturedSelfie, setCapturedSelfie] = useState(verifiedSelfie || null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0); // 0..3
  const [verifyResult, setVerifyResult] = useState(
    isVerified ? { isMatch: true, similarityScore: verifiedScore || 94, status: 'verified' } : null
  );
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera stream safely
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Start WebRTC Camera
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser. Please use photo upload.');
      }

      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('[SelfieCamera] Camera access notice:', err);
      setCameraError('Camera access unavailable. You can use your device camera or upload a clear selfie.');
      setCameraActive(false);
    }
  };

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Update video element when camera becomes active
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  // Handle Switch Camera (Front/Back)
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (cameraActive) {
      startCamera(nextMode);
    }
  };

  // Take Snapshot from Video Stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Crop center square
      const sx = ((video.videoWidth || size) - size) / 2;
      const sy = ((video.videoHeight || size) - size) / 2;

      // If front camera, mirror image back to natural orientation
      if (facingMode === 'user') {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      stopCamera();
      setCapturedSelfie(dataUrl);
      executeAiVerification(dataUrl);
    } catch (err) {
      console.error('[SelfieCamera] Capture error:', err);
      alert('Could not capture selfie. Please try again.');
    }
  };

  // Fallback: Device Native Camera / File Input
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await optimizeImageFile(file, {
        maxDimension: 800,
        targetMaxKB: 180,
        initialQuality: 0.85
      });
      if (result?.dataUrl) {
        stopCamera();
        setCapturedSelfie(result.dataUrl);
        executeAiVerification(result.dataUrl);
      }
    } catch (err) {
      console.error('[SelfieCamera] Upload error:', err);
      alert('Error processing selfie image.');
    } finally {
      e.target.value = '';
    }
  };

  // Execute AI Face Verification
  const executeAiVerification = async (selfieImage) => {
    if (!profilePhoto) {
      alert('Please upload your primary portrait photo above first.');
      return;
    }

    setIsVerifying(true);
    setVerificationStep(1);

    const stepTimer1 = setTimeout(() => setVerificationStep(2), 600);
    const stepTimer2 = setTimeout(() => setVerificationStep(3), 1200);

    try {
      const result = await verifyFaceMatch(profilePhoto, selfieImage);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setVerificationStep(3);
      setVerifyResult(result);

      if (result.isMatch) {
        if (onVerificationComplete) {
          onVerificationComplete({
            verified: true,
            selfiePhoto: selfieImage,
            similarityScore: result.similarityScore,
            status: 'approved'
          });
        }
      }
    } catch (err) {
      console.error('[AI FaceVerify] Execution error:', err);
      setVerifyResult({
        isMatch: false,
        similarityScore: 0,
        status: 'error',
        message: 'AI verification encountered an error. Please retake the selfie.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Open Selfie Modal
  const handleOpenModal = () => {
    if (!profilePhoto) {
      alert('Please upload your primary portrait photo first.');
      return;
    }
    setIsModalOpen(true);
    setVerifyResult(null);
    setCapturedSelfie(null);
    startCamera();
  };

  // Close Modal
  const handleCloseModal = () => {
    stopCamera();
    setIsModalOpen(false);
  };

  // Retake Selfie
  const handleRetake = () => {
    setCapturedSelfie(null);
    setVerifyResult(null);
    startCamera();
  };

  return (
    <div className="bg-gradient-to-br from-white via-amber-50/20 to-white rounded-2xl p-4 border border-[#D4AF37]/40 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#DFB76C] flex items-center justify-center text-[#0B192C] shadow-xs">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              AI Selfie Verification 
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 font-semibold normal-case">
                Anti-Catfish AI
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Verify your identity with live selfie to earn the Verified Member badge.
            </p>
          </div>
        </div>

        {/* Verification Status Badge */}
        {verifyResult?.isMatch || isVerified ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Verified ({verifyResult?.similarityScore || verifiedScore || 94}%)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            Required
          </span>
        )}
      </div>

      {/* Main Card Content */}
      {!profilePhoto ? (
        // State 0: No portrait uploaded yet
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-slate-500">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs">
            Upload your portrait photo in the section above to unlock AI selfie verification.
          </span>
        </div>
      ) : verifyResult?.isMatch || isVerified ? (
        // State 1: Verified Successfully!
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={capturedSelfie || verifiedSelfie || profilePhoto} 
                alt="Verified Selfie" 
                className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shadow-xs" 
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full ring-2 ring-white">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                Identity Verified with AI
                <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                  {verifyResult?.similarityScore || verifiedScore || 94}% Face Match
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-tight">
                Selfie matches your portrait. Your account is confirmed as genuine and authentic.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-300 cursor-pointer shrink-0"
          >
            Retake
          </button>
        </div>
      ) : (
        // State 2: Portrait uploaded, waiting for selfie
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative shrink-0">
              <img 
                src={profilePhoto} 
                alt="Portrait" 
                className="w-12 h-12 rounded-xl object-cover border-2 border-[#D4AF37] shadow-xs" 
              />
              <span className="absolute -bottom-1 -right-1 bg-[#D4AF37] text-[#0B192C] text-[8px] font-bold px-1 rounded shadow">
                Ref
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                Take a quick live selfie
                <Zap className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                AI will verify if the person creating the profile matches this portrait photo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>Verify Selfie with AI</span>
          </button>
        </div>
      )}

      {/* Hidden File Input for Native Mobile Camera Fallback */}
      <input 
        type="file" 
        accept="image/*" 
        capture="user" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
      />

      {/* Interactive AI Selfie Camera Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#D4AF37]/50 relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-[#0B192C] text-white px-4 py-3 flex items-center justify-between border-b border-[#D4AF37]/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#DFB76C]">
                  <Scan className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-wide text-white uppercase flex items-center gap-1">
                    AI Face Verification
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    Live selfie vs uploaded portrait check
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              
              {/* Reference Portrait Reminder */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200">
                <div className="flex items-center gap-2.5">
                  <img 
                    src={profilePhoto} 
                    alt="Target Portrait" 
                    className="w-10 h-10 rounded-lg object-cover border border-[#D4AF37]" 
                  />
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">Uploaded Profile Portrait</div>
                    <div className="text-[10px] text-slate-500">Target image to verify against</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#D4AF37]/20 text-[#8C6D1F]">
                  Reference Face
                </span>
              </div>

              {/* Viewfinder Container */}
              <div className="relative aspect-square max-h-[340px] mx-auto rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-700 shadow-inner flex items-center justify-center">
                
                {/* 1. Live Video Viewfinder */}
                {cameraActive && !capturedSelfie && (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />

                    {/* Biometric Oval Mask Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      <div className="w-[72%] h-[80%] rounded-[50%] border-2 border-dashed border-[#DFB76C] shadow-[0_0_0_9999px_rgba(11,25,44,0.45)] relative animate-pulse">
                        {/* Biometric crosshairs */}
                        <div className="absolute top-1/3 left-0 right-0 h-px bg-[#DFB76C]/30" />
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-[#DFB76C]/20" />
                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#DFB76C]/30" />
                      </div>
                      
                      <div className="absolute bottom-3 bg-[#0B192C]/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-medium text-amber-200 border border-[#D4AF37]/30 flex items-center gap-1.5">
                        <Smile className="w-3.5 h-3.5 text-[#DFB76C]" />
                        <span>Position face in the oval & look straight</span>
                      </div>
                    </div>
                  </>
                )}

                {/* 2. Captured Image View (During or after verification) */}
                {capturedSelfie && (
                  <div className="relative w-full h-full">
                    <img 
                      src={capturedSelfie} 
                      alt="Captured Selfie" 
                      className="w-full h-full object-cover" 
                    />

                    {/* AI Scanning Laser Overlay */}
                    {isVerifying && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#DFB76C] to-transparent shadow-[0_0_15px_#DFB76C] animate-bounce" />
                        <div className="absolute inset-0 bg-[#D4AF37]/10 backdrop-contrast-125" />
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Camera Unavailable State */}
                {!cameraActive && !capturedSelfie && (
                  <div className="p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-semibold text-slate-300">
                      {cameraError || 'Camera inactive'}
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#D4AF37] text-[#0B192C] hover:bg-[#dfb76c] transition-colors"
                      >
                        Retry Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
                      >
                        Upload Selfie from Device
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* AI Verification Progress State */}
              {isVerifying && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#D4AF37] animate-spin" />
                      AI Facial Analysis Running...
                    </span>
                    <span className="text-[10px] text-amber-700 font-mono">
                      Step {verificationStep}/3
                    </span>
                  </div>

                  <div className="w-full bg-amber-200/60 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-[#D4AF37] h-full transition-all duration-300 rounded-full" 
                      style={{ width: `${(verificationStep / 3) * 100}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-amber-800 font-medium">
                    {verificationStep === 1 && '1. Scanning portrait and selfie landmarks...'}
                    {verificationStep === 2 && '2. Comparing facial contours, eyes, nose & jawline...'}
                    {verificationStep === 3 && '3. Calculating AI similarity & anti-spoofing confidence...'}
                  </p>
                </div>
              )}

              {/* Verification Results Display */}
              {verifyResult && !isVerifying && (
                <div className={`p-4 rounded-2xl border ${verifyResult.isMatch ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-red-50 border-red-300 text-red-950'} space-y-2.5`}>
                  <div className="flex items-center gap-2">
                    {verifyResult.isMatch ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        {verifyResult.isMatch ? 'Identity Verified Successfully!' : 'Face Mismatch Detected'}
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${verifyResult.isMatch ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                          {verifyResult.similarityScore}% Match
                        </span>
                      </div>
                      <div className="text-[11px] opacity-90 leading-tight">
                        {verifyResult.message}
                      </div>
                    </div>
                  </div>

                  {verifyResult.details?.reason && (
                    <div className="text-[10px] pt-1.5 border-t border-black/10 font-medium opacity-80">
                      ℹ️ {verifyResult.details.reason}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Bottom Controls */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-2">
              {/* If camera is active: Capture Controls */}
              {cameraActive && !capturedSelfie && (
                <>
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Switch Front/Back Camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Live Selfie</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Upload Selfie file instead"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* If selfie was taken and verification passed: Accept */}
              {capturedSelfie && verifyResult?.isMatch && !isVerifying && (
                <>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm & Continue Registration</span>
                  </button>
                </>
              )}

              {/* If selfie was taken and verification failed: Retake */}
              {capturedSelfie && !verifyResult?.isMatch && !isVerifying && (
                <button
                  type="button"
                  onClick={handleRetake}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-800 bg-amber-400 hover:bg-amber-500 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again with Clearer Selfie</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
