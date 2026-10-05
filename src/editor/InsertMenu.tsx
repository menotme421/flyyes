import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Check, ImagePlus, Link2, Plus, SeparatorHorizontal, Upload } from "lucide-react";
import { toast } from "sonner";
import { fileToCompressedDataUrl } from "@/services/imageService";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UrlDialog } from "@/components/UrlDialog";
import { TableGridPicker } from "./TableGridPicker";

// WHY: One text-labeled Insert menu (Plus + "Insert") replacing four ribbon
// slots — link, image URL, upload, page break, and the table grid picker
// inline (no flyout needed). Controlled open state so the grid can close the
// menu on insert.
// Upload fires the hidden file input inside the item-select gesture so the
// browser file dialog is never blocked. Dialogs live here with their openers.

interface InsertMenuProperties {
  editor: Editor;
  linkActive: boolean;
  selectionEmpty: boolean;
  previousLinkHref?: string;
}

export function InsertMenu({ editor, linkActive, selectionEmpty, previousLinkHref }: InsertMenuProperties) {
  const [open, setOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
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
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Insert">
            <Plus /> Insert
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Insert</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setLinkDialogOpen(true)}>
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">Link…</span>
            {linkActive ? <Check className="h-4 w-4" /> : null}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setImageDialogOpen(true)}>
            <ImagePlus className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">Image from URL…</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInputReference.current?.click()}>
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">Upload image…</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => editor.chain().focus().setHorizontalRule().run()}>
            <SeparatorHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">Page break</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Table</p>
            <TableGridPicker
              onSelect={(cols, rows) => {
                // WHY: Plain tables by default — header row is opt-in via the table menu.
                editor.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run();
                setOpen(false);
              }}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputReference}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        aria-label="Upload image from device"
        className="hidden"
        onChange={(event) => void handleImageUpload(event)}
      />
      <UrlDialog
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        title="Insert link"
        description={
          selectionEmpty
            ? "No text selected — the link will be inserted at the cursor."
            : "Link the selected text."
        }
        placeholder="https://…"
        initialValue={previousLinkHref ?? ""}
        submitLabel={selectionEmpty ? "Insert link" : "Apply link"}
        allowEmpty
        showRemove={linkActive}
        removeLabel="Remove link"
        onRemove={() => editor.chain().focus().unsetLink().run()}
        validate={(url) => {
          if (url === "") {
            return selectionEmpty ? "Type or paste a link first." : null;
          }
          return /^https?:\/\/|^mailto:/i.test(url)
            ? null
            : "Only https:// and mailto: links are allowed.";
        }}
        onSubmit={(url) => {
          if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
          }
          if (selectionEmpty) {
            // WHY: Collapsed caret can't hold a mark visibly — insert the URL
            // as linked text (Word behavior) instead of silently arming
            // link-on-type, which confused everyone.
            editor
              .chain()
              .focus()
              .insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] })
              .run();
          } else {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
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
