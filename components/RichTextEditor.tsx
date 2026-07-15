'use client';

import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { Underline } from '@tiptap/extension-underline';
import { Youtube } from '@tiptap/extension-youtube';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useCallback, useState } from 'react';
import {
  FiBold,
  FiCode,
  FiGrid,
  FiImage,
  FiItalic,
  FiLink,
  FiList,
  FiMinus,
  FiRotateCcw,
  FiRotateCw,
  FiTrash2,
  FiUnderline,
  FiYoutube,
} from 'react-icons/fi';
import {
  MdFormatClear,
  MdFormatListNumbered,
  MdFormatQuote,
} from 'react-icons/md';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  required?: boolean;
}

// ── Toolbar Button ────────────────────────────────────────────────────────────
function ToolBtn({
  onClick,
  active,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center w-8 h-8 rounded transition-all cursor-pointer select-none text-sm
        ${
          active
            ? 'bg-[#E61C24] text-white'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
        }
        ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}
      `}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className='h-5 w-px bg-zinc-700/60 mx-0.5 shrink-0' />;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write content here...',
  rows = 8,
  label,
  required = false,
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {},
        orderedList: {},
        blockquote: {},
        codeBlock: {},
        horizontalRule: {},
        // Disable extensions we configure separately below
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Youtube.configure({ controls: true, nocookie: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor outline-none',
        'data-placeholder': placeholder,
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .setLink({
          href: linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`,
        })
        .run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const applyImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setShowImageInput(false);
    setImageUrl('');
  }, [editor, imageUrl]);

  const applyYoutube = useCallback(() => {
    if (!editor || !youtubeUrl) return;
    editor.commands.setYoutubeVideo({ src: youtubeUrl });
    setShowYoutubeInput(false);
    setYoutubeUrl('');
  }, [editor, youtubeUrl]);

  const minHeight = rows * 26 + 32;

  return (
    <div className='flex flex-col gap-2'>
      {label && (
        <label className='text-base font-bold text-zinc-300 flex items-center gap-1.5'>
          <span>{label}</span>
          {required && <span className='text-red-400'>*</span>}
        </label>
      )}

      <div className='border border-zinc-800 rounded-lg overflow-hidden bg-[#070b16] focus-within:border-[#E61C24]/60 transition-colors'>
        {/* ── Toolbar ── */}
        <div className='bg-[#0e1422] border-b border-zinc-800 px-3 py-2 flex flex-wrap items-center gap-1'>
          {/* History */}
          <ToolBtn
            onClick={() => editor?.chain().focus().undo().run()}
            title='Undo'
            disabled={!editor?.can().undo()}
          >
            <FiRotateCcw size={14} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor?.chain().focus().redo().run()}
            title='Redo'
            disabled={!editor?.can().redo()}
          >
            <FiRotateCw size={14} />
          </ToolBtn>

          <Divider />

          {/* Headings */}
          {([1, 2, 3] as const).map((level) => (
            <ToolBtn
              key={level}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level }).run()
              }
              active={editor?.isActive('heading', { level })}
              title={`Heading ${level}`}
            >
              <span className='font-bold text-xs leading-none'>H{level}</span>
            </ToolBtn>
          ))}

          <Divider />

          {/* Inline marks */}
          <ToolBtn
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold')}
            title='Bold'
          >
            <FiBold size={14} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic')}
            title='Italic'
          >
            <FiItalic size={14} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive('underline')}
            title='Underline'
          >
            <FiUnderline size={14} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor?.chain().focus().toggleCode().run()}
            active={editor?.isActive('code')}
            title='Inline Code'
          >
            <FiCode size={14} />
          </ToolBtn>

          <Divider />

          {/* Lists */}
          <ToolBtn
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList')}
            title='Bullet List'
          >
            <FiList size={14} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList')}
            title='Ordered List'
          >
            <MdFormatListNumbered size={15} />
          </ToolBtn>

          <Divider />

          {/* Block elements */}
          <ToolBtn
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive('blockquote')}
            title='Blockquote'
          >
            <MdFormatQuote size={16} />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            active={editor?.isActive('codeBlock')}
            title='Code Block'
          >
            <span className='font-mono text-xs font-bold leading-none'>
              {'<>'}
            </span>
          </ToolBtn>
          <ToolBtn
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            title='Horizontal Divider'
          >
            <FiMinus size={14} />
          </ToolBtn>

          <Divider />

          {/* Link */}
          <div className='relative'>
            <ToolBtn
              onClick={() => {
                setShowLinkInput((v) => !v);
                setShowImageInput(false);
                setShowYoutubeInput(false);
              }}
              active={editor?.isActive('link') || showLinkInput}
              title='Insert Link'
            >
              <FiLink size={14} />
            </ToolBtn>
            {showLinkInput && (
              <div className='absolute top-10 left-0 z-50 bg-[#0e1422] border border-zinc-700 rounded-lg p-3 flex gap-2 shadow-xl min-w-64'>
                <input
                  autoFocus
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                  placeholder='https://example.com'
                  className='flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-base text-white outline-none focus:border-[#E61C24]/60 placeholder-zinc-600'
                />
                <button
                  type='button'
                  onClick={applyLink}
                  className='px-3 py-1.5 bg-[#E61C24] text-white rounded text-sm font-bold hover:bg-[#4f4fdd] transition-colors cursor-pointer'
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Image URL */}
          <div className='relative'>
            <ToolBtn
              onClick={() => {
                setShowImageInput((v) => !v);
                setShowLinkInput(false);
                setShowYoutubeInput(false);
              }}
              active={showImageInput}
              title='Embed Image URL'
            >
              <FiImage size={14} />
            </ToolBtn>
            {showImageInput && (
              <div className='absolute top-10 left-0 z-50 bg-[#0e1422] border border-zinc-700 rounded-lg p-3 flex gap-2 shadow-xl min-w-72'>
                <input
                  autoFocus
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyImage()}
                  placeholder='https://example.com/image.png'
                  className='flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-base text-white outline-none focus:border-[#E61C24]/60 placeholder-zinc-600'
                />
                <button
                  type='button'
                  onClick={applyImage}
                  className='px-3 py-1.5 bg-[#E61C24] text-white rounded text-sm font-bold hover:bg-[#4f4fdd] transition-colors cursor-pointer'
                >
                  Insert
                </button>
              </div>
            )}
          </div>

          {/* YouTube */}
          <div className='relative'>
            <ToolBtn
              onClick={() => {
                setShowYoutubeInput((v) => !v);
                setShowLinkInput(false);
                setShowImageInput(false);
              }}
              active={showYoutubeInput}
              title='Embed YouTube Video'
            >
              <FiYoutube size={14} />
            </ToolBtn>
            {showYoutubeInput && (
              <div className='absolute top-10 left-0 z-50 bg-[#0e1422] border border-zinc-700 rounded-lg p-3 flex gap-2 shadow-xl min-w-80'>
                <input
                  autoFocus
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyYoutube()}
                  placeholder='https://www.youtube.com/watch?v=...'
                  className='flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-base text-white outline-none focus:border-[#E61C24]/60 placeholder-zinc-600'
                />
                <button
                  type='button'
                  onClick={applyYoutube}
                  className='px-3 py-1.5 bg-[#E61C24] text-white rounded text-sm font-bold hover:bg-[#4f4fdd] transition-colors cursor-pointer'
                >
                  Embed
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <ToolBtn
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            title='Insert Table (3×3)'
          >
            <FiGrid size={14} />
          </ToolBtn>

          <Divider />

          {/* Clear formatting */}
          <ToolBtn
            onClick={() =>
              editor?.chain().focus().clearNodes().unsetAllMarks().run()
            }
            title='Clear Formatting'
          >
            <MdFormatClear size={15} />
          </ToolBtn>
          <ToolBtn
            onClick={() => {
              editor?.commands.clearContent(true);
              onChange('');
            }}
            title='Clear All Content'
          >
            <FiTrash2 size={13} />
          </ToolBtn>
        </div>

        {/* ── Editor Content ── */}
        <div
          className='tiptap-wrapper px-4 py-3 text-base text-white leading-relaxed'
          style={{ minHeight }}
          onClick={() => editor?.commands.focus()}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .tiptap-editor {
          min-height: ${minHeight}px;
          outline: none;
          color: #e4e4e7;
          font-size: 1rem;
          line-height: 1.7;
        }
        .tiptap-editor h1 { font-size: 1.6rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #fff; }
        .tiptap-editor h2 { font-size: 1.35rem; font-weight: 700; margin: 0.9rem 0 0.4rem; color: #fff; }
        .tiptap-editor h3 { font-size: 1.15rem; font-weight: 700; margin: 0.8rem 0 0.35rem; color: #fff; }
        .tiptap-editor p { margin-bottom: 0.75rem; }
        .tiptap-editor.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #52525b;
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor p.is-empty.is-editor-empty::before {
          content: attr(data-placeholder);
          float: left;
          color: #52525b;
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor strong { font-weight: 700; color: #fff; }
        .tiptap-editor em { font-style: italic; color: #d4d4d8; }
        .tiptap-editor u { text-decoration: underline; }
        .tiptap-editor code {
          background: #1e293b; color: #a5f3fc;
          padding: 0.1rem 0.35rem; border-radius: 4px;
          font-family: monospace; font-size: 0.9em;
        }
        .tiptap-editor pre {
          background: #0f172a; border: 1px solid #1e293b;
          border-radius: 8px; padding: 1rem 1.25rem; margin: 0.75rem 0;
          overflow-x: auto;
        }
        .tiptap-editor pre code { background: none; color: #7dd3fc; padding: 0; }
        .tiptap-editor blockquote {
          border-left: 3px solid #E61C2480; padding-left: 1rem;
          margin: 0.75rem 0; color: #a1a1aa; font-style: italic;
        }
        .tiptap-editor ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .tiptap-editor ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .tiptap-editor li { margin-bottom: 0.2rem; }
        .tiptap-editor hr {
          border: none; border-top: 1px solid #27272a;
          margin: 1.25rem 0;
        }
        .tiptap-editor a { color: #818cf8; text-decoration: underline; cursor: pointer; }
        .tiptap-editor img {
          max-width: 100%; border-radius: 8px; margin: 0.75rem 0;
        }
        .tiptap-editor iframe {
          width: 100%; border-radius: 8px; margin: 0.75rem 0;
          aspect-ratio: 16/9; border: none;
        }
        /* Table styles */
        .tiptap-editor table {
          border-collapse: collapse; width: 100%;
          margin: 0.75rem 0; border-radius: 8px; overflow: hidden;
        }
        .tiptap-editor th {
          background: #1e293b; color: #e2e8f0; font-weight: 700;
          padding: 0.6rem 0.85rem; border: 1px solid #334155;
          text-align: left; font-size: 0.95rem;
        }
        .tiptap-editor td {
          padding: 0.55rem 0.85rem; border: 1px solid #1e293b;
          color: #cbd5e1; vertical-align: top;
        }
        .tiptap-editor tr:nth-child(even) td { background: #0a0f1e; }
        .tiptap-editor .selectedCell { background: #E61C2422 !important; }
      `}</style>
    </div>
  );
}
