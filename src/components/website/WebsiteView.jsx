import React, { useState, useMemo } from 'react';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteHero from './WebsiteHero';
import WebsiteStoriesReel from './WebsiteStoriesReel';
import WebsiteMatchShowcase from './WebsiteMatchShowcase';
import WebsitePillarsOfTrust from './WebsitePillarsOfTrust';
import WebsiteAppShowcase from './WebsiteAppShowcase';
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
  shortlisted,
  onToggleShortlist,
  onSelectProfile,
  onStartChat,
  onOpenLogin,
  onOpenRegister,
  onOpenOffers,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  candidateStatuses,
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
  onLogout,
  onOpenAppModal
}) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeCity, setActiveCity] = useState('');

  // Featured Profile for Hero Card (Strict opposite gender of logged-in user or bride by default)
  const featuredProfile = useMemo(() => {
    const targetGender = getTargetCandidateGender(currentUser);
    return profiles.find(p => isCandidateMatchingTarget(p.gender, targetGender)) || profiles[0];
  }, [profiles, currentUser]);

  const handleScrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll to top
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Monitor scroll position
  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="website-view-root min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-[#DFB76C]/30 selection:text-[#0B192C]">
      
      {/* 1. Global Luxury Matrimonial Navbar */}
      <WebsiteNavbar 
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenLogin={onOpenLogin}
        onOpenRegister={onOpenRegister}
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
      />

      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section with Quick Match Finder & Featured Profile */}
        <WebsiteHero 
          onQuickSearch={(filters) => {
            onQuickSearch?.(filters);
            handleScrollToSection('matches-section');
          }}
          onOpenLogin={onOpenLogin}
          onOpenRegister={onOpenRegister}
          onOpenOffers={onOpenOffers}
          onSelectProfile={onSelectProfile}
          featuredProfile={featuredProfile}
          onToggleInterest={onToggleInterest}
          isInterested={interestsSent.includes(featuredProfile?.id)}
          onScrollToSection={handleScrollToSection}
          currentUser={currentUser}
          setViewMode={setViewMode}
        />

        {/* 3. Candidate 60-Second Video & Photo Stories Reel (Only visible after login) */}
        {currentUser && (
          <WebsiteStoriesReel 
            profiles={profiles}
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
        />

        {/* 5. The 4 Pillars of Matrimonial Trust */}
        <WebsitePillarsOfTrust />

        {/* 7. Mobile App Interactive Showcase & APK Download */}
        <WebsiteAppShowcase 
          onSwitchToAppMode={() => {
            if (onOpenAppModal) {
              onOpenAppModal();
            } else {
              setViewMode('app');
            }
          }}
        />

        {/* 8. Festive Vivah Mahotsav 50% Off Membership Plans */}
        <WebsitePricingSection 
          plans={membershipPlans}
          offers={offers}
          currentUser={currentUser}
          onOpenLogin={onOpenLogin}
          onOpenRegister={onOpenRegister}
          onSelectPlanForPayment={onSelectPlanForPayment}
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
