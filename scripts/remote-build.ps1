#requires -Version 7.0

<#
.SYNOPSIS
Build the current Git working tree on the Debian build server without committing it.

.DESCRIPTION
Server-specific values are read from .remote-build.local.psd1, which is ignored by Git.
Explicit command-line parameters override the local configuration file.

.EXAMPLE
pwsh ./scripts/remote-build.ps1 -Mode upload

.EXAMPLE
pwsh ./scripts/remote-build.ps1 -Mode kernel -Jobs 4

.EXAMPLE
pwsh ./scripts/remote-build.ps1 -Mode world -Jobs 4
#>

[CmdletBinding()]
param(
    [ValidateSet('upload', 'kernel', 'world')]
    [string]$Mode = 'kernel',

    [string]$Server,

    [string]$RemoteRepo,

    [string]$IdentityFile = (Join-Path $HOME '.ssh\id_ed25519'),

    [ValidateRange(1, 64)]
    [int]$Jobs = 4,

    [switch]$RefreshFeeds,

    [switch]$NoDownload
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory)]
        [string]$Command,

        [Parameter()]
        [string[]]$CommandArguments = @()
    )

    & $Command @CommandArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Command"
    }
}

function Invoke-CapturedCommand {
    param(
        [Parameter(Mandatory)]
        [string]$Command,

        [Parameter()]
        [string[]]$CommandArguments = @()
    )

    $output = @(& $Command @CommandArguments)
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Command"
    }

    return $output
}

function ConvertTo-ShellLiteral {
    param(
        [Parameter(Mandatory)]
        [string]$Value
    )

    return "'" + $Value.Replace("'", "'\''") + "'"
}

function New-WorkspaceSnapshot {
    $temporaryIndex = Join-Path ([IO.Path]::GetTempPath()) (
        'remote-build-{0}.index' -f [guid]::NewGuid().ToString('N')
    )
    $indexPath = [string](Invoke-CapturedCommand git @('rev-parse', '--git-path', 'index'))
    $indexPath = (Resolve-Path -LiteralPath $indexPath.Trim()).Path
    $hadIndexOverride = Test-Path Env:GIT_INDEX_FILE
    $previousIndexOverride = $env:GIT_INDEX_FILE

    try {
        [IO.File]::Copy($indexPath, $temporaryIndex)
        $env:GIT_INDEX_FILE = $temporaryIndex
        Invoke-CheckedCommand git @('add', '-A', '--', '.')

        $tree = [string](Invoke-CapturedCommand git @('write-tree'))
        $parent = [string](Invoke-CapturedCommand git @('rev-parse', 'HEAD'))
        $message = 'remote-build snapshot {0:O}' -f [DateTimeOffset]::Now
        $snapshotOutput = @($message | & git commit-tree $tree.Trim() -p $parent.Trim())
        if ($LASTEXITCODE -ne 0) {
            throw "git commit-tree failed with exit code $LASTEXITCODE"
        }

        $snapshot = [string]($snapshotOutput | Select-Object -Last 1)
        if ($snapshot.Trim() -notmatch '^[0-9a-f]{40,64}$') {
            throw "git commit-tree returned an invalid object ID: $snapshot"
        }

        return $snapshot.Trim()
    }
    finally {
        if ($hadIndexOverride) {
            $env:GIT_INDEX_FILE = $previousIndexOverride
        }
        else {
            Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue
        }

        Remove-Item -LiteralPath $temporaryIndex -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath "${temporaryIndex}.lock" -Force -ErrorAction SilentlyContinue
    }
}

foreach ($command in @('git', 'ssh', 'scp')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command was not found: $command"
    }
}

$repoRoot = [string](Invoke-CapturedCommand git @('rev-parse', '--show-toplevel'))
$repoRoot = $repoRoot.Trim()
$localConfigPath = Join-Path $repoRoot '.remote-build.local.psd1'

if (Test-Path -LiteralPath $localConfigPath -PathType Leaf) {
    $localConfig = Import-PowerShellDataFile -LiteralPath $localConfigPath

    if (-not $PSBoundParameters.ContainsKey('Server') -and $localConfig.ContainsKey('Server')) {
        $Server = [string]$localConfig.Server
    }
    if (
        -not $PSBoundParameters.ContainsKey('RemoteRepo') -and
        $localConfig.ContainsKey('RemoteRepo')
    ) {
        $RemoteRepo = [string]$localConfig.RemoteRepo
    }
    if (
        -not $PSBoundParameters.ContainsKey('IdentityFile') -and
        $localConfig.ContainsKey('IdentityFile')
    ) {
        $IdentityFile = [string]$localConfig.IdentityFile
    }
}

if ([string]::IsNullOrWhiteSpace($Server)) {
    throw "Server is required. Set it in $localConfigPath or pass -Server."
}

if ([string]::IsNullOrWhiteSpace($RemoteRepo) -or $RemoteRepo -notmatch '^/\S+$') {
    throw 'RemoteRepo must be an absolute Linux path without whitespace.'
}

if (-not (Test-Path -LiteralPath $IdentityFile -PathType Leaf)) {
    throw "SSH private key was not found: $IdentityFile"
}

$previousLocation = Get-Location

