import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as exec from "@actions/exec";
import * as fs from "fs";
import * as path from "path";

const Env_DockerLogin = "NSC_DOCKER_LOGIN"
const Env_DockerRegistry = "NSC_CONTAINER_REGISTRY"

async function run(): Promise<void> {
	try {
		const which = require("which");

		const resolvedOrNull = await which("nsc", { nothrow: true });
		if (resolvedOrNull == null) {
			await core.group(`Prepare access to Namespace`, async () => {
				await installNsc();
			});
		} else {
			core.info(`Namespace Cloud CLI found.`);
		}
		await exec.exec("nsc version");

		await core.group(`Log into Namespace workspace`, async () => {
			await ensureNscloudToken();
		});

		const { isDockerLogin, dockerRegistry } = process.env;
		let registry = dockerRegistry;
		if (isDockerLogin == null || registry == null || isDockerLogin != "1" || registry == "") {
			registry = await core.group(`Log into Namespace workspace container registry`, async () => {
				await ensureNscloudToken();
				return await dockerLogin();
			});
		}

		await core.group(`Registry address`, async () => {
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
