import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as exec from "@actions/exec";
import * as fs from "fs";
import * as path from "path";

async function run(): Promise<void> {
	try {
		await installNsc();

		await ensureFreshTenantToken();

		const registry = await dockerLogin();
		core.setOutput("registry-address", registry);
	} catch (error) {
		core.setFailed(error.message);
	}
}

async function installNsc() {
	// Download the specific version of the tool, e.g. as a tarball
	const pathToTarball = await tc.downloadTool(getDownloadURL(), null, null, {
		CI: process.env.CI,
		"User-Agent": "nscloud-action",
	});

	// Extract the tarball onto the runner
	const pathToCLI = await tc.extractTar(pathToTarball);

	// Expose the tool by adding it to the PATH
	core.addPath(pathToCLI);

	core.exportVariable("NS_DO_NOT_UPDATE", "true");
}

function getDownloadURL(): string {
	const { RUNNER_ARCH, RUNNER_OS } = process.env;

	let arch = "";
	switch (RUNNER_ARCH) {
		case "X64":
			arch = "amd64";
			break;
		case "ARM64":
			arch = "arm64";
			break;
		default:
			throw new Error(`Unsupported architecture: ${RUNNER_ARCH}`);
	}

	let os = "";
	switch (RUNNER_OS) {
		case "macOS":
			os = "darwin";
			break;
		case "Linux":
			os = "linux";
			break;
		default:
			throw new Error(`Unsupported operating system: ${RUNNER_OS}`);
	}

	return `https://get.namespace.so/packages/nsc/latest?arch=${arch}&os=${os}`;
}

async function ensureFreshTenantToken() {
	await exec.exec("nsc auth exchange-github-token");
}

async function dockerLogin() {
	const out = tmpFile("registry.txt");
	await exec.exec(`nsc cluster docker-login --output_registry_to=${out}`);

	return fs.readFileSync(out, "utf8");
}

export function tmpFile(file: string): string {
	const tmpDir = path.join(process.env.RUNNER_TEMP, "ns");

	if (!fs.existsSync(tmpDir)) {
		fs.mkdirSync(tmpDir);
	}

	return path.join(tmpDir, file);
}

run();
