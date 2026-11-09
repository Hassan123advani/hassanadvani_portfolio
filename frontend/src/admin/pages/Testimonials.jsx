import CollectionManager from '../components/CollectionManager.jsx';

export default function Testimonials() {
  return (
    <>
      <CollectionManager
        endpoint="/testimonials"
        title="Testimonials"
        description="Only add real feedback, with the person’s permission. The section stays hidden on the site until at least one testimonial is published."
        noun="testimonial"
        imageKey="avatar"
        sort={(a, b) => (a.order ?? 0) - (b.order ?? 0)}
        blank={{ name: '', role: '', company: '', quote: '', avatar: null, link: '', order: 0, status: 'draft' }}
        columns={[
          { label: 'Person', render: (t) => t.name },
          { label: 'Quote', render: (t) => `${t.quote.slice(0, 80)}${t.quote.length > 80 ? '…' : ''}`, className: 'hide-sm' },
          { label: 'Status', status: true, render: () => null },
        ]}
        fields={[
          { name: 'name', label: 'Name', required: true, max: 100 },
          { name: 'role', label: 'Role', max: 100 },
          { name: 'company', label: 'Company / organisation', max: 100 },
          { name: 'quote', label: 'Testimonial', type: 'textarea', max: 1200, counter: 400 },
          { name: 'avatar', label: 'Photo (optional)', type: 'image', folder: 'media' },
          { name: 'link', label: 'Profile link (optional)', type: 'url' },
          { name: 'order', label: 'Sort order', type: 'number', min: 0, max: 10000 },
          { name: 'status', label: 'Visibility', type: 'select', options: [['draft', 'Draft (hidden)'], ['published', 'Published']] },
        ]}
      />
    </>
  );
}
