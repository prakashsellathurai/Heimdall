// Mock browser/chrome APIs for testing
global.chrome = {
    tabs: {
        create: jest.fn()
    }
};

global.browser = {
    tabs: {
        create: jest.fn()
    }
};

// Clear mocks and localStorage before each test
beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});
