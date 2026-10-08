import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Image, Table, Upload } from "@carbon/icons-react";
import { IconButton, Popover, PopoverContent } from "@carbon/react";
import { fileToCompressedDataUrl } from "@/services/imageService";
import { toast } from "@/components/toast";
import { UrlDialog } from "@/components/UrlDialog";
import { TableGridPicker } from "./TableGridPicker";

// WHY: Insert zone split into focused one-job buttons (no grab-bag menu):
// ImageMenu (URL or upload) and TableInsert (grid picker). Upload fires the
// hidden file input inside the click gesture so the browser file dialog is
// never blocked. Dialogs live here with their openers.

export function ImageMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const fileInputReference = useRef<HTMLInputElement>(null);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const { dataUrl, naturalWidth, naturalHeight } = await fileToCompressedDataUrl(file);
      // WHY: Single insert with full attrs (true pixels ride along for DOCX sizing).
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src: dataUrl, naturalWidth, naturalHeight },
        })
        .run();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add image.");
    }
  }

  return (
    <>
      <Popover open={open} onRequestClose={() => setOpen(false)} align="bottom-start" caret>
        <IconButton
          kind="ghost"
          size="sm"
          label="Insert image"
          align="bottom"
          autoAlign
          onClick={() => setOpen((currently) => !currently)}
        >
          <Image />
        </IconButton>
        <PopoverContent className="fly-popover-panel w-56">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setImageDialogOpen(true);
            }}
            className="fly-menu-row text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span className="text-muted-foreground [&>svg]:block [&>svg]:h-4 [&>svg]:w-4">
              <Image />
            </span>
            <span className="flex-1 text-left">Image from URL…</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              fileInputReference.current?.click();
            }}
            className="fly-menu-row text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span className="text-muted-foreground [&>svg]:block [&>svg]:h-4 [&>svg]:w-4">
              <Upload />
            </span>
            <span className="flex-1 text-left">Upload image…</span>
          </button>
        </PopoverContent>
      </Popover>
      <input
        ref={fileInputReference}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        aria-label="Upload image from device"
        className="hidden"
        onChange={(event) => void handleImageUpload(event)}
      />
      <UrlDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        title="Insert image"
        description="Embed an image by URL."
        placeholder="https://…"
        submitLabel="Insert image"
        validate={(url) => (/^https?:\/\//i.test(url) ? null : "Only https:// images are allowed.")}
        onSubmit={(url) => editor.chain().focus().setImage({ src: url }).run()}
      />
    </>
  );
}

export function TableInsert({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onRequestClose={() => setOpen(false)} align="bottom-start" caret>
      <IconButton
        kind="ghost"
        size="sm"
        label="Insert table"
        align="bottom"
        autoAlign
        onClick={() => setOpen((currently) => !currently)}
      >
        <Table />
      </IconButton>
      <PopoverContent className="fly-submenu-panel max-h-[80vh] overflow-y-auto">
        <TableGridPicker
          onSelect={(cols, rows) => {
            // WHY: Plain tables by default — header row is opt-in via the table menu.
            editor.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run();
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
