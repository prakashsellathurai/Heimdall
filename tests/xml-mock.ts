export class MockXMLHttpRequest {
  static nextResponse = '';
  static nextStatus = 200;
  static nextUrlContainsError = false;

  method = '';
  url = '';
  status = 200;
  responseText = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send() {
    if (MockXMLHttpRequest.nextUrlContainsError || this.url.includes('error')) {
      this.onerror?.();
    } else {
      this.status = MockXMLHttpRequest.nextStatus;
      this.responseText = MockXMLHttpRequest.nextResponse;
      if (this.status === 200) {
        this.onload?.();
      } else {
        this.onerror?.();
      }
    }
  }
}
