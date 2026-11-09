import SettingsForm from '../components/SettingsForm.jsx';
import { FormFields, TextField } from '../components/Fields.jsx';
import { youtubeId } from '../../lib/format.js';

const SECTIONS = [
  {
    title: 'Basics',
    fields: [
      { name: 'name', label: 'Full name', required: true, max: 120 },
      { name: 'shortName', label: 'Short name', hint: 'Used in greetings and the logo.', max: 60 },
      { name: 'headline', label: 'Headline', max: 200 },
      { name: 'tagline', label: 'Tagline', max: 200 },
      { name: 'intro', label: 'Hero introduction', type: 'textarea', max: 600, counter: 300 },
      { name: 'location', label: 'Location', max: 120 },
      { name: 'email', label: 'Public email', type: 'email' },
      { name: 'availability', label: 'Availability line', max: 160 },
    ],
  },
  {
    title: 'Photo & résumé',
    fields: [
      { name: 'avatar', label: 'Profile photo', type: 'image', folder: 'profile' },
      { name: 'resume', label: 'Résumé (PDF)', type: 'file', folder: 'resume', hint: 'When set, “Download résumé” buttons appear on the site.' },
    ],
  },
  {
    title: 'About me',
    fields: [{ name: 'bio', label: 'Bio paragraphs', type: 'list', simple: true, maxItems: 10 }],
  },
  {
    title: 'Links & highlights',
    fields: [
      { name: 'socials', label: 'Social links', type: 'list', itemTitle: (s) => s.label, newItem: { label: '', url: '' }, fields: [{ name: 'label', label: 'Label' }, { name: 'url', label: 'URL (https:// or mailto:)' }] },
      { name: 'stats', label: 'Stats', type: 'list', maxItems: 6, itemTitle: (s) => `${s.value} — ${s.label}`, newItem: { value: '', label: '' }, fields: [{ name: 'value', label: 'Value', max: 20 }, { name: 'label', label: 'Label', max: 60 }] },
    ],
  },
  {
    title: 'Skills',
    description: 'Levels are optional self-assessments (0–100).',
    fields: [
      {
        name: 'skills',
        label: 'Skill groups',
        type: 'list',
        itemTitle: (g) => g.group,
        newItem: { group: '', items: [] },
        fields: [
          { name: 'group', label: 'Group name', max: 60 },
          { name: 'items', label: 'Skills', type: 'list', maxItems: 20, itemTitle: (s) => `${s.name}${typeof s.level === 'number' ? ` · ${s.level}%` : ''}`, newItem: { name: '', level: 50 }, fields: [{ name: 'name', label: 'Skill' }, { name: 'level', label: 'Level (0–100)', type: 'number', min: 0, max: 100 }] },
        ],
      },
    ],
  },
  {
    title: 'Education & experience',
    fields: [
      {
        name: 'education',
        label: 'Education',
        type: 'list',
        itemTitle: (e) => `${e.credential || ''} — ${e.institution}`,
        newItem: { institution: '', credential: '', period: '', status: '', description: '' },
        fields: [
          { name: 'institution', label: 'Institution' },
          { name: 'credential', label: 'Degree / credential' },
          { name: 'period', label: 'Period', placeholder: '2026 — 2030' },
          { name: 'status', label: 'Status', placeholder: 'In progress / Completed' },
          { name: 'description', label: 'Description', type: 'textarea' },
        ],
      },
      {
        name: 'experience',
        label: 'Experience',
        type: 'list',
        hint: 'Only add real roles. While empty, the site shows an honest “no professional roles yet” message.',
        itemTitle: (x) => `${x.role}${x.organization ? ` @ ${x.organization}` : ''}`,
        newItem: { role: '', organization: '', period: '', location: '', description: '' },
        fields: [
          { name: 'role', label: 'Role' },
          { name: 'organization', label: 'Organisation' },
          { name: 'period', label: 'Period' },
          { name: 'location', label: 'Location' },
          { name: 'description', label: 'Description', type: 'textarea' },
        ],
      },
    ],
  },
  {
    title: 'Services (Hire me)',
    fields: [
      {
        name: 'services',
        label: 'Services',
        type: 'list',
        itemTitle: (s) => s.title,
        newItem: { title: '', description: '', deliverables: [] },
        fields: [
          { name: 'title', label: 'Title' },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'deliverables', label: 'Deliverables', type: 'tags', maxItems: 10 },
        ],
      },
    ],
  },
  {
    title: 'Learning & subjects',
    fields: [
      { name: 'learning', label: 'Currently learning', type: 'list', itemTitle: (l) => `${l.title} (${l.status})`, newItem: { title: '', status: 'In progress' }, fields: [{ name: 'title', label: 'Topic' }, { name: 'status', label: 'Status' }] },
      { name: 'subjects', label: 'Degree subjects', type: 'list', maxItems: 24, itemTitle: (s) => s.title, newItem: { title: '', description: '' }, fields: [{ name: 'title', label: 'Subject' }, { name: 'description', label: 'Short description' }] },
    ],
  },
];

