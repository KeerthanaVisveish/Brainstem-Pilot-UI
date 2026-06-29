/** File System Access API (Chrome/Edge) — not in all DOM lib versions. */
interface FileSystemHandle {
  readonly kind: 'file' | 'directory';
  readonly name: string;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory';
}

interface Window {
  showDirectoryPicker?(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
}
