// @flow

import { getRepoURL } from '../page-detect'
import { getFirstFileContents, getMainBranch } from '../utils'

let minimumNumberOfApprovals: int
let maxFailedBuilds: int
let requireBuilds: boolean = false

let ciStatus

export async function init() {
    const mergeButton = document.getElementById('fulfill-pullrequest')
    if (!mergeButton) {
        console.warn(`refined-bitbucket: No merge button found`)
        return
    }

    const ciStatusMsg = document.querySelectorAll('[data-status-counts]')[0]
    if (ciStatusMsg) {
        console.info(`refined-bitbucket: CI status found`)
        // JSON.parse(document.querySelectorAll('[data-status-counts]')[0].attributes['data-status-counts'].value)['FAILED']
        ciStatus = JSON.parse(
            ciStatusMsg.attributes['data-status-counts'].value
        )
        console.info(`refined-bitbucket: CI Status:`, ciStatus)
    } else {
        console.warn(`refined-bitbucket: No CI status found`)
    }

    const pullrequestOptionsUrls = getPullrequestOptionsUrls()
    const optionsJson = await getFirstFileContents(pullrequestOptionsUrls)

    if (!optionsJson) {
        console.warn(`refined-bitbucket: No options found for this PR`)
        return
    }
    const options = JSON.parse(optionsJson)
    console.info(`refined-bitbucket: got PR options:`, options)
    minimumNumberOfApprovals = options['minimum_approvals']
    requireBuilds = options['require_builds']
    maxFailedBuilds = options['max_failed_builds']

    bindApprovalClick()
    mergeButton.disabled = shouldMergeBeDisabled()
}

export function getPullrequestOptionsUrls() {
    const repoURL = getRepoURL()

    const mainBranch = getMainBranch()

    const pullrequestOptionsUrls = [
        `https://bitbucket.org/${repoURL}/raw/${mainBranch}/.refined_bitbucket/PULL_REQUEST_OPTIONS.json`,
    ]

    console.info(
        `refined-bitbucket: Looking for PR options in ${pullrequestOptionsUrls}`
    )

    return pullrequestOptionsUrls
}

function bindApprovalClick() {
    const approveButton = document.getElementById('approve-button')
    /*
        Passing once: true so that the eventListener is destroyed after executed.
        The thing is that after clicking the approve button the button is destroyed
        and a new button with a new counter is added.
     */
    approveButton.addEventListener('click', clickHandler, { once: true })

    function clickHandler() {
        // timeout because it takes some time for the approvals counter to update
        setTimeout(() => {
            const mergeButton = document.getElementById('fulfill-pullrequest')
            {
                mergeButton.disabled = shouldMergeBeDisabled()
                bindApprovalClick()
            }
        }, 500)
    }
}

function shouldMergeBeDisabled(): boolean {
    const numberOfApprovals = parseInt(
        document.getElementsByClassName('approvals')[0].textContent,
        10
    )
    const mergeRequiresApproval = minimumNumberOfApprovals > 0

    // First, initialize to requireBuilds. Therefore, if CI are required then we marked as failed initially
    var failedCI = requireBuilds
    if (ciStatus && maxFailedBuilds) {
        // Then, figure out if there are more failed builds than the maximum
        failedCI = ciStatus['FAILED'] > maxFailedBuilds
    }
    console.debug(
        `mergeRequiresApproval ${mergeRequiresApproval}, numberOfApprovals ${numberOfApprovals}, failedCI ${failedCI}`
    )
    return (
        (mergeRequiresApproval &&
            numberOfApprovals < minimumNumberOfApprovals) ||
        failedCI
    )
}
