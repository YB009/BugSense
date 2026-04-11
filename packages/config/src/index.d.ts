interface LoadEnvOptions {
    serviceName?: string;
    includeInfraEnv?: boolean;
}
export declare function loadEnvFiles(options?: LoadEnvOptions): void;
export declare function parseProjectApiKeys(rawValue: string | undefined): Record<string, string>;
export {};
