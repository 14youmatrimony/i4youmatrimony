import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  CreditCard, 
  Smartphone, 
  Building, 
  Wallet, 
  Sparkles, 
  ArrowRight, 
  Tag, 
  FileText,
  AlertCircle,
  RefreshCw,
  Clock,
  ExternalLink,
  Copy,
  Check,
  FlaskConical,
  Link as LinkIcon,
  ArrowLeft
} from 'lucide-react';
import { 
  POPULAR_BANKS, 
  UPI_APPS, 
  VALID_COUPONS, 
  calculateOrderDetails 
} from '../../data/plansData';
import { 
  GooglePayLogo, 
  PhonePeLogo, 
  PaytmLogo, 
  BhimUpiLogo, 
  AmazonPayLogo, 
  HdfcBankLogo, 
  SbiBankLogo, 
  IciciBankLogo, 
  AxisBankLogo, 
  KotakBankLogo, 
  UpiBadgeLogo 
} from '../common/PaymentLogos';
import {
  createCashfreeOrder,
  verifyCashfreeOrder,
  createCashfreeLink,
  verifyCashfreeLink,
  createCashfreeUpiIntent,
  simulateUpiPinSuccess
} from '../../services/api';



export default function MobilePaymentModal({
  isOpen,
  plan,
  durationMonths = 6,
  initialCoupon = '',
  currentUser,
  onClose,
  onPaymentSuccess,
  onViewInvoice,
  isWebsiteModal = false,
  offers = []
}) {
  const activeOffer = (offers && offers.length > 0)
    ? (offers.find(o => o.is_active === 1 || o.is_active === true || o.is_active === '1' || o.is_active === undefined) || offers[0])
    : null;
  const defaultCode = initialCoupon || activeOffer?.code || '';
  const [couponInput, setCouponInput] = useState(defaultCode);
  const [appliedCouponCode, setAppliedCouponCode] = useState(defaultCode);
  const [couponError, setCouponError] = useState('');

  // Payment method selection: 'upi' | 'card' | 'netbanking' | 'wallet'
  const [method, setMethod] = useState('upi');
  const [upiMode, setUpiMode] = useState('apps'); // 'apps' | 'qr' | 'id'
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [upiIdInput, setUpiIdInput] = useState(`${currentUser?.name?.toLowerCase().replace(/\s+/g, '') || 'arun'}@okhdfcbank`);
  const [upiVerified, setUpiVerified] = useState(false);

  // Card Inputs
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8912');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('582');
  const [cardHolder, setCardHolder] = useState((currentUser?.name && currentUser.name !== 'Verified Member') ? currentUser.name : 'Priya Sharma');

  // Net Banking & Wallet
  const [selectedBank, setSelectedBank] = useState('hdfc');
  const [selectedWallet, setSelectedWallet] = useState('paytm');

  // Processing state: 'idle' | 'authorizing' | 'otp' | 'success'
  const [step, setStep] = useState('idle');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('749201');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);

  // Cashfree Gateway States
  const [cashfreeError, setCashfreeError] = useState('');
  const [activeCfOrderId, setActiveCfOrderId] = useState('');
  const [paymentLinkData, setPaymentLinkData] = useState(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Direct Seamless UPI Intent & PIN States
  const [upiPinInput, setUpiPinInput] = useState('');
  const [upiIntentData, setUpiIntentData] = useState(null);
  const [upiAppPaying, setUpiAppPaying] = useState('gpay');
  const [isUpiPinAuthorizing, setIsUpiPinAuthorizing] = useState(false);
  const [upiPinError, setUpiPinError] = useState('');

  // QR Code timer
  const [qrTimer, setQrTimer] = useState(180);

  const order = useMemo(() => {
    return calculateOrderDetails(plan, durationMonths, appliedCouponCode, offers);
  }, [plan, durationMonths, appliedCouponCode, offers]);

  useEffect(() => {
    if (isOpen) {
      setStep('idle');
      setIsProcessing(false);
      setCompletedInvoice(null);
      setCashfreeError('');
      setActiveCfOrderId('');
      setPaymentLinkData(null);
      setIsCreatingLink(false);
      setIsVerifying(false);
      setCopiedLink(false);
      setUpiPinInput('');
      setUpiIntentData(null);
      setUpiAppPaying(selectedUpiApp || 'gpay');
      setIsUpiPinAuthorizing(false);
      setUpiPinError('');
      setQrTimer(180);
      const codeToApply = initialCoupon || (offers && offers.length > 0 ? (offers.find(o => o.is_active === 1 || o.is_active === true || o.is_active === '1' || o.is_active === undefined)?.code || offers[0]?.code) : '') || '';
      setAppliedCouponCode(codeToApply);
      setCouponInput(codeToApply);
    }
  }, [isOpen, initialCoupon, offers, selectedUpiApp]);

  // Background polling for payment confirmation (e.g. when user pays via real GPay/PhonePe and returns)
  useEffect(() => {
    let pollInterval;
    if (isOpen && (step === 'upi_pin' || step === 'authorizing') && activeCfOrderId) {
      pollInterval = setInterval(async () => {
        try {
          const res = await verifyCashfreeOrder(activeCfOrderId);
          if (res.paid || res.order_status === 'PAID') {
            const appLabel = upiAppPaying === 'phonepe' ? 'PhonePe' : upiAppPaying === 'paytm' ? 'Paytm' : upiAppPaying === 'bhim' ? 'BHIM UPI' : 'Google Pay';
            const inv = {
              invoiceNumber: res.invoice_no || `INV-2026-${activeCfOrderId.slice(-6)}`,
              date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
              transactionId: res.transaction_id || `UPI_${activeCfOrderId}`,
              planId: plan.id,
              planName: plan.name,
              durationMonths,
              baseOfferPrice: order.baseOfferPrice,
              couponCode: order.couponApplied?.code || null,
              couponDiscount: order.couponDiscount,
              discountedBase: order.discountedBase,
              cgst: order.cgst,
              sgst: order.sgst,
              gst: order.gst,
              totalAmount: order.totalAmount,
              contactCredits: plan.contactCredits,
              paymentMethod: res.payment_method || `UPI (${appLabel})`
            };
            setCompletedInvoice(inv);
            setStep('success');
            if (onPaymentSuccess) {
              onPaymentSuccess(plan, inv);
            }
          }
        } catch (e) {
          // ignore background poll errors
        }
      }, 2500);
    }
    return () => clearInterval(pollInterval);
  }, [isOpen, step, activeCfOrderId, plan, durationMonths, order, upiAppPaying, onPaymentSuccess]);

  useEffect(() => {
    let interval;
    if (isOpen && method === 'upi' && upiMode === 'qr' && qrTimer > 0) {
      interval = setInterval(() => {
        setQrTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, method, upiMode, qrTimer]);

  const handleApplyCoupon = (e) => {
    e?.preventDefault();
    setCouponError('');
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setAppliedCouponCode('');
      return;
    }
    const matched = offers.find(o => o.code?.toUpperCase() === code && (o.is_active === undefined || o.is_active === 1 || o.is_active === true));
    if (matched || VALID_COUPONS[code]) {
      setAppliedCouponCode(code);
    } else {
      setCouponError(`Invalid or expired promo code.${activeOffer?.code ? ` Try ${activeOffer.code}` : ''}`);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode('');
    setCouponInput('');
    setCouponError('');
  };

  // Card Brand Detection
  const cardBrand = useMemo(() => {
    const raw = cardNumber.replace(/\D/g, '');
    if (raw.startsWith('4')) return 'Visa';
    if (raw.startsWith('5')) return 'Mastercard';
    if (raw.startsWith('60') || raw.startsWith('65') || raw.startsWith('81')) return 'RuPay';
    return 'RuPay / Card';
  }, [cardNumber]);

  // Brand Logo Renderers
  const renderUpiLogo = (appId) => {
    switch (appId) {
      case 'gpay':
        return <GooglePayLogo className="w-8 h-8" />;
      case 'phonepe':
        return <PhonePeLogo className="w-8 h-8" />;
      case 'paytm':
        return <PaytmLogo className="w-8 h-8" />;
      case 'bhim':
        return <BhimUpiLogo className="w-8 h-8" />;
      default:
        return <span className="text-xl">💳</span>;
    }
  };

  const renderBankLogo = (bankId) => {
    switch (bankId) {
      case 'hdfc':
        return <HdfcBankLogo className="w-6 h-6" />;
      case 'sbi':
        return <SbiBankLogo className="w-6 h-6" />;
      case 'icici':
        return <IciciBankLogo className="w-6 h-6" />;
      case 'axis':
        return <AxisBankLogo className="w-6 h-6" />;
      case 'kotak':
        return <KotakBankLogo className="w-6 h-6" />;
      default:
        return <span className="text-base">🏦</span>;
    }
  };

  const renderWalletLogo = (walletId) => {
    switch (walletId) {
      case 'paytm':
        return <PaytmLogo className="w-7 h-7" />;
      case 'amazon':
        return <AmazonPayLogo className="w-7 h-7" />;
      default:
        return <span className="text-lg">👛</span>;
    }
  };

  // Initiate Payment
  const handleInitiatePayment = () => {
    setIsProcessing(true);
    setStep('authorizing');

    setTimeout(() => {
      // Move to bank OTP verification step
      setIsProcessing(false);
      setStep('otp');
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(randomOtp);
      setOtpInput('');
    }, 1200);
  };

  // Confirm OTP and complete payment
  const handleConfirmOtp = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep('success');

      let paymentLabel = 'UPI';
      if (method === 'upi') {
        paymentLabel = upiMode === 'apps' 
          ? `${UPI_APPS.find(u => u.id === selectedUpiApp)?.name || 'UPI'} Instant`
          : upiMode === 'qr' ? 'UPI Dynamic QR' : `UPI (${upiIdInput})`;
      } else if (method === 'card') {
        paymentLabel = `${cardBrand} Ending in ${cardNumber.slice(-4) || '8912'}`;
      } else if (method === 'netbanking') {
        paymentLabel = `${POPULAR_BANKS.find(b => b.id === selectedBank)?.name || 'Net Banking'}`;
      } else {
        paymentLabel = 'Mobile Wallet';
      }

      const inv = {
        invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        transactionId: `TXN_${method.toUpperCase()}_${Date.now().toString().slice(-8)}`,
        planId: plan.id,
        planName: plan.name,
        durationMonths,
        baseOfferPrice: order.baseOfferPrice,
        couponCode: order.couponApplied?.code || null,
        couponDiscount: order.couponDiscount,
        discountedBase: order.discountedBase,
        cgst: order.cgst,
        sgst: order.sgst,
        gst: order.gst,
        totalAmount: order.totalAmount,
        contactCredits: plan.contactCredits,
        paymentMethod: paymentLabel
      };

      setCompletedInvoice(inv);

      if (onPaymentSuccess) {
        onPaymentSuccess(plan, inv);
      }
    }, 1500);
  };

  // ── SEAMLESS DIRECT UPI INTENT HANDLER (Google Pay, PhonePe, Paytm, BHIM) ──
  const handlePayDirectUpi = async (appId = selectedUpiApp) => {
    setIsProcessing(true);
    setCashfreeError('');
    setUpiAppPaying(appId);
    try {
      const intentPayload = {
        plan_id: plan.id,
        plan_name: `${plan.name} Membership`,
        amount: order.totalAmount,
        duration_months: durationMonths,
        user_id: currentUser?.id ? `user_${currentUser.id}` : `cust_${Date.now()}`,
        user_name: (currentUser?.name && currentUser.name !== 'Verified Member') ? currentUser.name : 'Candidate',
        phone: currentUser?.mobile || currentUser?.phone || '9876543210',
        email: currentUser?.email || 'candidate@i4you.in',
        upi_app: appId
      };

      const res = await createCashfreeUpiIntent(intentPayload);
      if (!res.success) {
        throw new Error(res.error || 'Failed to initialize direct UPI payment');
      }

      setUpiIntentData(res);
      setActiveCfOrderId(res.order_id);
      setIsProcessing(false);

      // Check if mobile device
      const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // On mobile devices or in production, trigger the deep link directly to open Google Pay / PhonePe
      if (res.intent_url && (isMobile || res.environment === 'production')) {
        try {
          window.location.href = res.intent_url;
        } catch (e) {
          console.warn('Could not launch native UPI intent URL:', e);
        }
      }

      // Transition to authentic UPI PIN Authorization Screen
      setUpiPinInput('');
      setUpiPinError('');
      setStep('upi_pin');

    } catch (err) {
      console.error('Direct UPI Intent Error:', err);
      setCashfreeError(err.message || 'Direct UPI connection error. Opening Gateway checkout.');
      setIsProcessing(false);
      handlePayWithCashfree();
    }
  };

  // ── CONFIRM UPI PIN HANDLER ──
  const handleConfirmUpiPin = async () => {
    if (upiPinInput.length < 4) {
      setUpiPinError('Please enter your 4 or 6-digit UPI PIN');
      return;
    }
    setIsUpiPinAuthorizing(true);
    setUpiPinError('');
    try {
      const appName = upiAppPaying === 'gpay' ? 'Google Pay' : upiAppPaying === 'phonepe' ? 'PhonePe' : upiAppPaying === 'paytm' ? 'Paytm' : upiAppPaying === 'bhim' ? 'BHIM UPI' : 'UPI';
      const simData = {
        order_id: activeCfOrderId || upiIntentData?.order_id,
        pin: upiPinInput,
        plan_name: `${plan.name} (${durationMonths} Months)`,
        amount: order.totalAmount,
        user_name: (currentUser?.name && currentUser.name !== 'Verified Member') ? currentUser.name : 'Candidate',
        user_id: currentUser?.id,
        upi_app: appName
      };

      const res = await simulateUpiPinSuccess(simData);
      if (res.success && res.paid) {
        const inv = {
          invoiceNumber: res.invoice_no || `INV-2026-${(activeCfOrderId || '').slice(-6)}`,
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          transactionId: res.transaction_id || `UPI_${activeCfOrderId}`,
          planId: plan.id,
          planName: plan.name,
          durationMonths,
          baseOfferPrice: order.baseOfferPrice,
          couponCode: order.couponApplied?.code || null,
          couponDiscount: order.couponDiscount,
          discountedBase: order.discountedBase,
          cgst: order.cgst,
          sgst: order.sgst,
          gst: order.gst,
          totalAmount: order.totalAmount,
          contactCredits: plan.contactCredits,
          paymentMethod: `UPI Direct (${appName})`
        };

        setCompletedInvoice(inv);
        setIsUpiPinAuthorizing(false);
        setStep('success');

        if (onPaymentSuccess) {
          onPaymentSuccess(plan, inv);
        }
      } else {
        throw new Error(res.error || 'UPI PIN authorization failed');
      }
    } catch (err) {
      console.error('UPI PIN Auth Error:', err);
      setUpiPinError(err.message || 'Payment authorization failed. Please try again.');
      setIsUpiPinAuthorizing(false);
    }
  };

  // ── CASHFREE CHECKOUT HANDLER ──
  const handlePayWithCashfree = async () => {
    setIsProcessing(true);
    setCashfreeError('');
    try {
      const orderPayload = {
        plan_id: plan.id,
        plan_name: `${plan.name} Membership`,
        amount: order.totalAmount,
        duration_months: durationMonths,
        user_id: currentUser?.id ? `user_${currentUser.id}` : `cust_${Date.now()}`,
        user_name: (currentUser?.name && currentUser.name !== 'Verified Member') ? currentUser.name : 'Candidate',
        phone: currentUser?.mobile || currentUser?.phone || '9876543210',
        email: currentUser?.email || 'candidate@i4you.in'
      };

      const res = await createCashfreeOrder(orderPayload);
      if (!res.success || !res.payment_session_id) {
        throw new Error(res.error || 'Failed to initialize Cashfree session');
      }

      setActiveCfOrderId(res.order_id);

      if (typeof window.Cashfree === 'function') {
        const cashfree = window.Cashfree({ mode: "sandbox" });
        setIsProcessing(false);

        cashfree.checkout({
          paymentSessionId: res.payment_session_id,
          redirectTarget: "_modal"
        }).then(async (checkoutResult) => {
          console.log('[Cashfree Checkout Result]', checkoutResult);
          await handleVerifyPayment(res.order_id);
        }).catch(async (err) => {
          console.warn('[Cashfree Checkout Error]', err);
          await handleVerifyPayment(res.order_id);
        });
      } else {
        console.warn('Cashfree JS SDK not loaded, using simulated auth');
        setIsProcessing(false);
        handleInitiatePayment();
      }
    } catch (err) {
      console.error('Cashfree PG Checkout Error:', err);
      setCashfreeError(err.message || 'Payment Gateway error. You can use Simulated Demo Payment.');
      setIsProcessing(false);
    }
  };

  // ── CASHFREE VERIFY ORDER HANDLER ──
  const handleVerifyPayment = async (orderId) => {
    if (!orderId) return;
    setIsVerifying(true);
    setCashfreeError('');
    try {
      const verifyRes = await verifyCashfreeOrder(orderId);
      console.log('[Cashfree Verify Response]', verifyRes);

      if (verifyRes.paid || verifyRes.order_status === 'PAID') {
        const inv = {
          invoiceNumber: verifyRes.invoice_no || `INV-2026-${orderId.slice(-6)}`,
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          transactionId: verifyRes.transaction_id || `CF_${orderId}`,
          planId: plan.id,
          planName: plan.name,
          durationMonths,
          baseOfferPrice: order.baseOfferPrice,
          couponCode: order.couponApplied?.code || null,
          couponDiscount: order.couponDiscount,
          discountedBase: order.discountedBase,
          cgst: order.cgst,
          sgst: order.sgst,
          gst: order.gst,
          totalAmount: order.totalAmount,
          contactCredits: plan.contactCredits,
          paymentMethod: verifyRes.payment_method || 'Cashfree Gateway (Sandbox)'
        };

        setCompletedInvoice(inv);
        setStep('success');
        if (onPaymentSuccess) {
          onPaymentSuccess(plan, inv);
        }
      } else {
        setCashfreeError(`Payment not completed (Status: ${verifyRes.order_status || 'PENDING'}). Click "Verify Again" once you complete payment in the Cashfree dialog.`);
      }
    } catch (err) {
      console.error('Verify Order Error:', err);
      setCashfreeError('Failed to verify payment status: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // ── CASHFREE PAYMENT LINK GENERATOR ──
  const handleGeneratePaymentLink = async () => {
    setIsCreatingLink(true);
    setCashfreeError('');
    try {
      const res = await createCashfreeLink({
        plan_id: plan.id,
        plan_name: `${plan.name} Membership`,
        amount: order.totalAmount,
        duration_months: durationMonths,
        user_name: (currentUser?.name && currentUser.name !== 'Verified Member') ? currentUser.name : 'Candidate',
        phone: currentUser?.mobile || currentUser?.phone || '9876543210',
        email: currentUser?.email || 'candidate@i4you.in',
        purpose: `I 4 You Matrimony - ${plan.name} (${durationMonths} Months)`
      });

      if (res.success && res.link_url) {
        setPaymentLinkData(res);
      } else {
        throw new Error(res.error || 'Failed to generate link');
      }
    } catch (err) {
      console.error('Payment Link Error:', err);
      setCashfreeError('Payment Link Error: ' + err.message);
    } finally {
      setIsCreatingLink(false);
    }
  };

  // ── CASHFREE VERIFY LINK HANDLER ──
  const handleVerifyLink = async (linkId) => {
    if (!linkId) return;
    setIsVerifying(true);
    setCashfreeError('');
    try {
      const verifyRes = await verifyCashfreeLink(linkId);
      console.log('[Cashfree Link Verify Response]', verifyRes);

      if (verifyRes.paid || verifyRes.link_status === 'PAID') {
        const inv = {
          invoiceNumber: verifyRes.invoice_no || `INV-2026-${linkId.slice(-6)}`,
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          transactionId: verifyRes.link_id || `CF_${linkId}`,
          planId: plan.id,
          planName: plan.name,
          durationMonths,
          baseOfferPrice: order.baseOfferPrice,
          couponCode: order.couponApplied?.code || null,
          couponDiscount: order.couponDiscount,
          discountedBase: order.discountedBase,
          cgst: order.cgst,
          sgst: order.sgst,
          gst: order.gst,
          totalAmount: order.totalAmount,
          contactCredits: plan.contactCredits,
          paymentMethod: 'Cashfree Payment Link (Sandbox)'
        };

        setCompletedInvoice(inv);
        setStep('success');
        if (onPaymentSuccess) {
          onPaymentSuccess(plan, inv);
        }
      } else {
        setCashfreeError(`Payment Link not paid yet (Status: ${verifyRes.link_status || 'ACTIVE'}). Please complete test payment in browser.`);
      }
    } catch (err) {
      console.error('Verify Link Error:', err);
      setCashfreeError('Link verification error: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Copy shareable link
  const handleCopyLink = () => {
    if (paymentLinkData?.link_url) {
      navigator.clipboard.writeText(paymentLinkData.link_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!isOpen || !plan) return null;


  return (
    <div 
      className={isWebsiteModal 
        ? "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
        : "absolute inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
      }
      onClick={onClose}
    >
      <div 
        className={`bg-white w-full max-h-[95%] sm:max-h-[90%] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-in ${
          isWebsiteModal 
            ? 'rounded-3xl max-w-lg zoom-in-95' 
            : 'rounded-t-3xl sm:rounded-3xl max-w-lg slide-in-from-bottom-6'
        } duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top App Bar inside Checkout */}
        <header className="p-3.5 sm:p-4 bg-gradient-to-r from-[#0B192C] via-[#152E52] to-[#0B192C] text-white rounded-t-3xl border-b border-[#D4AF37]/30 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#DFB76C]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#DFB76C]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-serif font-bold text-sm text-white">Secure Matrimonial Checkout</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                  256-Bit SSL
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                Aadhaar Authentication & NPCI Gateway
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-[#DFB76C]" />
          </button>
        </header>

        {/* ── STEP 1 & 2: Main Checkout Form ── */}
        {step !== 'success' && step !== 'otp' && step !== 'upi_pin' && (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">

            {/* Cashfree Sandbox Gateway Status Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 border border-[#D4AF37]/50 rounded-2xl p-2.5 flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-[#D4AF37]/25 text-[#8C6D1F] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D4AF37]/40 shadow-2xs">
                  <FlaskConical className="w-4 h-4 text-[#8C6D1F]" />
                </div>
                <div className="truncate">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-900 block truncate text-xs">
                      Cashfree Sandbox Connected
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-[#D4AF37]/30 text-[#0B192C] px-1.5 py-0.2 rounded-full border border-[#D4AF37]/50 shrink-0">
                      SANDBOX
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    App ID: TEST1127...7211 • Test UPI & cards active
                  </p>
                </div>
              </div>

              {activeCfOrderId && (
                <button
                  type="button"
                  onClick={() => handleVerifyPayment(activeCfOrderId)}
                  disabled={isVerifying}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 flex items-center space-x-1 shrink-0 cursor-pointer shadow-2xs active:scale-95 transition-all"
                  title="Verify payment with Cashfree backend"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isVerifying ? 'animate-spin text-[#8C6D1F]' : ''}`} />
                  <span>Verify</span>
                </button>
              )}
            </div>

            {/* Error Message Alert */}
            {cashfreeError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between shadow-2xs animate-in fade-in">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{cashfreeError}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setCashfreeError('')}
                  className="text-rose-600 hover:text-rose-800 text-xs font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
            
            {/* Selected Plan Summary Card */}
            <div className="bg-gradient-to-br from-amber-50/80 to-slate-50 border border-amber-200/80 rounded-2xl p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">
                    {plan.id === 'vip' ? '👑' : plan.id === 'diamond' ? '💎' : '⭐'}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">{plan.name} Membership</h4>
                    <p className="text-[10px] text-slate-600 font-medium">{durationMonths} Months Duration • {plan.contactCredits === 999 ? 'Unlimited' : plan.contactCredits} Contact Unlocks</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 line-through text-xs font-semibold block">₹ {(order?.originalPrice ?? 0).toLocaleString('en-IN')}</span>
                  <span className="text-sm font-serif font-extrabold text-[#0B192C]">₹ {(order?.baseOfferPrice ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Promo Coupon Box */}
              <div className="pt-2 border-t border-amber-200/60">
                {order.couponApplied ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-emerald-800 font-semibold">
                    <div className="flex items-center space-x-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Coupon <strong>{order.couponApplied.code}</strong> Applied! (Save ₹{(order?.couponDiscount ?? 0).toLocaleString('en-IN')})</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleRemoveCoupon} 
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-1.5">
                    <div className="relative flex-1">
                      <input 
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder={activeOffer?.code ? `Have a coupon? e.g. ${activeOffer.code}` : "Have a coupon code?"}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold uppercase placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-[#0B192C] text-[#DFB76C] font-bold text-xs hover:bg-slate-800 cursor-pointer transition-colors shadow-2xs"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {couponError && (
                  <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    <span>{couponError}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Select Payment Mode:
              </label>

              <div className="grid grid-cols-5 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`p-2 rounded-2xl border font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                    method === 'upi'
                      ? 'bg-[#0B192C] text-[#DFB76C] border-[#D4AF37] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-[10px] sm:text-[11px]">UPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`p-2 rounded-2xl border font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                    method === 'card'
                      ? 'bg-[#0B192C] text-[#DFB76C] border-[#D4AF37] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-[10px] sm:text-[11px]">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('netbanking')}
                  className={`p-2 rounded-2xl border font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                    method === 'netbanking'
                      ? 'bg-[#0B192C] text-[#DFB76C] border-[#D4AF37] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span className="text-[10px] sm:text-[11px]">NetBank</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('wallet')}
                  className={`p-2 rounded-2xl border font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                    method === 'wallet'
                      ? 'bg-[#0B192C] text-[#DFB76C] border-[#D4AF37] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span className="text-[10px] sm:text-[11px]">Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('link')}
                  className={`p-2 rounded-2xl border font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                    method === 'link'
                      ? 'bg-[#0B192C] text-[#DFB76C] border-[#D4AF37] shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span className="text-[10px] sm:text-[11px]">Pay Link</span>
                </button>
              </div>
            </div>

            {/* ── METHOD 1: UPI Options ── */}
            {method === 'upi' && (
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-3">
                <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setUpiMode('apps')}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      upiMode === 'apps' ? 'bg-white text-[#0B192C] shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    UPI Apps
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpiMode('qr')}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      upiMode === 'qr' ? 'bg-white text-[#0B192C] shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpiMode('id')}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      upiMode === 'id' ? 'bg-white text-[#0B192C] shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    UPI ID
                  </button>
                </div>

                {upiMode === 'apps' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500">Tap your preferred UPI app to authenticate payment:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {UPI_APPS.map(app => (
                        <div
                          key={app.id}
                          onClick={() => setSelectedUpiApp(app.id)}
                          className={`p-3 rounded-2xl border flex items-center space-x-3 cursor-pointer transition-all ${
                            selectedUpiApp === app.id
                              ? 'bg-amber-50/90 border-[#D4AF37] ring-2 ring-[#D4AF37]/50 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                          }`}
                        >
                          {renderUpiLogo(app.id)}
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-900 block truncate text-xs">{app.name}</span>
                            <span className="text-[10px] text-slate-500 block truncate">{app.sub}</span>
                          </div>
                          {selectedUpiApp === app.id && (
                            <CheckCircle2 className="w-4 h-4 text-[#8C6D1F] shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Dedicated 1-Click Branded Logo Pay Button */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handlePayDirectUpi(selectedUpiApp)}
                      className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center space-x-2.5 transition-all shadow-md cursor-pointer mt-2 active:scale-95 ${
                        selectedUpiApp === 'gpay'
                          ? 'bg-white text-slate-900 border-2 border-slate-200 hover:bg-slate-50 shadow-sm'
                          : selectedUpiApp === 'phonepe'
                            ? 'bg-[#5f259f] text-white hover:bg-[#4d1e82]'
                            : selectedUpiApp === 'paytm'
                              ? 'bg-[#002970] text-white hover:bg-[#001f54]'
                              : 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C]'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        {renderUpiLogo(selectedUpiApp)}
                      </div>
                      <span>
                        Pay ₹{(order?.totalAmount ?? 0).toLocaleString('en-IN')} via {UPI_APPS.find(u => u.id === selectedUpiApp)?.name || 'UPI'}
                      </span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                )}

                {upiMode === 'qr' && (
                  <div className="text-center p-3 bg-white rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="inline-block p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                      {/* Realistic dynamic QR Matrix representation */}
                      <div className="w-36 h-36 mx-auto bg-slate-900 rounded-xl p-2 relative flex items-center justify-center">
                        <div className="w-full h-full bg-white rounded-lg p-2 flex flex-col justify-between">
                          <div className="flex justify-between">
                            <div className="w-6 h-6 border-4 border-black rounded-sm flex items-center justify-center">
                              <div className="w-2 h-2 bg-black"></div>
                            </div>
                            <div className="w-6 h-6 border-4 border-black rounded-sm flex items-center justify-center">
                              <div className="w-2 h-2 bg-black"></div>
                            </div>
                          </div>
                          
                          <div className="text-center font-bold text-[9px] text-[#0B192C] font-mono tracking-tighter flex items-center justify-center">
                            <UpiBadgeLogo className="w-10 h-3.5" />
                          </div>

                          <div className="flex justify-between items-end">
                            <div className="w-6 h-6 border-4 border-black rounded-sm flex items-center justify-center">
                              <div className="w-2 h-2 bg-black"></div>
                            </div>
                            <div className="text-[8px] font-mono font-bold text-slate-500">
                              ₹{order.totalAmount}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] font-medium text-slate-600">
                      Scan with any UPI app (Google Pay, PhonePe, Paytm, BHIM)
                    </p>
                    <div className="flex items-center justify-center space-x-1 text-xs font-mono text-amber-700">
                      <Clock className="w-3.5 h-3.5" />
                      <span>QR Valid for: {Math.floor(qrTimer / 60)}:{(qrTimer % 60).toString().padStart(2, '0')}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleInitiatePayment}
                      className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#8C6D1F] text-xs font-bold transition-colors cursor-pointer"
                    >
                      ⚡ Simulate Phone Scan & Pay
                    </button>
                  </div>
                )}

                {upiMode === 'id' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Enter UPI ID / VPA:
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={upiIdInput}
                        onChange={(e) => {
                          setUpiIdInput(e.target.value);
                          setUpiVerified(false);
                        }}
                        placeholder="yourname@okhdfcbank"
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      />
                      <button
                        type="button"
                        onClick={() => setUpiVerified(true)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          upiVerified ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {upiVerified ? '✓ Verified' : 'Verify'}
                      </button>
                    </div>
                    {upiVerified && (
                      <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Account verified: {(currentUser?.name && currentUser.name !== 'Verified Member') ? currentUser.name : 'Priya Sharma'} (Aadhaar Linked)</span>
                      </p>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* ── METHOD 2: Credit / Debit Card ── */}
            {method === 'card' && (
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">Card Number:</label>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                      {cardBrand}
                    </span>
                  </div>
                  <input 
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4532 0000 0000 8912"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wider focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Valid Thru:</label>
                    <input 
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">CVV / CVC:</label>
                    <input 
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="•••"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Cardholder Name:</label>
                  <input 
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Full name as on card"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
              </div>
            )}

            {/* ── METHOD 3: Net Banking ── */}
            {method === 'netbanking' && (
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2.5">
                <label className="text-[11px] font-semibold text-slate-700 block">Select Your Bank:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {POPULAR_BANKS.map(bank => (
                    <div
                      key={bank.id}
                      onClick={() => setSelectedBank(bank.id)}
                      className={`p-2.5 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                        selectedBank === bank.id
                          ? 'bg-amber-50/80 border-[#D4AF37] ring-1 ring-[#D4AF37]'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {renderBankLogo(bank.id)}
                      <span className="font-bold text-slate-800 text-[11px] truncate">{bank.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── METHOD 4: Wallets ── */}
            {method === 'wallet' && (
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                <label className="text-[11px] font-semibold text-slate-700 block">Choose Wallet:</label>
                {[
                  { id: 'paytm', name: 'Paytm Wallet', bal: '₹ 3,450.00' },
                  { id: 'amazon', name: 'Amazon Pay', bal: '₹ 1,820.00' },
                  { id: 'simpl', name: 'Simpl PayLater (3 Interest-free EMIs)', bal: 'Approved' }
                ].map(w => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWallet(w.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs ${
                      selectedWallet === w.id
                        ? 'bg-amber-50/80 border-[#D4AF37] ring-1 ring-[#D4AF37]'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {renderWalletLogo(w.id)}
                      <span className="font-bold text-slate-900">{w.name}</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold font-mono">{w.bal}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── METHOD 5: Cashfree Shareable Test Payment Link ── */}
            {method === 'link' && (
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                  <LinkIcon className="w-4 h-4 text-[#8C6D1F]" />
                  <span>Cashfree Payment Link (Sandbox Test Mode)</span>
                </div>
                
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Generate an authentic Cashfree hosted payment link for <strong>{plan.name} (₹{(order?.totalAmount ?? 0).toLocaleString('en-IN')})</strong>. You can open it in a browser to test Cashfree's checkout, simulate success, and verify payment.
                </p>

                {!paymentLinkData ? (
                  <button
                    type="button"
                    disabled={isCreatingLink}
                    onClick={handleGeneratePaymentLink}
                    className="w-full py-3 px-4 rounded-xl bg-[#0B192C] hover:bg-[#152E52] text-[#DFB76C] font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm active:scale-95"
                  >
                    {isCreatingLink ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Cashfree Sandbox Link...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Sandbox Payment Link (₹{(order?.totalAmount ?? 0).toLocaleString('en-IN')})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 truncate mr-2">
                        ID: {paymentLinkData.link_id}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase shrink-0">
                        {paymentLinkData.link_status || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        readOnly
                        value={paymentLinkData.link_url}
                        className="flex-1 bg-transparent text-[11px] font-mono text-slate-700 outline-none truncate"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                        title="Copy Link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={paymentLinkData.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3 rounded-xl bg-[#0B192C] text-[#DFB76C] font-bold text-xs flex items-center justify-center space-x-1.5 hover:bg-slate-800 transition-colors shadow-2xs"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={() => handleVerifyLink(paymentLinkData.link_id)}
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] font-extrabold text-xs flex items-center justify-center space-x-1.5 hover:opacity-95 transition-colors shadow-2xs cursor-pointer active:scale-95"
                      >
                        {isVerifying ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verify Paid Status</span>
                          </>
                        )}
                      </button>
                    </div>

                    {paymentLinkData.link_qrcode && (
                      <div className="pt-2 text-center border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 block mb-1">Cashfree Dynamic Link QR Code</span>
                        <img 
                          src={paymentLinkData.link_qrcode} 
                          alt="Cashfree Payment QR" 
                          className="w-28 h-28 mx-auto rounded-lg border border-slate-200 p-1 bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Price & GST Breakdown Card */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 space-y-1.5 text-xs shadow-2xs">
              <div className="flex justify-between text-slate-500">
                <span>Base Plan Price:</span>
                <span>₹ {(order?.baseOfferPrice ?? 0).toLocaleString('en-IN')}</span>
              </div>
              
              {Number(order?.couponDiscount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Coupon Discount ({order?.couponApplied?.code || 'COUPON'}):</span>
                  <span>- ₹ {(order?.couponDiscount ?? 0).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500">
                <span>GST (18% - CGST 9% + SGST 9%):</span>
                <span>₹ {(order?.gst ?? 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-extrabold text-[#0B192C]">
                <span className="text-sm">Total Payable:</span>
                <span className="text-base font-serif font-black text-[#0B192C]">
                  ₹ {(order?.totalAmount ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Trust and Safety Guarantee */}
            <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-500 font-medium text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Aadhaar Security • Instant Upgrade • 7-Day Money-Back Guarantee</span>
            </div>

          </div>
        )}

        {/* ── AUTHORIZING LOADER ── */}
        {step === 'authorizing' && (
          <div className="p-8 text-center space-y-4 flex-1 flex flex-col items-center justify-center animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-[#DFB76C]/20 border-2 border-[#D4AF37] flex items-center justify-center animate-spin">
              <RefreshCw className="w-6 h-6 text-[#8C6D1F]" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-base text-[#0B192C]">
                Connecting to Secure Banking Gateway...
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Verifying 256-bit SSL encryption & Aadhaar KYC protocol with National Payments Corporation of India (NPCI).
              </p>
            </div>
          </div>
        )}

        {/* ── STEP: NATIVE DIRECT UPI PIN SCREEN (Google Pay / PhonePe / Paytm / BHIM) ── */}
        {step === 'upi_pin' && (
          <div className="flex-1 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200 bg-[#FAFAFA]">
            {/* Top Header of UPI App */}
            <div className={`p-4 text-white flex items-center justify-between ${
              upiAppPaying === 'phonepe'
                ? 'bg-[#5f259f]'
                : upiAppPaying === 'paytm'
                  ? 'bg-[#002970]'
                  : upiAppPaying === 'bhim'
                    ? 'bg-[#00796B]'
                    : 'bg-[#1a73e8]'
            }`}>
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                  title="Back to Payment Options"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="w-8 h-8 rounded-full bg-white p-1 flex items-center justify-center shadow-xs">
                  {renderUpiLogo(upiAppPaying)}
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight text-white flex items-center space-x-1.5">
                    <span>
                      {upiAppPaying === 'gpay' ? 'Google Pay' : upiAppPaying === 'phonepe' ? 'PhonePe' : upiAppPaying === 'paytm' ? 'Paytm UPI' : 'NPCI UPI'}
                    </span>
                    <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-mono">
                      DIRECT
                    </span>
                  </h4>
                  <p className="text-[10px] text-white/80">Unified Payments Interface (UPI)</p>
                </div>
              </div>

              <div className="flex items-center space-x-1 text-white/90 text-[11px] font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Verified</span>
              </div>
            </div>

            {/* Merchant Details Card */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0B192C] to-[#152E52] text-[#DFB76C] font-serif font-black text-xs flex items-center justify-center border border-[#D4AF37]/40 shadow-xs">
                      I 4 U
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">I 4 You Matrimony</h4>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 inline fill-blue-50" />
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">i4you.matrimony@cashfree</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Merchant
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-2.5 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Amount</span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      Plan: {plan?.name} ({durationMonths} Mo)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-serif font-extrabold text-[#0B192C]">
                      ₹{(order?.totalAmount ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Debiting Account */}
                <div className="bg-slate-50 rounded-xl p-2 flex items-center justify-between text-xs border border-slate-200/60">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-xs">
                      🏦
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">Primary Bank Account</span>
                      <span className="text-[10px] text-slate-500 font-mono">State Bank of India •••• 5821</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-[#8C6D1F] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    NPCI Link
                  </span>
                </div>
              </div>

              {/* UPI PIN Box */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2.5 text-center">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Enter 6-Digit UPI PIN
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Entering PIN will debit ₹{(order?.totalAmount ?? 0).toLocaleString('en-IN')} from your bank account
                  </p>
                </div>

                {/* Animated PIN Dots */}
                <div className="flex justify-center items-center space-x-3 py-1">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const isFilled = upiPinInput.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                          isFilled 
                            ? 'bg-[#0B192C] scale-110 shadow-xs' 
                            : 'border-2 border-slate-300 bg-slate-100'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Hidden / Transparent Real Input for mobile native soft-keyboard */}
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={upiPinInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setUpiPinInput(val);
                    if (upiPinError) setUpiPinError('');
                  }}
                  autoFocus
                  placeholder="Click here to type PIN"
                  className="w-full text-center text-xs text-slate-400 focus:outline-none bg-transparent"
                />

                {/* Error Banner if any */}
                {upiPinError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-2 text-xs flex items-center justify-center space-x-1.5 animate-in shake">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{upiPinError}</span>
                  </div>
                )}

                {/* Sandbox Demo helper */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setUpiPinInput('749201');
                      setUpiPinError('');
                    }}
                    className="text-[11px] font-bold text-[#8C6D1F] bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    ⚡ Auto-fill Test PIN (749201)
                  </button>
                </div>
              </div>

              {/* On-Screen Numeric Keypad (for Desktop or Touch) */}
              <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto pt-0.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (upiPinInput.length < 6) {
                        setUpiPinInput(prev => prev + num);
                        if (upiPinError) setUpiPinError('');
                      }
                    }}
                    className="h-11 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 font-bold text-base text-slate-800 shadow-2xs transition-all flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUpiPinInput('')}
                  className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold text-xs text-slate-600 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (upiPinInput.length < 6) {
                      setUpiPinInput(prev => prev + '0');
                      if (upiPinError) setUpiPinError('');
                    }
                  }}
                  className="h-11 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 font-bold text-base text-slate-800 shadow-2xs transition-all flex items-center justify-center cursor-pointer active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setUpiPinInput(prev => prev.slice(0, -1))}
                  className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold text-sm text-slate-700 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                  title="Backspace"
                >
                  ⌫
                </button>
              </div>
            </div>

            {/* Bottom Actions for UPI PIN Screen */}
            <div className="p-3.5 bg-white border-t border-slate-200 space-y-2">
              <button
                type="button"
                disabled={isUpiPinAuthorizing || upiPinInput.length < 4}
                onClick={handleConfirmUpiPin}
                className={`w-full py-3 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                  upiAppPaying === 'phonepe'
                    ? 'bg-[#5f259f] text-white hover:bg-[#4d1e82]'
                    : upiAppPaying === 'paytm'
                      ? 'bg-[#002970] text-white hover:bg-[#001f54]'
                      : 'bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] text-[#0B192C]'
                }`}
              >
                {isUpiPinAuthorizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authorizing ₹{(order?.totalAmount ?? 0).toLocaleString('en-IN')} with Bank...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize & Pay ₹{(order?.totalAmount ?? 0).toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                <span className="flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>256-bit Encrypted PIN • NPCI Safe</span>
                </span>
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-slate-500 hover:text-rose-600 font-semibold cursor-pointer underline"
                >
                  Cancel & Return
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: SIMULATED BANK OTP MODAL ── */}
        {step === 'otp' && (
          <div className="p-5 space-y-4 flex-1 flex flex-col justify-center animate-in fade-in">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#8C6D1F] flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-6 h-6 text-[#8C6D1F]" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#0B192C]">
                Bank / UPI 3D-Secure Authentication
              </h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                One-Time Password (OTP) sent to your registered mobile ending in <strong>{currentUser?.mobile?.slice(-4) || '3210'}</strong>
              </p>
            </div>

            {/* Simulated SMS Notification Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 shadow-md border border-slate-700 text-xs space-y-1">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>💬 SMS • Just now</span>
                <span className="font-mono text-emerald-400 font-bold">AXIS-ALERT</span>
              </div>
              <p className="text-[11px] leading-snug">
                OTP for I 4 YOU Matrimony payment of <strong className="text-[#DFB76C]">₹{order.totalAmount}</strong> is <strong className="text-white font-mono bg-white/20 px-1 py-0.2 rounded tracking-widest">{generatedOtp}</strong>. Do not share with anyone.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block text-center">
                Enter 6-Digit OTP:
              </label>
              <div className="flex justify-center">
                <input 
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="••••••"
                  className="w-48 text-center bg-slate-50 border-2 border-slate-300 rounded-2xl py-2.5 text-lg font-mono font-bold tracking-widest focus:outline-none focus:border-[#D4AF37] focus:bg-white"
                />
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setOtpInput(generatedOtp)}
                  className="text-xs font-bold text-[#8C6D1F] hover:underline cursor-pointer"
                >
                  ⚡ Auto-fill OTP ({generatedOtp})
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing || otpInput.length < 4}
              onClick={handleConfirmOtp}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] text-[#0B192C] font-extrabold text-sm shadow-lg shadow-[#D4AF37]/30 hover:opacity-95 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authorizing Payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify OTP & Authorize ₹{order.totalAmount}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 3: SUCCESS CELEBRATION MODAL ── */}
        {step === 'success' && completedInvoice && (
          <div className="p-6 space-y-4 text-center flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
            {/* Celebration Icon */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <Sparkles className="w-6 h-6 text-[#DFB76C] absolute -top-1 -right-1 animate-pulse" />
            </div>

            <div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#D4AF37]/20 text-[#8C6D1F] border border-[#D4AF37]/40 uppercase tracking-wider">
                Membership Activated ✨
              </span>
              <h3 className="font-serif font-extrabold text-xl text-[#0B192C] mt-2">
                Congratulations, {currentUser?.name?.split(' ')[0] || 'Member'}!
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1 leading-relaxed">
                You are now a verified <strong className="text-slate-900">{plan.name}</strong> subscriber. Your <strong className="text-[#8C6D1F]">{plan.contactCredits === 999 ? 'Unlimited' : plan.contactCredits} contact unlocks</strong> and profile boost are active!
              </p>
            </div>

            {/* Quick Details Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 w-full text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-800">{completedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-slate-900">₹ {(completedInvoice?.totalAmount ?? order?.totalAmount ?? 0).toLocaleString('en-IN')} (Incl. GST)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold text-slate-800">{completedInvoice.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan Duration:</span>
                <span className="font-semibold text-slate-800">{durationMonths} Months</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="w-full space-y-2 pt-2">
              <button
                type="button"
                onClick={() => onViewInvoice && onViewInvoice(completedInvoice)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#8C6D1F]" />
                <span>View & Print GST Tax Invoice</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-2xl bg-[#0B192C] hover:bg-[#152E52] text-[#DFB76C] font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Continue to Matrimony Feed →
              </button>
            </div>
          </div>
        )}

        {/* Bottom Action Footer for Step 1 */}
        {step !== 'success' && step !== 'otp' && step !== 'upi_pin' && (
          <footer className="p-3.5 bg-slate-50 border-t border-slate-200 rounded-b-3xl flex flex-col space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Total Payable</span>
                <span className="font-serif font-extrabold text-base text-[#0B192C]">
                  ₹ {(order?.totalAmount ?? 0).toLocaleString('en-IN')}
                </span>
              </div>

              {method === 'link' ? (
                <button
                  type="button"
                  disabled={isVerifying || isCreatingLink}
                  onClick={paymentLinkData ? () => handleVerifyLink(paymentLinkData.link_id) : handleGeneratePaymentLink}
                  className="py-3 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] text-[#0B192C] font-extrabold text-xs sm:text-sm shadow-lg shadow-[#D4AF37]/35 transition-all flex items-center space-x-2.5 cursor-pointer active:scale-95"
                >
                  {isVerifying || isCreatingLink ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#0B192C]" />
                      <span>{isCreatingLink ? 'Generating Link...' : 'Verifying Link...'}</span>
                    </>
                  ) : paymentLinkData ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#0B192C]" />
                      <span>Verify Link Paid Status</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#0B192C]" />
                      <span>Generate Test Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={method === 'upi' ? () => handlePayDirectUpi(selectedUpiApp) : handlePayWithCashfree}
                  className="py-3 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#DFB76C] to-[#D4AF37] hover:from-[#dfb76c] hover:to-[#b89228] text-[#0B192C] font-extrabold text-xs sm:text-sm shadow-lg shadow-[#D4AF37]/35 transition-all flex items-center space-x-2.5 cursor-pointer active:scale-95"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#0B192C]" />
                      <span>Connecting Gateway...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {method === 'upi' && renderUpiLogo(selectedUpiApp)}
                        {method === 'card' && <CreditCard className="w-4 h-4 text-[#0B192C]" />}
                        {method === 'netbanking' && renderBankLogo(selectedBank)}
                        {method === 'wallet' && renderWalletLogo(selectedWallet)}
                      </div>
                      <span className="font-extrabold">
                        {method === 'upi'
                          ? `Pay ₹${(order?.totalAmount ?? 0).toLocaleString('en-IN')} via ${UPI_APPS.find(u => u.id === selectedUpiApp)?.name || 'UPI'}`
                          : `Pay ₹${(order?.totalAmount ?? 0).toLocaleString('en-IN')} with Cashfree PG`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Offline Simulation & Safety Guarantee Sub-row */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 text-[10px] text-slate-500">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cashfree Sandbox (Zero real charge)</span>
              </span>
              <button
                type="button"
                onClick={handleInitiatePayment}
                className="text-slate-600 hover:text-[#8C6D1F] font-bold hover:underline cursor-pointer transition-colors"
                title="Simulate bank authorization using a local test OTP without opening external gateway"
              >
                ⚡ Offline Simulated Demo OTP
              </button>
            </div>
          </footer>
        )}

      </div>
    </div>
  );
}
