/**
 * @jest-environment jsdom
 */

describe('Background Wrapper', () => {
    it('imports scripts successfully', () => {
        global.importScripts = jest.fn();
        jest.resetModules();
        require('../js/background-wrapper');

        expect(global.importScripts).toHaveBeenCalledWith('core.js', 'main.js');
    });

    it('handles import error', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        global.importScripts = jest.fn(() => { throw new Error('Import failed'); });

        jest.resetModules();
        require('../js/background-wrapper');

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to import'), expect.any(Error));
        consoleSpy.mockRestore();
    });
});
