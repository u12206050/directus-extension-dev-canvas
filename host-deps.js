import fs from 'fs';

// Dependencies we want to find
const DEPENDENCIES = ['vue', 'vue-router', 'vue-i18n', 'pinia', '@directus/extensions-sdk'];

function findDirectusAssets() {
	const basePath = 'node_modules/@directus/app/dist/assets';

	if (!fs.existsSync(basePath)) {
		throw new Error('Could not find Directus assets directory');
	}

	return basePath;
}

function transformPackageName(name) {
	// Transform package name to match Directus's file naming convention
	// e.g., '@directus/extensions-sdk' -> '@directus_extensions-sdk'
	return name.replace(/\//g, '_');
}
function scanDependencyFiles() {
	const assetsDir = findDirectusAssets();
	const files = fs.readdirSync(assetsDir);
	const result = {};

	// Create regex patterns for each dependency
	const patterns = DEPENDENCIES.map(dep => ({
		name: dep,
		pattern: new RegExp(`^${transformPackageName(dep)}\\.[a-zA-Z0-9-]+\\.entry\\.js$`),
	}));

	// Scan files and match against patterns
	for (const file of files) {
		for (const { name, pattern } of patterns) {
			if (pattern.test(file)) {
				result[name] = `%\${HOST_URL}/admin/assets/${file}%`;
				break;
			}
		}
	}

	return result;
}

// Execute and output results
try {
	const mappings = scanDependencyFiles();
	const json = JSON.stringify(mappings, null, 2);

	const escaped = json.replace(/"%/g, '`').replace(/%"/g, '`');
	console.log(escaped);
} catch (error) {
	console.error('Error:', error.message);
	process.exit(1);
}
