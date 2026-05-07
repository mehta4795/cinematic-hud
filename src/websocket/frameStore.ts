let _latestBlob: Blob | null = null

export function setFrame(blob: Blob): void {
  _latestBlob = blob
}

export function getFrame(): Blob | null {
  return _latestBlob
}
