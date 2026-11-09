import SettingsForm from '../components/SettingsForm.jsx';

export default function SeoSettings() {
  return (
    <SettingsForm
      settingsKey="seo"
      title="SEO settings"
      description="Defaults used for search engines and social sharing. Articles and projects can override title and description individually."
      sections={[
        {
          title: 'Search',
          fields: [
            { name: 'defaultTitle', label: 'Default page title', max: 120, counter: 60 },
            { name: 'titleTemplate', label: 'Title template', hint: '%s is replaced by the page title, e.g. “%s · Hassan Advani”.', max: 120 },
            { name: 'description', label: 'Default meta description', type: 'textarea', max: 300, counter: 160 },
            { name: 'keywords', label: 'Keywords', type: 'tags', maxItems: 30 },
            { name: 'siteUrl', label: 'Canonical site URL', type: 'url' },
          ],
        },
        {
          title: 'Social sharing',
          fields: [
            { name: 'ogImage', label: 'Default share image', type: 'image', folder: 'media', hint: '1200×630 recommended.' },
            { name: 'twitterHandle', label: 'X / Twitter handle', placeholder: '@handle', max: 40 },
          ],
        },
      ]}
    />
  );
}
