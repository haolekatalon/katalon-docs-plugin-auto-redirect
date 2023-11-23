import pluginClientRedirects from '@docusaurus/plugin-client-redirects';
import { LoadContext, Plugin } from '@docusaurus/types';
import path from 'path';

import DocumentTrackingLib from './libs/documentTracking';
import { PluginOptions } from './types';
import { getS3Config, getRedirectRules } from './utils';

export default function pluginAutoRedirect(context: LoadContext, options: PluginOptions): Plugin<void> {
  const lib = new DocumentTrackingLib(getS3Config(options));

  const pluginPostBuild: Plugin<void>['postBuild'] = async (props) => {
    const trackedChanges = await lib.trackChanges(path.resolve(__dirname, '../../../.docusaurus/docusaurus-plugin-content-docs'));

    const { postBuild } = pluginClientRedirects(context, {
      ...options,
      fromExtensions: [],
      toExtensions: [],
      redirects: getRedirectRules(trackedChanges),
    });

    postBuild && await postBuild(props);
  };

  return {
    name: 'plugin-auto-redirect',
    postBuild: pluginPostBuild,
  }
}
