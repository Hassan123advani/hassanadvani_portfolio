import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { ConfirmProvider, NoAccess, ToastProvider } from './components/Feedback.jsx';
import AdminLayout from './AdminLayout.jsx';
import Login from './pages/Login.jsx';
import { PageLoader, ErrorState } from '../components/ui/States.jsx';
import './admin.css';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Posts = lazy(() => import('./pages/Posts.jsx'));
const PostEditor = lazy(() => import('./pages/PostEditor.jsx'));
const Projects = lazy(() => import('./pages/Projects.jsx'));
const ProjectEditor = lazy(() => import('./pages/ProjectEditor.jsx'));
const Certificates = lazy(() => import('./pages/Certificates.jsx'));
const Testimonials = lazy(() => import('./pages/Testimonials.jsx'));
const Taxonomy = lazy(() => import('./pages/Taxonomy.jsx'));
const Media = lazy(() => import('./pages/Media.jsx'));
const Messages = lazy(() => import('./pages/Messages.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const SeoSettings = lazy(() => import('./pages/SeoSettings.jsx'));
const SiteSettings = lazy(() => import('./pages/SiteSettings.jsx'));
const Admins = lazy(() => import('./pages/Admins.jsx'));
const Activity = lazy(() => import('./pages/Activity.jsx'));
const ChangePassword = lazy(() => import('./pages/ChangePassword.jsx'));

function Guard({ perm, superOnly, children }) {
  const { can, isSuper } = useAuth();
  if (superOnly ? !isSuper : perm && !can(perm)) return <NoAccess />;
  return children;
}

function Gate() {
  const auth = useAuth();
  if (auth.status === 'loading') return <PageLoader />;
  if (auth.status === 'unconfigured' || auth.status === 'signedOut') return <Login />;
  if (auth.status === 'error') {
    return (
      <div className="a-center">
        <ErrorState title="Could not reach the admin API" error={auth.error} onRetry={auth.retry} />
        <button type="button" className="btn btn--text btn--sm" onClick={auth.signOut}>
          Sign out
        </button>
      </div>
    );
  }
  return (
    <AdminLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<Guard perm="blog"><Posts /></Guard>} />
          <Route path="posts/new" element={<Guard perm="blog"><PostEditor /></Guard>} />
          <Route path="posts/:id" element={<Guard perm="blog"><PostEditor /></Guard>} />
          <Route path="projects" element={<Guard perm="projects"><Projects /></Guard>} />
          <Route path="projects/new" element={<Guard perm="projects"><ProjectEditor /></Guard>} />
          <Route path="projects/:id" element={<Guard perm="projects"><ProjectEditor /></Guard>} />
          <Route path="certificates" element={<Guard perm="certificates"><Certificates /></Guard>} />
          <Route path="testimonials" element={<Guard perm="testimonials"><Testimonials /></Guard>} />
          <Route path="taxonomy" element={<Guard perm="taxonomy"><Taxonomy /></Guard>} />
          <Route path="media" element={<Guard perm="media"><Media /></Guard>} />
          <Route path="messages" element={<Guard perm="messages"><Messages /></Guard>} />
          <Route path="profile" element={<Guard perm="profile"><Profile /></Guard>} />
          <Route path="seo" element={<Guard perm="seo"><SeoSettings /></Guard>} />
          <Route path="settings" element={<Guard perm="settings"><SiteSettings /></Guard>} />
          <Route path="admins" element={<Guard superOnly><Admins /></Guard>} />
          <Route path="activity" element={<Guard perm="activity"><Activity /></Guard>} />
          <Route path="account/password" element={<ChangePassword />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}

export default function AdminApp() {
  useEffect(() => {
    document.body.classList.add('is-admin');
    return () => document.body.classList.remove('is-admin');
  }, []);
  return (
    <>
      <Helmet>
        <title>Dashboard</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Helmet>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </>
  );
}