try {
    Set-Location -LiteralPath $repoRoot

    $ignoredInputs = @(Invoke-CapturedCommand git @(
        'status', '--short', '--ignored', '--', 'files', 'package/feeds'
    ))
    if ($ignoredInputs.Count -gt 0) {
        Write-Warning (
            "Ignored build inputs are not part of the anonymous snapshot:`n" +
            ($ignoredInputs -join "`n") +
            "`nThey remain server-local and can make the remote build differ from GitHub CI."
        )
    }

    Write-Host '==> Creating an anonymous snapshot from HEAD plus working-tree changes'
    $snapshot = New-WorkspaceSnapshot
    $shortSnapshot = $snapshot.Substring(0, 12)
    $remoteRef = "refs/codex/build-snapshots/$snapshot"
    Write-Host "    snapshot: $snapshot"

    $remoteGitUrl = "${Server}:$RemoteRepo"
    $identityForGit = $IdentityFile.Replace('\', '/')
    $gitSshCommand = "ssh -o BatchMode=yes -o IdentitiesOnly=yes -i `"$identityForGit`""
    $hadGitSshCommand = Test-Path Env:GIT_SSH_COMMAND
    $previousGitSshCommand = $env:GIT_SSH_COMMAND

    try {
        $env:GIT_SSH_COMMAND = $gitSshCommand
        Write-Host "==> Uploading snapshot to ${Server}:$remoteRef"
        Invoke-CheckedCommand git @(
            'push', $remoteGitUrl, "${snapshot}:$remoteRef"
        )
    }
    finally {
        if ($hadGitSshCommand) {
            $env:GIT_SSH_COMMAND = $previousGitSshCommand
        }
        else {
            Remove-Item Env:GIT_SSH_COMMAND -ErrorAction SilentlyContinue
        }
    }

    $sshArguments = @(
        '-o', 'BatchMode=yes',
        '-o', 'IdentitiesOnly=yes',
        '-i', $IdentityFile,
        $Server
    )
    $repoLiteral = ConvertTo-ShellLiteral $RemoteRepo
    $buildId = '{0}-{1}-{2}' -f (
        Get-Date -Format 'yyyyMMdd-HHmmss'
    ), $shortSnapshot, $Mode
    $remoteLog = "$RemoteRepo/logs/remote-build/$buildId.log"
    $refreshFeedsFlag = if ($RefreshFeeds -or $Mode -eq 'world') { '1' } else { '0' }
    $runnerPath = Join-Path $repoRoot 'scripts/remote-build-runner.sh'
    if (-not (Test-Path -LiteralPath $runnerPath -PathType Leaf)) {
        throw "Remote runner was not found: $runnerPath"
    }

    $runnerPayload = [Convert]::ToBase64String([IO.File]::ReadAllBytes($runnerPath))
    $runnerCommand = @(
        "printf '%s' '$runnerPayload' | base64 -d | bash -s --",
        $repoLiteral,
        (ConvertTo-ShellLiteral $remoteRef),
        (ConvertTo-ShellLiteral $Mode),
        $Jobs,
        $refreshFeedsFlag,
        (ConvertTo-ShellLiteral $remoteLog)
    ) -join ' '

    if ($Mode -eq 'upload') {
        Write-Host '==> Checking out the snapshot on the build server'
    }
    else {
        Write-Host "==> Starting remote $Mode build with $Jobs jobs"
    }

    $buildExitCode = 0
    & ssh @sshArguments $runnerCommand
    $buildExitCode = $LASTEXITCODE

    $cleanupRefCommand = "git -C $repoLiteral update-ref -d " + (
        ConvertTo-ShellLiteral $remoteRef
    )
    & ssh @sshArguments $cleanupRefCommand | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Could not remove temporary remote ref: $remoteRef"
    }

    if ($Mode -eq 'upload') {
        if ($buildExitCode -ne 0) {
            throw "Remote snapshot checkout failed with exit code $buildExitCode"
        }

        Write-Host "==> Upload complete. Remote HEAD is $shortSnapshot"
        return
    }

    $localBuildDir = Join-Path $repoRoot "bin/remote-build/$buildId"
    New-Item -ItemType Directory -Path $localBuildDir -Force | Out-Null
    $scpArguments = @(
        '-o', 'BatchMode=yes',
        '-o', 'IdentitiesOnly=yes',
        '-i', $IdentityFile
    )

    Write-Host "==> Downloading build log to $localBuildDir"
    & scp @scpArguments "${Server}:$remoteLog" $localBuildDir
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Could not download remote log: $remoteLog"
    }

    if ($buildExitCode -ne 0) {
        throw "Remote build failed with exit code $buildExitCode"
    }

    if ($Mode -eq 'world' -and -not $NoDownload) {
        Write-Host "==> Downloading firmware artifacts to $localBuildDir"
        & scp @scpArguments -r (
            "${Server}:$RemoteRepo/bin/targets/airoha/an7581"
        ) $localBuildDir
        if ($LASTEXITCODE -ne 0) {
            throw "Firmware download failed with exit code $LASTEXITCODE"
        }
    }

    Write-Host "==> Remote build succeeded: $buildId"
    Write-Host "    remote log: $remoteLog"
    Write-Host "    local output: $localBuildDir"
}
finally {
    Set-Location -LiteralPath $previousLocation
}
