import * as core from "@actions/core"
import * as tc from "@actions/tool-cache"
import * as exec from "@actions/exec"
import * as io from "@actions/io"
import {arch as ARCH, env, platform as PLATFORM} from 'node:process'
import * as path from 'path'
import {run as awsCredentials} from "configure-aws-credentials/src/index"

async function run() {
    const command = PLATFORM === `win32` ? `where` : `which`
    const exitCode = await exec.exec(command, [`aws`], {
        silent: false,
        ignoreReturnCode: true
    })

    if (exitCode == 0 && !core.getBooleanInput(`update-version`)) {
        core.notice(`AWS CLI already exits`)
    } else {
        switch (PLATFORM) {
            case `linux`:
            case `darwin`: {
                const arch = {
                    x64: `x86_64`,
                    arm64: `aarch64`
                }
                const platform = {
                    linux: `awscli-exe-linux-${arch[ARCH as keyof Object]}.zip`,
                    darwin: `AWSCLIV2.pkg`
                }

                const downloadedPath = await tc.downloadTool(`https://awscli.amazonaws.com/${platform[PLATFORM]}`, path.join(env.RUNNER_TEMP!, platform[PLATFORM]))
                const extractedPath = PLATFORM === `linux` ? await tc.extractZip(downloadedPath) : downloadedPath
                if (PLATFORM === `linux`) {
                    await exec.exec(`sudo`, [`${extractedPath}/aws/install`, `--update`], {
                        silent: true
                    })
                } else if (PLATFORM === `darwin`) {
                    await exec.exec(`sudo`, [`installer`, `-pkg`, extractedPath, `-target`, `/`], {
                        silent: true
                    })
                }

                await io.rmRF(downloadedPath)
                await io.rmRF(extractedPath)

                break
            }
            case `win32`: {
                await exec.exec(`msiexec.exe`, [`/a`, `/i`, `https://awscli.amazonaws.com/AWSCLIV2.msi`], {
                    silent: false
                })

                break
            }
            default: {
                throw new Error('Invalid platform')
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
