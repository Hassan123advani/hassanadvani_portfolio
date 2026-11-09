import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ADMIN_PATH } from './lib/config.js';
import PublicLayout from './components/layout/PublicLayout.jsx';
import { PageLoader } from './components/ui/States.jsx';
import Home from './pages/Home.jsx';

const About = lazy(() => import('./pages/About.jsx'));
const Projects = lazy(() => import('./pages/Projects.jsx'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.jsx'));
const Blog = lazy(() => import('./pages/Blog.jsx'));
const BlogPost = lazy(() => import('./pages/BlogPost.jsx'));
const Certificates = lazy(() => import('./pages/Certificates.jsx'));
const Github = lazy(() => import('./pages/Github.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
// The admin bundle is split out and only downloaded when its route is visited.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={`${ADMIN_PATH}/*`} element={<AdminApp />} />
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:slug" element={<ProjectDetail />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="github" element={<Github />} />
          <Route path="services" element={<Services />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
