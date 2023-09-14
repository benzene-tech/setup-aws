import * as core from "@actions/core"
import * as tc from "@actions/tool-cache"
import * as exec from "@actions/exec"
import * as io from "@actions/io"
import {run as awsCredentials} from "configure-aws-credentials/src/index";

async function run() {
    const version = `v2`

    const awsPath = tc.find(`AWS`, version)
    if (awsPath !== `` && !core.getBooleanInput(`update-version`)) {
        core.notice(`AWS CLI with ${version} already installed`)
        core.addPath(awsPath)

        awsCredentials().catch(error => {
            core.setFailed(error)
        })

        return
    }

    let cachedPath: string = ``
    switch (process.platform) {
        case `linux` || `darwin`: {
            const arch = {
                x64: `x86_64`,
                arm64: `aarch64`
            }
            const platform = {
                linux: `awscli-exe-linux-${arch[process.arch as keyof Object]}.zip`,
                darwin: `AWSCLIV2.pkg`
            }

            const pathToCLI = await tc.downloadTool(`https://awscli.amazonaws.com/${platform[process.platform as keyof Object]}`)
            const extractedPathToCLI = await (async (path: string) => {
                switch (process.platform) {
                    case `linux`: {
                        return await tc.extractZip(path);
                    }
                    case `darwin`: {
                        return await tc.extractXar(path);
                    }
                }
            })(pathToCLI)
            await exec.exec(`sudo`, [`${extractedPathToCLI}/aws/install`], {
                silent: true
            })
            cachedPath = await tc.cacheFile(pathToCLI, `/usr/local/bin/aws`, `AWS`, version)

            await io.rmRF(pathToCLI)
            await io.rmRF(extractedPathToCLI!)
            await io.rmRF(`/usr/local/bin/aws`)

            break
        }
        case `win32`: {
            const pathToCLI = await tc.downloadTool(`https://awscli.amazonaws.com/AWSCLIV2.msi`)
            await exec.exec(`msiexec.exe`, [`/i`, pathToCLI, `TARGETDIR="${core.toPlatformPath(`${pathToCLI}/..`)}"`], {
                silent: true
            })
            cachedPath = await tc.cacheFile(pathToCLI, `${core.toPlatformPath(`${pathToCLI}/..`)}/aws.exe`, `AWS`, version)

            break
        }
    }

    core.addPath(cachedPath)

    core.setOutput(`path`, cachedPath)

    awsCredentials().catch(error => {
        core.setFailed(error)
    })
}


if (require.main === module) {
    run().catch(error => {
        core.setFailed(error)
    })
}
