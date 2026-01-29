/**
 * @jest-environment jsdom
 */

const core = require('../js/core');
Object.assign(global, core);

describe('Main Background Script', () => {
    let main;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(global, 'setTimeout');
        global.UpdateIfReady = jest.fn();
        global.SetInitialOption = jest.fn();

        // Reset module registry to re-run main.js
        jest.resetModules();
        main = require('../js/main');
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('initializes options on load', () => {
        expect(global.SetInitialOption).toHaveBeenCalledWith("HN.RequestInterval", 1200000);
        expect(global.SetInitialOption).toHaveBeenCalledWith("LWN.RequestInterval", 1200000);
    });

    it('startRequest calls UpdateIfReady and schedules next', () => {
        // main.js calls startRequest() on load
        // First call should have been made
        expect(global.UpdateIfReady).toHaveBeenCalledWith("HN", true); // firstRequest = true
        expect(global.UpdateIfReady).toHaveBeenCalledWith("LWN", true);

        // Check timeout
        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000);

        // Fast forward
        global.UpdateIfReady.mockClear();
        jest.runOnlyPendingTimers();

        // Should call again with false (not first request)
        // Wait, 'startRequest' is exported but 'firstRequest' is internal var.
        // The closure maintains state.

        // The require caused the first run.
        // The timeout callback is the 'startRequest' function reference.
        // In main.js: window.setTimeout(startRequest, 60000);

        // So running timer executes startRequest() again.
        expect(global.UpdateIfReady).toHaveBeenCalledWith("HN", false);
    });

    it('exported startRequest can be called manually', () => {
        global.UpdateIfReady.mockClear();
        main.startRequest();
        // Depends on internal state of 'firstRequest', which is false after first run on load
        expect(global.UpdateIfReady).toHaveBeenCalled();
    });
});
