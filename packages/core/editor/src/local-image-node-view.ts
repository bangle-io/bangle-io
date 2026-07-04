import type {
  EditorView,
  NodeView,
  NodeViewConstructor,
  PMNode,
} from '@bangle.io/prosemirror-plugins';
import { resolveLocalMarkdownAsset } from '@bangle.io/ws-path';

type FileSystem = {
  readFile: (wsPath: string) => Promise<File | undefined>;
};

const DIRECT_IMAGE_SRC_RE = /^(?:https?:\/\/|blob:|data:image\/)/i;

export function createLocalImageNodeView({
  currentWsPath,
  fileSystem,
}: {
  currentWsPath: string;
  fileSystem: FileSystem;
}): NodeViewConstructor {
  return (node: PMNode, view: EditorView): NodeView => {
    return new LocalImageNodeView(node, view, currentWsPath, fileSystem);
  };
}

class LocalImageNodeView implements NodeView {
  dom: HTMLImageElement;

  private objectUrl: string | undefined;
  private readVersion = 0;

  constructor(
    private node: PMNode,
    private view: EditorView,
    private currentWsPath: string,
    private fileSystem: FileSystem,
  ) {
    this.dom = document.createElement('img');
    this.render(node);
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) {
      return false;
    }
    const srcChanged = node.attrs.src !== this.node.attrs.src;
    const altChanged = node.attrs.alt !== this.node.attrs.alt;
    const titleChanged = node.attrs.title !== this.node.attrs.title;
    this.node = node;
    if (srcChanged) {
      this.render(node);
    } else if (altChanged || titleChanged) {
      this.applyTextAttributes(node);
    }
    return true;
  }

  destroy(): void {
    this.revokeObjectUrl();
    this.readVersion += 1;
  }

  private applyTextAttributes(node: PMNode): void {
    const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : '';
    const title = typeof node.attrs.title === 'string' ? node.attrs.title : '';
    this.dom.alt = alt;
    if (title) {
      this.dom.title = title;
    } else {
      this.dom.removeAttribute('title');
    }
  }

  private render(node: PMNode): void {
    const version = ++this.readVersion;
    this.revokeObjectUrl();
    this.applyTextAttributes(node);
    const src = typeof node.attrs.src === 'string' ? node.attrs.src : '';
    this.dom.classList.remove('bangle-local-image-broken');

    if (!src) {
      this.markBroken();
      return;
    }

    if (DIRECT_IMAGE_SRC_RE.test(src)) {
      this.dom.src = src;
      return;
    }

    const assetWsPath = resolveLocalMarkdownAsset(this.currentWsPath, src);
    if (!assetWsPath) {
      this.markBroken();
      return;
    }

    this.dom.removeAttribute('src');
    this.dom.dataset.localImageLoading = 'true';
    void this.fileSystem
      .readFile(assetWsPath.wsPath)
      .then((file) => {
        if (version !== this.readVersion || this.view.isDestroyed) {
          return;
        }
        if (!file) {
          this.markBroken();
          return;
        }
        this.revokeObjectUrl();
        this.objectUrl = URL.createObjectURL(file);
        this.dom.src = this.objectUrl;
        this.dom.classList.remove('bangle-local-image-broken');
      })
      .catch(() => {
        if (version === this.readVersion) {
          this.markBroken();
        }
      })
      .finally(() => {
        if (version === this.readVersion) {
          delete this.dom.dataset.localImageLoading;
        }
      });
  }

  private markBroken(): void {
    this.revokeObjectUrl();
    this.dom.removeAttribute('src');
    this.dom.classList.add('bangle-local-image-broken');
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
  }
}
