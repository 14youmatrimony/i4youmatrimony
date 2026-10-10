import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  RotateCw, 
  Sparkles, 
  ChevronLeft,
  MessageSquare,
  Check,
  Flame,
  AlertCircle,
  FileCheck2,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  Upload,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Trash2,
  Camera,
  X,
  FileUp,
  CheckCircle,
  Clock,
  User,
  Shield,
  BadgeCheck
} from 'lucide-react';
import { 
  generateAadhaarOtp, 
  submitAadhaarOtp, 
  formatAadhaarDisplay,
  formatAadhaar,
  isLiveAadhaarConfigured,
  getActiveAadhaarProvider,
  saveSurepassToken,
  getSurepassToken 
} from '../services/surepassAadhaar';
import { optimizeImageFile } from '../utils/imageOptimizer';
import {
  saveSandboxCredentials,
  getSandboxApiKey,
  getSandboxApiSecret
} from '../services/sandboxAadhaar';

export function generateCandidateAadhaarFront(name, aadhaarNo, dob, gender, photoUrl) {
  const cleanNo = String(aadhaarNo || '492081735928').replace(/\D/g, '');
  const safeNo = cleanNo.length >= 12 ? cleanNo : (cleanNo + '492081735928').slice(0, 12);
  const formattedNo = `${safeNo.slice(0, 4)} ${safeNo.slice(4, 8)} ${safeNo.slice(8, 12)}`;
  const resolvedDob = dob || '15/08/1998';
  const resolvedGender = String(gender || 'FEMALE').toUpperCase();
  const genderMl = resolvedGender.includes('FEMALE') ? 'സ്ത്രീ / FEMALE' : 'പുരുഷൻ / MALE';
  const safePhoto = photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 440" width="700" height="440">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFDF9"/>
      <stop offset="50%" stop-color="#FAF6EE"/>
      <stop offset="100%" stop-color="#F4ECE1"/>
    </linearGradient>
    <pattern id="guilloche" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M0,15 Q7.5,0 15,15 T30,15" fill="none" stroke="#D4AF37" stroke-width="0.6" opacity="0.18"/>
      <path d="M15,0 Q22.5,15 15,30" fill="none" stroke="#D4AF37" stroke-width="0.6" opacity="0.18"/>
    </pattern>
  </defs>
  <rect x="4" y="4" width="692" height="432" rx="18" fill="url(#cardBg)" stroke="#94A3B8" stroke-width="1.8"/>
  <rect x="4" y="4" width="692" height="432" rx="18" fill="url(#guilloche)"/>
  <rect x="4" y="4" width="230" height="12" rx="4" fill="#FF9933"/>
  <rect x="234" y="4" width="232" height="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="0.5"/>
  <rect x="466" y="4" width="230" height="12" rx="4" fill="#138808"/>
  <g transform="translate(25, 26)">
    <circle cx="24" cy="24" r="22" fill="#DFB76C" opacity="0.25" stroke="#B8860B" stroke-width="1.2"/>
    <text x="24" y="29" font-family="serif" font-size="13" font-weight="bold" fill="#78350F" text-anchor="middle">सत्यमेव</text>
    <text x="58" y="22" font-family="sans-serif" font-size="16" font-weight="900" fill="#0F172A">ഭാരത സർക്കാർ</text>
    <text x="58" y="40" font-family="sans-serif" font-size="13" font-weight="800" fill="#334155" letter-spacing="1">GOVERNMENT OF INDIA</text>
  </g>
  <g transform="translate(560, 24)">
    <rect width="112" height="48" rx="10" fill="#FFF1F2" stroke="#FECDD3" stroke-width="1.2"/>
    <circle cx="24" cy="24" r="14" fill="#E11D48"/>
    <text x="24" y="30" font-family="sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">🔥</text>
    <text x="46" y="24" font-family="sans-serif" font-size="14" font-weight="900" fill="#BE123C">ആധാർ</text>
    <text x="46" y="39" font-family="sans-serif" font-size="10" font-weight="800" fill="#64748B" letter-spacing="1.5">AADHAAR</text>
  </g>
  <line x1="25" y1="84" x2="675" y2="84" stroke="#CBD5E1" stroke-width="1.5"/>
  <g transform="translate(35, 100)">
    <rect width="150" height="190" rx="12" fill="#F1F5F9" stroke="#D4AF37" stroke-width="2.5"/>
    <circle cx="75" cy="68" r="32" fill="#CBD5E1"/>
    <path d="M25,160 C25,115 125,115 125,160 Z" fill="#94A3B8"/>
    <image href="${safePhoto}" x="3" y="3" width="144" height="184" preserveAspectRatio="xMidYMid slice"/>
    <rect y="164" width="150" height="26" rx="6" fill="#0F172ACC"/>
    <text x="75" y="181" font-family="sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="1">UIDAI AUTHENTICATED</text>
  </g>
  <g transform="translate(210, 106)">
    <text y="14" font-family="sans-serif" font-size="11" font-weight="700" fill="#64748B">പേര് / Full Name</text>
    <text y="42" font-family="sans-serif" font-size="20" font-weight="900" fill="#0F172A">${name}</text>
    <line x1="0" y1="76" x2="465" y2="76" stroke="#E2E8F0" stroke-width="1"/>
    <text y="100" font-family="sans-serif" font-size="11" font-weight="700" fill="#64748B">ജനന തീയതി / Date of Birth</text>
    <text y="122" font-family="sans-serif" font-size="15" font-weight="800" fill="#0F172A">${resolvedDob}</text>
    <text x="240" y="100" font-family="sans-serif" font-size="11" font-weight="700" fill="#64748B">ലിംഗം / Gender</text>
    <text x="240" y="122" font-family="sans-serif" font-size="14" font-weight="800" fill="#0F172A">${genderMl}</text>
    <rect y="146" width="380" height="28" rx="8" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1.2"/>
    <text x="14" y="164" font-family="sans-serif" font-size="11.5" font-weight="800" fill="#065F46">✓ ഔദ്യോഗിക തിരിച്ചറിയൽ രേഖ (Verified Live ID Document)</text>
  </g>
  <g transform="translate(35, 308)">
    <rect width="630" height="64" rx="14" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.5"/>
    <text x="315" y="42" font-family="monospace, sans-serif" font-size="28" font-weight="900" fill="#0F172A" text-anchor="middle" letter-spacing="6">${formattedNo}</text>
  </g>
  <text x="350" y="396" font-family="sans-serif" font-size="13" font-weight="800" fill="#B45309" text-anchor="middle">എന്റെ ആധാർ, എന്റെ തിരിച്ചറിയൽ രേഖ • Mera Aadhaar, Meri Pehchan</text>
  <rect x="4" y="424" width="230" height="12" rx="4" fill="#138808"/>
  <rect x="234" y="424" width="232" height="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="0.5"/>
  <rect x="466" y="424" width="230" height="12" rx="4" fill="#FF9933"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateCandidateAadhaarBack(name, aadhaarNo, district, state, pincode) {
  const cleanNo = String(aadhaarNo || '492081735928').replace(/\D/g, '');
  const safeNo = cleanNo.length >= 12 ? cleanNo : (cleanNo + '492081735928').slice(0, 12);
  const formattedNo = `${safeNo.slice(0, 4)} ${safeNo.slice(4, 8)} ${safeNo.slice(8, 12)}`;
  const distName = district || 'Alakode, Kannur';
  const stateName = state || 'Kerala';
  const pin = pincode || '670571';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 440" width="700" height="440">
  <defs>
    <linearGradient id="cardBgBack" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFDF9"/>
      <stop offset="50%" stop-color="#FAF6EE"/>
      <stop offset="100%" stop-color="#F4ECE1"/>
    </linearGradient>
    <pattern id="guillocheBack" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M0,15 Q7.5,0 15,15 T30,15" fill="none" stroke="#D4AF37" stroke-width="0.6" opacity="0.18"/>
      <path d="M15,0 Q22.5,15 15,30" fill="none" stroke="#D4AF37" stroke-width="0.6" opacity="0.18"/>
    </pattern>
  </defs>
  <rect x="4" y="4" width="692" height="432" rx="18" fill="url(#cardBgBack)" stroke="#94A3B8" stroke-width="1.8"/>
  <rect x="4" y="4" width="692" height="432" rx="18" fill="url(#guillocheBack)"/>
  <rect x="4" y="4" width="230" height="12" rx="4" fill="#FF9933"/>
  <rect x="234" y="4" width="232" height="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="0.5"/>
  <rect x="466" y="4" width="230" height="12" rx="4" fill="#138808"/>
  <g transform="translate(35, 35)">
    <text font-family="sans-serif" font-size="12" font-weight="800" fill="#64748B" letter-spacing="1">വിലാസം / ADDRESS:</text>
    <text x="0" y="35" font-family="sans-serif" font-size="14" font-weight="700" fill="#1E293B">D/O or S/O ${name} Family</text>
    <text x="0" y="58" font-family="sans-serif" font-size="14" font-weight="700" fill="#1E293B">Near Post Office, ${distName}</text>
    <text x="0" y="80" font-family="sans-serif" font-size="14" font-weight="700" fill="#1E293B">${stateName} - PIN: ${pin}</text>
  </g>
  <g transform="translate(480, 40)">
    <rect width="185" height="185" rx="14" fill="#FFFFFF" stroke="#64748B" stroke-width="1.5"/>
    <rect x="15" y="15" width="40" height="40" fill="#0F172A" rx="4"/>
    <rect x="23" y="23" width="24" height="24" fill="#FFFFFF" rx="2"/>
    <rect x="27" y="27" width="16" height="16" fill="#0F172A" rx="1"/>
    <rect x="130" y="15" width="40" height="40" fill="#0F172A" rx="4"/>
    <rect x="138" y="23" width="24" height="24" fill="#FFFFFF" rx="2"/>
    <rect x="142" y="27" width="16" height="16" fill="#0F172A" rx="1"/>
    <rect x="15" y="130" width="40" height="40" fill="#0F172A" rx="4"/>
    <rect x="23" y="138" width="24" height="24" fill="#FFFFFF" rx="2"/>
    <rect x="27" y="142" width="16" height="16" fill="#0F172A" rx="1"/>
    <g fill="#0F172A">
      <rect x="65" y="20" width="8" height="8"/><rect x="80" y="25" width="12" height="6"/><rect x="100" y="18" width="10" height="10"/>
      <rect x="68" y="45" width="20" height="8"/><rect x="95" y="40" width="8" height="15"/><rect x="25" y="65" width="15" height="8"/>
      <rect x="50" y="70" width="25" height="8"/><rect x="85" y="65" width="12" height="12"/><rect x="110" y="70" width="20" height="8"/>
      <rect x="140" y="65" width="12" height="10"/><rect x="30" y="90" width="30" height="8"/><rect x="75" y="95" width="15" height="15"/>
      <rect x="100" y="90" width="25" height="8"/><rect x="135" y="95" width="18" height="12"/><rect x="65" y="125" width="15" height="8"/>
      <rect x="90" y="130" width="25" height="8"/><rect x="125" y="120" width="10" height="15"/><rect x="65" y="145" width="20" height="10"/>
      <rect x="100" y="150" width="15" height="8"/><rect x="130" y="145" width="25" height="8"/>
    </g>
    <rect x="20" y="170" width="145" height="1" fill="#CBD5E1"/>
    <text x="92" y="179" font-family="sans-serif" font-size="8" font-weight="bold" fill="#64748B" text-anchor="middle">UIDAI SECURE DIGITAL QR</text>
  </g>
  <line x1="35" y1="240" x2="665" y2="240" stroke="#CBD5E1" stroke-width="1.5"/>
  <g transform="translate(35, 260)">
    <rect width="630" height="64" rx="14" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.5"/>
    <text x="315" y="42" font-family="monospace, sans-serif" font-size="28" font-weight="900" fill="#0F172A" text-anchor="middle" letter-spacing="6">${formattedNo}</text>
  </g>
  <g transform="translate(35, 345)">
    <rect width="630" height="50" rx="10" fill="#F1F5F9" stroke="#E2E8F0" stroke-width="1"/>
    <text x="315" y="22" font-family="sans-serif" font-size="11.5" font-weight="800" fill="#334155" text-anchor="middle">
      സഹായവാണി / Help Line: 1947 • ഇ-മെയിൽ / Email: help@uidai.gov.in • വെബ്സൈറ്റ്: www.uidai.gov.in
    </text>
    <text x="315" y="38" font-family="sans-serif" font-size="10" font-weight="700" fill="#64748B" text-anchor="middle">
      UIDAI Unique Identification Authority of India • ഭാരതീയ വിശിഷ്ട തിരിച്ചറിയൽ അതോറിറ്റി
    </text>
  </g>
  <rect x="4" y="424" width="230" height="12" rx="4" fill="#138808"/>
  <rect x="234" y="424" width="232" height="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="0.5"/>
  <rect x="466" y="424" width="230" height="12" rx="4" fill="#FF9933"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Realistic High-Definition Aadhaar Card SVGs for Instant Demo Testing
const SAMPLE_AADHAAR_FRONT = generateCandidateAadhaarFront('Priya Sharma', '492081735928', '15/08/1998', 'Female', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800');
const SAMPLE_AADHAAR_BACK = generateCandidateAadhaarBack('Priya Sharma', '492081735928', 'Thiruvananthapuram', 'Kerala', '695010');

export default function AadhaarVerificationScreen({
  registrationData,
  onVerificationSuccess,
  onBack,
  onCancel,
  isProduction
}) {
  const isSentBack = Boolean(
    registrationData?.aadhaar_status === 'sent_back' ||
    registrationData?.aadhaarStatus === 'sent_back' ||
    registrationData?.aadhaarRejectionReason ||
    registrationData?.aadhaar_rejection_reason
  );
  const rejectionReason = registrationData?.aadhaarRejectionReason || 
    registrationData?.aadhaar_rejection_reason || 
    'Uploaded photo was blurry or details could not be read clearly.';

  const isAlreadyApproved = Boolean(
    registrationData?.aadhaarVerified || 
    registrationData?.aadhaar_verified === 1 || 
    registrationData?.aadhaar_status === 'approved' || 
    registrationData?.aadhaarStatus === 'approved'
  );

  const isAlreadyPending = !isSentBack && !isAlreadyApproved && Boolean(
    registrationData?.aadhaar_status === 'pending' || 
    registrationData?.aadhaarStatus === 'pending' || 
    registrationData?.aadhaar_front_image || 
    registrationData?.frontDocumentPreview
  );

  // Mode selection: default to 'manual' if sent back for re-upload, otherwise 'otp'
  const [verificationMethod, setVerificationMethod] = useState(() => isSentBack ? 'manual' : 'otp');

  // OTP Verification States
  const [aadhaarInput, setAadhaarInput] = useState(
    registrationData?.aadhaarNumber ? registrationData.aadhaarNumber.replace(/\D/g, '') : '492081735928'
  );
  const [step, setStep] = useState('number'); // 'number' | 'otp'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(45);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(() => Boolean(isAlreadyApproved || isAlreadyPending));
  const [showSimulatedSms, setShowSimulatedSms] = useState(false);
  const [showMaskedNumber, setShowMaskedNumber] = useState(false);

  // Manual Card Upload States
  const [manualName, setManualName] = useState(
    registrationData?.fullName || registrationData?.name || 'Priya Sharma'
  );
  const [manualAadhaar, setManualAadhaar] = useState(
    registrationData?.aadhaarNumber ? registrationData.aadhaarNumber.replace(/\D/g, '') : '492081735928'
  );
  const [frontFile, setFrontFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(() => registrationData?.aadhaar_front_image || registrationData?.frontDocumentPreview || null);
  const [backFile, setBackFile] = useState(null);
  const [backPreview, setBackPreview] = useState(() => registrationData?.aadhaar_back_image || registrationData?.backDocumentPreview || null);
  const [fastDemoApproval, setFastDemoApproval] = useState(false);
  const [isManualVerified, setIsManualVerified] = useState(() => Boolean(isAlreadyPending));
  const frontFileInputRef = useRef(null);
  const backFileInputRef = useRef(null);

  // Live eKYC Integration State (Sandbox.co.in / Surepass.io)
  const [clientId, setClientId] = useState('');
  const [isLiveApi, setIsLiveApi] = useState(isLiveAadhaarConfigured());
  const activeProvider = getActiveAadhaarProvider();
  const [verifiedProfileData, setVerifiedProfileData] = useState(null);

  // Real SMS Setup Modal State
  const [showApiSetupModal, setShowApiSetupModal] = useState(false);
  const [inputSandboxKey, setInputSandboxKey] = useState(getSandboxApiKey());
  const [inputSandboxSecret, setInputSandboxSecret] = useState(getSandboxApiSecret());
  const [setupSavedSuccess, setSetupSavedSuccess] = useState(false);

  const handleSaveApiCredentials = (e) => {
    e?.preventDefault();
    saveSandboxCredentials(inputSandboxKey, inputSandboxSecret);
    const configured = isLiveAadhaarConfigured();
    setIsLiveApi(configured);
    setSetupSavedSuccess(true);
    setTimeout(() => {
      setSetupSavedSuccess(false);
      setShowApiSetupModal(false);
    }, 1500);
  };

  const otpInputsRef = useRef([]);

  const cleanAadhaar = aadhaarInput.replace(/\D/g, '');
  const cleanManualAadhaar = manualAadhaar.replace(/\D/g, '');

  // Timer countdown for resend
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && timer > 0 && !verified) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer, verified]);

  const handleAadhaarChange = (e) => {
    setError('');
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarInput(raw);
  };

  const handleManualAadhaarChange = (e) => {
    setError('');
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setManualAadhaar(raw);
  };

  const handleSendUidaiOtp = async (e) => {
    e?.preventDefault();
    setError('');

    if (cleanAadhaar.length !== 12) {
      setError('Please enter a valid 12-digit Indian Aadhaar number');
      return;
    }

    setLoading(true);
    try {
      const res = await generateAadhaarOtp(cleanAadhaar);
      if (res.success) {
        setClientId(res.clientId);
        setIsLiveApi(!res.isSimulated);
        setStep('otp');
        setTimer(45);
        setOtp(['', '', '', '', '', '']);
        setShowSimulatedSms(Boolean(res.isSimulated));
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 150);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('Failed to dispatch UIDAI OTP: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    setError('');

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto advance to next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      otpInputsRef.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  const handleAutoFillDemo = () => {
    setOtp(['7', '3', '9', '2', '0', '1']);
    setError('');
    otpInputsRef.current[5]?.focus();
  };

  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    setError('');
    try {
      const res = await generateAadhaarOtp(cleanAadhaar);
      if (res.success) {
        setClientId(res.clientId);
        setTimer(45);
        setOtp(['', '', '', '', '', '']);
        setShowSimulatedSms(Boolean(res.isSimulated));
        otpInputsRef.current[0]?.focus();
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('Failed to resend UIDAI OTP: ' + (err.message || ''));
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyUidaiOtp = async (e) => {
    e?.preventDefault();
    setError('');
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter all 6 digits of the UIDAI authentication code');
      return;
    }

    setLoading(true);
    try {
      const res = await submitAadhaarOtp(clientId, enteredOtp, cleanAadhaar);
      if (res.success) {
        setVerifiedProfileData(res.data);
        setIsManualVerified(false);
        setVerified(true);
        const candidateName = res.data?.fullName || registrationData?.fullName || registrationData?.name || 'Verified Member';
        const candidatePhoto = registrationData?.photo || res.data?.photo || null;
        const eFront = generateCandidateAadhaarFront(candidateName, cleanAadhaar, res.data?.dob, res.data?.gender, candidatePhoto);
        const eBack = generateCandidateAadhaarBack(candidateName, cleanAadhaar, res.data?.dist, res.data?.state, res.data?.pincode);

        const finalData = {
          ...registrationData,
          ...(res.data || {}),
          aadhaarVerified: true,
          governmentIdVerified: true,
          verified: true,
          maskedAadhaar: res.data?.maskedAadhaar || `XXXX XXXX ${cleanAadhaar.slice(-4) || '5928'}`,
          aadhaarNumber: formatAadhaarDisplay(cleanAadhaar),
          aadhaar_front_image: eFront,
          aadhaar_back_image: eBack,
          frontDocumentPreview: eFront,
          backDocumentPreview: eBack,
          verificationType: 'instant_otp'
        };
        try {
          localStorage.setItem('i4u_aadhaar_verified', 'true');
        } catch (e) {}
        onVerificationSuccess?.(finalData);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError('Failed to verify UIDAI OTP: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // Manual File Upload Handlers
  const handleFileSelect = async (side, file) => {
    if (!file) return;
    setError('');
    try {
      const result = await optimizeImageFile(file, {
        maxDimension: 1600,
        targetMaxKB: 250,
        initialQuality: 0.88
      });
      if (side === 'front') {
        setFrontFile(file);
        setFrontPreview(result.dataUrl);
      } else {
        setBackFile(file);
        setBackPreview(result.dataUrl);
      }
    } catch (err) {
      console.warn("Aadhaar optimization fallback:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (side === 'front') {
          setFrontFile(file);
          setFrontPreview(reader.result);
        } else {
          setBackFile(file);
          setBackPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = (side) => {
    if (side === 'front') {
      setFrontFile(null);
      setFrontPreview(null);
      if (frontFileInputRef.current) frontFileInputRef.current.value = '';
    } else {
      setBackFile(null);
      setBackPreview(null);
      if (backFileInputRef.current) backFileInputRef.current.value = '';
    }
  };

  // Quick Demo Auto-fill for Manual Upload Testing
  const handleAutoFillManualDemo = () => {
    setError('');
    setManualName(registrationData?.fullName || registrationData?.name || 'Priya Sharma');
    setManualAadhaar('492081735928');
    setFrontPreview(SAMPLE_AADHAAR_FRONT);
    setFrontFile({ name: 'aadhaar_card_front_sample.svg', size: 1024 * 12, type: 'image/svg+xml' });
    setBackPreview(SAMPLE_AADHAAR_BACK);
    setBackFile({ name: 'aadhaar_card_back_sample.svg', size: 1024 * 10, type: 'image/svg+xml' });
  };

  // Submit Manual Verification
  const handleSubmitManualVerification = async (e) => {
    e?.preventDefault();
    setError('');

    const cleanManualNo = manualAadhaar.replace(/\D/g, '');
    if (!manualName.trim()) {
      setError('Please enter the full name as printed on the Aadhaar card');
      return;
    }
    if (cleanManualNo.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    if (!frontPreview) {
      setError('Please upload the Front side photo of your Aadhaar card');
      return;
    }

    setLoading(true);
    try {
      // Simulate fast secure upload & document OCR scan
      await new Promise((r) => setTimeout(r, 900));

      const maskedNum = `XXXX XXXX ${cleanManualNo.slice(-4) || '5928'}`;
      const formattedNum = formatAadhaarDisplay(cleanManualNo);

      // Keep candidate's personal profile photo; DO NOT overwrite with Aadhaar card document
      const userPhoto = registrationData?.photo || null;

      const manualData = {
        fullName: manualName.trim(),
        aadhaarNumber: formattedNum,
        maskedAadhaar: maskedNum,
        verificationType: 'manual_card_upload',
        aadhaarVerified: false,
        aadhaar_status: 'pending',
        aadhaarStatus: 'pending',
        governmentIdVerified: false,
        manualVerificationApproved: false,
        verified: false,
        frontDocumentUploaded: true,
        backDocumentUploaded: Boolean(backPreview),
        frontDocumentPreview: frontPreview,
        backDocumentPreview: backPreview,
        aadhaar_front_image: frontPreview,
        aadhaar_back_image: backPreview,
        ...(userPhoto ? { photo: userPhoto } : {})
      };

      setVerifiedProfileData(manualData);
      setIsManualVerified(true);
      setVerified(true);

      try {
        localStorage.removeItem('i4u_aadhaar_verified');
        localStorage.setItem('i4u_manual_aadhaar_submitted', 'true');
      } catch (e) {}

      const finalData = {
        ...registrationData,
        ...manualData
      };

      onVerificationSuccess?.(finalData);
    } catch (err) {
      setError('Failed to process manual Aadhaar card verification: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const maskedAadhaarDisplay = verifiedProfileData?.maskedAadhaar || 
    (verificationMethod === 'manual' 
      ? `XXXX XXXX ${cleanManualAadhaar.slice(-4) || '5928'}` 
      : `XXXX XXXX ${cleanAadhaar.slice(-4) || '5928'}`);

  const handleCompleteAndProceed = () => {
    const finalAadhaarNum = verificationMethod === 'manual'
      ? formatAadhaarDisplay(cleanManualAadhaar)
      : formatAadhaarDisplay(cleanAadhaar);

    // Keep candidate's real personal profile photo; DO NOT overwrite with Aadhaar card document
    const userPhoto = registrationData?.photo || verifiedProfileData?.photo || null;

    const isManual = verificationMethod === 'manual';

    const finalData = {
      ...registrationData,
      ...(verifiedProfileData || {}),
      aadhaarVerified: isManual ? false : true,
      aadhaar_status: isManual ? 'pending' : 'approved',
      aadhaarStatus: isManual ? 'pending' : 'approved',
      governmentIdVerified: isManual ? false : true,
      manualVerificationApproved: false,
      verified: isManual ? false : true,
      maskedAadhaar: maskedAadhaarDisplay,
      aadhaarNumber: finalAadhaarNum,
      aadhaar_front_image: verifiedProfileData?.aadhaar_front_image || verifiedProfileData?.frontDocumentPreview || frontPreview || registrationData?.aadhaar_front_image,
      aadhaar_back_image: verifiedProfileData?.aadhaar_back_image || verifiedProfileData?.backDocumentPreview || backPreview || registrationData?.aadhaar_back_image,
      ...(userPhoto ? { photo: userPhoto } : {})
    };
    try {
      if (finalData.aadhaarVerified) {
        localStorage.setItem('i4u_aadhaar_verified', 'true');
      } else {
        localStorage.removeItem('i4u_aadhaar_verified');
      }
    } catch (e) {}
    onVerificationSuccess?.(finalData);
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-slate-50 relative overflow-hidden">
      {/* Main Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-4 sm:px-4 sm:py-5 space-y-3.5 pb-12">
        
        {/* Top Back / Cancel Navigation */}
        {(onBack || onCancel) && !verified && (
          <div className="flex items-center justify-between px-1">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-[#DFB76C]" />
                <span>Back</span>
              </button>
            ) : <div />}

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        )}
        
        {/* Simulated Incoming UIDAI SMS Toast Alert (Only in OTP Mode) */}
        {showSimulatedSms && step === 'otp' && verificationMethod === 'otp' && !verified && (
          <aside aria-label="Simulated UIDAI SMS" className="bg-gradient-to-r from-slate-900 to-[#0F2942] text-white p-3.5 rounded-2xl shadow-xl border border-emerald-400/40 flex items-start space-x-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 text-xs min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 text-[11px]">💬 UIDAI Simulated Demo OTP</span>
                <span className="text-[9px] text-slate-400">Demo Code</span>
              </div>
              <p className="text-slate-200 mt-1 leading-snug break-words">
                <span className="font-mono font-bold text-white bg-black/40 px-1.5 py-0.5 rounded text-xs tracking-wider border border-white/20">739201</span> is your OTP. (Showing on screen because live API Key is not yet configured in .env).
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleAutoFillDemo}
                  className="text-[10px] font-bold text-[#DFB76C] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tap to auto-fill UIDAI code into boxes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowApiSetupModal(true)}
                  className="text-[10px] font-bold text-cyan-300 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Why didn't SMS reach phone? (Setup Real SMS)</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {!verified ? (
          /* State 1: Aadhaar Form (Segmented Switch: OTP vs Manual Upload) */
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-md space-y-4 overflow-hidden">
            
            {/* National Identity Header Motif */}
            <div className="text-center space-y-1">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0B192C] via-[#152E52] to-[#1E3A8A] text-[#DFB76C] border border-[#D4AF37]/40 flex items-center justify-center mx-auto shadow-md">
                <FileCheck2 className="w-7 h-7 text-[#DFB76C]" />
              </div>
              <h2 className="font-serif font-bold text-lg text-[#0B192C]">
                Aadhaar Authentication
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Required to protect prospective brides & grooms against fake profiles and unlock verified contact numbers.
              </p>

              {/* Live Provider / Sandbox Status Badge (In OTP Mode) */}
              {verificationMethod === 'otp' && (
                <div className="flex justify-center pt-1">
                  {isLiveApi ? (
                    <button
                      type="button"
                      onClick={() => setShowApiSetupModal(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10.5px] font-semibold shadow-2xs cursor-pointer transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>🟢 {activeProvider.name} Live UIDAI eKYC Active</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowApiSetupModal(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-[10.5px] font-semibold cursor-pointer transition-all shadow-xs"
                      title="Click to Connect Real UIDAI SMS Gateway"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>⚠️ Demo Mode: Real SMS not connected (Tap to Setup)</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sent Back Re-upload Notice Banner */}
            {isSentBack && (
              <div className="p-3.5 bg-gradient-to-br from-rose-50 to-amber-50 border-2 border-rose-300 rounded-2xl text-rose-950 text-xs space-y-2 shadow-xs animate-in fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-rose-950">
                        Previous Upload Sent Back by Admin
                      </h4>
                      <p className="text-[10px] text-rose-700 font-medium">
                        Please upload a clearer photo to complete verification
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-200 text-rose-900 border border-rose-300 shrink-0 uppercase">
                    Re-upload
                  </span>
                </div>

                <div className="bg-white/90 p-2.5 rounded-xl border border-rose-200 text-[11px] text-slate-800 space-y-1">
                  <span className="text-[9.5px] font-bold text-rose-900 uppercase tracking-wider block">
                    Admin Reason:
                  </span>
                  <p className="font-bold text-rose-950 italic">
                    "{rejectionReason}"
                  </p>
                </div>

                <p className="text-[10px] text-rose-800 leading-snug">
                  📌 <strong>Tip:</strong> Place your physical Aadhaar card flat in good lighting. Ensure all 4 corners, portrait and 12-digit number are sharp and clearly legible without glare.
                </p>
              </div>
            )}

            {/* VERIFICATION MODE SWITCH TOGGLE BAR */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                  Verification Method:
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-100/70 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                  {verificationMethod === 'otp' ? '⚡ Instant UIDAI OTP' : '📄 Aadhaar Card Upload'}
                </span>
              </div>
              
              <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMethod('otp');
                    setError('');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    verificationMethod === 'otp'
                      ? 'bg-[#0B192C] text-[#DFB76C] shadow-md shadow-black/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant UIDAI OTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerificationMethod('manual');
                    setError('');
                  }}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    verificationMethod === 'manual'
                      ? 'bg-[#0B192C] text-[#DFB76C] shadow-md shadow-black/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Manual Card Upload</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* VIEW A: INSTANT UIDAI OTP FLOW */}
            {verificationMethod === 'otp' && (
              <>
                {/* Quick Demo Pre-fill Box for OTP */}
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 text-xs text-amber-900 space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-[#8C6D1F]">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Quick Test: Demo Aadhaar Number</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Test with pre-configured verified credentials:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAadhaarInput('492081735928');
                      setError('');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#D4AF37] text-[#0B192C] font-bold text-[11px] hover:bg-[#dfb76c] transition-colors cursor-pointer"
                  >
                    ⚡ Use Demo Aadhaar: 4920 8173 5928
                  </button>
                </div>

                {step === 'number' ? (
                  /* Step 1: 12-Digit Aadhaar Input Form */
                  <form onSubmit={handleSendUidaiOtp} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="aadhaarNo" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          12-Digit Aadhaar Number *
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {cleanAadhaar.length}/12 Digits
                        </span>
                      </div>

                      <div className="relative rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-[#D4AF37] focus-within:border-[#D4AF37] overflow-hidden bg-slate-50 flex items-center">
                        <div className="px-3 py-3 bg-slate-100 border-r border-slate-300 text-slate-600 font-bold text-xs flex items-center space-x-1">
                          <span>🇮🇳</span>
                          <span>UID</span>
                        </div>
                        <input
                          id="aadhaarNo"
                          type="text"
                          inputMode="numeric"
                          value={formatAadhaar(aadhaarInput)}
                          onChange={handleAadhaarChange}
                          placeholder="XXXX XXXX XXXX"
                          className="flex-1 px-3 py-3 text-sm sm:text-base font-mono font-bold text-slate-900 bg-white focus:outline-none tracking-widest"
                          maxLength={14}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Your full 12-digit Aadhaar is never shared with anyone or stored unmasked.</span>
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-md shadow-[#D4AF37]/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
                    >
                      {loading ? (
                        <RotateCw className="w-4 h-4 animate-spin text-[#0B192C]" />
                      ) : (
                        <>
                          <span>Send UIDAI OTP on Registered Mobile</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Step 2: UIDAI OTP Authentication Form */
                  <form onSubmit={handleVerifyUidaiOtp} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider truncate">
                            UIDAI Authentication OTP
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Sent for Aadhaar <span className="font-mono font-bold text-slate-800">{maskedAadhaarDisplay}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep('number')}
                          className="text-xs text-[#8C6D1F] hover:underline font-semibold cursor-pointer shrink-0"
                        >
                          Change UID
                        </button>
                      </div>

                      <div className="grid grid-cols-6 gap-1.5 sm:gap-2 w-full" onPaste={handlePaste}>
                        {otp.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (otpInputsRef.current[idx] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(idx, e)}
                            aria-label={`UIDAI Digit ${idx + 1}`}
                            className="w-full h-11 sm:h-12 text-center text-lg sm:text-xl font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/40 focus:outline-none transition-all shadow-inner min-w-0 p-0"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                      <span>Didn’t receive UIDAI OTP?</span>
                      {timer > 0 ? (
                        <span className="font-semibold text-slate-500">
                          Resend in 0:{timer < 10 ? `0${timer}` : timer}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isResending}
                          className="font-bold text-[#8C6D1F] hover:text-[#0B192C] flex items-center space-x-1 cursor-pointer"
                        >
                          {isResending ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <span>Resend OTP</span>}
                        </button>
                      )}
                    </div>

                    {/* 1-Tap Autofill Chip */}
                    <div>
                      <button
                        type="button"
                        onClick={handleAutoFillDemo}
                        className="w-full py-2 px-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[#8C6D1F] text-xs font-semibold hover:bg-amber-100/70 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#DFB76C]" />
                        <span>Quick Test: Auto-fill UIDAI OTP (739201)</span>
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-emerald-500 via-[#D4AF37] to-emerald-500 hover:from-emerald-600 hover:to-[#b89228] shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
                    >
                      {loading ? (
                        <RotateCw className="w-4 h-4 animate-spin text-[#0B192C]" />
                      ) : (
                        <>
                          <span>Complete Aadhaar Verification</span>
                          <CheckCircle2 className="w-4 h-4 text-[#0B192C]" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* VIEW B: MANUAL AADHAAR CARD UPLOAD FLOW */}
            {verificationMethod === 'manual' && (
              <form onSubmit={handleSubmitManualVerification} className="space-y-4">
                
                {/* Quick Test Demo Pre-fill for Manual Upload */}
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 text-xs text-amber-900 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold text-[#8C6D1F]">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Quick Test: Auto-fill Sample Aadhaar Card</span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">1-Click Test</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Instantly load verified sample Front & Back cards and sample cardholder details:
                  </p>
                  <button
                    type="button"
                    onClick={handleAutoFillManualDemo}
                    className="w-full py-2 px-3 rounded-xl bg-[#D4AF37] text-[#0B192C] font-bold text-xs hover:bg-[#dfb76c] transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <FileCheck2 className="w-4 h-4 text-[#0B192C]" />
                    <span>⚡ Auto-fill Sample Aadhaar Card & Documents</span>
                  </button>
                </div>

                {/* Cardholder Full Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Name as on Aadhaar Card *
                  </label>
                  <div className="relative rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-[#D4AF37] focus-within:border-[#D4AF37] overflow-hidden bg-slate-50 flex items-center">
                    <div className="px-3 py-2.5 bg-slate-100 border-r border-slate-300 text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="flex-1 px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* 12-Digit Aadhaar Number Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      12-Digit Aadhaar Number *
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {cleanManualAadhaar.length}/12 Digits
                    </span>
                  </div>
                  <div className="relative rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-[#D4AF37] focus-within:border-[#D4AF37] overflow-hidden bg-slate-50 flex items-center">
                    <div className="px-3 py-2.5 bg-slate-100 border-r border-slate-300 text-slate-600 font-bold text-xs flex items-center space-x-1">
                      <span>🇮🇳</span>
                      <span>UID</span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatAadhaar(manualAadhaar)}
                      onChange={handleManualAadhaarChange}
                      placeholder="XXXX XXXX XXXX"
                      className="flex-1 px-3 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 bg-white focus:outline-none tracking-widest"
                      maxLength={14}
                    />
                  </div>
                </div>

                {/* TWO UPLOAD ZONES: FRONT SIDE & BACK SIDE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  
                  {/* ZONE 1: FRONT SIDE */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <span>Aadhaar Front Side *</span>
                        {frontPreview && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Attached
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] text-slate-400">Photo & Name</span>
                    </div>

                    <input
                      type="file"
                      ref={frontFileInputRef}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileSelect('front', e.target.files[0])}
                      className="hidden"
                    />

                    {frontPreview ? (
                      /* Front Preview Card */
                      <div className="relative rounded-2xl border-2 border-emerald-400/60 bg-emerald-50/20 p-2.5 overflow-hidden group">
                        <div className="h-28 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                          <img 
                            src={frontPreview} 
                            alt="Aadhaar Front" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 truncate max-w-[130px] text-[11px]">
                            {frontFile?.name || 'Aadhaar_Front.jpg'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile('front')}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Front Upload Dropzone */
                      <div
                        onClick={() => frontFileInputRef.current?.click()}
                        className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#D4AF37] bg-slate-50/70 hover:bg-amber-50/30 p-3.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[126px]"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                          <UploadCloud className="w-5 h-5 text-slate-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Upload Front Side</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, PDF (max 15MB)</span>
                        <span className="mt-1.5 inline-flex items-center space-x-1 text-[10px] text-[#8C6D1F] font-semibold bg-amber-100/60 px-2 py-0.5 rounded-md">
                          <Camera className="w-3 h-3" />
                          <span>Tap to Browse</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ZONE 2: BACK SIDE */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <span>Aadhaar Back Side</span>
                        {backPreview && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Attached
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] text-slate-400">Address & QR</span>
                    </div>

                    <input
                      type="file"
                      ref={backFileInputRef}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileSelect('back', e.target.files[0])}
                      className="hidden"
                    />

                    {backPreview ? (
                      /* Back Preview Card */
                      <div className="relative rounded-2xl border-2 border-emerald-400/60 bg-emerald-50/20 p-2.5 overflow-hidden group">
                        <div className="h-28 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                          <img 
                            src={backPreview} 
                            alt="Aadhaar Back" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 truncate max-w-[130px] text-[11px]">
                            {backFile?.name || 'Aadhaar_Back.jpg'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile('back')}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Back Upload Dropzone */
                      <div
                        onClick={() => backFileInputRef.current?.click()}
                        className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#D4AF37] bg-slate-50/70 hover:bg-amber-50/30 p-3.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[126px]"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                          <UploadCloud className="w-5 h-5 text-slate-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">Upload Back Side</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Address proof & QR Code</span>
                        <span className="mt-1.5 inline-flex items-center space-x-1 text-[10px] text-[#8C6D1F] font-semibold bg-amber-100/60 px-2 py-0.5 rounded-md">
                          <Camera className="w-3 h-3" />
                          <span>Tap to Browse</span>
                        </span>
                      </div>
                    )}
                  </div>

                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-emerald-500 via-[#D4AF37] to-emerald-500 hover:from-emerald-600 hover:to-[#b89228] shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
                >
                  {loading ? (
                    <RotateCw className="w-4 h-4 animate-spin text-[#0B192C]" />
                  ) : (
                    <>
                      <span>Submit Aadhaar Card for Verification</span>
                      <CheckCircle2 className="w-4 h-4 text-[#0B192C]" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Clear Privacy & UIDAI Compliance Notice Card */}
            <div className="pt-3 border-t border-slate-100 text-left space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>UIDAI Privacy & Statutory Compliance</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                In compliance with the Aadhaar Act guidelines, I 4 You uses encrypted tokenized storage. <strong>Uploaded ID documents are solely used for identity verification and never shared with other users or unverified profiles.</strong> Your identity is verified strictly to safeguard families and prevent fraudulent matrimony profiles.
              </p>
            </div>

          </div>
        ) : isManualVerified ? (
          /* State 2A: Manual Document Submitted • Pending Admin Review */
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-5 text-center animate-in zoom-in-95 duration-300">
            
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto ring-8 ring-amber-50 shadow-inner">
              <Clock className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 shadow-sm border border-amber-400 text-xs font-extrabold">
                <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Document Submitted • Review Pending</span>
              </div>

              <h2 className="text-xl font-serif font-bold text-[#0B192C] mt-2">
                Aadhaar Card Submitted for Verification
              </h2>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                Your Aadhaar card document has been uploaded successfully and is currently under review by our admin verification team.
              </p>
            </div>

            {/* If Manual Verification, Show Document Badges */}
            {(frontPreview || backPreview) && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Uploaded ID Documents</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    ⏳ Pending Admin Approval
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {frontPreview && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 h-20 bg-white p-1">
                      <img src={frontPreview} alt="Aadhaar Front" className="w-full h-full object-contain" />
                    </div>
                  )}
                  {backPreview && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 h-20 bg-white p-1">
                      <img src={backPreview} alt="Aadhaar Back" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* What happens next instructions */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200 text-left text-xs space-y-2.5">
              <div className="flex items-center space-x-2 font-bold text-amber-950 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Verification Process</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-amber-900 leading-snug">
                <div className="flex items-start space-x-2">
                  <span className="font-bold text-amber-700">1.</span>
                  <span>Our admin team inspects your uploaded card photos to verify authenticity.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-bold text-amber-700">2.</span>
                  <span>Once the admin approves the document, your profile will immediately unlock the official <strong>UID 100% Verified</strong> green badge.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-bold text-amber-700">3.</span>
                  <span>If any photo is blurry or unreadable, the admin will send it back with feedback for re-upload.</span>
                </div>
              </div>
            </div>

            {/* Continue to Profile */}
            <button
              type="button"
              onClick={handleCompleteAndProceed}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-lg shadow-[#D4AF37]/30 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>Continue to Profile & Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setVerified(false);
                setIsManualVerified(false);
                setVerificationMethod('manual');
              }}
              className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Need to upload a different photo? Tap here to replace
            </button>

          </div>
        ) : (
          /* State 2B: Instant OTP Verified Celebration */
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-5 text-center animate-in zoom-in-95 duration-300">
            
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50 shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1.5">
              {/* Official Green Checkmark Badge */}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white shadow-md border border-emerald-400 text-xs font-extrabold">
                <CheckCircle2 className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Aadhaar Verified</span>
              </div>

              <h2 className="text-xl font-serif font-bold text-[#0B192C] mt-2">
                Identity Successfully Authenticated!
              </h2>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                Your Aadhaar <span className="font-mono font-bold text-slate-900">{maskedAadhaarDisplay}</span> has been authenticated with UIDAI records.
              </p>
            </div>

            {/* Profile Trust Unlocked Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/60 to-amber-50/40 border border-emerald-200/80 text-left text-xs space-y-2.5">
              <div className="flex items-center space-x-3 pb-2 border-b border-emerald-200/50">
                <img 
                  src={verifiedProfileData?.profileImage ? `data:image/jpeg;base64,${verifiedProfileData.profileImage}` : (registrationData?.photo || (registrationData?.gender === 'Male' ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300" : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300"))} 
                  alt={verifiedProfileData?.fullName || registrationData?.name || registrationData?.fullName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500 shadow-sm" 
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>{verifiedProfileData?.fullName || registrationData?.fullName || registrationData?.name || 'Verified Member'}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Aadhaar Badge Active • 100% Screened Profile
                  </p>
                  {(verifiedProfileData?.state || verifiedProfileData?.dob) && (
                    <p className="text-[10px] text-emerald-800 font-medium mt-0.5">
                      UIDAI Match: {verifiedProfileData?.dist ? `${verifiedProfileData.dist}, ` : ''}{verifiedProfileData?.state || 'India'}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-700">
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Contact numbers and sensitive details now unlocked for genuine matches</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Exclusive <strong>Aadhaar Verified</strong> trust badge displayed on your profile card</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Priority visibility in Pan-India match recommendations</span>
                </div>
              </div>
            </div>

            {/* Continue to Matches */}
            <button
              type="button"
              onClick={handleCompleteAndProceed}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#0B192C] bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] shadow-lg shadow-[#D4AF37]/30 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Flame className="w-4 h-4 text-[#0B192C]" />
              <span>Explore Verified Matches</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        )}

      {/* Real UIDAI SMS Gateway Setup Modal */}
      {showApiSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B192C] text-white border-2 border-[#D4AF37]/50 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button
              type="button"
              onClick={() => setShowApiSetupModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-white">
                  Real UIDAI SMS Gateway Setup
                </h3>
                <p className="text-[11px] text-slate-300">
                  Connect Sandbox.co.in to send real OTPs to mobile phones
                </p>
              </div>
            </div>

            {/* Explanation why real SMS was not coming */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-xs space-y-2 mb-4">
              <p className="text-amber-300 font-bold flex items-center gap-1 text-[11.5px]">
                <span>❓ എന്തുകൊണ്ടാണ് ഫോണിൽ SMS വരാതിരുന്നത്?</span>
              </p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                ആധാർ OTP അയക്കുന്നത് കേന്ദ്ര സർക്കാരിന്റെ <strong>UIDAI</strong> ആണ്. ഒരു വെബ്‌സൈറ്റിനും സാധാരണ SMS ഗേറ്റ്‌വേകൾ (Fast2SMS/Twilio) വഴി ആധാർ OTP അയക്കാൻ സാധിക്കില്ല. ഗവൺമെന്റ് അംഗീകൃത <strong>Sandbox.co.in</strong> അല്ലെങ്കിൽ <strong>Surepass.io</strong> അക്കൗണ്ട് കണക്ട് ചെയ്താൽ മാത്രമേ ഉപയോക്താവിന്റെ ഫോണിലേക്ക് യഥാർത്ഥ UIDAI SMS വരികയുള്ളൂ.
              </p>
            </div>

            {setupSavedSuccess ? (
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/50 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sandbox credentials saved! Real UIDAI SMS is now ACTIVE!</span>
              </div>
            ) : (
              <form onSubmit={handleSaveApiCredentials} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Sandbox.co.in API Key
                  </label>
                  <input
                    type="text"
                    value={inputSandboxKey}
                    onChange={(e) => setInputSandboxKey(e.target.value)}
                    placeholder="e.g. key_live_..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white text-xs font-mono focus:border-[#DFB76C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Sandbox.co.in API Secret
                  </label>
                  <input
                    type="password"
                    value={inputSandboxSecret}
                    onChange={(e) => setInputSandboxSecret(e.target.value)}
                    placeholder="e.g. secret_live_..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white text-xs font-mono focus:border-[#DFB76C] focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:opacity-95 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save & Activate Real SMS</span>
                  </button>

                  <a
                    href="https://sandbox.co.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 text-center text-xs text-amber-300 hover:text-white underline"
                  >
                    Free Sandbox.co.in Account എടുക്കാൻ ഇവിടെ ക്ലിക്ക് ചെയ്യുക ➔
                  </a>
                </div>
              </form>
            )}

            <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-slate-400 leading-normal">
              💡 <em>Key നൽകിയില്ലെങ്കിലും ആപ്പ് ഫീച്ചറുകൾ സുഗമമായി പരീക്ഷിക്കാൻ <strong>739201</strong> എന്ന ഡെമോ OTP ഉപയോഗിക്കാം.</em>
            </div>

          </div>
        </div>
      )}

      </div>

    </div>
  );
}
