module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['**/tests/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    collectCoverageFrom: [
        'js/**/*.js',
        '!js/background.js'
    ],
    moduleFileExtensions: ['js'],
    verbose: true
};
