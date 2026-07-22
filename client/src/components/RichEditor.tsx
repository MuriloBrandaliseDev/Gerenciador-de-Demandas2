import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Strikethrough,
} from 'lucide-react';
import { useEffect } from 'react';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function RichEditor({ value, onChange }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: 'Descreva a demanda com detalhes…',
      }),
    ],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrito"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Itálico"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sublinhado"
        >
          <UnderlineIcon size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Tachado"
        >
          <Strikethrough size={14} />
        </button>
        <span className="toolbar-sep" />
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Título"
        >
          <Heading2 size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Subtítulo"
        >
          <Heading3 size={14} />
        </button>
        <span className="toolbar-sep" />
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          <ListOrdered size={14} />
        </button>
        <span className="toolbar-sep" />
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Alinhar à esquerda"
        >
          <AlignLeft size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Centralizar"
        >
          <AlignCenter size={14} />
        </button>
        <button
          type="button"
          className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Alinhar à direita"
        >
          <AlignRight size={14} />
        </button>
        <span className="toolbar-sep" />
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => editor.chain().focus().undo().run()}
          title="Desfazer"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => editor.chain().focus().redo().run()}
          title="Refazer"
        >
          <Redo2 size={14} />
        </button>
      </div>
      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
