import React, { useState, useMemo } from 'react';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteHero from './WebsiteHero';
import WebsiteStoriesReel from './WebsiteStoriesReel';
import WebsiteMatchShowcase from './WebsiteMatchShowcase';
import WebsitePricingSection from './WebsitePricingSection';
import WebsiteSuccessStories from './WebsiteSuccessStories';
import WebsiteFooter from './WebsiteFooter';
import { getTargetCandidateGender, isCandidateMatchingTarget } from '../../utils/genderMatch';

export default function WebsiteView({
  profiles,
  currentUser,
  currentScreen = 'app',
  interestsSent,
  onToggleInterest,
  onRequestSendInterest,
  shortlisted,
  onToggleShortlist,
  onSelectProfile,
  onStartChat,
  onOpenLogin,
  onOpenRegister,
  onOpenEditProfile,
  onOpenOffers,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  candidateStatuses,
  activeStories = [],
  myStatus,
  onOpenStatusViewer,
  onOpenStatusEditor,
  onSelectPlanForPayment,
  viewMode,
  setViewMode,
  onOpenAadhaarVerification,
  isProduction,
  onToggleProductionMode,
  onQuickSearch,
  selectedReligion = 'All Religions',
  onSelectReligion,
  membershipPlans,
  offers = [],
  homepageBanners = [],
  visitorLocation = null,
  onLogout,
  onOpenAppModal,
  onOpenVendorPortal,
  onOpenServices
}) {
  const [activeCity, setActiveCity] = useState('');

  // Featured Profile for Hero Card (Strict opposite gender of logged-in user or bride by default)
  const featuredProfile = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    const targetGender = getTargetCandidateGender(currentUser);
    return profiles.find(p => isCandidateMatchingTarget(p.gender, targetGender)) || profiles[0] || null;
  }, [profiles, currentUser]);

  const handleScrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div 
      className="website-view-root min-h-screen min-h-[100dvh] bg-[#F5E1E6] text-[#4A2E37] flex flex-col antialiased selection:bg-[#E4C1CA]/50 selection:text-[#4E0C22]"
      style={{ minHeight: '100dvh' }}
    >
      
      {/* 1. Global Luxury Matrimonial Navbar */}
      <WebsiteNavbar 
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenLogin={onOpenLogin}
        onOpenRegister={onOpenRegister}
        onOpenEditProfile={onOpenEditProfile}
        onOpenOffers={onOpenOffers}
        offers={offers}
        onOpenNotifications={onOpenNotifications}
        unreadNotificationsCount={unreadNotificationsCount}
        currentUser={currentUser}
        currentScreen={currentScreen}
        onScrollToSection={handleScrollToSection}
        onOpenAadhaarVerification={onOpenAadhaarVerification}
        isProduction={isProduction}
        onToggleProductionMode={onToggleProductionMode}
        onLogout={onLogout}
        onOpenAppModal={onOpenAppModal}
        onOpenServices={onOpenServices}
      />

      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section (Guest View Only - hidden when a Matrimony user is logged in) */}
        {(!currentUser || currentUser.isGuest) && (
          <WebsiteHero 
            onQuickSearch={(filters) => {
              onQuickSearch?.(filters);
              handleScrollToSection('matches-section');
            }}
            onOpenLogin={onOpenLogin}
            onOpenRegister={onOpenRegister}
            onOpenOffers={onOpenOffers}
            offers={offers}
            banners={homepageBanners}
            onSelectProfile={onSelectProfile}
            featuredProfile={featuredProfile}
            onToggleInterest={onToggleInterest}
            onRequestSendInterest={onRequestSendInterest}
            isInterested={interestsSent.includes(featuredProfile?.id)}
            onScrollToSection={handleScrollToSection}
            currentUser={currentUser}
            setViewMode={setViewMode}
            onOpenVendorPortal={onOpenVendorPortal}
            onOpenServices={onOpenServices}
          />
        )}

        {/* 3. Candidate 60-Second Video & Photo Stories Reel (Only visible after login) */}
        {currentUser && (
          <WebsiteStoriesReel 
            profiles={profiles}
            activeStories={activeStories}
            candidateStatuses={candidateStatuses}
            myStatus={myStatus}
            onOpenStatusViewer={onOpenStatusViewer}
            onOpenStatusEditor={onOpenStatusEditor}
            currentUser={currentUser}
          />
        )}

        {/* 4. Curated Match Showcase & Filter Engine */}
        <WebsiteMatchShowcase 
          profiles={profiles}
          interestsSent={interestsSent}
          onToggleInterest={onToggleInterest}
          onRequestSendInterest={onRequestSendInterest}
          shortlisted={shortlisted}
          onToggleShortlist={onToggleShortlist}
          onSelectProfile={onSelectProfile}
          onStartChat={onStartChat}
          onOpenRegister={onOpenRegister}
          onOpenOffers={onOpenOffers}
          externalReligion={selectedReligion}
          onSelectReligion={onSelectReligion}
          externalCity={activeCity}
          onClearExternalCity={() => setActiveCity('')}
          currentUser={currentUser}
          visitorLocation={visitorLocation}
        />

        {/* 8. Festive Vivah Mahotsav 50% Off Membership Plans */}
        <WebsitePricingSection 
          plans={membershipPlans}
          offers={offers}
          currentUser={currentUser}
          onOpenLogin={onOpenLogin}
          onOpenRegister={onOpenRegister}
          onSelectPlanForPayment={onSelectPlanForPayment}
          onOpenOffers={onOpenOffers}
        />

        {/* 9. Real Blessed Marriages Success Stories */}
        <WebsiteSuccessStories />
      </main>

      {/* 10. Comprehensive Footer */}
      <WebsiteFooter 
        onScrollToSection={handleScrollToSection}
        onOpenLogin={onOpenLogin}
        onOpenRegister={onOpenRegister}
        onOpenOffers={onOpenOffers}
        offers={offers}
        currentUser={currentUser}
        onLogout={onLogout}
        selectedReligion={selectedReligion}
        onSelectReligion={(rel) => {
          onSelectReligion?.(rel);
          handleScrollToSection('matches-section');
        }}
        onSelectCity={(city) => {
          setActiveCity(city);
          handleScrollToSection('matches-section');
        }}
      />
    </div>
  );
}
