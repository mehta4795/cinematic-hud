interface Window {
  api: {
    saveCapture: (dataUrl: string) => Promise<string>
  }
}
