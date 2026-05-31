export function getAPI(): typeof chrome {
  return (typeof browser !== 'undefined' ? browser : chrome) as unknown as typeof chrome;
}

export function openUrl(url: string, takeFocus: boolean): void {
  if (!url.startsWith('http:') && !url.startsWith('https:')) return;
  getAPI().tabs.create({ url, active: takeFocus });
}

export function openOptionsPage(): void {
  getAPI().runtime.openOptionsPage();
}

export function isValidHttpUrl(url: string): boolean {
  return url.startsWith('http:') || url.startsWith('https:');
}
