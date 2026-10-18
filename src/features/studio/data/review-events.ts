const changes = new EventTarget();

export function notifyReviewChange(): void {
  changes.dispatchEvent(new Event('change'));
}

export function subscribeReviewChanges(onChange: () => void): () => void {
  changes.addEventListener('change', onChange);
  return () => changes.removeEventListener('change', onChange);
}