const VIDEO_PATH_HINT = 'Full https:// URL (e.g. Cloudinary) or a file shipped with the site, e.g. /video/intro-en.mp4';

function VideoEditor({ value, setValue }) {
  const v = value.video || {};
  const set = (patch) => setValue({ ...value, video: { ...v, ...patch } });
  return (
    <section className="a-card a-form-section">
      <header className="a-card__head">
        <div>
          <h2>Introduction video</h2>
          <p className="muted small">
            Plays muted when visitors scroll to it (never with sound), with captions and a tap-for-sound button. The current video was built with
            <code> scripts/video</code> (see docs/VIDEO_PRODUCTION_PLAN.md).
          </p>
        </div>
      </header>
      <div className="field">
        <label htmlFor="v-prov">Source</label>
        <select id="v-prov" value={v.provider || 'none'} onChange={(e) => set({ provider: e.target.value })}>
          <option value="none">None (shows an “in production” card)</option>
          <option value="file">Video file hosted with the site (/video/…)</option>
          <option value="cloudinary">Uploaded video (Cloudinary, max 100 MB)</option>
          <option value="youtube">YouTube</option>
        </select>
      </div>
      {v.provider === 'youtube' && (
        <TextField label="YouTube URL or video ID" value={v.youtubeId} onChange={(x) => set({ youtubeId: youtubeId(x) || x })} hint={v.youtubeId && !youtubeId(v.youtubeId) ? 'This is not a valid YouTube link yet.' : 'Paste the full link — the ID is extracted automatically.'} />
      )}
      {v.provider === 'cloudinary' && (
        <FormFields
          fields={[
            { name: 'file', label: 'Video file (MP4 with the voice-over audio track)', type: 'video', folder: 'video' },
            { name: 'captions', label: 'Captions (.vtt)', type: 'file', folder: 'video', hint: 'WebVTT subtitles shown by default on the player.' },
          ]}
          value={{ file: v.url ? { url: v.url, resourceType: 'video' } : null, captions: v.captionsUrl ? { url: v.captionsUrl, resourceType: 'raw' } : null }}
          onChange={(x) => set({ url: x.file?.url || '', captionsUrl: x.captions?.url || '' })}
        />
      )}
      {(v.provider === 'file' || v.provider === 'cloudinary') && (
        <>
          {v.provider === 'file' && (
            <>
              <TextField label="Video URL / path" value={v.url} onChange={(x) => set({ url: x.trim() })} hint={VIDEO_PATH_HINT} />
              <TextField label="Captions URL / path (.vtt)" value={v.captionsUrl} onChange={(x) => set({ captionsUrl: x.trim() })} hint="e.g. /video/intro-en.en.vtt" />
            </>
          )}
          <FormFields
            fields={[
              {
                name: 'versions',
                label: 'Language versions',
                type: 'list',
                maxItems: 4,
                hint: 'Optional. With two or more, visitors get a language switch (e.g. English / اردو). The first one plays by default.',
                itemTitle: (x) => `${x.label} — ${x.url}`,
                newItem: { label: '', lang: '', url: '', captionsUrl: '' },
                fields: [
                  { name: 'label', label: 'Button label', max: 30 },
                  { name: 'lang', label: 'Language code (en, ur…)', max: 10 },
                  { name: 'url', label: 'Video URL / path', hint: VIDEO_PATH_HINT },
                  { name: 'captionsUrl', label: 'Captions URL / path (.vtt)' },
                ],
              },
            ]}
            value={v}
            onChange={(x) => set({ versions: x.versions })}
          />
        </>
      )}
      <FormFieldsCommon v={v} set={set} />
    </section>
  );
}

// Small wrapper so the nested video object can reuse FormFields.
const FormFieldsCommon = ({ v, set }) => (
  <FormFields
    fields={[
      { name: 'poster', label: 'Thumbnail / poster image', type: 'image', folder: 'video' },
      { name: 'title', label: 'Title', max: 150 },
      { name: 'description', label: 'Description', type: 'textarea', max: 600 },
      { name: 'chapters', label: 'Chapters', type: 'list', maxItems: 20, itemTitle: (c) => `${c.time} ${c.label}`, newItem: { time: '0:00', label: '' }, fields: [{ name: 'time', label: 'Time (m:ss)', max: 10 }, { name: 'label', label: 'Label', max: 80 }] },
    ]}
    value={v}
    onChange={(x) => set(x)}
  />
);

export default function Profile() {
  return (
    <SettingsForm settingsKey="profile" title="Profile & résumé" description="Everything about you shown across the website: bio, skills, education, services and the intro video." sections={SECTIONS}>
      {(value, setValue) => <VideoEditor value={value} setValue={setValue} />}
    </SettingsForm>
  );
}
