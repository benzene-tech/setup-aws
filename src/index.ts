import * as core from "@actions/core"
import * as tc from "@actions/tool-cache"
import * as exec from "@actions/exec"
import * as io from "@actions/io"
import * as path from 'path'
import {arch, env, platform} from 'node:process'
import {run as awsCredentials} from "configure-aws-credentials/src/index"

async function run() {
    const exitCode = await exec.exec(`which`, [`aws`], {
        silent: true,
        ignoreReturnCode: true
    })

    if (exitCode == 0 && !core.getBooleanInput(`update-version`)) {
        core.notice(`AWS CLI already exits`)
    } else {
        switch (platform) {
            case `linux`:
            case `darwin`: {
                const cliArch = {
                    x64: `x86_64`,
                    arm64: `aarch64`
                }
                const cliPackage = {
                    linux: `awscli-exe-linux`,
                    darwin: `AWSCLIV2.pkg`
                }
                const downloadedPath = await tc.downloadTool(`https://awscli.amazonaws.com/${cliPackage[platform]}${platform === `linux` ? `-${cliArch[arch as keyof Object]}.zip` : ``}`, path.join(env.RUNNER_TEMP!, cliPackage[platform]))

                const extractedPath = platform === `linux` ? await tc.extractZip(downloadedPath) : downloadedPath
                const args = platform === `linux` ? [`${extractedPath}/aws/install`, `--update`] : [`installer`, `-pkg`, extractedPath, `-target`, `/`]
                await exec.exec(`sudo`, args, {
                    silent: true
                })

                await io.rmRF(downloadedPath)
                await io.rmRF(extractedPath)

                break
            }
            default: {
                throw new Error(`This action is currently not supported for ${platform}`)
            }
        }
    }

    const configureAWSCredentials = core.getBooleanInput(`configure-aws-credentials`)
    !configureAWSCredentials || awsCredentials().catch(error => {
        core.setFailed(error)
    })
}


if (require.main === module) {
    run().catch(error => {
        core.setFailed(error)
    })
}
