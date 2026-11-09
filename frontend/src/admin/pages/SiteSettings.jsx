import SettingsForm from '../components/SettingsForm.jsx';

export default function SiteSettings() {
  return (
    <SettingsForm
      settingsKey="site"
      title="Website settings"
      description="Switch sections on or off and change site-wide text."
      sections={[
        {
          title: 'General',
          fields: [
            { name: 'siteTitle', label: 'Site title', max: 120 },
            { name: 'footerNote', label: 'Footer note', max: 200 },
            { name: 'announcement', label: 'Announcement bar', hint: 'Shown at the top of every page when not empty.', max: 200 },
          ],
        },
        {
          title: 'Sections',
          fields: [
            { name: 'contactEnabled', label: 'Accept contact form messages', type: 'toggle', hint: 'When off, the form is replaced with your email address.' },
            { name: 'blogEnabled', label: 'Show the blog', type: 'toggle' },
            { name: 'showGithub', label: 'Show GitHub repositories', type: 'toggle' },
            { name: 'showTestimonials', label: 'Show testimonials', type: 'toggle' },
            { name: 'postsPerPage', label: 'Articles per page', type: 'number', min: 3, max: 30 },
          ],
        },
      ]}
    />
  );
}
