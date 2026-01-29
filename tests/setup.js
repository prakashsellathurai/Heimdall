// Mock browser/chrome APIs for testing
global.chrome = {
    tabs: {
        create: jest.fn()
    },
    runtime: {
        openOptionsPage: jest.fn()
    }
};

global.browser = {
    tabs: {
        create: jest.fn()
    },
    runtime: {
        openOptionsPage: jest.fn()
    }
};

// Mock DOMParser
global.DOMParser = class {
    parseFromString(str, type) {
        return {
            getElementsByTagName: (tagName) => {
                // simple mock for RSS parsing
                if ((str.includes('<item>') || str.includes('<entry>')) && (tagName === 'item' || tagName === 'entry')) {
                    const items = [];
                    // Very basic regex parsing for test mocks
                    const matches = str.match(/<item>[\s\S]*?<\/item>/g) || str.match(/<entry>[\s\S]*?<\/entry>/g) || [];
                    return {
                        length: matches.length,
                        item: (i) => {
                            const content = matches[i];
                            return {
                                getElementsByTagName: (tag) => {
                                    const tagMatch = content.match(new RegExp(`<${tag}.*?>(.*?)</${tag}>`));
                                    const attrMatch = content.match(new RegExp(`<${tag}.*?href="(.*?)".*?>`));

                                    if (!tagMatch && !attrMatch) return []; // Return empty collection if not found

                                    return [{
                                        textContent: tagMatch ? tagMatch[1] : '',
                                        getAttribute: (attr) => {
                                            if (attr === 'href' && attrMatch) return attrMatch[1];
                                            return null;
                                        }
                                    }];
                                }
                            };
                        }
                    };
                }
                return { length: 0, item: () => null };
            }
        };
    }
};

// Mock XMLHttpRequest
global.XMLHttpRequest = class {
    open(method, url) {
        this.method = method;
        this.url = url;
    }
    send() {
        // Trigger onload/onerror based on url mocks setup in tests
        if (this.url.includes('error')) {
            this.onerror && this.onerror();
        } else {
            this.status = 200;
            this.responseText = this.mockResponse || '';
            this.onload && this.onload();
        }
    }
};

// Mock ActiveXObject for IE support test
global.ActiveXObject = class {
    constructor() {
        this.async = false;
    }
    loadXML() { }
};


// Clear mocks and localStorage before each test
beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
});

