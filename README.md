# Directus Extension Dev Canvas


## Installation

### NPM Package

```bash
npm install directus-extension-dev-canvas -S -D
```

### Docker

Follow the [official Directus extension installation guide](https://docs.directus.io/extensions/installing-extensions.html) for Docker-based installations.

## Configuration (In your custom extension that you are developing)

1. Add a `vite.config.ts` file to the root of your extension with the following content:

```ts
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const HOST_URL = 'http://localhost:8080';
const LOAD_IN_HOST = true;
// Update this with the correct values
const HOST_DEPS = {
  "@directus/extensions-sdk": "${HOST_URL}/admin/assets/@directus_extensions-sdk.BUQzFEMG.entry.js",
  "pinia": "${HOST_URL}/admin/assets/pinia.CcPPvUKL.entry.js",
  "vue-i18n": "${HOST_URL}/admin/assets/vue-i18n.BDgO9r8I.entry.js",
  "vue-router": "${HOST_URL}/admin/assets/vue-router.Y6owf-Uq.entry.js",
  "vue": "${HOST_URL}/admin/assets/vue.Di93ddbl.entry.js"
};

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			...(LOAD_IN_HOST ? HOST_DEPS : undefined),
		},
		extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue', '.d.ts'],
	},
});
```

2. **IMPORTANT STEP**: The HOST_DEPS in the vite.config.ts file is a list of shared dependencies that need to be loaded from Directus. Every version of Directus contains different hash values, so you need to update the HOST_DEPS with the correct values now and every time you upgrade Directus. To help there is a script that you can run at the root of your Directus Project to print out the correct values.

```bash
node ./node_modules/directus-extension-dev-canvas/host-deps.js
> Copy the output and paste it into your vite.config.ts file
```

3. Add the following to your extension's `package.json` file:
```json
"scripts": {
	"start": "vite"
}
```

4. Edit your environment variables to include the following:
```
CONTENT_SECURITY_POLICY_DIRECTIVES__SCRIPT_SRC="'self' 'unsafe-eval' http://localhost:5173"
CONTENT_SECURITY_POLICY_DIRECTIVES__CONNECT_SRC="'self' https://* wss://* ws://localhost:5173"
```
> Note: The port 5173 is the default port for Vite, if you are using a different port, please replace it with your port.

5. Run your extension with `npm start`

6. Start up your Directus instance, and navigate to the Developer Canvas module in the sidebar.

7. Enter the URL of your extension's index.ts file in the "URI" field, and select the type of extension you are developing.
> Note: For bundled extensions you might have an extra folder eg. `http://localhost:5173/src/my-interface/index.ts`

8. Click "Load It", and your extension should now be loaded in the Developer Canvas module.

## Supported UI Extension Types

- ✅ Bundles
- ✅ Modules
- ✅ Layouts
- 🔰 Displays
- 🔰 Interfaces

🔰 = Works for simple extensions, but not those with relationships.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Contributors:

 - YOUR NAME HERE ;)

## License

If you are developing an open source extension for Directus that you plan to share with the community, you must use the GNU Affero General Public License v3.0. If you are developing an extension commercial organization or a client, you must purchase a commercial license.

> Note: This software is provided as-is, without any warranty. The original author is not liable for any damages or losses incurred while using this software.

Read the entire license agreement here [LICENSE.md](LICENSE.md)

Copyright (c) 2025 Gerard Lamusse
