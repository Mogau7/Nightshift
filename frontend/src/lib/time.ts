function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) {
    return '00:00:00';
  }
  const totalSeconds = Math.floor(msLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
}

export function isRunningLow(msLeft: number): boolean {
  return msLeft > 0 && msLeft < 15 * 60 * 1000;
}
