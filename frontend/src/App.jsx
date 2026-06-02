import { Navigate, Route, Routes, useLocation } from "react-router";
import { useEffect } from "react";

import HomePage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import CallPage from "./pages/CallPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import OnboardingInterestsPage from "./pages/OnboardingInterestsPage.jsx";
import ExplorePage from "./pages/ExplorePage.jsx";
import HashtagPage from "./pages/HashtagPage.jsx";
import LanguageGroupPage from "./pages/LanguageGroupPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import BanPage from "./pages/BanPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import DocsPage from "./pages/DocsPage.jsx";
import BotPage from "./pages/BotPage.jsx";

import { Toaster } from "react-hot-toast";

import PageLoader from "./components/PageLoader.jsx";
import Layout from "./components/Layout.jsx";
import CallProvider from "./components/CallProvider.jsx";
import LiveNotificationToasts from "./components/LiveNotificationToasts.jsx";

import useAuthUser from "./hooks/useAuthUser.js";
import { useThemeStore } from "./store/useThemeStore.js";

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme, hydrateThemeForUser } = useThemeStore();
  const location = useLocation();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;
  const isBanned = Boolean(authUser?.activeBan);
  const isEmailVerified = authUser?.emailVerified !== false;
  const hasInterests = Boolean(
    authUser?.interests?.length || authUser?.algorithmProfile?.selectedInterests?.length
  );
  const skippedInterests = authUser?._id
    ? window.localStorage.getItem(`bettermedia-skip-interests:${authUser._id}`) === "true"
    : false;

  useEffect(() => {
    hydrateThemeForUser(authUser);
  }, [authUser, hydrateThemeForUser]);

  if (isLoading) return <PageLoader />;

  const protectedPage = (
    children,
    { showSidebar = true, adminOnly = false } = {}
  ) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }

    if (isBanned) return <Navigate to="/ban" />;
    if (!isOnboarded) return <Navigate to="/onboarding" />;
    if (!isEmailVerified) return <VerifyEmailPage />;
    if (
      !adminOnly &&
      !hasInterests &&
      !skippedInterests &&
      location.pathname !== "/onboarding/interests"
    ) {
      return <Navigate to="/onboarding/interests" />;
    }
    if (adminOnly && !authUser?.isAdmin) return <Navigate to="/" />;

    return showSidebar ? <Layout showSidebar={true}>{children}</Layout> : children;
  };

  return (
    <div className="min-h-screen bg-base-100" data-theme={theme}>
      <CallProvider
        authUser={authUser}
        enabled={isAuthenticated && isOnboarded && !isBanned}
      >
        <LiveNotificationToasts
          authUser={authUser}
          enabled={isAuthenticated && isOnboarded && !isBanned && isEmailVerified}
        />

        <Routes>
          {/* Public pages */}
          <Route path="/docs" element={<DocsPage />} />

          <Route
            path="/signup"
            element={
              !isAuthenticated ? (
                <SignUpPage />
              ) : (
                <Navigate
                  to={isBanned ? "/ban" : isOnboarded ? "/" : "/onboarding"}
                />
              )
            }
          />

          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <LoginPage />
              ) : (
                <Navigate
                  to={isBanned ? "/ban" : isOnboarded ? "/" : "/onboarding"}
                />
              )
            }
          />

          <Route
            path="/forgot-password"
            element={
              !isAuthenticated ? (
                <ForgotPasswordPage />
              ) : (
                <Navigate
                  to={isBanned ? "/ban" : isOnboarded ? "/" : "/onboarding"}
                />
              )
            }
          />

          {/* Protected pages */}
          <Route path="/" element={protectedPage(<HomePage />)} />

          <Route
            path="/ban"
            element={
              isAuthenticated ? (
                isBanned ? (
                  <BanPage />
                ) : (
                  <Navigate to={isOnboarded ? "/" : "/onboarding"} />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route path="/messages" element={protectedPage(<MessagesPage />)} />
          <Route path="/explore" element={protectedPage(<ExplorePage />)} />
          <Route path="/hashtag/:tag" element={protectedPage(<HashtagPage />)} />
          <Route path="/language-groups/:slug" element={protectedPage(<LanguageGroupPage />)} />
          <Route path="/settings" element={protectedPage(<SettingsPage />)} />
          <Route path="/profile/:id" element={protectedPage(<ProfilePage />)} />
          <Route path="/bot" element={protectedPage(<BotPage />)} />
          <Route path="/notifications" element={protectedPage(<NotificationsPage />)} />

          <Route
            path="/admin"
            element={protectedPage(<AdminPage />, { adminOnly: true })}
          />

          <Route
            path="/debug"
            element={authUser?.isAdmin ? <Navigate to="/admin" /> : <Navigate to="/" />}
          />

          <Route path="/friends" element={<Navigate to="/explore" />} />

          <Route
            path="/call/:id"
            element={protectedPage(<CallPage />, { showSidebar: false })}
          />

          <Route
            path="/chat/:id"
            element={protectedPage(
              <Layout showSidebar={false}>
                <ChatPage />
              </Layout>,
              { showSidebar: false }
            )}
          />

          <Route
            path="/onboarding/interests"
            element={
              isAuthenticated ? (
                isBanned ? (
                  <Navigate to="/ban" />
                ) : !isOnboarded ? (
                  <Navigate to="/onboarding" />
                ) : !isEmailVerified ? (
                  <VerifyEmailPage />
                ) : (
                  <OnboardingInterestsPage />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route
            path="/onboarding"
            element={
              isAuthenticated ? (
                isBanned ? (
                  <Navigate to="/ban" />
                ) : !isOnboarded ? (
                  <OnboardingPage />
                ) : (
                  <Navigate to="/" />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </CallProvider>

      <Toaster toastOptions={{ duration: 3500 }} />
    </div>
  );
};

export default App;
