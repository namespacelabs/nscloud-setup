import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as exec from "@actions/exec";
import * as fs from "fs";
import * as path from "path";

async function withRetry<T>(name: string, fn: () => Promise<T>, maxRetries: number): Promise<T> {
	let lastError: Error;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (e) {
			lastError = e;
			if (attempt < maxRetries) {
				const delay = Math.pow(2, attempt);
				core.warning(`${name} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}s: ${e instanceof Error ? e.message : String(e)}`);
				await new Promise((resolve) => setTimeout(resolve, delay * 1000));
			}
		}
	}
	throw lastError;
}

async function run(): Promise<void> {
	try {
		const which = require("which");
		const maxRetries = parseInt(core.getInput("retries") || "0", 10) || 0;

		const resolvedOrNull = await which("nsc", { nothrow: true });
		if (resolvedOrNull == null) {
			await core.group("Prepare access to Namespace", async () => {
				await withRetry("installNsc", () => installNsc(), maxRetries);
			});
		} else {
			core.info("Namespace Cloud CLI found.");
		}
		await exec.exec("nsc version");

		await core.group("Log into Namespace workspace", async () => {
			await withRetry("ensureNscloudToken", () => ensureNscloudToken(), maxRetries);
		});

		const { NSC_DOCKER_LOGIN, NSC_CONTAINER_REGISTRY } = process.env;
		let registry = NSC_CONTAINER_REGISTRY;
		if (
			NSC_DOCKER_LOGIN == null ||
			registry == null ||
			NSC_DOCKER_LOGIN !== "1" ||
			registry === ""
		) {
			registry = await core.group("Log into Namespace workspace container registry", async () => {
				await withRetry("ensureNscloudToken", () => ensureNscloudToken(), maxRetries);
				return await withRetry("dockerLogin", () => dockerLogin(), maxRetries);
			});
		}

		await core.group("Registry address", async () => {
			core.info(registry);
			core.setOutput("registry-address", registry);
		});
	} catch (e) {
		core.setFailed(e.message);
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

async function ensureNscloudToken() {
	const tokenFile = "/var/run/nsc/token.json";
	if (fs.existsSync(tokenFile)) {
		core.exportVariable("NSC_TOKEN_FILE", tokenFile);
		return;
	}

	await exec.exec("nsc auth exchange-github-token");
}

async function dockerLogin() {
	const out = tmpFile("registry.txt");
	await exec.exec(`nsc docker login --output_registry_to=${out} --log_actions=false`);

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
