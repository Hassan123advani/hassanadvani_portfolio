import CollectionManager from '../components/CollectionManager.jsx';

const STATUS = [
  ['published', 'Published'],
  ['draft', 'Draft (hidden)'],
];

export default function Certificates() {
  return (
    <CollectionManager
      endpoint="/certificates"
      title="Certificates"
      description="Certificates shown in the public gallery. Professional certificates are featured at the top."
      noun="certificate"
      imageKey="image"
      sort={(a, b) => (a.order ?? 0) - (b.order ?? 0)}
      blank={{ title: '', issuer: '', platform: '', kind: 'course', issuedOn: '', description: '', image: null, credentialUrl: '', courses: [], order: 0, status: 'published' }}
      columns={[
        { label: 'Certificate', render: (c) => c.title },
        { label: 'Issuer', render: (c) => [c.issuer, c.platform].filter(Boolean).join(' · '), className: 'hide-sm' },
        { label: 'Issued', render: (c) => c.issuedOn, className: 'hide-sm' },
        { label: 'Status', status: true, render: () => null },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true, max: 200 },
        { name: 'issuer', label: 'Issuer', placeholder: 'e.g. Google', max: 120 },
        { name: 'platform', label: 'Platform', placeholder: 'e.g. Coursera', max: 120 },
        { name: 'kind', label: 'Type', type: 'select', options: [['course', 'Course certificate'], ['professional', 'Professional certificate (featured)'], ['other', 'Other']] },
        { name: 'issuedOn', label: 'Issued on', placeholder: 'e.g. Dec 27, 2024', max: 40 },
        { name: 'image', label: 'Certificate image', type: 'image', folder: 'certificates' },
        { name: 'credentialUrl', label: 'Verification URL', type: 'url', placeholder: 'https://coursera.org/verify/…' },
        { name: 'description', label: 'Description', type: 'textarea', max: 2000 },
        { name: 'courses', label: 'Included courses', type: 'tags', hint: 'For professional certificates — press Enter after each course.', maxItems: 30 },
        { name: 'order', label: 'Sort order', type: 'number', min: 0, max: 10000 },
        { name: 'status', label: 'Visibility', type: 'select', options: STATUS },
      ]}
    />
  );
}
