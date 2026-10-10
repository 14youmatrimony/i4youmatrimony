import React, { useState, useEffect } from 'react';
import { 
  X, 
  Maximize2, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Crown,
  Monitor,
  Flame,
  Search,
  Heart,
  MessageCircle,
  User,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { MobileTopStatusBar, MobileBottomNavigationIndicator } from './MobileStatusBar';
import MobileAppShell from './MobileAppShell';
import MobileMatchFeed from './MobileMatchFeed';
import MobileSearchScreen from './MobileSearchScreen';
import MobileInterestsScreen from './MobileInterestsScreen';
import MobileChatScreen from './MobileChatScreen';
import MobileAccountScreen from './MobileAccountScreen';
import MobileNotificationsSheet from './MobileNotificationsSheet';
import MobileProfileDetailSheet from './MobileProfileDetailSheet';
import MobileFilterBottomSheet from './MobileFilterBottomSheet';
import WhatsAppStatusSystem from './WhatsAppStatusSystem';
import MobilePhotoManagerSheet from './MobilePhotoManagerSheet';
import { ScreenshotRestrictedBanner, ScreenshotCaptureBlockOverlay } from './PhotoPrivacyShield';
import MobileOffersAndPlansSheet from './MobileOffersAndPlansSheet';
import MobilePaymentModal from './MobilePaymentModal';
import PaymentInvoiceModal from './PaymentInvoiceModal';
import MobileThemeSettingsSheet from './MobileThemeSettingsSheet';
import AadhaarVerificationScreen from '../AadhaarVerificationScreen';
import { useTheme } from '../../context/ThemeContext';

export default function MobileAppModal({
  isOpen,
  onClose,
  onSwitchToFullApp,
  currentUser,
  setCurrentUser,
  onLogout,
  onOpenLogin,
  onOpenRegister,
  onSwitchDemoGender,
  activeTab,
  setActiveTab,
  profiles,
  filteredProfiles,
  interestsSent,
  onToggleInterest,
  shortlisted,
  onToggleShortlist,
  selectedProfile,
  setSelectedProfile,
  onSelectProfile,
  conversations,
  setConversations,
  activeChatProfileId,
  setActiveChatProfileId,
  isDirectChatOpen,
  setIsDirectChatOpen,
  notifications,
  unreadNotificationsCount,
  isNotificationsOpen,
  setIsNotificationsOpen,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onDeleteNotification,
  onAcceptInterestNotification,
  onDeclineInterestNotification,
  onSimulateNotification,
  myStatus,
  candidateStatuses,
  hiddenStatusIds,
  deletedStatusIds,
  onOpenStatusViewer,
  onOpenStatusEditor,
  onOpenStatusMenu,
  onSaveMyStatus,
  onDeleteMyStatus,
  onToggleHideMyStatus,
  onHideOtherStatus,
  onRemoveOtherStatus,
  activeStoryViewer,
  setActiveStoryViewer,
  isStatusEditorOpen,
  setIsStatusEditorOpen,
  statusMenuData,
  setStatusMenuData,
  isFilterSheetOpen,
  setIsFilterSheetOpen,
  activeFiltersCount,
  onResetFilters,
  selectedState,
  setSelectedState,
  selectedDistrict,
  setSelectedDistrict,
  selectedReligion,
  setSelectedReligion,
  selectedCaste,
  setSelectedCaste,
  minAge,
  setMinAge,
  maxAge,
  setMaxAge,
  minHeight,
  setMinHeight,
  selectedMaritalStatus,
  setSelectedMaritalStatus,
  selectedEducation,
  setSelectedEducation,
  selectedProfession,
  setSelectedProfession,
  minIncome,
  setMinIncome,
  selectedDiet,
  setSelectedDiet,
  selectedDrinking,
  setSelectedDrinking,
  selectedSmoking,
  setSelectedSmoking,
  selectedWorkMode,
  setSelectedWorkMode,
  selectedFamilyType,
  setSelectedFamilyType,
  selectedFamilyStatus,
  setSelectedFamilyStatus,
  verifiedOnly,
  setVerifiedOnly,
  photoOnly,
  setPhotoOnly,
  membershipFilter,
  setMembershipFilter,
  phoneOnly,
  setPhoneOnly,
  mobileSearchNumber,
  setMobileSearchNumber,
  isOffersSheetOpen,
  setIsOffersSheetOpen,
  onOpenOffers,
  membershipPlans,
  offers = [],
  selectedPlanForPayment,
  paymentDuration,
  paymentCoupon,
  isPaymentModalOpen,
  setIsPaymentModalOpen,
  activeInvoice,
  setActiveInvoice,
  handleSelectPlanForPayment,
  handlePaymentSuccess,
  handleUnlockContact,
  isPhotoManagerOpen,
  setIsPhotoManagerOpen,
  photoManagerTab,
  setPhotoManagerTab,
  onUpdatePhotos,
  isThemeSettingsOpen,
  setIsThemeSettingsOpen,
  handleStartChat,
  onRequestSendInterest,
  onStartAudioCall,
  onStartVideoCall,
  onAadhaarVerificationComplete,
  isProduction,
  showToast,
  interestsSegment,
  setInterestsSegment,
  declinedReceivedIds,
  handleDeclineReceivedInterest,
  handleUndoDeclineReceivedInterest,
  handleAcceptReceivedInterest
}) {
  const { bottomBarStyle, isDarkMode } = useTheme();
  // Layout sizing inside the 80% screen modal: 'phone' (420px, matches screenshot), 'wide' (520px), or 'fill' (100% of 80% window)
  const [modalLayoutMode, setModalLayoutMode] = useState('phone');
  const [internalScreen, setInternalScreen] = useState('app'); // 'app' | 'verify-aadhaar' | 'offers'

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalUnreadChatCount = conversations?.reduce((acc, c) => acc + (c.unreadCount || 0), 0) || 0;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* 90% Screen Modal Window Container */}
      <div 
        className="w-[96vw] md:w-[92vw] lg:w-[90vw] h-[94vh] md:h-[90vh] bg-[#070F1E] border-2 border-[#D4AF37]/50 rounded-[28px] sm:rounded-[36px] shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative subtle ambient lights */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#1E3A8A]/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Top Control Header */}
        <header className="px-4 py-2.5 sm:px-6 sm:py-3 bg-[#0B192C]/95 border-b border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-3 text-white z-30 shrink-0">
          
          {/* Left: Brand Identity & Active Profile */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#DFB76C] to-[#8C6D1F] p-0.5 shadow-md shrink-0">
              <img 
                src="/brand-logo.png" 
                alt="I 4 You Logo" 
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="w-full h-full bg-[#0B192C] text-[#DFB76C] font-serif font-black flex items-center justify-center text-xs">I4U</div>';
                }}
              />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-extrabold text-sm sm:text-base text-white tracking-wide truncate">
                  I 4 You Mobile Experience
                </h3>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#DFB76C] border border-[#D4AF37]/40 shadow-xs hidden sm:inline-block shrink-0">
                  90% Screen Web App
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Member: <strong>{currentUser?.name || 'Priya Sharma'}</strong></span>
                {currentUser?.aadhaarVerified && (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5 text-[10px]">
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" /> Aadhaar Verified
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Layout Switcher, Fullscreen & Close Button */}
          <div className="flex items-center space-x-2 shrink-0">
            
            {/* View Mode Toggle: Phone (420px) vs Wide (520px) vs Fill (Full 80% screen) */}
            <div className="hidden sm:flex items-center bg-black/50 p-1 rounded-full border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setModalLayoutMode('phone')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                  modalLayoutMode === 'phone'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Exact smartphone aspect ratio matching screenshot (420px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone (420px)</span>
              </button>

              <button
                type="button"
                onClick={() => setModalLayoutMode('wide')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                  modalLayoutMode === 'wide'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Spacious mobile view (520px)"
              >
                <span>Wide</span>
              </button>

              <button
                type="button"
                onClick={() => setModalLayoutMode('fill')}
                className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                  modalLayoutMode === 'fill'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#DFB76C] text-[#0B192C] shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Responsive layout filling full 80% width"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Full Width</span>
              </button>
            </div>

            {/* Demo Persona Switcher: Bride (Priya) vs Groom (Rohan) */}
            {!isProduction && onSwitchDemoGender && (
              <div className="hidden sm:flex items-center space-x-0.5 bg-black/40 p-0.5 rounded-full border border-[#D4AF37]/40 text-xs">
                <button
                  type="button"
                  onClick={() => onSwitchDemoGender('female')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                    (currentUser?.gender || '').toLowerCase() === 'female'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Switch to Bride persona (Priya Sharma - viewing Gents only)"
                >
                  <span>👰 Bride</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchDemoGender('male')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                    (currentUser?.gender || '').toLowerCase() === 'male'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Switch to Groom persona (Rohan Jayasimha - viewing Brides only)"
                >
                  <span>🤵 Groom</span>
                </button>
              </div>
            )}

            {/* Switch to Full Screen Simulator */}
            {onSwitchToFullApp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToFullApp();
                }}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                title="Switch to full screen simulator view"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#DFB76C]" />
                <span className="hidden md:inline">Full Screen</span>
              </button>
            )}

            {/* Close Button (X) */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/15 hover:border-rose-400/40 transition-colors cursor-pointer"
              title="Close & Return to Webpage (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </header>

        {/* Modal Body: Houses the Active Mobile Application View */}
        <div className="flex-1 min-h-0 overflow-hidden relative flex justify-center items-center p-0 sm:p-2 md:p-3 bg-gradient-to-b from-[#0B192C] via-[#081220] to-[#040810]">
          
          {/* Frame Container fitting either phone (420px), wide (520px), or fill (full 80% width) */}
          <div className={`flex flex-col h-full shadow-2xl relative overflow-hidden transition-all duration-300 sm:rounded-[32px] sm:border-2 sm:border-slate-800 ${
            modalLayoutMode === 'phone'
              ? 'w-full max-w-[420px]'
              : modalLayoutMode === 'wide'
                ? 'w-full max-w-[540px]'
                : 'w-full max-w-full'
          } ${isDarkMode ? 'bg-[#081220]' : 'bg-slate-50'}`}>

            {/* Mobile Top Status Bar (Time, Signal, WiFi, Battery) */}
            <MobileTopStatusBar 
              deviceType="ios" 
              currentScreen={internalScreen} 
              activeStoryViewer={activeStoryViewer} 
              theme="auto" 
            />

            {/* Internal App Navigation / Screen Router */}
            <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
              
              {/* Screen 1: Aadhaar UIDAI Verification */}
              {internalScreen === 'verify-aadhaar' && (
                <AadhaarVerificationScreen 
                  registrationData={currentUser}
                  onVerificationSuccess={(data) => {
                    onAadhaarVerificationComplete?.(data);
                    setInternalScreen('app');
                  }}
                  onBack={() => setInternalScreen('app')}
                  isProduction={isProduction}
                />
              )}

              {/* Screen 2: Dedicated Offers & Plans Screen */}
              {internalScreen === 'offers' && (
                <MobileOffersAndPlansSheet 
                  isOpen={true}
                  onClose={() => setInternalScreen('app')}
                  currentUser={currentUser}
                  onSelectPlanForPayment={handleSelectPlanForPayment}
                  onViewInvoices={() => {
                    setInternalScreen('app');
                    setActiveTab('account');
                  }}
                  plans={membershipPlans}
                  offers={offers}
                />
              )}

              {/* Screen 3: Main App Shell & Tabs (Matching the user screenshot!) */}
              {internalScreen === 'app' && (
                <MobileAppShell
                  activeTab={activeTab}
                  setActiveTab={(tabId) => {
                    if (tabId === 'chat' && activeTab !== 'chat') {
                      setIsDirectChatOpen(false);
                    }
                    setActiveTab(tabId);
                  }}
                  unreadCount={currentUser ? totalUnreadChatCount : 0}
                  interestCount={currentUser ? interestsSent.length : 0}
                  unreadNotificationsCount={currentUser ? unreadNotificationsCount : 0}
                  onOpenNotifications={() => setIsNotificationsOpen(true)}
                  currentUser={currentUser}
                  onOpenFilter={() => setIsFilterSheetOpen(true)}
                  deviceType="ios"
                  activeFiltersCount={activeFiltersCount}
                  hideFloatingNotification={Boolean(selectedProfile || isDirectChatOpen || activeTab === 'chat')}
                  hideBottomNav={Boolean(activeTab === 'chat' && isDirectChatOpen)}
                  overlays={
                    <>
                      {/* Notifications Sheet */}
                      <MobileNotificationsSheet 
                        isOpen={isNotificationsOpen}
                        onClose={() => setIsNotificationsOpen(false)}
                        currentUser={currentUser}
                        onOpenLogin={() => {
                          setIsNotificationsOpen(false);
                          if (onOpenLogin) onOpenLogin();
                        }}
                        notifications={currentUser ? notifications : []}
                        profiles={profiles}
                        onMarkAsRead={onMarkNotificationAsRead}
                        onMarkAllAsRead={onMarkAllNotificationsAsRead}
                        onDeleteNotification={onDeleteNotification}
                        onAcceptInterest={onAcceptInterestNotification}
                        onDeclineInterest={onDeclineInterestNotification}
                        onSendInterest={(profileId) => onToggleInterest(profileId)}
                        onOpenChat={(profileId) => {
                          setIsNotificationsOpen(false);
                          handleStartChat(profileId);
                        }}
                        onOpenProfile={(profile) => {
                          setIsNotificationsOpen(false);
                          handleSelectProfile(profile);
                        }}
                        onSimulateNotification={onSimulateNotification}
                      />

                      {/* Profile Detail Sheet */}
                      {selectedProfile && (
                        <MobileProfileDetailSheet 
                          profile={selectedProfile}
                          currentUser={currentUser}
                          onClose={() => setSelectedProfile(null)}
                          onToggleInterest={onToggleInterest}
                          onRequestSendInterest={onRequestSendInterest}
                          isInterested={interestsSent.includes(selectedProfile.id)}
                          onToggleShortlist={onToggleShortlist}
                          isShortlisted={shortlisted.includes(selectedProfile.id)}
                          onStartChat={handleStartChat}
                          onStartAudioCall={onStartAudioCall}
                          onStartVideoCall={onStartVideoCall}
                          onOpenAadhaarVerification={() => setInternalScreen('verify-aadhaar')}
                          onOpenOffers={onOpenOffers}
                          onUnlockContact={handleUnlockContact}
                        />
                      )}

                      {/* Filter Bottom Sheet */}
                      <MobileFilterBottomSheet 
                        isOpen={isFilterSheetOpen}
                        onClose={() => setIsFilterSheetOpen(false)}
                        selectedState={selectedState}
                        setSelectedState={setSelectedState}
                        selectedDistrict={selectedDistrict}
                        setSelectedDistrict={setSelectedDistrict}
                        selectedReligion={selectedReligion}
                        setSelectedReligion={setSelectedReligion}
                        selectedCaste={selectedCaste}
                        setSelectedCaste={setSelectedCaste}
                        minAge={minAge}
                        setMinAge={setMinAge}
                        maxAge={maxAge}
                        setMaxAge={setMaxAge}
                        minHeight={minHeight}
                        setMinHeight={setMinHeight}
                        selectedMaritalStatus={selectedMaritalStatus}
                        setSelectedMaritalStatus={setSelectedMaritalStatus}
                        selectedEducation={selectedEducation}
                        setSelectedEducation={setSelectedEducation}
                        selectedProfession={selectedProfession}
                        setSelectedProfession={setSelectedProfession}
                        minIncome={minIncome}
                        setMinIncome={setMinIncome}
                        selectedDiet={selectedDiet}
                        setSelectedDiet={setSelectedDiet}
                        selectedDrinking={selectedDrinking}
                        setSelectedDrinking={setSelectedDrinking}
                        selectedSmoking={selectedSmoking}
                        setSelectedSmoking={setSelectedSmoking}
                        selectedWorkMode={selectedWorkMode}
                        setSelectedWorkMode={setSelectedWorkMode}
                        selectedFamilyType={selectedFamilyType}
                        setSelectedFamilyType={setSelectedFamilyType}
                        selectedFamilyStatus={selectedFamilyStatus}
                        setSelectedFamilyStatus={setSelectedFamilyStatus}
                        verifiedOnly={verifiedOnly}
                        setVerifiedOnly={setVerifiedOnly}
                        photoOnly={photoOnly}
                        setPhotoOnly={setPhotoOnly}
                        membershipFilter={membershipFilter}
                        setMembershipFilter={setMembershipFilter}
                        phoneOnly={phoneOnly}
                        setPhoneOnly={setPhoneOnly}
                        mobileSearchNumber={mobileSearchNumber}
                        setMobileSearchNumber={setMobileSearchNumber}
                        onReset={onResetFilters}
                        totalMatching={filteredProfiles?.length || 0}
                        activeFiltersCount={activeFiltersCount}
                        currentUser={currentUser}
                      />

                      {/* WhatsApp Status System Overlays */}
                      <WhatsAppStatusSystem
                        myStatus={myStatus}
                        activeStoryViewer={activeStoryViewer}
                        onCloseStoryViewer={() => setActiveStoryViewer(null)}
                        statusEditorOpen={isStatusEditorOpen}
                        onCloseStatusEditor={() => setIsStatusEditorOpen(false)}
                        onOpenStatusEditor={onOpenStatusEditor}
                        statusMenuOpen={statusMenuData}
                        onCloseStatusMenu={() => setStatusMenuData(null)}
                        onOpenStatusMenu={onOpenStatusMenu}
                        onSaveMyStatus={onSaveMyStatus}
                        onDeleteMyStatus={onDeleteMyStatus}
                        onToggleHideMyStatus={onToggleHideMyStatus}
                        onHideOtherStatus={onHideOtherStatus}
                        onRemoveOtherStatus={onRemoveOtherStatus}
                        onOpenProfile={onSelectProfile}
                        onOpenChat={(pid) => handleStartChat(pid)}
                        onToggleInterest={onToggleInterest}
                        isInterested={interestsSent.includes(activeStoryViewer?.profile?.id)}
                      />

                      {/* Photo Manager Sheet */}
                      <MobilePhotoManagerSheet 
                        isOpen={isPhotoManagerOpen}
                        onClose={() => setIsPhotoManagerOpen(false)}
                        initialTab={photoManagerTab}
                        currentUser={currentUser}
                        onUpdatePhotos={(photosData) => {
                          if (onUpdatePhotos) {
                            onUpdatePhotos(photosData);
                          } else {
                            setCurrentUser(prev => ({
                              ...prev,
                              ...photosData
                            }));
                            showToast?.('Photos updated! ✨');
                          }
                        }}
                      />

                      {/* Screenshot Protection Overlays */}
                      <ScreenshotRestrictedBanner />
                      <ScreenshotCaptureBlockOverlay />

                      {/* Offers Sheet */}
                      <MobileOffersAndPlansSheet 
                        isOpen={isOffersSheetOpen}
                        onClose={() => setIsOffersSheetOpen(false)}
                        currentUser={currentUser}
                        onSelectPlanForPayment={handleSelectPlanForPayment}
                        onViewInvoices={() => {
                          setIsOffersSheetOpen(false);
                          setActiveTab('account');
                        }}
                        plans={membershipPlans}
                        offers={offers}
                      />

                      {/* Payment Modal */}
                      <MobilePaymentModal 
                        isOpen={isPaymentModalOpen}
                        plan={selectedPlanForPayment}
                        durationMonths={paymentDuration}
                        initialCoupon={paymentCoupon}
                        currentUser={currentUser}
                        offers={offers}
                        onClose={() => setIsPaymentModalOpen(false)}
                        onPaymentSuccess={handlePaymentSuccess}
                        onViewInvoice={(inv) => {
                          setIsPaymentModalOpen(false);
                          setActiveInvoice(inv);
                        }}
                      />

                      {/* Invoice Modal */}
                      <PaymentInvoiceModal 
                        invoice={activeInvoice}
                        currentUser={currentUser}
                        onClose={() => setActiveInvoice(null)}
                      />

                      {/* Theme Settings Sheet */}
                      <MobileThemeSettingsSheet 
                        isOpen={isThemeSettingsOpen}
                        onClose={() => setIsThemeSettingsOpen(false)}
                      />
                    </>
                  }
                >
                  {/* Tab 1: Discover / Feed (Exact Match for user uploaded screenshot!) */}
                  {activeTab === 'feed' && (
                    <MobileMatchFeed 
                      profiles={filteredProfiles}
                      activeFiltersCount={activeFiltersCount}
                      onResetFilters={onResetFilters}
                      currentUser={currentUser}
                      currentScreen={internalScreen}
                      interestsSent={interestsSent}
                      onToggleInterest={onToggleInterest}
                      shortlisted={shortlisted}
                      onToggleShortlist={onToggleShortlist}
                      onSelectProfile={onSelectProfile}
                      onStartChat={handleStartChat}
                      onOpenFilter={() => setIsFilterSheetOpen(true)}
                      onOpenOffers={onOpenOffers}
                      myStatus={myStatus}
                      candidateStatuses={candidateStatuses}
                      hiddenStatusIds={hiddenStatusIds}
                      deletedStatusIds={deletedStatusIds}
                      onOpenStatusViewer={onOpenStatusViewer}
                      onOpenStatusEditor={onOpenStatusEditor}
                      onOpenStatusMenu={onOpenStatusMenu}
                      onOpenAadhaarVerification={() => setInternalScreen('verify-aadhaar')}
                    />
                  )}

                  {/* Tab 2: Advanced Search */}
                  {activeTab === 'search' && (
                    <MobileSearchScreen 
                      profiles={filteredProfiles || profiles}
                      currentUser={currentUser}
                      interestsSent={interestsSent}
                      onToggleInterest={onToggleInterest}
                      shortlisted={shortlisted}
                      onToggleShortlist={onToggleShortlist}
                      onSelectProfile={onSelectProfile}
                      onStartChat={handleStartChat}
                      onOpenFilter={() => setIsFilterSheetOpen(true)}
                      activeFiltersCount={activeFiltersCount}
                    />
                  )}

                  {/* Tab 3: Interests & Matches */}
                  {activeTab === 'interests' && (
                    <MobileInterestsScreen 
                      profiles={filteredProfiles || profiles}
                      currentUser={currentUser}
                      onOpenLogin={onOpenLogin}
                      interestsSent={interestsSent}
                      onToggleInterest={onToggleInterest}
                      shortlisted={shortlisted}
                      onToggleShortlist={onToggleShortlist}
                      onSelectProfile={onSelectProfile}
                      onStartChat={handleStartChat}
                      activeSegment={interestsSegment}
                      onSegmentChange={setInterestsSegment}
                      declinedReceivedIds={declinedReceivedIds}
                      onDeclineReceivedInterest={handleDeclineReceivedInterest}
                      onUndoDeclineReceivedInterest={handleUndoDeclineReceivedInterest}
                      onAcceptReceivedInterest={handleAcceptReceivedInterest}
                    />
                  )}

                  {/* Tab 4: Messages / Chat */}
                  {activeTab === 'chat' && (
                    <MobileChatScreen 
                      profiles={filteredProfiles || profiles}
                      currentUser={currentUser}
                      onOpenLogin={onOpenLogin}
                      conversations={conversations}
                      setConversations={setConversations}
                      activeProfileId={activeChatProfileId}
                      setActiveProfileId={setActiveChatProfileId}
                      onSelectProfile={onSelectProfile}
                      isDirectChatOpen={isDirectChatOpen}
                      setIsDirectChatOpen={setIsDirectChatOpen}
                      onOpenOffers={onOpenOffers}
                      onStartAudioCall={onStartAudioCall}
                      onStartVideoCall={onStartVideoCall}
                    />
                  )}

                  {/* Tab 5: Account & Profile */}
                  {activeTab === 'account' && (
                    <MobileAccountScreen 
                      currentUser={currentUser}
                      onOpenNotifications={() => setIsNotificationsOpen(true)}
                      unreadNotificationsCount={unreadNotificationsCount}
                      onOpenPhotoManager={(tab = 'single') => {
                        setPhotoManagerTab(tab);
                        setIsPhotoManagerOpen(true);
                      }}
                      onNavigateToInterests={(segment = 'sent') => {
                        setInterestsSegment(segment);
                        setActiveTab('interests');
                      }}
                      onUpdateLocation={(loc) => {
                        setCurrentUser(prev => ({ ...prev, ...loc }));
                        showToast?.(`Location set to ${loc.district} Dist., ${loc.state}`);
                      }}
                      onUpdatePhotos={(photosData) => {
                        if (onUpdatePhotos) {
                          onUpdatePhotos(photosData);
                        } else {
                          setCurrentUser(prev => ({
                            ...prev,
                            ...photosData
                          }));
                        }
                      }}
                      onOpenOffers={onOpenOffers}
                      onOpenThemeSettings={() => setIsThemeSettingsOpen(true)}
                      onOpenAadhaarVerification={() => setInternalScreen('verify-aadhaar')}
                      onLogout={onLogout}
                      onOpenLogin={onOpenLogin}
                      onOpenRegister={onOpenRegister}
                    />
                  )}

                </MobileAppShell>
              )}

            </div>

            {/* Mobile Bottom Home Navigation Indicator */}
            <MobileBottomNavigationIndicator 
              deviceType="ios" 
              currentScreen={internalScreen} 
              activeStoryViewer={activeStoryViewer} 
              theme="auto" 
              bottomBarStyle={bottomBarStyle}
              isDarkMode={isDarkMode}
            />

          </div>

        </div>

      </div>
    </div>
  );
}
