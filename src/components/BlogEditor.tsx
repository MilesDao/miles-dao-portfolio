import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ArrowLeft, Check, Upload, Trash2, Calendar, FolderOpen, Tag, FileText,
  Plus, GripVertical, Heading1, Heading2, List, CheckSquare, Quote, 
  Code, AlertCircle, Play, ChevronDown, ChevronRight, Grid, HelpCircle, 
  MessageSquare, Download, Share2, CornerDownRight, AlignLeft, ImagePlus
} from "lucide-react";
import { Blog, EditorBlock } from "../types";

interface BlogEditorProps {
  blog: Blog;
  onClose: () => void;
  onSave: (updatedBlog: Blog) => Promise<void>;
}

// ============================================================
// MARKDOWN TO BLOCKS PARSER
// ============================================================
export function parseMarkdownToBlocks(markdown: string): EditorBlock[] {
  if (!markdown) {
    return [{ id: "b-1", type: "paragraph", content: "" }];
  }

  // Check if content is already JSON blocks
  if (markdown.trim().startsWith("[") && markdown.trim().endsWith("]")) {
    try {
      const parsed = JSON.parse(markdown);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
        return parsed as EditorBlock[];
      }
    } catch (e) {
      // Not JSON, continue to parse markdown
    }
  }

  const lines = markdown.split("\n");
  const blocks: EditorBlock[] = [];
  let codeBlockBuffer: string[] = [];
  let inCodeBlock = false;
  let codeLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          id: `b-${Date.now()}-${i}`,
          type: "code",
          content: codeBlockBuffer.join("\n"),
          properties: { language: codeLang || "javascript" }
        });
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.trim().substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    // Image markdown: ![caption](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      blocks.push({
        id: `b-${Date.now()}-${i}`,
        type: "image",
        content: imgMatch[1] || "",
        properties: { imageUrl: imgMatch[2] }
      });
    } else if (trimmed.startsWith("# ")) {
      blocks.push({ id: `b-${Date.now()}-${i}`, type: "h1", content: trimmed.substring(2) });
    } else if (trimmed.startsWith("## ")) {
      blocks.push({ id: `b-${Date.now()}-${i}`, type: "h2", content: trimmed.substring(3) });
    } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      if (trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ")) {
        const checked = trimmed.startsWith("- [x] ");
        blocks.push({
          id: `b-${Date.now()}-${i}`,
          type: "todo",
          content: trimmed.substring(6),
          properties: { checked }
        });
      } else {
        blocks.push({ id: `b-${Date.now()}-${i}`, type: "bullet", content: trimmed.substring(2) });
      }
    } else if (trimmed.startsWith("> ")) {
      blocks.push({ id: `b-${Date.now()}-${i}`, type: "quote", content: trimmed.substring(2) });
    } else if (trimmed.startsWith("$$")) {
      const eqLines = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith("$$")) {
        eqLines.push(lines[j]);
        j++;
      }
      blocks.push({
        id: `b-${Date.now()}-${i}`,
        type: "math",
        content: eqLines.join(" ").trim() || "E = mc^2"
      });
      i = j;
    } else {
      blocks.push({ id: `b-${Date.now()}-${i}`, type: "paragraph", content: line });
    }
  }

  if (blocks.length === 0) {
    blocks.push({ id: "b-1", type: "paragraph", content: "" });
  }
  return blocks;
}

// ============================================================
// BLOCKS SERIALIZERS
// ============================================================
function serializeBlocksToMarkdown(blocks: EditorBlock[]): string {
  return JSON.stringify(blocks, null, 2);
}

function serializeBlocksToHTML(blocks: EditorBlock[], title: string): string {
  let html = `<html><head><title>${title}</title><style>
    body { font-family: monospace; padding: 2rem; background: #ebeae4; color: #111111; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    h1 { font-size: 2.2rem; border-bottom: 2px solid #111; padding-bottom: 0.5rem; }
    h2 { font-size: 1.6rem; margin-top: 1.5rem; }
    ul { padding-left: 1.5rem; }
    blockquote { border-left: 4px solid #111; padding-left: 1rem; font-style: italic; color: #555; }
    pre { background: #e0dfd5; border: 1px solid #999; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    code { font-family: monospace; }
    .todo { display: flex; align-items: center; gap: 0.5rem; list-style: none; }
    .callout { background: #dbdad0; border-left: 4px solid #3b82f6; padding: 1rem; border-radius: 4px; margin: 1rem 0; display: flex; gap: 0.75rem; }
    .math { text-align: center; font-size: 1.25rem; font-style: italic; background: #e0dfd5; padding: 1rem; border-radius: 4px; }
    .table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    .table td, .table th { border: 1px solid #999; padding: 8px; }
    img { max-width: 100%; border-radius: 4px; }
    .caption { text-align: center; font-size: 0.85rem; color: #666; margin-top: 0.5rem; font-style: italic; }
  </style></head><body>`;
  
  html += `<h1>${title.toUpperCase()}</h1>`;

  blocks.forEach(b => {
    switch (b.type) {
      case "h1":
        html += `<h2>${b.content}</h2>`;
        break;
      case "h2":
        html += `<h3>${b.content}</h3>`;
        break;
      case "bullet":
        html += `<ul><li>${b.content}</li></ul>`;
        break;
      case "todo":
        html += `<div class="todo"><input type="checkbox" ${b.properties?.checked ? "checked" : ""} disabled /> <span>${b.content}</span></div>`;
        break;
      case "quote":
        html += `<blockquote>${b.content}</blockquote>`;
        break;
      case "code":
        html += `<pre><code>${b.content}</code></pre>`;
        break;
      case "callout":
        html += `<div class="callout"><span>${b.properties?.emoji || "💡"}</span><div>${b.content}</div></div>`;
        break;
      case "math":
        html += `<div class="math">$$ ${b.content} $$</div>`;
        break;
      case "image":
        html += `<figure><img src="${b.properties?.imageUrl || ""}" alt="${b.content}" />${b.content ? `<figcaption class="caption">${b.content}</figcaption>` : ""}</figure>`;
        break;
      case "table":
        if (b.properties?.tableData) {
          html += `<table class="table">`;
          b.properties.tableData.forEach((row: string[]) => {
            html += `<tr>`;
            row.forEach(cell => {
              html += `<td>${cell}</td>`;
            });
            html += `</tr>`;
          });
          html += `</table>`;
        }
        break;
      default:
        html += `<p>${b.content}</p>`;
    }
  });

  html += `</body></html>`;
  return html;
}

function serializeBlocksToPlainMarkdown(blocks: EditorBlock[], title: string): string {
  let md = `# ${title.toUpperCase()}\n\n`;
  blocks.forEach(b => {
    switch (b.type) {
      case "h1":
        md += `# ${b.content}\n\n`;
        break;
      case "h2":
        md += `## ${b.content}\n\n`;
        break;
      case "bullet":
        md += `* ${b.content}\n\n`;
        break;
      case "todo":
        md += `- [${b.properties?.checked ? "x" : " "}] ${b.content}\n\n`;
        break;
      case "quote":
        md += `> ${b.content}\n\n`;
        break;
      case "code":
        md += `\`\`\`${b.properties?.language || "javascript"}\n${b.content}\n\`\`\`\n\n`;
        break;
      case "callout":
        md += `> **[${b.properties?.emoji || "💡"} CALLOUT]** ${b.content}\n\n`;
        break;
      case "math":
        md += `$$\n${b.content}\n$$\n\n`;
        break;
      case "image":
        md += `![${b.content}](${b.properties?.imageUrl || ""})\n\n`;
        break;
      case "table":
        if (b.properties?.tableData) {
          b.properties.tableData.forEach((row: string[], rIdx: number) => {
            md += `| ` + row.join(" | ") + ` |\n`;
            if (rIdx === 0) {
              md += `| ` + row.map(() => "---").join(" | ") + ` |\n`;
            }
          });
          md += `\n`;
        }
        break;
      default:
        md += `${b.content}\n\n`;
    }
  });
  return md;
}

