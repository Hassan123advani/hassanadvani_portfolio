import { useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Icon from '../../components/ui/Icon.jsx';
import { Modal, useToast } from './Feedback.jsx';
import { LibraryModal } from './MediaField.jsx';
import { useAuth } from '../AuthContext.jsx';
import { LIMITS, uploadFile } from '../lib/upload.js';
import { youtubeId } from '../../lib/format.js';

/** A caption paragraph (rendered as <p class="caption">) for images and videos. */
const Caption = Node.create({
  name: 'caption',
  group: 'block',
  content: 'inline*',
  priority: 1100,
  parseHTML: () => [{ tag: 'p.caption' }],
  renderHTML: ({ HTMLAttributes }) => ['p', mergeAttributes(HTMLAttributes, { class: 'caption' }), 0],
  addCommands() {
    return { toggleCaption: () => ({ commands }) => commands.toggleNode(this.name, 'paragraph') };
  },
});

const Btn = ({ onClick, active, label, children, disabled }) => (
  <button type="button" className={`rte__btn ${active ? 'is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={onClick} aria-label={label} title={label} aria-pressed={active} disabled={disabled}>
    {children}
  </button>
);

function InsertDialog({ kind, onClose, onSubmit }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const conf = {
    link: { title: 'Insert link', a: 'URL (https://…)', b: null },
    youtube: { title: 'Embed YouTube video', a: 'YouTube URL or video ID', b: 'Caption (optional)' },
    image: { title: 'Insert image from URL', a: 'Image URL (https://…)', b: 'Alt text' },
  }[kind];
  return (
    <Modal
      title={conf.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onSubmit(a.trim(), b.trim())}>
            Insert
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="rte-a">{conf.a}</label>
        <input id="rte-a" value={a} onChange={(e) => setA(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSubmit(a.trim(), b.trim())} />
      </div>
      {conf.b && (
        <div className="field">
          <label htmlFor="rte-b">{conf.b}</label>
          <input id="rte-b" value={b} onChange={(e) => setB(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}

export default function RichEditor({ value, onChange, folder = 'posts', placeholder = 'Start writing…' }) {
  const { integrations } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [dialog, setDialog] = useState(null);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Caption,
      Link.configure({ openOnClick: false, autolink: true, protocols: ['https', 'http', 'mailto'] }),
      Image.configure({ inline: false }),
      Youtube.configure({ nocookie: true, width: 640, height: 360, controls: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });

  if (!editor) return <div className="rte rte--loading" />;

  const chain = () => editor.chain().focus();
  const insertCaption = (text) => text && chain().insertContent({ type: 'caption', content: [{ type: 'text', text }] }).run();

  function submitDialog(a, b) {
    if (dialog === 'link') {
      if (!a) chain().unsetLink().run();
      else if (!/^(https?:|mailto:)/i.test(a)) return toast.error('Links must start with https://, http:// or mailto:');
      else chain().extendMarkRange('link').setLink({ href: a }).run();
    }
    if (dialog === 'youtube') {
      const id = youtubeId(a);
      if (!id) return toast.error('That doesn’t look like a YouTube link.');
      chain().setYoutubeVideo({ src: `https://www.youtube.com/watch?v=${id}` }).run();
      insertCaption(b);
    }
    if (dialog === 'image') {
      if (!/^https?:\/\//i.test(a)) return toast.error('Enter a full https:// image URL.');
      chain().setImage({ src: a, alt: b }).run();
    }
    setDialog(null);
    return undefined;
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const item = await uploadFile(file, folder);
      chain().setImage({ src: item.url, alt: item.alt || '' }).run();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  const is = (n, a) => editor.isActive(n, a);
  const words = editor.getText().split(/\s+/).filter(Boolean).length;

  return (
    <div className="rte">
      <div className="rte__toolbar" role="toolbar" aria-label="Formatting">
        <select
          className="rte__select"
          aria-label="Block type"
          value={is('heading', { level: 2 }) ? 'h2' : is('heading', { level: 3 }) ? 'h3' : is('heading', { level: 4 }) ? 'h4' : is('caption') ? 'caption' : 'p'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') chain().setParagraph().run();
            else if (v === 'caption') chain().toggleCaption().run();
            else chain().toggleHeading({ level: Number(v[1]) }).run();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="caption">Caption</option>
        </select>
        <span className="rte__sep" />
        <Btn label="Bold" active={is('bold')} onClick={() => chain().toggleBold().run()}>
          <b>B</b>
        </Btn>
        <Btn label="Italic" active={is('italic')} onClick={() => chain().toggleItalic().run()}>
          <i>I</i>
        </Btn>
        <Btn label="Underline" active={is('underline')} onClick={() => chain().toggleUnderline().run()}>
          <u>U</u>
        </Btn>
        <Btn label="Strikethrough" active={is('strike')} onClick={() => chain().toggleStrike().run()}>
          <s>S</s>
        </Btn>
        <Btn label="Inline code" active={is('code')} onClick={() => chain().toggleCode().run()}>
          <Icon name="code" size={15} />
        </Btn>
        <span className="rte__sep" />
        <Btn label="Bulleted list" active={is('bulletList')} onClick={() => chain().toggleBulletList().run()}>
          •≡
        </Btn>
        <Btn label="Numbered list" active={is('orderedList')} onClick={() => chain().toggleOrderedList().run()}>
          1≡
        </Btn>
        <Btn label="Quote" active={is('blockquote')} onClick={() => chain().toggleBlockquote().run()}>
          <Icon name="quote" size={15} />
        </Btn>
        <Btn label="Code block" active={is('codeBlock')} onClick={() => chain().toggleCodeBlock().run()}>
          {'{ }'}
        </Btn>
        <Btn label="Divider" onClick={() => chain().setHorizontalRule().run()}>
          —
        </Btn>
        <span className="rte__sep" />
        <Btn label="Link" active={is('link')} onClick={() => setDialog('link')}>
          <Icon name="link" size={15} />
        </Btn>
        {integrations?.cloudinary ? (
          <>
            <Btn label={uploading ? 'Uploading…' : 'Upload image'} disabled={uploading} onClick={() => fileRef.current.click()}>
              <Icon name="upload" size={15} />
            </Btn>
            <Btn label="Image from library" onClick={() => setPicking(true)}>
              <Icon name="image" size={15} />
            </Btn>
          </>
        ) : (
          <Btn label="Image from URL" onClick={() => setDialog('image')}>
            <Icon name="image" size={15} />
          </Btn>
        )}
        <Btn label="Embed YouTube video" onClick={() => setDialog('youtube')}>
          <Icon name="youtube" size={15} />
        </Btn>
        <span className="rte__sep" />
        <Btn label="Undo" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
          ↶
        </Btn>
        <Btn label="Redo" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
          ↷
        </Btn>
      </div>
      <EditorContent editor={editor} className="rte__content prose" />
      <div className="rte__foot mono">
        {words} words · ~{Math.max(1, Math.round(words / 220))} min read
      </div>
      <input ref={fileRef} type="file" hidden accept={LIMITS.image.accept} onChange={onFile} />
      {dialog && <InsertDialog kind={dialog} onClose={() => setDialog(null)} onSubmit={submitDialog} />}
      {picking && (
        <LibraryModal
          folder={folder}
          onClose={() => setPicking(false)}
          onPick={(m) => {
            chain().setImage({ src: m.url, alt: m.alt || '' }).run();
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}
