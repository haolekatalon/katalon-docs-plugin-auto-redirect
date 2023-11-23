"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_client_redirects_1 = __importDefault(require("@docusaurus/plugin-client-redirects"));
const path_1 = __importDefault(require("path"));
const documentTracking_1 = __importDefault(require("./libs/documentTracking"));
const utils_1 = require("./utils");
function pluginAutoRedirect(context, options) {
    const lib = new documentTracking_1.default((0, utils_1.getS3Config)(options));
    const pluginPostBuild = async (props) => {
        const trackedChanges = await lib.trackChanges(path_1.default.resolve(__dirname, '../../../.docusaurus/docusaurus-plugin-content-docs'));
        const { postBuild } = (0, plugin_client_redirects_1.default)(context, {
            ...options,
            fromExtensions: [],
            toExtensions: [],
            redirects: (0, utils_1.getRedirectRules)(trackedChanges),
        });
        postBuild && await postBuild(props);
    };
    return {
        name: 'plugin-auto-redirect',
        postBuild: pluginPostBuild,
    };
}
exports.default = pluginAutoRedirect;
