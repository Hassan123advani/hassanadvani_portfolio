import CollectionManager from '../components/CollectionManager.jsx';
import { PageHeader } from '../components/Feedback.jsx';

export default function Taxonomy() {
  return (
    <>
      <PageHeader title="Categories & tags" description="Suggestions offered in the post and project editors. Content can still use any category or tag." />
      <div className="a-grid-2">
        <section>
          <CollectionManager
            header={false}
            endpoint="/categories"
            title="Categories"
            noun="category"
            sort={(a, b) => a.name.localeCompare(b.name)}
            blank={{ name: '', slug: '', description: '', scope: 'both' }}
            columns={[
              { label: 'Name', render: (c) => c.name },
              { label: 'Used for', render: (c) => ({ both: 'Posts & projects', post: 'Posts', project: 'Projects' })[c.scope] },
            ]}
            fields={[
              { name: 'name', label: 'Name', required: true, max: 80 },
              { name: 'slug', label: 'Slug (optional)', max: 100 },
              { name: 'description', label: 'Description', type: 'textarea', max: 300 },
              { name: 'scope', label: 'Used for', type: 'select', options: [['both', 'Posts & projects'], ['post', 'Posts only'], ['project', 'Projects only']] },
            ]}
          />
        </section>
        <section>
          <CollectionManager
            header={false}
            endpoint="/tags"
            title="Tags"
            noun="tag"
            sort={(a, b) => a.name.localeCompare(b.name)}
            blank={{ name: '', slug: '' }}
            columns={[
              { label: 'Name', render: (t) => `#${t.name}` },
              { label: 'Slug', render: (t) => t.slug, className: 'mono small' },
            ]}
            fields={[
              { name: 'name', label: 'Name', required: true, max: 50 },
              { name: 'slug', label: 'Slug (optional)', max: 60 },
            ]}
          />
        </section>
      </div>
    </>
  );
}
