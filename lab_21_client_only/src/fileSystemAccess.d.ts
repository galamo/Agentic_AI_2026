export {}

declare global {
  interface FilePickerAcceptType {
    description?: string
    accept: Record<string, string[]>
  }

  interface OpenFilePickerOptions {
    multiple?: boolean
    types?: FilePickerAcceptType[]
  }

  interface SaveFilePickerOptions {
    suggestedName?: string
    types?: FilePickerAcceptType[]
  }

  interface FileSystemFileHandle {
    queryPermission(descriptor?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
    requestPermission(descriptor?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  }

  interface Window {
    showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>
  }
}
