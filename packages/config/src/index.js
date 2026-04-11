"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnvFiles = loadEnvFiles;
exports.parseProjectApiKeys = parseProjectApiKeys;
const fs_1 = require("fs");
const path_1 = require("path");
function loadEnvFiles(options = {}) {
    const cwd = process.cwd();
    const candidates = [
        (0, path_1.join)(cwd, '.env'),
        (0, path_1.join)(cwd, '.env.local'),
    ];
    if (options.serviceName) {
        candidates.push((0, path_1.join)(cwd, 'apps', options.serviceName, '.env'), (0, path_1.join)(cwd, 'apps', options.serviceName, '.env.local'));
    }
    if (options.includeInfraEnv) {
        candidates.push((0, path_1.join)(cwd, 'infra', '.env'));
    }
    for (const filePath of candidates) {
        loadEnvFile(filePath);
    }
}
function parseProjectApiKeys(rawValue) {
    if (!rawValue) {
        return {};
    }
    return rawValue
        .split(',')
        .map((pair) => pair.trim())
        .filter(Boolean)
        .reduce((acc, pair) => {
        const separatorIndex = pair.indexOf(':');
        if (separatorIndex <= 0) {
            return acc;
        }
        const projectId = pair.slice(0, separatorIndex).trim();
        const apiKey = pair.slice(separatorIndex + 1).trim();
        if (projectId && apiKey) {
            acc[projectId] = apiKey;
        }
        return acc;
    }, {});
}
function loadEnvFile(filePath) {
    if (!(0, fs_1.existsSync)(filePath)) {
        return;
    }
    const contents = (0, fs_1.readFileSync)(filePath, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex <= 0) {
            continue;
        }
        const key = trimmed.slice(0, separatorIndex).trim();
        const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim());
        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}
function stripQuotes(value) {
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    return value;
}
//# sourceMappingURL=index.js.map