// ============================================================
// CONTENT EDITABLE — ref-based, never uses dangerouslySetInnerHTML
// This prevents React from resetting DOM content during re-renders,
// which caused the "words disappearing" bug.
// ============================================================
function ContentEditable({
  blockId, content, className, onKeyDown, onInput, onFocus, onBlur
}: {
  blockId: string;
  content: string;
  className: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onInput: (e: React.FormEvent<HTMLDivElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const prevContentRef = useRef(content);
  const initialContentRef = useRef(content);

  // Set innerHTML ONLY on mount
  useEffect(() => {
    if (elRef.current) {
      elRef.current.innerHTML = initialContentRef.current;
      prevContentRef.current = initialContentRef.current;
    }
  }, []);

  // Update innerHTML ONLY when content prop changes programmatically
  // (e.g. blur flush, type change). During typing, content prop stays
  // the same so this effect never fires → DOM is never touched.
  useEffect(() => {
    if (elRef.current && content !== prevContentRef.current) {
      elRef.current.innerHTML = content;
      prevContentRef.current = content;
    }
  }, [content]);

  return (
    <div
      ref={elRef}
      data-block-id={blockId}
      contentEditable
      suppressContentEditableWarning
      onKeyDown={onKeyDown}
      onInput={onInput}
      onFocus={onFocus}
      onBlur={onBlur}
      className={className}
    />
  );
}

// ============================================================
// BLOG EDITOR COMPONENT
// ============================================================
export default function BlogEditor({ blog, onClose, onSave }: BlogEditorProps) {
  // --- Core state ---
  const [title, setTitle] = useState(blog.title || "");
  const [category, setCategory] = useState(blog.category || "");
  const [date, setDate] = useState(blog.date || "");
  const [summary, setSummary] = useState(blog.summary || "");
  const [image, setImage] = useState(blog.image || "");
  const [tags, setTags] = useState(blog.tags ? blog.tags.join(", ") : "");
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- Sidebars & popups ---
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; time: string }>>([
    { id: "c-1", author: "Miles", text: "Thiết kế Notion Workspace cho bài viết này nhé!", time: "20:31" },
    { id: "c-2", author: "DeepMind Partner", text: "Trông cực kì tối giản và brutalist! 👍", time: "20:34" }
  ]);
  const [newComment, setNewComment] = useState("");

  // --- Editor UI state ---
  const [activeMenuBlockId, setActiveMenuBlockId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [slashQuery, setSlashQuery] = useState("");
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);
  const [slashPosition, setSlashPosition] = useState({ x: 0, y: 0 });
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [draggedBlockIdx, setDraggedBlockIdx] = useState<number | null>(null);
  const [floatingBar, setFloatingBar] = useState<{ isOpen: boolean; x: number; y: number; text: string } | null>(null);
  
  // --- Drag & drop state ---
  const [coverDragActive, setCoverDragActive] = useState(false);
  const [docDropActive, setDocDropActive] = useState(false);
  const [draggableBlockId, setDraggableBlockId] = useState<string | null>(null);

  // --- History (Undo/Redo) ---
  const historyRef = useRef<EditorBlock[][]>([]);
  const redoRef = useRef<EditorBlock[][]>([]);
  const prevBlocksRef = useRef<EditorBlock[] | null>(null);
  const isUndoingRedoingRef = useRef<boolean>(false);
  const focusedBlockInitialContentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!blocks || blocks.length === 0) return;
    
    if (prevBlocksRef.current === null) {
      prevBlocksRef.current = JSON.parse(JSON.stringify(blocks));
      return;
    }

    if (isUndoingRedoingRef.current) {
      isUndoingRedoingRef.current = false;
      prevBlocksRef.current = JSON.parse(JSON.stringify(blocks));
      return;
    }

    // Check if the content actually changed to avoid duplicate history states
    const prevStr = JSON.stringify(prevBlocksRef.current);
    const currStr = JSON.stringify(blocks);
    if (prevStr === currStr) return;

    // Push the cloned previous state to history
    historyRef.current.push(prevBlocksRef.current);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
    
    // Clear redo stack on new action
    redoRef.current = [];
    
    prevBlocksRef.current = JSON.parse(JSON.stringify(blocks));
  }, [blocks]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    
    isUndoingRedoingRef.current = true;
    
    // Save current blocks to redo stack
    const currentClone = JSON.parse(JSON.stringify(blocks));
    redoRef.current.push(currentClone);
    
    // Restore previous state
    const previousState = historyRef.current.pop()!;
    setBlocks(previousState);
  }, [blocks]);

  const redo = useCallback(() => {
    if (redoRef.current.length === 0) return;
    
    isUndoingRedoingRef.current = true;
    
    // Save current blocks to undo stack
    const currentClone = JSON.parse(JSON.stringify(blocks));
    historyRef.current.push(currentClone);
    
    // Restore next state
    const nextState = redoRef.current.pop()!;
    setBlocks(nextState);
  }, [blocks]);

  // Global Undo/Redo key shortcut listener
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Check for Ctrl+Z or Cmd+Z
      const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey;
      const isRedo = ((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey);

      if (isUndo || isRedo) {
        if (focusedBlockId) {
          const currentContent = blockContentsRef.current[focusedBlockId] ?? 
            blocksRef.current.find(b => b.id === focusedBlockId)?.content ?? "";
          
          if (currentContent !== focusedBlockInitialContentRef.current) {
            // Let the browser handle native undo/redo (e.g. typing)
            return;
          }
        }

        e.preventDefault();
        if (isUndo) {
          undo();
        } else {
          redo();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalShortcuts);
    return () => document.removeEventListener('keydown', handleGlobalShortcuts);
  }, [undo, redo, focusedBlockId]);

  // --- Image resize state ---
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);

  // --- Block selection state ---
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());

  // ====================================================================
  // REFS — Critical for smooth editing. We store block content in refs
  // during active typing to avoid React re-renders that reset the cursor.
  // Content is flushed from refs → state on blur and before save.
  // ====================================================================
  const blockContentsRef = useRef<Record<string, string>>({});
  const focusedBlockRef = useRef<string | null>(null);
  const blocksRef = useRef<EditorBlock[]>(blocks);
  const docDragCounterRef = useRef(0);
  const coverDragCounterRef = useRef(0);
  const resizeDataRef = useRef({ startX: 0, startWidth: 100, containerCenterX: 0, halfContainerW: 0 });
  const selectionAnchorRef = useRef<string | null>(null);
  const isSelectingBlocksRef = useRef<boolean>(false);

  // Keep blocksRef in sync
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // ====================================================================
  // IMAGE PROCESSING
  // ====================================================================
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, WEBP, etc.)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB. Please upload a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const processImageForBlock = useCallback((file: File, blockId: string) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBlocks(prev => prev.map(b =>
          b.id === blockId
            ? { ...b, properties: { ...b.properties, imageUrl: event.target!.result as string } }
            : b
        ));
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const insertImageBlock = useCallback((dataUrl: string) => {
    const imageBlock: EditorBlock = {
      id: `b-${Date.now()}-img`,
      type: "image",
      content: "",
      properties: { imageUrl: dataUrl }
    };
    // Insert after focused block, or at end
    setBlocks(prev => {
      const newBlocks = [...prev];
      const focusIdx = focusedBlockRef.current
        ? newBlocks.findIndex(b => b.id === focusedBlockRef.current)
        : -1;
      const insertIdx = focusIdx >= 0 ? focusIdx + 1 : newBlocks.length;
      newBlocks.splice(insertIdx, 0, imageBlock);
      return newBlocks;
    });
  }, []);

  // ====================================================================
  // COVER BANNER DRAG & DROP
  // ====================================================================
  const handleCoverDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    coverDragCounterRef.current++;
    setCoverDragActive(true);
  };
  const handleCoverDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleCoverDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    coverDragCounterRef.current--;
    if (coverDragCounterRef.current <= 0) {
      coverDragCounterRef.current = 0;
      setCoverDragActive(false);
    }
  };
  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragActive(false);
    coverDragCounterRef.current = 0;

    // Handle file drops
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        processFile(file);
        return;
      }
    }
    // Handle URL drops (images dragged from browser)
    const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      setImage(url);
    }
  };

  // ====================================================================
  // WORKSPACE / DOCUMENT BODY DRAG & DROP (for image blocks)
  // ====================================================================
  const handleDocDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    docDragCounterRef.current++;
    if (draggedBlockIdx === null) {
      setDocDropActive(true);
    }
  };
  const handleDocDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDocDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    docDragCounterRef.current--;
    if (docDragCounterRef.current <= 0) {
      docDragCounterRef.current = 0;
      setDocDropActive(false);
    }
  };
  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDocDropActive(false);
    docDragCounterRef.current = 0;

    // Only handle external drops (not internal block reordering)
    if (draggedBlockIdx !== null) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith("image/")) return;
      if (file.size > 2 * 1024 * 1024) {
        alert("Image must be smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          insertImageBlock(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      return;
    }
    // Handle URL drops from browser
    const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (url && (url.startsWith("http://") || url.startsWith("https://")) &&
        (url.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)(\?.*)?$/i))) {
      insertImageBlock(url);
    }
  };

  // ====================================================================
  // CONTENT FLUSH — sync ref contents into React state
  // ====================================================================
  const flushBlockContents = useCallback(() => {
    const pending = { ...blockContentsRef.current };
    if (Object.keys(pending).length === 0) return;
    blockContentsRef.current = {};
    setBlocks(prev => prev.map(b => {
      const content = pending[b.id];
      return content !== undefined ? { ...b, content } : b;
    }));
  }, []);

  const getLatestBlocks = useCallback((): EditorBlock[] => {
    const pending = { ...blockContentsRef.current };
    return blocksRef.current.map(b => {
      const content = pending[b.id];
      return content !== undefined ? { ...b, content } : b;
    });
  }, []);

  // ====================================================================
  // LOAD BLOCKS ON MOUNT
  // ====================================================================
  useEffect(() => {
    setBlocks(parseMarkdownToBlocks(blog.content));
  }, [blog.content]);

  // ====================================================================
  // FLOATING SELECTION BAR LISTENER
  // ====================================================================
  useEffect(() => {
    const handleMouseUp = () => {
      if (isSelectingBlocksRef.current) {
        isSelectingBlocksRef.current = false;
      }
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setFloatingBar(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setFloatingBar({
        isOpen: true,
        x: rect.left + window.scrollX + (rect.width / 2) - 80,
        y: rect.top + window.scrollY - 44,
        text: selection.toString()
      });
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (slashBlockId && !target.closest("[data-slash-menu]")) {
        setSlashBlockId(null);
      }
      if (activeMenuBlockId && !target.closest("[data-block-menu]")) {
        setActiveMenuBlockId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [slashBlockId, activeMenuBlockId]);

  // ====================================================================
  // FORMAT SELECTION
  // ====================================================================
  const formatSelection = (tag: string, styleValue?: string) => {
    if (!floatingBar) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const content = range.extractContents();
    const span = document.createElement("span");

    if (tag === "strong") {
      span.innerHTML = `<strong>${content.textContent}</strong>`;
    } else if (tag === "em") {
      span.innerHTML = `<em>${content.textContent}</em>`;
    } else if (tag === "u") {
      span.innerHTML = `<u>${content.textContent}</u>`;
    } else if (tag === "code") {
      span.innerHTML = `<code style="background:#dbdad0;padding:2px 4px;border-radius:3px;">${content.textContent}</code>`;
    } else if (tag === "color") {
      span.innerHTML = `<span style="color:${styleValue || "red"}">${content.textContent}</span>`;
    } else if (tag === "highlight") {
      span.innerHTML = `<span style="background-color:${styleValue || "yellow"}">${content.textContent}</span>`;
    }

    range.insertNode(span);

    // Update matching block in ref
    const activeBlockElement = document.activeElement;
    if (activeBlockElement && activeBlockElement.getAttribute("data-block-id")) {
      const blockId = activeBlockElement.getAttribute("data-block-id")!;
      blockContentsRef.current[blockId] = activeBlockElement.innerHTML;
    }
    setFloatingBar(null);
  };

  // ====================================================================
  // BLOCK FOCUS / BLUR (critical for smooth editing)
  // ====================================================================
  const handleBlockFocus = (blockId: string) => {
    focusedBlockRef.current = blockId;
    setFocusedBlockId(blockId);
    
    // Store the initial content when focused to compare for native vs custom undo/redo
    const block = blocksRef.current.find(b => b.id === blockId);
    focusedBlockInitialContentRef.current = block ? block.content : null;

    // Clear block selection when entering edit mode
    if (selectedBlockIds.size > 0) {
      setSelectedBlockIds(new Set());
    }
  };

  const handleBlockBlur = (blockId: string) => {
    focusedBlockRef.current = null;
    focusedBlockInitialContentRef.current = null;
    setFocusedBlockId(null);
    
    // Sync pending content from ref → state
    const pendingContent = blockContentsRef.current[blockId];
    if (pendingContent !== undefined) {
      setBlocks(prev => prev.map(b =>
        b.id === blockId ? { ...b, content: pendingContent } : b
      ));
      delete blockContentsRef.current[blockId];
    }
  };

  // ====================================================================
  // KEYBOARD EVENTS
  // ====================================================================
  const handleBlockKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, blockId: string, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Flush current block content
      const currentContent = blockContentsRef.current[blockId] ?? e.currentTarget.innerHTML;
      delete blockContentsRef.current[blockId];

      const newBlock: EditorBlock = {
        id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "paragraph",
        content: ""
      };

      setBlocks(prev => {
        const updated = prev.map(b =>
          b.id === blockId ? { ...b, content: currentContent } : b
        );
        const newBlocks = [...updated];
        newBlocks.splice(index + 1, 0, newBlock);
        return newBlocks;
      });

      setTimeout(() => {
        const nextEl = document.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLDivElement;
        if (nextEl) {
          nextEl.focus();
        }
      }, 30);
    }

    else if (e.key === "Backspace") {
      const contentText = e.currentTarget.innerHTML || "";
      if (contentText === "" || contentText === "<br>") {
        e.preventDefault();
        if (blocks.length === 1) return;

        delete blockContentsRef.current[blockId];
        const prevBlock = blocks[index - 1];
        setBlocks(prev => prev.filter(b => b.id !== blockId));

        if (prevBlock) {
          setTimeout(() => {
            const prevEl = document.querySelector(`[data-block-id="${prevBlock.id}"]`) as HTMLDivElement;
            if (prevEl) {
              prevEl.focus();
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(prevEl);
              range.collapse(false);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }, 30);
        }
      }
    }

    else if (e.key === "ArrowUp" && index > 0) {
      const sel = window.getSelection();
      if (sel && sel.anchorOffset === 0) {
        e.preventDefault();
        const prevEl = document.querySelector(`[data-block-id="${blocks[index - 1].id}"]`) as HTMLDivElement;
        if (prevEl) {
          prevEl.focus();
          const range = document.createRange();
          range.selectNodeContents(prevEl);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    }

    else if (e.key === "ArrowDown" && index < blocks.length - 1) {
      const sel = window.getSelection();
      const textLen = e.currentTarget.textContent?.length || 0;
      if (sel && sel.anchorOffset >= textLen) {
        e.preventDefault();
        const nextEl = document.querySelector(`[data-block-id="${blocks[index + 1].id}"]`) as HTMLDivElement;
        if (nextEl) {
          nextEl.focus();
          const range = document.createRange();
          range.selectNodeContents(nextEl);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    }
  };

  // ====================================================================
  // BLOCK INPUT — stores in ref ONLY (no state updates during typing)
  // ====================================================================
  const handleBlockInput = (e: React.FormEvent<HTMLDivElement>, blockId: string, index: number) => {
    const htmlText = e.currentTarget.innerHTML;
    const textText = e.currentTarget.textContent || "";

    // Store in ref — NOT state — to avoid React re-render + cursor reset
    blockContentsRef.current[blockId] = htmlText;

    // Slash commands detection
    if (textText.endsWith("/")) {
      const rect = e.currentTarget.getBoundingClientRect();
      setSlashBlockId(blockId);
      setSlashPosition({
        x: rect.left + window.scrollX + 20,
        y: rect.bottom + window.scrollY + 4
      });
      setSlashQuery("");
    } else if (slashBlockId === blockId) {
      if (!textText.includes("/")) {
        setSlashBlockId(null);
      } else {
        const parts = textText.split("/");
        setSlashQuery(parts[parts.length - 1]);
      }
    }

    // Markdown Shortcut Triggers
    if (textText === "# ") {
      e.currentTarget.innerHTML = "";
      delete blockContentsRef.current[blockId];
      changeBlockType(blockId, "h1");
    } else if (textText === "## ") {
      e.currentTarget.innerHTML = "";
      delete blockContentsRef.current[blockId];
      changeBlockType(blockId, "h2");
    } else if (textText === "* " || textText === "- ") {
      e.currentTarget.innerHTML = "";
      delete blockContentsRef.current[blockId];
      changeBlockType(blockId, "bullet");
    } else if (textText === "[] ") {
      e.currentTarget.innerHTML = "";
      delete blockContentsRef.current[blockId];
      changeBlockType(blockId, "todo");
    } else if (textText === "``` ") {
      e.currentTarget.innerHTML = "";
      delete blockContentsRef.current[blockId];
      changeBlockType(blockId, "code");
    } else if (textText === "> ") {
      e.currentTarget.innerHTML = "";
      delete blockContentsRef.current[blockId];
      changeBlockType(blockId, "quote");
    }
  };

  // ====================================================================
  // BLOCK TYPE CHANGES
  // ====================================================================
  const changeBlockType = (blockId: string, type: EditorBlock["type"]) => {
    // Clear ref since we're resetting the block
    delete blockContentsRef.current[blockId];

    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;

      const properties: EditorBlock["properties"] = { ...b.properties };
      if (type === "todo") properties.checked = false;
      if (type === "code") properties.language = "javascript";
      if (type === "callout") {
        properties.emoji = "💡";
        properties.bgColor = "#dbdad0";
      }
      if (type === "toggle") properties.isOpen = true;
      if (type === "table") {
        properties.tableData = [
          ["Header 1", "Header 2", "Header 3"],
          ["Cell A", "Cell B", "Cell C"],
          ["Cell X", "Cell Y", "Cell Z"]
        ];
      }
      if (type === "image") {
        properties.imageUrl = "";
      }

      return { ...b, type, content: "", properties };
    }));

    setSlashBlockId(null);

    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLDivElement;
      el?.focus();
    }, 30);
  };

  // ====================================================================
  // BLOCK GUTTER MENU
  // ====================================================================
  const openBlockMenu = (e: React.MouseEvent, blockId: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveMenuBlockId(blockId);
    setMenuPosition({
      x: rect.left + window.scrollX - 160,
      y: rect.bottom + window.scrollY + 8
    });
  };

  const deleteBlock = (blockId: string) => {
    if (blocks.length === 1) return;
    delete blockContentsRef.current[blockId];
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    setActiveMenuBlockId(null);
  };

  // ====================================================================
  // BLOCK DRAG & DROP REORDERING
  // ====================================================================
  const handleBlockDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedBlockIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    // Set a custom drag type to distinguish from external file drops
    e.dataTransfer.setData("application/x-block-reorder", String(idx));
  };

  const handleBlockDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedBlockIdx === null || draggedBlockIdx === idx) return;

    const list = [...blocks];
    const item = list[draggedBlockIdx];
    list.splice(draggedBlockIdx, 1);
    list.splice(idx, 0, item);

    setBlocks(list);
    setDraggedBlockIdx(idx);
  };

  const handleBlockDragEnd = () => {
    setDraggedBlockIdx(null);
    setDraggableBlockId(null);
  };

  // ====================================================================
  // IMAGE RESIZE (drag side handles)
  // ====================================================================
  const handleResizeStart = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Find the image container to compute center
    const imgContainer = (e.currentTarget as HTMLElement).closest('[data-img-wrapper]') as HTMLElement;
    if (!imgContainer) return;
    const parentBlock = imgContainer.parentElement;
    if (!parentBlock) return;
    const parentRect = parentBlock.getBoundingClientRect();

    resizeDataRef.current = {
      startX: e.clientX,
      startWidth: (block => block?.properties?.imageWidth ?? 100)(blocks.find(b => b.id === blockId)),
      containerCenterX: parentRect.left + parentRect.width / 2,
      halfContainerW: parentRect.width / 2
    };
    setResizingBlockId(blockId);

    const onMouseMove = (me: MouseEvent) => {
      const { containerCenterX, halfContainerW } = resizeDataRef.current;
      const distFromCenter = Math.abs(me.clientX - containerCenterX);
      const newWidth = Math.round(Math.max(15, Math.min(100, (distFromCenter / halfContainerW) * 100)));
      setBlocks(prev => prev.map(b =>
        b.id === blockId
          ? { ...b, properties: { ...b.properties, imageWidth: newWidth } }
          : b
      ));
    };

    const onMouseUp = () => {
      setResizingBlockId(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ====================================================================
  // BLOCK SELECTION (click/shift-click/ctrl-click/drag for multi-select)
  // ====================================================================
  const handleBlockMouseDown = (e: React.MouseEvent, blockId: string, idx: number) => {
    const target = e.target as HTMLElement;
    // Don't select blocks when interacting with inputs, textareas, buttons, or menus
    if (target.closest('[contenteditable]') || target.closest('input') ||
        target.closest('textarea') || target.closest('button') || target.closest('select') ||
        target.closest('[data-block-menu]') || target.closest('[data-slash-menu]')) {
      return;
    }
    
    // Only handle left click
    if (e.button !== 0) return;

    // Prevent default browser text selection highlighting while drag-selecting blocks
    e.preventDefault();
    
    isSelectingBlocksRef.current = true;
    
    if (e.shiftKey && selectionAnchorRef.current) {
      // Shift range select
      const anchorIdx = blocksRef.current.findIndex(b => b.id === selectionAnchorRef.current);
      if (anchorIdx !== -1) {
        const start = Math.min(anchorIdx, idx);
        const end = Math.max(anchorIdx, idx);
        setSelectedBlockIds(new Set(blocksRef.current.slice(start, end + 1).map(b => b.id)));
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd toggle select
      setSelectedBlockIds(prev => {
        const next = new Set(prev);
        if (next.has(blockId)) next.delete(blockId);
        else next.add(blockId);
        return next;
      });
      selectionAnchorRef.current = blockId;
    } else {
      // Normal single select
      setSelectedBlockIds(new Set([blockId]));
      selectionAnchorRef.current = blockId;
    }

    // Blur any active editable elements
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleBlockMouseEnter = (e: React.MouseEvent, blockId: string, idx: number) => {
    if (!isSelectingBlocksRef.current || !selectionAnchorRef.current) return;

    // Range select between anchor and current block
    const anchorIdx = blocksRef.current.findIndex(b => b.id === selectionAnchorRef.current);
    if (anchorIdx === -1) return;

    const start = Math.min(anchorIdx, idx);
    const end = Math.max(anchorIdx, idx);
    const newSelected = new Set(blocksRef.current.slice(start, end + 1).map(b => b.id));
    setSelectedBlockIds(newSelected);
  };

  const deleteSelectedBlocks = () => {
    const remaining = blocks.filter(b => !selectedBlockIds.has(b.id));
    if (remaining.length === 0) {
      setBlocks([{ id: `b-${Date.now()}`, type: 'paragraph', content: '' }]);
    } else {
      setBlocks(remaining);
    }
    setSelectedBlockIds(new Set());
  };

  const duplicateSelectedBlocks = () => {
    const dupes = blocks
      .filter(b => selectedBlockIds.has(b.id))
      .map(b => ({ ...b, id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }));
    setBlocks(prev => [...prev, ...dupes]);
    setSelectedBlockIds(new Set());
  };

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleSelectionKeys = (e: KeyboardEvent) => {
      if (selectedBlockIds.size === 0) return;

      if (e.key === 'Escape') {
        setSelectedBlockIds(new Set());
        return;
      }

      // Delete selected blocks (only when not editing)
      if ((e.key === 'Backspace' || e.key === 'Delete') &&
          !document.activeElement?.getAttribute('contenteditable') &&
          !(document.activeElement instanceof HTMLInputElement) &&
          !(document.activeElement instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        deleteSelectedBlocks();
      }
    };

    document.addEventListener('keydown', handleSelectionKeys);
    return () => document.removeEventListener('keydown', handleSelectionKeys);
  });

  // ====================================================================
  // SAVE
  // ====================================================================
  const handleSave = async () => {
    setIsSaving(true);

    // Flush all pending block contents from refs
    const latestBlocks = getLatestBlocks();
    blockContentsRef.current = {};
    setBlocks(latestBlocks);

    const contentString = serializeBlocksToMarkdown(latestBlocks);
    const updatedBlog: Blog = {
      ...blog,
      title: title.toUpperCase(),
      category: category,
      date: date || new Date().toISOString().split("T")[0],
      summary: summary || (latestBlocks[0]?.content.replace(/<[^>]*>/g, "").slice(0, 100) + "..."),
      content: contentString,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      image: image || "/assets/blog_visual.png"
    };

    try {
      await onSave(updatedBlog);
      onClose();
    } catch (err) {
      alert("Error saving Notion blog blocks.");
    } finally {
      setIsSaving(false);
    }
  };

  // ====================================================================
  // EXPORTS
  // ====================================================================
  const handleDownload = (format: "md" | "html" | "json") => {
    const latestBlocks = getLatestBlocks();
    let payload = "";
    let mime = "";
    let filename = `${blog.id || "blog-entry"}`;

    if (format === "md") {
      payload = serializeBlocksToPlainMarkdown(latestBlocks, title);
      mime = "text/markdown";
      filename += ".md";
    } else if (format === "html") {
      payload = serializeBlocksToHTML(latestBlocks, title);
      mime = "text/html";
      filename += ".html";
    } else if (format === "json") {
      payload = serializeBlocksToMarkdown(latestBlocks);
      mime = "application/json";
      filename += ".json";
    }

    const blob = new Blob([payload], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  // ====================================================================
  // TABLE OF CONTENTS
  // ====================================================================
  const getHeadings = () => {
    return blocks.filter(b => b.type === "h1" || b.type === "h2");
  };

  // ====================================================================
  // SLASH COMMAND ITEMS
  // ====================================================================
  const slashCommands: { type: EditorBlock["type"]; label: string; icon: React.ReactNode; description: string }[] = [
    { type: "paragraph", label: "Paragraph", icon: <AlignLeft size={13} className="text-neutral-500" />, description: "Plain text block" },
    { type: "h1", label: "Heading 1", icon: <Heading1 size={13} className="text-neutral-500" />, description: "Large section header" },
    { type: "h2", label: "Heading 2", icon: <Heading2 size={13} className="text-neutral-500" />, description: "Medium section header" },
    { type: "bullet", label: "Bullet List", icon: <List size={13} className="text-neutral-500" />, description: "Unordered list item" },
    { type: "todo", label: "Todo/Checklist", icon: <CheckSquare size={13} className="text-neutral-500" />, description: "Checkbox with label" },
    { type: "quote", label: "Quote Block", icon: <Quote size={13} className="text-neutral-500" />, description: "Bordered quote section" },
    { type: "code", label: "Code Block", icon: <Code size={13} className="text-neutral-500" />, description: "Syntax-highlighted code" },
    { type: "callout", label: "Callout Box", icon: <AlertCircle size={13} className="text-neutral-500" />, description: "Highlighted note panel" },
    { type: "toggle", label: "Toggle List", icon: <Play size={13} className="text-neutral-500 transform rotate-90" />, description: "Collapsible content" },
    { type: "math", label: "LaTeX Math", icon: <HelpCircle size={13} className="text-neutral-500" />, description: "Mathematical equation" },
    { type: "table", label: "Grid Table", icon: <Grid size={13} className="text-neutral-500" />, description: "Editable spreadsheet" },
    { type: "image", label: "Image", icon: <ImagePlus size={13} className="text-neutral-500" />, description: "Upload or embed image" },
    { type: "synced", label: "Synced Block", icon: <Share2 size={13} className="text-neutral-500" />, description: "Global update block" },
    { type: "toc", label: "Table of Contents", icon: <AlignLeft size={13} className="text-neutral-500" />, description: "Auto-generated TOC" },
  ];

  const filteredSlashCommands = slashQuery
    ? slashCommands.filter(c => c.label.toLowerCase().includes(slashQuery.toLowerCase()))
    : slashCommands;

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <div
      className="min-h-screen bg-[#ebeae4] text-[#111111] selection:bg-neutral-900 selection:text-[#ebeae4] relative flex flex-col select-text font-sans"
      onDragOver={(e) => e.preventDefault()}
    >
      {/* ============= Floating Selection Toolbar ============= */}
      {floatingBar?.isOpen && (
        <div
          style={{ top: `${floatingBar.y}px`, left: `${floatingBar.x}px` }}
          className="absolute z-[99] bg-neutral-950 text-[#ebeae4] border border-neutral-800 rounded-lg shadow-2xl flex items-center gap-1.5 p-1.5 text-[10px] font-mono select-none animate-[fadeIn_0.1s_ease-out]"
        >
          <button onClick={() => formatSelection("strong")} className="px-2 py-1 hover:bg-neutral-800 font-bold uppercase rounded" title="Bold">B</button>
          <button onClick={() => formatSelection("em")} className="px-2 py-1 hover:bg-neutral-800 italic rounded" title="Italic">I</button>
          <button onClick={() => formatSelection("u")} className="px-2 py-1 hover:bg-neutral-800 underline rounded" title="Underline">U</button>
          <button onClick={() => formatSelection("code")} className="px-2 py-1 hover:bg-neutral-800 rounded" title="Inline Code">&lt;&gt;</button>
          <div className="h-4 w-px bg-neutral-700 mx-0.5" />
          <button onClick={() => formatSelection("color", "#ff4a4a")} className="w-4 h-4 rounded-full bg-red-500 hover:scale-125 transition-transform" title="Red text" />
          <button onClick={() => formatSelection("color", "#3b82f6")} className="w-4 h-4 rounded-full bg-blue-500 hover:scale-125 transition-transform" title="Blue text" />
          <button onClick={() => formatSelection("highlight", "#fef08a")} className="w-4 h-4 rounded bg-yellow-200 border border-neutral-600 hover:scale-125 transition-transform" title="Highlight" />
        </div>
      )}

      {/* ============= Top Header ============= */}
      <header className="sticky top-0 z-40 w-full flex justify-between items-center border-b border-neutral-300 bg-[#ebeae4]/90 backdrop-blur-md px-6 py-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 font-mono text-xs font-bold text-neutral-600 hover:text-neutral-950 transition-colors uppercase border border-neutral-300 hover:border-neutral-900 rounded-sm px-3 py-1.5 bg-[#ebeae4]"
        >
          <ArrowLeft size={14} />
          <span>Back to Portfolio</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCommentsOpen(!commentsOpen)}
            className={`flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1.5 border rounded-sm transition-colors ${
              commentsOpen ? "bg-neutral-950 text-[#ebeae4] border-neutral-950" : "border-neutral-300 hover:border-neutral-900 text-neutral-700 bg-transparent"
            }`}
          >
            <MessageSquare size={13} />
            <span>Comments ({comments.length})</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 font-mono text-xs font-bold border border-neutral-300 hover:border-neutral-900 text-neutral-700 rounded-sm px-3 py-1.5 bg-[#ebeae4]"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-950 rounded shadow-xl font-mono text-xs z-50 flex flex-col p-1.5 gap-1">
                <button onClick={() => handleDownload("md")} className="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded">EXPORT MARKDOWN (.MD)</button>
                <button onClick={() => handleDownload("html")} className="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded">EXPORT RAW HTML (.HTML)</button>
                <button onClick={() => handleDownload("json")} className="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded">EXPORT RAW JSON (.JSON)</button>
                <button onClick={() => { window.print(); setExportOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded">EXPORT PDF (BROWSER PRINT)</button>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-neutral-950 text-[#ebeae4] hover:bg-neutral-800 transition-colors border border-neutral-950 px-4 py-1.5 rounded-sm font-mono text-xs font-bold uppercase disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save & Close"}
          </button>
        </div>
      </header>

      {/* ============= Cover Banner with Full Drag & Drop ============= */}
      <div
        onDragEnter={handleCoverDragEnter}
        onDragOver={handleCoverDragOver}
        onDragLeave={handleCoverDragLeave}
        onDrop={handleCoverDrop}
        className={`relative w-full h-48 md:h-64 border-b overflow-hidden group transition-all duration-300 ${
          coverDragActive
            ? "bg-blue-50 border-blue-400 border-b-2 ring-2 ring-blue-300 ring-inset"
            : "bg-neutral-200 border-neutral-300"
        }`}
      >
        {image ? (
          <img src={image} alt="Cover" className="w-full h-full object-cover select-none" draggable={false} />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200 flex items-center justify-center font-mono text-xs text-neutral-400 select-none">
            No cover image set
          </div>
        )}

        {/* Drag-active overlay */}
        {coverDragActive && (
          <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 flex flex-col items-center justify-center z-20 pointer-events-none animate-pulse">
            <Upload size={36} className="text-blue-600 mb-2" />
            <p className="font-mono text-sm font-bold text-blue-700 uppercase tracking-widest">Drop Image Here</p>
          </div>
        )}

        {/* Hover overlay (only when not dragging) */}
        {!coverDragActive && (
          <div className="absolute inset-0 bg-neutral-950/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white pointer-events-none">
            <Upload size={24} className="mb-2 animate-bounce" />
            <p className="font-mono text-xs font-bold uppercase tracking-widest">Drag & Drop Cover Image Here</p>
            <p className="font-mono text-[9px] text-neutral-300 mt-1">OR CLICK TO UPLOAD (MAX 2MB)</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto z-10"
            />
          </div>
        )}

        {image && (
          <button
            onClick={() => setImage("")}
            className="absolute right-4 bottom-4 z-20 bg-neutral-950/80 hover:bg-red-600 text-white rounded border border-neutral-700/80 p-2 transition-colors duration-200 flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold"
          >
            <Trash2 size={12} /> Remove Cover
          </button>
        )}
      </div>

      {/* ============= Main Content Area ============= */}
      <div className="flex-1 flex w-full relative">
        <main
          className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 md:py-16 flex flex-col gap-6 select-text"
          onDragEnter={handleDocDragEnter}
          onDragOver={handleDocDragOver}
          onDragLeave={handleDocDragLeave}
          onDrop={handleDocDrop}
        >
          {/* Document drop zone indicator */}
          {docDropActive && draggedBlockIdx === null && (
            <div className="fixed inset-0 pointer-events-none z-30 border-4 border-dashed border-blue-400 bg-blue-50/10 rounded-lg flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur px-8 py-5 rounded-xl shadow-2xl border border-blue-300 flex flex-col items-center gap-2 pointer-events-none">
                <ImagePlus size={40} className="text-blue-500" />
                <p className="font-mono text-sm font-bold text-blue-700 uppercase tracking-widest">Drop to Add Image Block</p>
                <p className="font-mono text-[10px] text-blue-400">PNG, JPG, WEBP • MAX 2MB</p>
              </div>
            </div>
          )}

          {/* Title input */}
          <div>
            <textarea
              rows={1}
              placeholder="Untitled Journal Entry"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-4xl md:text-5xl font-display font-black text-neutral-950 border-none outline-none focus:ring-0 resize-none placeholder-neutral-300 uppercase tracking-tight leading-none"
            />
          </div>

          {/* Properties Grid */}
          <div className="border-y border-neutral-300 py-6 my-2 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs text-neutral-700">
            <div className="flex items-center gap-3">
              <span className="w-24 text-neutral-400 font-bold flex items-center gap-1.5 uppercase select-none">
                <FolderOpen size={13} /> Category
              </span>
              <input
                type="text"
                placeholder="Category (e.g., Data Science)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-neutral-950 outline-none pb-0.5 font-bold text-neutral-900"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-neutral-400 font-bold flex items-center gap-1.5 uppercase select-none">
                <Calendar size={13} /> Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-neutral-950 outline-none pb-0.5 text-neutral-900"
              />
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <span className="w-24 text-neutral-400 font-bold flex items-center gap-1.5 uppercase select-none">
                <Tag size={13} /> Tags
              </span>
              <input
                type="text"
                placeholder="Tags (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="flex-1 bg-transparent border-b border-transparent hover:border-neutral-400 focus:border-neutral-950 outline-none pb-0.5 text-neutral-900"
              />
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <span className="w-24 text-neutral-400 font-bold flex items-center gap-1.5 uppercase select-none mt-1">
                <FileText size={13} /> Summary
              </span>
              <textarea
                placeholder="Brief summary or excerpt..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                className="flex-1 bg-neutral-200/30 border border-neutral-300 rounded p-2 focus:outline-none focus:border-neutral-950 font-sans text-xs text-neutral-800 leading-relaxed resize-none"
              />
            </div>
          </div>

          {/* ============= Block Workspace ============= */}
          <div className="flex-1 flex flex-col min-h-[400px] mt-4 relative">
            {blocks.map((block, idx) => {
              const isDragged = idx === draggedBlockIdx;

              return (
                <div
                  key={block.id}
                  draggable={draggableBlockId === block.id}
                  onDragStart={(e) => handleBlockDragStart(e, idx)}
                  onDragOver={(e) => handleBlockDragOver(e, idx)}
                  onDragEnd={handleBlockDragEnd}
                  onMouseDown={(e) => handleBlockMouseDown(e, block.id, idx)}
                  onMouseEnter={(e) => handleBlockMouseEnter(e, block.id, idx)}
                  className={`group relative flex items-start gap-2 py-0.5 px-1 rounded transition-all duration-150 ${
                    isDragged ? "opacity-30 bg-neutral-300 border border-dashed border-neutral-900"
                    : selectedBlockIds.has(block.id) ? "bg-blue-50 ring-2 ring-blue-300 ring-inset"
                    : "hover:bg-neutral-200/40"
                  }`}
                  style={{ animation: "blockAppear 0.15s ease-out" }}
                >
                  {/* Left Gutter */}
                  <div className="absolute left-[-88px] top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity select-none z-10 bg-[#ebeae4] px-1 py-0.5 rounded shadow-sm border border-neutral-300">
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setSlashBlockId(block.id);
                        setSlashPosition({
                          x: rect.left + window.scrollX + 24,
                          y: rect.bottom + window.scrollY + 4
                        });
                        setSlashQuery("");
                      }}
                      className="p-1 hover:bg-neutral-300 text-neutral-500 hover:text-neutral-950 rounded"
                    >
                      <Plus size={12} />
                    </button>
                    <div
                      onMouseEnter={() => setDraggableBlockId(block.id)}
                      onMouseLeave={() => {
                        if (draggedBlockIdx === null) {
                          setDraggableBlockId(null);
                        }
                      }}
                      className="p-1 cursor-grab active:cursor-grabbing hover:bg-neutral-300 text-neutral-400 hover:text-neutral-950 rounded"
                    >
                      <GripVertical size={12} />
                    </div>
                    <button
                      onClick={(e) => openBlockMenu(e, block.id)}
                      className="p-1 hover:bg-neutral-300 text-neutral-500 hover:text-neutral-950 rounded font-mono text-[9px]"
                    >
                      •••
                    </button>
                  </div>

                  {/* ============= Block Renderers ============= */}
                  <div className="flex-1 text-left w-full">

                    {/* --- H1 --- */}
                    {block.type === "h1" && (
                      <div className="relative">
                        <ContentEditable
                          blockId={block.id}
                          content={block.content}
                          onKeyDown={(e) => handleBlockKeyDown(e, block.id, idx)}
                          onInput={(e) => handleBlockInput(e, block.id, idx)}
                          onFocus={() => handleBlockFocus(block.id)}
                          onBlur={() => handleBlockBlur(block.id)}
                          className="font-display font-black text-2xl text-neutral-950 uppercase border-none outline-none w-full tracking-tight mt-3 mb-1"
                        />
                        {!block.content && focusedBlockId !== block.id && (
                          <span className="absolute top-3 left-0 text-neutral-300 text-2xl font-display font-black uppercase pointer-events-none select-none">Heading 1</span>
                        )}
                      </div>
                    )}

                    {/* --- H2 --- */}
                    {block.type === "h2" && (
                      <div className="relative">
                        <ContentEditable
                          blockId={block.id}
                          content={block.content}
                          onKeyDown={(e) => handleBlockKeyDown(e, block.id, idx)}
                          onInput={(e) => handleBlockInput(e, block.id, idx)}
                          onFocus={() => handleBlockFocus(block.id)}
                          onBlur={() => handleBlockBlur(block.id)}
                          className="font-mono font-bold text-lg text-neutral-900 border-none outline-none w-full uppercase mt-2 mb-1"
                        />
                        {!block.content && focusedBlockId !== block.id && (
                          <span className="absolute top-2 left-0 text-neutral-300 text-lg font-mono font-bold uppercase pointer-events-none select-none">Heading 2</span>
                        )}
                      </div>
                    )}

                    {/* --- Quote --- */}
                    {block.type === "quote" && (
                      <div className="flex items-stretch gap-3 pl-1.5 border-l-4 border-neutral-950 italic text-neutral-600 text-sm my-1">
                        <ContentEditable
                          blockId={block.id}
                          content={block.content}
                          onKeyDown={(e) => handleBlockKeyDown(e, block.id, idx)}
                          onInput={(e) => handleBlockInput(e, block.id, idx)}
                          onFocus={() => handleBlockFocus(block.id)}
                          onBlur={() => handleBlockBlur(block.id)}
                          className="border-none outline-none w-full bg-transparent"
                        />
                      </div>
                    )}

                    {/* --- Bullet --- */}
                    {block.type === "bullet" && (
                      <div className="flex items-start gap-2.5 pl-2 my-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-2 flex-shrink-0" />
                        <ContentEditable
                          blockId={block.id}
                          content={block.content}
                          onKeyDown={(e) => handleBlockKeyDown(e, block.id, idx)}
                          onInput={(e) => handleBlockInput(e, block.id, idx)}
                          onFocus={() => handleBlockFocus(block.id)}
                          onBlur={() => handleBlockBlur(block.id)}
                          className="border-none outline-none w-full bg-transparent text-sm leading-relaxed"
                        />
                      </div>
                    )}

                    {/* --- Todo / Checklist --- */}
                    {block.type === "todo" && (
                      <div className="flex items-center gap-2.5 pl-2 my-0.5 font-mono text-xs">
                        <input
                          type="checkbox"
                          checked={!!block.properties?.checked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, properties: { ...b.properties, checked } } : b));
                          }}
                          className="w-3.5 h-3.5 border-neutral-400 text-neutral-950 focus:ring-neutral-950 rounded cursor-pointer"
                        />
                        <ContentEditable
                          blockId={block.id}
                          content={block.content}
                          onKeyDown={(e) => handleBlockKeyDown(e, block.id, idx)}
                          onInput={(e) => handleBlockInput(e, block.id, idx)}
                          onFocus={() => handleBlockFocus(block.id)}
                          onBlur={() => handleBlockBlur(block.id)}
                          className={`border-none outline-none w-full bg-transparent font-sans text-sm ${block.properties?.checked ? "line-through text-neutral-400" : "text-neutral-800"}`}
                        />
                      </div>
                    )}

                    {/* --- Callout --- */}
                    {block.type === "callout" && (
                      <div className="bg-neutral-200/50 border border-neutral-300 rounded p-4 flex gap-3 my-2 select-text">
                        <input
                          type="text"
                          value={block.properties?.emoji || "💡"}
                          onChange={(e) => {
                            const emoji = e.target.value;
                            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, properties: { ...b.properties, emoji } } : b));
                          }}
                          className="w-8 h-8 text-center text-lg bg-neutral-300/40 hover:bg-neutral-300 rounded border-none outline-none"
                        />
                        <ContentEditable
                          blockId={block.id}
                          content={block.content}
                          onKeyDown={(e) => handleBlockKeyDown(e, block.id, idx)}
                          onInput={(e) => handleBlockInput(e, block.id, idx)}
                          onFocus={() => handleBlockFocus(block.id)}
                          onBlur={() => handleBlockBlur(block.id)}
                          className="border-none outline-none w-full bg-transparent text-sm leading-relaxed"
                        />
                      </div>
                    )}

                    {/* --- Math / LaTeX --- */}
                    {block.type === "math" && (
                      <div className="bg-neutral-200/30 border border-neutral-300 rounded p-4 my-2 text-center select-text font-serif italic text-base flex flex-col gap-2 items-center">
                        <div className="font-mono text-[9px] uppercase font-bold text-neutral-400 select-none">LaTeX Block Equation</div>
                        <input
                          type="text"
                          value={block.content}
                          onChange={(e) => {
                            const content = e.target.value;
                            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content } : b));
                          }}
                          className="bg-transparent border-b border-neutral-300 focus:border-neutral-900 w-full text-center py-1 outline-none text-sm font-mono"
                        />
                        <div className="text-xl font-bold tracking-wide mt-2 text-neutral-900">
                          {block.content || "E = mc²"}
                        </div>
                      </div>
                    )}

                    {/* --- Toggle --- */}
                    {block.type === "toggle" && (
                      <div className="pl-1.5 my-1.5 select-text">
                        <div className="flex items-center gap-1.5 font-bold">
                          <button
                            onClick={() => {
                              const isOpen = !block.properties?.isOpen;
                              setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, properties: { ...b.properties, isOpen } } : b));
                            }}
                            className="p-1 hover:bg-neutral-300 rounded text-neutral-600 transition-transform"
                          >
                            {block.properties?.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          <ContentEditable
                            blockId={block.id}
                            content={block.content}
                            onKeyDown={(e) => handleBlockKeyDown(e, block.id, idx)}
                            onInput={(e) => handleBlockInput(e, block.id, idx)}
                            onFocus={() => handleBlockFocus(block.id)}
                            onBlur={() => handleBlockBlur(block.id)}
                            className="border-none outline-none w-full bg-transparent text-sm"
                          />
                        </div>
                        {block.properties?.isOpen && (
                          <div className="pl-8 border-l border-neutral-300 mt-2 py-1 select-text transition-all duration-200">
                            <span className="font-mono text-[9px] text-neutral-400 uppercase select-none flex items-center gap-1">
                              <CornerDownRight size={10} /> Nested Toggle Workspace
                            </span>
                            <textarea
                              placeholder="Write foldout nested summary info..."
                              value={block.properties?.bgColor || ""}
                              onChange={(e) => {
                                const bgColor = e.target.value;
                                setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, properties: { ...b.properties, bgColor } } : b));
                              }}
                              className="w-full bg-transparent border-none outline-none focus:ring-0 font-mono text-xs leading-relaxed text-neutral-500 mt-1 resize-none h-16"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- Code Block --- */}
                    {block.type === "code" && (
                      <div className="bg-neutral-900 border border-neutral-800 rounded p-4 my-2 text-[#ebeae4] font-mono text-xs select-text flex flex-col gap-2 relative">
                        <div className="flex justify-between items-center pb-2 border-b border-neutral-800 select-none">
                          <select
                            value={block.properties?.language || "javascript"}
                            onChange={(e) => {
                              const language = e.target.value;
                              setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, properties: { ...b.properties, language } } : b));
                            }}
                            className="bg-neutral-800 text-[#ebeae4] border border-neutral-700 px-2 py-0.5 rounded text-[10px] outline-none"
                          >
                            <option value="python">Python</option>
                            <option value="cpp">C++</option>
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                            <option value="sql">SQL</option>
                            <option value="bash">Bash</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                          </select>
                          <span className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Code Block</span>
                        </div>
                        <textarea
                          placeholder="Write code block content..."
                          value={block.content}
                          onChange={(e) => {
                            const content = e.target.value;
                            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content } : b));
                          }}
                          className="w-full bg-transparent border-none outline-none focus:ring-0 font-mono text-xs leading-relaxed text-emerald-300 resize-none h-32"
                        />
                      </div>
                    )}

                    {/* --- Table --- */}
                    {block.type === "table" && (
                      <div className="bg-white/40 border border-neutral-300 rounded p-4 my-2 overflow-x-auto select-text">
                        <div className="font-mono text-[9px] uppercase font-bold text-neutral-400 mb-2 select-none flex justify-between items-center">
                          <span>Notion Grid Table Block</span>
                          <button
                            onClick={() => {
                              if (block.properties?.tableData) {
                                const tableData = block.properties.tableData.map(row => [...row]);
                                const newRow = Array(tableData[0].length).fill("");
                                tableData.push(newRow);
                                setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, properties: { ...b.properties, tableData } } : b));
                              }
                            }}
                            className="px-2 py-0.5 bg-neutral-900 text-[#ebeae4] hover:bg-neutral-800 text-[8px] rounded uppercase font-bold"
                          >
                            + Add Row
                          </button>
                        </div>
                        {block.properties?.tableData && (
                          <table className="border-collapse w-full font-mono text-xs">
                            <tbody>
                              {block.properties.tableData.map((row: string[], rIdx: number) => (
                                <tr key={rIdx} className={rIdx === 0 ? "bg-neutral-200/50" : ""}>
                                  {row.map((cell: string, cIdx: number) => (
                                    <td key={cIdx} className="border border-neutral-400 p-1 min-w-[80px]">
                                      <input
                                        type="text"
                                        value={cell}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const tableData = block.properties!.tableData!.map(r => [...r]);
                                          tableData[rIdx][cIdx] = val;
                                          setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, properties: { ...b.properties, tableData } } : b));
                                        }}
                                        className="w-full bg-transparent border-none outline-none text-neutral-950 text-xs px-1 py-0.5"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* --- Image Block --- */}
                    {block.type === "image" && (
                      <div
                        className="my-3 relative group/img select-text"
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.dataTransfer.files?.[0]) {
                            processImageForBlock(e.dataTransfer.files[0], block.id);
                          }
                        }}
                      >
                        {block.properties?.imageUrl ? (
                          <>
                            {/* Resizable image container */}
                            <div
                              data-img-wrapper
                              className="relative mx-auto"
                              style={{ width: `${block.properties?.imageWidth ?? 100}%` }}
                            >
                              <img
                                src={block.properties.imageUrl}
                                alt={block.content || "Uploaded image"}
                                className="w-full rounded border border-neutral-300 shadow-sm"
                                draggable={false}
                              />

                              {/* Width % indicator during resize */}
                              {resizingBlockId === block.id && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-950/85 text-white px-3 py-1.5 rounded-lg text-sm font-mono font-bold z-30 pointer-events-none shadow-lg">
                                  {block.properties?.imageWidth ?? 100}%
                                </div>
                              )}

                              {/* Left resize handle */}
                              <div
                                className={`absolute left-[-6px] top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center z-20 transition-opacity ${resizingBlockId === block.id ? 'opacity-100' : 'opacity-0 group-hover/img:opacity-100'}`}
                                onMouseDown={(e) => handleResizeStart(e, block.id)}
                              >
                                <div className="w-1.5 h-16 bg-neutral-400 hover:bg-blue-500 rounded-full transition-colors shadow" />
                              </div>

                              {/* Right resize handle */}
                              <div
                                className={`absolute right-[-6px] top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center z-20 transition-opacity ${resizingBlockId === block.id ? 'opacity-100' : 'opacity-0 group-hover/img:opacity-100'}`}
                                onMouseDown={(e) => handleResizeStart(e, block.id)}
                              >
                                <div className="w-1.5 h-16 bg-neutral-400 hover:bg-blue-500 rounded-full transition-colors shadow" />
                              </div>

                              {/* Action buttons (top-right) */}
                              <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity z-20">
                                <button
                                  onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.accept = "image/*";
                                    input.onchange = (ev) => {
                                      const file = (ev.target as HTMLInputElement).files?.[0];
                                      if (file) processImageForBlock(file, block.id);
                                    };
                                    input.click();
                                  }}
                                  className="bg-neutral-950/80 hover:bg-neutral-700 text-white p-1.5 rounded font-mono text-[9px] uppercase font-bold flex items-center gap-1"
                                >
                                  <Upload size={10} /> Replace
                                </button>
                                <button
                                  onClick={() => deleteBlock(block.id)}
                                  className="bg-neutral-950/80 hover:bg-red-600 text-white p-1.5 rounded"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Quick size presets */}
                            <div className="flex justify-center gap-1 mt-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                              {[25, 50, 75, 100].map(pct => (
                                <button
                                  key={pct}
                                  onClick={() => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, properties: { ...b.properties, imageWidth: pct } } : b))}
                                  className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors ${
                                    (block.properties?.imageWidth ?? 100) === pct
                                      ? 'bg-neutral-950 text-white border-neutral-950'
                                      : 'bg-white text-neutral-500 border-neutral-300 hover:border-neutral-900 hover:text-neutral-900'
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>

                            {/* Caption */}
                            <ContentEditable
                              blockId={block.id}
                              content={block.content || ""}
                              onKeyDown={(e) => handleBlockKeyDown(e, block.id, idx)}
                              onInput={(e) => handleBlockInput(e, block.id, idx)}
                              onFocus={() => handleBlockFocus(block.id)}
                              onBlur={() => handleBlockBlur(block.id)}
                              className="text-center text-xs text-neutral-400 mt-2 italic border-none outline-none w-full bg-transparent min-h-[1.2em]"
                            />
                            {!block.content && focusedBlockId !== block.id && (
                              <p className="text-center text-xs text-neutral-300 italic pointer-events-none select-none mt-[-1.2em]">Add a caption...</p>
                            )}
                          </>
                        ) : (
                          <div
                            className="border-2 border-dashed border-neutral-300 hover:border-neutral-500 rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-colors relative"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/*";
                              input.onchange = (ev) => {
                                const file = (ev.target as HTMLInputElement).files?.[0];
                                if (file) processImageForBlock(file, block.id);
                              };
                              input.click();
                            }}
                          >
                            <ImagePlus size={32} className="text-neutral-300 mb-3" />
                            <p className="font-mono text-xs text-neutral-400 uppercase font-bold">Click to upload or drop image</p>
                            <p className="font-mono text-[9px] text-neutral-300 mt-1">PNG, JPG, WEBP • MAX 2MB</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* --- Synced Block --- */}
                    {block.type === "synced" && (
                      <div className="border border-red-300 bg-red-50/10 rounded p-4 my-2 select-text">
                        <div className="font-mono text-[9px] uppercase font-bold text-red-500 mb-2 select-none flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span>Synced Block Matrix (Global Updates)</span>
                        </div>
                        <input
                          type="text"
                          value={block.properties?.syncedId || "footer-info"}
                          onChange={(e) => {
                            const syncedId = e.target.value;
                            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, properties: { ...b.properties, syncedId } } : b));
                          }}
                          className="bg-neutral-200/40 border border-neutral-300 focus:border-neutral-900 rounded px-2 py-1 outline-none text-[10px] font-mono mb-2"
                          placeholder="Synced block key"
                        />
                        <ContentEditable
                          blockId={block.id}
                          content={block.content}
                          onKeyDown={(e) => handleBlockKeyDown(e, block.id, idx)}
                          onInput={(e) => handleBlockInput(e, block.id, idx)}
                          onFocus={() => handleBlockFocus(block.id)}
                          onBlur={() => handleBlockBlur(block.id)}
                          className="border-none outline-none w-full bg-transparent text-sm leading-relaxed"
                        />
                      </div>
                    )}

                    {/* --- Table of Contents --- */}
                    {block.type === "toc" && (
                      <div className="bg-neutral-100/40 border border-neutral-300 rounded p-4 my-2 select-none font-mono text-xs text-neutral-700">
                        <div className="font-mono text-[9px] uppercase font-bold text-neutral-400 mb-3 select-none flex items-center gap-1.5">
                          <AlignLeft size={12} />
                          <span>Table of Contents (Auto-Generated)</span>
                        </div>
                        {getHeadings().length > 0 ? (
                          <div className="space-y-1.5 text-left pl-2">
                            {getHeadings().map((h, hIdx) => (
                              <div
                                key={h.id || hIdx}
                                className={`flex items-center gap-2 text-neutral-600 hover:text-neutral-950 transition-colors ${
                                  h.type === "h2" ? "pl-4 text-[11px]" : "font-bold text-xs"
                                }`}
                              >
                                <span className="text-neutral-400">#</span>
                                <span>{h.content.replace(/<[^>]*>/g, "") || "Heading"}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-neutral-400 text-[10px] italic">No headings created yet. Headings added to document will list here.</div>
                        )}
                      </div>
                    )}

                    {/* --- Paragraph (default) --- */}
                    {block.type === "paragraph" && (
                      <div className="relative">
                        <ContentEditable
                          blockId={block.id}
                          content={block.content}
                          onKeyDown={(e) => handleBlockKeyDown(e, block.id, idx)}
                          onInput={(e) => handleBlockInput(e, block.id, idx)}
                          onFocus={() => handleBlockFocus(block.id)}
                          onBlur={() => handleBlockBlur(block.id)}
                          className="border-none outline-none w-full bg-transparent text-sm leading-relaxed text-neutral-800 min-h-[1.5em]"
                        />
                        {!block.content && focusedBlockId !== block.id && (
                          <span className="absolute top-0 left-0 text-neutral-300 text-sm pointer-events-none select-none">
                            Type &apos;/&apos; for commands...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Click-to-add area below blocks */}
            <div
              className="flex-1 min-h-[200px] cursor-text"
              onClick={() => {
                const lastBlock = blocks[blocks.length - 1];
                if (lastBlock && lastBlock.content === "" && lastBlock.type === "paragraph") {
                  const el = document.querySelector(`[data-block-id="${lastBlock.id}"]`) as HTMLDivElement;
                  el?.focus();
                } else {
                  const newBlock: EditorBlock = {
                    id: `b-${Date.now()}-new`,
                    type: "paragraph",
                    content: ""
                  };
                  setBlocks(prev => [...prev, newBlock]);
                  setTimeout(() => {
                    const el = document.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLDivElement;
                    el?.focus();
                  }, 30);
                }
              }}
            />
          </div>
        </main>

        {/* ============= Slash Command Menu ============= */}
        {slashBlockId && (
          <div
            data-slash-menu
            style={{ top: `${slashPosition.y}px`, left: `${slashPosition.x}px` }}
            className="absolute z-50 w-64 bg-white border border-neutral-950 rounded-lg shadow-2xl font-mono text-[11px] p-1.5 flex flex-col gap-0.5 select-none max-h-[360px] overflow-y-auto"
          >
            <div className="px-2 py-1.5 text-[9px] text-neutral-400 uppercase font-black tracking-wider border-b border-neutral-200 mb-1">
              {slashQuery ? `Search: "${slashQuery}"` : "Convert to block"}
            </div>

            {filteredSlashCommands.map(cmd => (
              <button
                key={cmd.type}
                onClick={() => changeBlockType(slashBlockId, cmd.type)}
                className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-neutral-100 rounded transition-colors"
              >
                {cmd.icon}
                <div>
                  <div className="font-bold text-neutral-800">{cmd.label}</div>
                  <div className="text-[9px] text-neutral-400">{cmd.description}</div>
                </div>
              </button>
            ))}

            {filteredSlashCommands.length === 0 && (
              <div className="px-3 py-4 text-center text-neutral-400 text-[10px]">No matching blocks found.</div>
            )}
          </div>
        )}

        {/* ============= Block Context Menu ============= */}
        {activeMenuBlockId && (
          <div
            data-block-menu
            style={{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }}
            className="absolute z-50 w-44 bg-white border border-neutral-950 rounded shadow-2xl font-mono text-[10px] p-1 flex flex-col gap-0.5 select-none"
          >
            <button
              onClick={() => deleteBlock(activeMenuBlockId)}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-red-50 text-red-600 rounded"
            >
              <Trash2 size={12} />
              <span>DELETE BLOCK</span>
            </button>
            <button
              onClick={() => {
                const newBlocks = [...blocks];
                const idx = newBlocks.findIndex(b => b.id === activeMenuBlockId);
                if (idx >= 0) {
                  const duplicate: EditorBlock = {
                    ...newBlocks[idx],
                    id: `b-${Date.now()}-dup`
                  };
                  newBlocks.splice(idx + 1, 0, duplicate);
                  setBlocks(newBlocks);
                }
                setActiveMenuBlockId(null);
              }}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 hover:bg-neutral-100 text-neutral-700 rounded"
            >
              <span>DUPLICATE BLOCK</span>
            </button>
            <button
              onClick={() => setActiveMenuBlockId(null)}
              className="flex items-center justify-center w-full px-2 py-1 border-t border-neutral-200 text-neutral-400 font-bold uppercase text-[8px] tracking-widest mt-1"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ============= Comments Sidebar ============= */}
        {commentsOpen && (
          <aside className="w-80 border-l border-neutral-300 bg-[#ebeae4]/70 backdrop-blur px-6 py-8 flex flex-col justify-between font-mono text-xs select-none">
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-neutral-300 pb-3">
                <span className="font-bold text-neutral-800 uppercase flex items-center gap-1.5">
                  <MessageSquare size={14} /> Discussions
                </span>
                <button
                  onClick={() => setCommentsOpen(false)}
                  className="text-neutral-400 hover:text-neutral-950 font-bold"
                >
                  [HIDE]
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[400px] pr-1 select-text">
                {comments.map((c) => (
                  <div key={c.id} className="bg-white p-3 border border-neutral-300 rounded space-y-1.5">
                    <div className="flex justify-between text-[9px] text-neutral-400 font-black">
                      <span>@{c.author.toUpperCase()}</span>
                      <span>{c.time} UTC</span>
                    </div>
                    <p className="text-neutral-700 text-left leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-300 mt-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newComment.trim()) return;
                  const c = {
                    id: `c-${Date.now()}`,
                    author: "Miles",
                    text: newComment,
                    time: new Date().toISOString().split("T")[1].slice(0, 5)
                  };
                  setComments(prev => [...prev, c]);
                  setNewComment("");
                }}
                className="space-y-2"
              >
                <textarea
                  placeholder="Ask a question or type @mention..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full border border-neutral-300 p-2 text-xs rounded bg-white font-sans outline-none focus:border-neutral-950 h-16 resize-none"
                />
                <button
                  type="submit"
                  className="w-full bg-neutral-950 hover:bg-neutral-800 text-[#ebeae4] py-1.5 font-bold uppercase rounded text-[10px]"
                >
                  Post Comment
                </button>
              </form>
            </div>
          </aside>
        )}
      </div>

      {/* ============= Selection Floating Toolbar ============= */}
      {selectedBlockIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-950 text-[#ebeae4] px-5 py-2.5 rounded-xl shadow-2xl font-mono text-xs"
          style={{ animation: "fadeIn 0.15s ease-out" }}
        >
          <span className="font-bold text-blue-300">{selectedBlockIds.size} block{selectedBlockIds.size > 1 ? "s" : ""} selected</span>
          <span className="w-px h-4 bg-neutral-700" />
          <button
            onClick={deleteSelectedBlocks}
            className="flex items-center gap-1 px-2 py-1 hover:bg-red-600 rounded text-[10px] uppercase font-bold transition-colors"
          >
            <Trash2 size={12} /> Delete
          </button>
          <button
            onClick={duplicateSelectedBlocks}
            className="flex items-center gap-1 px-2 py-1 hover:bg-neutral-700 rounded text-[10px] uppercase font-bold transition-colors"
          >
            <Plus size={12} /> Duplicate
          </button>
          <button
            onClick={() => setSelectedBlockIds(new Set())}
            className="flex items-center gap-1 px-2 py-1 hover:bg-neutral-700 rounded text-[10px] uppercase font-bold transition-colors"
          >
            Esc
          </button>
        </div>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes blockAppear {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
