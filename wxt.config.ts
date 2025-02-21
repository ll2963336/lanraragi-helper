import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: "LANraragi Helper",
    description: "LANraragi Helper Extension",
    icons: {
      16: "/icon/icon-16.png",
      32: "/icon/icon-32.png",
      48: "/icon/icon-48.png",
      128: "/icon/icon-128.png"
    },
    permissions: [
      'storage',
      'tabs',
      'scripting'
    ],
    host_permissions: [
      '*://*/*',  // 允许访问所有网站
      '*://*.e-hentai.org/*',
      '*://*.exhentai.org/*'
    ],

  },
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()]
  })
});
