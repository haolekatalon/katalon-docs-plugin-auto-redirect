import { PluginOptions as PluginClientRedirectsOptions } from '@docusaurus/plugin-client-redirects';
export interface RedirectRule {
    to: string;
    from: string | string[];
}
export interface DocumentUrlHistory {
    id: string;
    from: string[];
    to: string;
    removed?: boolean;
}
export interface DocumentMetaData {
    id: string;
    unversionedId: string;
    slug: string;
    permalink: string;
    source: string;
    version: string;
}
export interface DocumentTrackingLib {
    trackChanges(): Promise<DocumentUrlHistory[]>;
}
export interface StorageLib<T> {
    getInstance(): T;
}
export interface S3Config {
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    key: string;
    region: string;
}
export interface PluginOptions extends PluginClientRedirectsOptions {
    s3Config: {
        accessKeyId: string;
        secretAccessKey: string;
        bucket: string;
        key?: string;
        region?: string;
    };
}
export interface DocusaurusGlobalData {
    'docusaurus-plugin-content-docs': {
        default: {
            versions: {
                name: string;
                path: string;
                docs: {
                    id: string;
                    path: string;
                }[];
            }[];
        };
    };
}
export interface DocusaurusGlobalDataSplit {
    'docusaurus-plugin-content-docs': {
        [key: string]: {
            versions: {
                name: string;
                path: string;
                isLast: boolean;
                docs: {
                    id: string;
                    path: string;
                }[];
            }[];
        };
    };
}
