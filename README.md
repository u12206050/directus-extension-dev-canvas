# Directus Extension Dev Canvas

A module for developing Directus UI extensions with **hot-reloading**.

| Edit bundled or single extensions | Edit displays with live setup options |
| -------- | ------- |
| <img src="https://github.com/u12206050/directus-extension-dev-canvas/raw/main/screenshots/ExtensionSelector.png" width="200" alt="Selecting an extension"> | <img src="https://github.com/u12206050/directus-extension-dev-canvas/raw/main/screenshots/DevelopDisplays.png" width="300" alt="Selecting an extension"> |

## 1 Setup

First install this extension in your Directus project:

### NPM Package

```bash
npm install directus-extension-dev-canvas -S
```

### Docker

Follow the [official Directus extension installation guide](https://docs.directus.io/extensions/installing-extensions.html) for Docker-based installations.

## 2 Configuration

**In your custom extension that you are developing follow these steps carefully:**

1. Add a file `vite.config.js` (`vite.config.ts` if using typescript), to the root of your extension with the following content:

```ts
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Update this with your Directus URL
const HOST_URL = 'http://localhost:8080';
const LOAD_IN_HOST = true;
// Update this with the correct values
// On root, run `node node_modules/directus-extension-dev-canvas/host-deps.js` to generate new list
// Current values are for a Directus 11.5.0
const HOST_DEPS = {
  "@directus/extensions-sdk": `${HOST_URL}/admin/assets/@directus_extensions-sdk.DWZqRl_w.entry.js`,
  "pinia": `${HOST_URL}/admin/assets/pinia.CgQSnxxV.entry.js`,
  "vue-i18n": `${HOST_URL}/admin/assets/vue-i18n.DjdmXneM.entry.js`,
  "vue-router": `${HOST_URL}/admin/assets/vue-router.CUNOcKiw.entry.js`,
  "vue": `${HOST_URL}/admin/assets/vue.wgR5vgTp.entry.js`
};

export default defineConfig({
	plugins: [vue()],
	server: {
		cors: true,
	},
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
> Copy the output and paste it as the value of HOST_DEPS into your vite.config.ts file
```

> NOTE: Also update the HOST_URL with the correct URL of your Directus instance.

3. Add the following to your extension's `package.json` file:
```json
"scripts": {
	"start": "vite"
}
```

4. Start the vite server for your extension with `npm start`

## 3 Final Steps

In your Directus project, follow these steps:

1. Edit your environment variables to include the following:
```
CONTENT_SECURITY_POLICY_DIRECTIVES__SCRIPT_SRC="'self' 'unsafe-eval' http://localhost:5173"
CONTENT_SECURITY_POLICY_DIRECTIVES__CONNECT_SRC="'self' https://* wss://* http://localhost:5173 ws://localhost:5173"
```
> Note: The port 5173 is the default port for Vite, if you are using a different port, please replace it with your port.


2. Start up your Directus instance, and navigate to the Developer Canvas module in the sidebar.
> You might have to enable the module in the settings first time you load it.

3. Update if needed the the URL of the running vite server

4. If it is a bundle, select the extension you want to work on.

4. Click **"Load It"**, and your extension should now be loaded in the Developer Canvas module.

## Note

- The Developer Canvas module is only available to users with the `admin_access` permission.

- You still need to manually run `npm run build` to actually bundle your extension once you want to use it outside of the Developer Canvas module.

## Supported UI Extension Types

- ✅ Bundles
- ✅ Modules
- ✅ Layouts
- 🔰 Displays
- 🔰 Interfaces

🔰 = Works for simple extensions, and for many-to-one / one-to-many relational interfaces and displays. Many-to-any (m2a) relations aren't supported yet.

### Previewing interfaces and displays

The canvas renders the interface/display next to its options, passing the same props Directus does
(`value`, `type`, `collection`, `field`, `fieldData`, `primaryKey`, `disabled`, and every option as its own prop).

- **Options**: option fields start at their `schema.default_value`. Custom options components (`options: MyOptions.vue`)
  are rendered instead of the options form, and receive `value` / `collection` and emit `input`, like in Directus.
- **Field Type**: if the extension supports several `types`, pick the one to preview with. The Test Value editor
  follows it (e.g. a JSON code editor for `json`, a checkbox for `boolean`).
- **Test Value**: the value handed to the extension. Values emitted by an interface show up here too. Displays are
  remounted whenever it changes, as Directus does per row, so a display that only reads `value` in `setup()` stays in
  sync. Relational displays take the related item(s) as JSON, e.g. `{ "title": "Hello" }`.
- **Disabled** (interfaces only): renders the interface in its disabled state.
- Interfaces get an injected `values` (the item being edited), as they do inside a Directus form.
- If the extension throws while rendering (often in `setup()`, e.g. a required option isn't set yet), the error is
  shown in the preview and logged to the console. Changing an option or clicking **Refresh** retries.

### Testing relational interfaces/displays (m2o / o2m)

If the interface or display you're developing is a many-to-one or one-to-many type, set **Related Collection**
(next to **Test Collection**) to an existing collection in your project, then click **Load It**. Developer Canvas
will register a temporary, in-memory field + relation for the duration of the preview, so the interface can
resolve real relation data the same way it would for a real field.

This never touches your database — nothing is written through the API. But it does inject that field into
Directus's live relations/fields stores in your browser, under an obviously fake field name
(`__dev_canvas_relation__`), so for as long as the preview is loaded, that field could theoretically show up
anywhere else in the app that reads those stores for the same collection (e.g. the real Data Model settings
page, if you have it open in another tab). It's cleared automatically when you change extension/collection,
close the Developer Canvas dialog, or navigate away from the module.

Many-to-any (m2a) relations aren't supported yet, since they need a simulated junction collection rather than
just a fake field.

# Known Issues

>Console error: `Refused to connect to [URL]because it violates the document's Content Security Policy.`
>
> Check step 3.1 of the installation instructions.


> Error: `Failed to fetch dynamically imported module`:
>
> Ensure the vite server is running and the URL is correct.


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

Run `npm install` then `npm test` to run the unit tests before submitting a change.

### Contributors:

 - YOUR NAME HERE ;)

## License

If you are developing an open source extension for Directus that you plan to share with the community, you must use the GNU Affero General Public License v3.0. If you are developing an extension commercial organization or a client, you must purchase a commercial license.

> Note: This software is provided as-is, without any warranty. The original author is not liable for any damages or losses incurred while using this software.

Read the entire license agreement here [LICENSE.md](LICENSE.md)

Copyright (c) 2025 Gerard Lamusse
